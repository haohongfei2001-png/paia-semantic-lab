from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Sequence

from semantic_lab.context import classification_text
from semantic_lab.embedding_adapters import HashNgramEmbeddingAdapter, cosine
from semantic_lab.rem01 import query_representation
from semantic_lab.sca03 import (
    assemble_graph_candidates,
    domain_members,
    load_profiles,
    profile_text,
    topic_centroid_ranking,
    topic_to_domain,
    weighted_rrf,
)

ROOT = Path(__file__).resolve().parents[1]


def _rank_from_vectors(query: Sequence[float], vectors: Sequence[Sequence[float]], ids: Sequence[str]) -> list[str]:
    rows = [(cosine(query, vector), str(item_id)) for vector, item_id in zip(vectors, ids)]
    rows.sort(key=lambda item: (-item[0], item[1]))
    return [item_id for _, item_id in rows]


def _position(ranking: Sequence[str], item_id: str) -> int:
    return list(ranking).index(item_id) + 1


def _capped_domain_candidates(
    direct_ranking: Sequence[str],
    profiles: Sequence[dict[str, Any]],
    *,
    sibling_cap: int,
    limit: int = 144,
) -> list[str]:
    members = domain_members(profiles)
    mapping = topic_to_domain(profiles)
    known = set(mapping)
    direct = [str(value) for value in direct_ranking if str(value) in known]
    selected: list[str] = []
    seen: set[str] = set()

    def add(topic_id: str) -> None:
        if topic_id in known and topic_id not in seen:
            seen.add(topic_id)
            selected.append(topic_id)

    def add_domain(domain_id: str, seed: str) -> None:
        add(seed)
        siblings = [topic_id for topic_id in members[domain_id] if topic_id != seed]
        for topic_id in siblings[:sibling_cap]:
            add(topic_id)

    first_seed = direct[0]
    first_domain = mapping[first_seed]
    add_domain(first_domain, first_seed)
    for topic_id in direct:
        if len(selected) >= 10:
            break
        add(topic_id)

    second_seed = next((topic_id for topic_id in direct[1:] if mapping[topic_id] != first_domain), None)
    if second_seed is not None:
        add_domain(mapping[second_seed], second_seed)
    for topic_id in direct:
        if len(selected) >= 20:
            break
        add(topic_id)

    for topic_id in direct:
        add(topic_id)
    for topic_id in sorted(known):
        add(topic_id)
    return selected[:limit]


def candidate_budget_diagnostic(profiles: Sequence[dict[str, Any]]) -> dict[str, Any]:
    by_domain = domain_members(profiles)
    domains = sorted(by_domain)
    representatives = [by_domain[domain_id][0] for domain_id in domains[:10]]
    representative_set = set(representatives)
    remainder = [
        profile["topic_id"]
        for profile in profiles
        if profile["topic_id"] not in representative_set
    ]
    direct = representatives + remainder
    current, _ = assemble_graph_candidates(direct, profiles, limit=144)
    capped4 = _capped_domain_candidates(direct, profiles, sibling_cap=4)
    capped2 = _capped_domain_candidates(direct, profiles, sibling_cap=2)
    mapping = topic_to_domain(profiles)

    def retained(ranking: Sequence[str], cutoff: int) -> int:
        head = set(ranking[:cutoff])
        return sum(topic_id in head for topic_id in direct[:10])

    counterexample = direct[3]
    result = {
        "fixture": "ten_distinct_domain_representatives_in_direct_top10",
        "direct_top10_domains": [mapping[topic_id] for topic_id in direct[:10]],
        "direct_rank4_topic": counterexample,
        "direct_rank4_position_after_current_k8": _position(current, counterexample),
        "direct_top10_retained_at_10": {
            "direct_only": 10,
            "current_k8": retained(current, 10),
            "sibling_cap4": retained(capped4, 10),
            "sibling_cap2": retained(capped2, 10),
        },
        "direct_top10_retained_at_20": {
            "direct_only": 10,
            "current_k8": retained(current, 20),
            "sibling_cap4": retained(capped4, 20),
            "sibling_cap2": retained(capped2, 20),
        },
        "current_top10_first_domain_count": sum(
            mapping[topic_id] == mapping[direct[0]]
            for topic_id in current[:10]
        ),
    }
    result["confirmed"] = (
        result["direct_rank4_position_after_current_k8"] > 10
        and result["direct_top10_retained_at_10"]["current_k8"]
        < result["direct_top10_retained_at_10"]["sibling_cap4"]
        < result["direct_top10_retained_at_10"]["sibling_cap2"]
        < result["direct_top10_retained_at_10"]["direct_only"]
    )
    return result


def sparse_prototype_diagnostic(profiles: Sequence[dict[str, Any]]) -> dict[str, Any]:
    import numpy as np

    topic_ids = [profile["topic_id"] for profile in profiles]
    query = np.asarray([1.0, 0.0], dtype="float32")
    profile_ranking = list(reversed(topic_ids))
    target = profile_ranking[0]

    seen_indices = [0, 47, 95, 120]
    seen_ids = [topic_ids[index] for index in seen_indices]
    train_vectors = np.asarray(
        [
            [1.0, 0.0],
            [0.8, 0.2],
            [0.6, 0.4],
            [0.0, 1.0],
        ],
        dtype="float32",
    )
    train_cases = [
        {"truth_state": "ASSIGNED", "truth_topics": [topic_id]}
        for topic_id in seen_ids
    ]

    partial_centroid = topic_centroid_ranking(
        query,
        train_vectors,
        train_cases,
        topic_ids=topic_ids,
    )
    no_prototype_centroid = topic_centroid_ranking(
        query,
        np.empty((0, 2), dtype="float32"),
        [],
        topic_ids=topic_ids,
    )

    profile_only = weighted_rrf(
        profile_ranking,
        no_prototype_centroid,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        calibration_weight=0.0,
    )
    partial_15 = weighted_rrf(
        profile_ranking,
        partial_centroid,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        calibration_weight=1.5,
    )
    partial_30 = weighted_rrf(
        profile_ranking,
        partial_centroid,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        calibration_weight=3.0,
    )
    no_proto_15 = weighted_rrf(
        profile_ranking,
        no_prototype_centroid,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        calibration_weight=1.5,
    )
    no_proto_30 = weighted_rrf(
        profile_ranking,
        no_prototype_centroid,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        calibration_weight=3.0,
    )

    zero_ids = [topic_id for topic_id in topic_ids if topic_id not in set(seen_ids)]
    partial_zero_order = [
        topic_id for topic_id in partial_centroid
        if topic_id in set(zero_ids)
    ]
    result = {
        "fixture": "real_centroid_function_144_topics_partial_and_zero_prototype_controls",
        "numpy_version": np.__version__,
        "topic_count": len(topic_ids),
        "seen_topic_count": len(seen_ids),
        "zero_prototype_count": len(zero_ids),
        "zero_prototype_target": target,
        "partial_prototype": {
            "target_profile_rank": _position(profile_ranking, target),
            "target_centroid_rank": _position(partial_centroid, target),
            "target_fused_rank_weight_1_5": _position(partial_15, target),
            "target_fused_rank_weight_3_0": _position(partial_30, target),
            "zero_prototype_tail_is_topic_id_sorted": partial_zero_order == sorted(zero_ids),
        },
        "all_no_prototype": {
            "input_shape": [0, 2],
            "centroid_ranking_equals_topic_id_order": no_prototype_centroid == sorted(topic_ids),
            "target_centroid_rank": _position(no_prototype_centroid, target),
            "target_fused_rank_weight_1_5": _position(no_proto_15, target),
            "target_fused_rank_weight_3_0": _position(no_proto_30, target),
        },
        "profile_only_control": {
            "calibration_weight": 0.0,
            "ranking_equals_profile_ranking": profile_only == profile_ranking,
            "target_rank": _position(profile_only, target),
        },
    }
    result["confirmed"] = (
        result["topic_count"] == 144
        and result["partial_prototype"]["zero_prototype_tail_is_topic_id_sorted"]
        and result["all_no_prototype"]["centroid_ranking_equals_topic_id_order"]
        and result["profile_only_control"]["ranking_equals_profile_ranking"]
        and result["profile_only_control"]["target_rank"] == 1
        and result["all_no_prototype"]["target_fused_rank_weight_1_5"] == 10
        and result["all_no_prototype"]["target_fused_rank_weight_3_0"] == 32
        and result["partial_prototype"]["target_fused_rank_weight_1_5"] > 1
        and result["partial_prototype"]["target_fused_rank_weight_3_0"]
        >= result["partial_prototype"]["target_fused_rank_weight_1_5"]
    )
    return result

def context_path_diagnostic(profiles: Sequence[dict[str, Any]]) -> dict[str, Any]:
    interview = next(profile for profile in profiles if profile["canonical_names"]["en"] == "Interviews")
    current = "What should I focus on?"
    allowed = {
        "policy": "synthetic-public-diagnostic",
        "inputs": [
            {
                "input_ref": "synthetic.context.1",
                "input_revision": "r1",
                "text": (
                    "I have a product manager interview tomorrow. "
                    "I need interview preparation, interview questions and mock interview practice."
                ),
                "direction": "before",
                "offset": -1,
            }
        ],
    }
    synthetic_case = {
        "text": current,
        "allowed_context": allowed,
    }
    current_query = query_representation(synthetic_case, "current_only")
    context_query = query_representation(synthetic_case, "allowed_context")

    adapter = HashNgramEmbeddingAdapter(dimensions=256)
    current_vector, context_vector = adapter.embed([current_query, context_query])
    topic_ids = [profile["topic_id"] for profile in profiles]
    documents = [profile_text(profile, "core") for profile in profiles]
    document_vectors = adapter.embed(documents)
    current_ranking = _rank_from_vectors(current_vector, document_vectors, topic_ids)
    context_ranking = _rank_from_vectors(context_vector, document_vectors, topic_ids)

    interview_id = interview["topic_id"]
    result = {
        "fixture": "ambiguous_current_input_with_interview_context",
        "current_text_changed_by_allowed_context": current_query != context_query,
        "query_embedding_cosine": cosine(current_vector, context_vector),
        "ranking_changed": current_ranking != context_ranking,
        "interview_topic_id": interview_id,
        "interview_rank_current_only": _position(current_ranking, interview_id),
        "interview_rank_allowed_context": _position(context_ranking, interview_id),
        "current_top5": current_ranking[:5],
        "allowed_context_top5": context_ranking[:5],
        "query_entry_point": "semantic_lab.rem01.query_representation",
        "control_adapter": "HashNgramEmbeddingAdapter",
    }
    result["confirmed"] = (
        result["current_text_changed_by_allowed_context"]
        and result["query_embedding_cosine"] < 0.999999
        and result["ranking_changed"]
        and result["interview_rank_allowed_context"] < result["interview_rank_current_only"]
    )
    result["private_causality_inference_permitted"] = False
    return result


def run_diagnostics(root: Path = ROOT) -> dict[str, Any]:
    profiles = load_profiles(root)
    candidate = candidate_budget_diagnostic(profiles)
    prototype = sparse_prototype_diagnostic(profiles)
    context = context_path_diagnostic(profiles)
    return {
        "package": "SCA03-PUBLIC-SYNTHETIC-DIAGNOSTICS-v0.1",
        "evidence_class": "PUBLIC_SYNTHETIC_ONLY",
        "private_artifact_reads": 0,
        "evaluation_reads": 0,
        "lockbox_reads": 0,
        "production_algorithm_modified": False,
        "diagnostics": {
            "candidate_budget": candidate,
            "sparse_prototype": prototype,
            "allowed_context_path": context,
        },
        "confirmed_count": sum(bool(row["confirmed"]) for row in (candidate, prototype, context)),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run bounded public synthetic SCA-03 failure diagnostics")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = run_diagnostics()
    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
