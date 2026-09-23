from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Sequence

from semantic_lab.baa01 import (
    ALLOWED_SIBLING_CAPS,
    assemble_direct_preserving_candidates,
    candidate_public_invariants,
    neutral_prototype_rrf,
    observed_topic_centroid_ranking,
)
from semantic_lab.sca03 import load_profiles


ROOT = Path(__file__).resolve().parents[1]


def _complete_ranking(prefix: Sequence[str], topic_ids: Sequence[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for raw in list(prefix) + list(topic_ids):
        topic_id = str(raw)
        if topic_id not in seen:
            seen.add(topic_id)
            result.append(topic_id)
    return result


def _domain_members(profiles: Sequence[dict[str, Any]]) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for profile in profiles:
        result.setdefault(str(profile["domain"]["id"]), []).append(str(profile["topic_id"]))
    return {key: sorted(values) for key, values in result.items()}


def _candidate_fixtures(profiles: Sequence[dict[str, Any]]) -> dict[str, list[str]]:
    topic_ids = [str(profile["topic_id"]) for profile in profiles]
    members = _domain_members(profiles)
    domains = sorted(members)

    distinct = [members[domain_id][0] for domain_id in domains[:10]]
    dense_first = members[domains[0]][:8] + [
        members[domains[1]][0],
        members[domains[2]][0],
    ]
    alternating: list[str] = []
    for left, right in zip(members[domains[3]][:5], members[domains[4]][:5]):
        alternating.extend([left, right])

    return {
        "ten_distinct_domains": _complete_ranking(distinct, topic_ids),
        "dense_first_domain": _complete_ranking(dense_first, topic_ids),
        "alternating_two_domains": _complete_ranking(alternating, topic_ids),
    }


def _positions(ranking: Sequence[str], items: Sequence[str]) -> list[int]:
    index = {topic_id: position for position, topic_id in enumerate(ranking, 1)}
    return [index[str(item)] for item in items]


def candidate_verification(profiles: Sequence[dict[str, Any]]) -> dict[str, Any]:
    fixtures = _candidate_fixtures(profiles)
    policies: dict[str, Any] = {}

    for sibling_cap in ALLOWED_SIBLING_CAPS:
        policy_id = f"direct_reserve6_sibling_cap{sibling_cap}"
        fixture_results: dict[str, Any] = {}
        policy_pass = True
        for fixture_id, direct in fixtures.items():
            ranking, metadata = assemble_direct_preserving_candidates(
                direct,
                profiles,
                sibling_cap=sibling_cap,
                limit=144,
            )
            invariants = candidate_public_invariants(ranking, direct, profiles)
            injected_counts_within_cap = all(
                int(count) <= sibling_cap
                for count in metadata["injected_sibling_counts"].values()
            )
            sibling_semantics_pass = (
                metadata["sibling_cap_counts_seed"] is False
                and injected_counts_within_cap
            )
            fixture_pass = all(invariants.values()) and sibling_semantics_pass
            policy_pass = policy_pass and fixture_pass
            fixture_results[fixture_id] = {
                "pass": fixture_pass,
                "invariants": invariants,
                "sibling_cap_counts_seed": metadata["sibling_cap_counts_seed"],
                "injected_sibling_counts": metadata["injected_sibling_counts"],
                "injected_counts_within_cap": injected_counts_within_cap,
                "direct_top6_positions": _positions(ranking, direct[:6]),
                "direct_top10_positions": _positions(ranking, direct[:10]),
                "candidate_count": len(ranking),
                "unique_candidate_count": len(set(ranking)),
            }

        policies[policy_id] = {
            "sibling_cap": sibling_cap,
            "pass": policy_pass,
            "fixtures": fixture_results,
        }

    return {
        "pass": all(row["pass"] for row in policies.values()),
        "policies": policies,
        "fixture_count": len(fixtures),
    }


def _relative_order(ranking: Sequence[str], subset: set[str]) -> list[str]:
    return [topic_id for topic_id in ranking if topic_id in subset]


def prototype_verification(profiles: Sequence[dict[str, Any]]) -> dict[str, Any]:
    import numpy as np

    topic_ids = [str(profile["topic_id"]) for profile in profiles]
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
    query = np.asarray([1.0, 0.0], dtype="float32")

    partial_stream = observed_topic_centroid_ranking(
        query,
        train_vectors,
        train_cases,
        topic_ids=topic_ids,
    )
    no_prototype_stream = observed_topic_centroid_ranking(
        query,
        np.empty((0, 2), dtype="float32"),
        [],
        topic_ids=topic_ids,
    )

    partial_15 = neutral_prototype_rrf(
        profile_ranking,
        partial_stream,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        prototype_weight=1.5,
    )
    partial_30 = neutral_prototype_rrf(
        profile_ranking,
        partial_stream,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        prototype_weight=3.0,
    )
    all_none_15 = neutral_prototype_rrf(
        profile_ranking,
        no_prototype_stream,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        prototype_weight=1.5,
    )
    all_none_30 = neutral_prototype_rrf(
        profile_ranking,
        no_prototype_stream,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        prototype_weight=3.0,
    )
    profile_only = neutral_prototype_rrf(
        profile_ranking,
        partial_stream,
        topic_ids,
        constant=20,
        profile_weight=1.0,
        prototype_weight=0.0,
    )

    zero_ids = set(topic_ids) - set(seen_ids)
    partial_zero_order_15 = _relative_order(partial_15, zero_ids)
    partial_zero_order_30 = _relative_order(partial_30, zero_ids)
    profile_zero_order = _relative_order(profile_ranking, zero_ids)

    logical_profile = ["obs.a", "zero.one", "zero.two", "obs.b", "zero.three", "zero.four"]
    logical_prototype = ["obs.b", "obs.a"]
    renamed_profile = ["obs.a", "renamed.z", "renamed.a", "obs.b", "renamed.m", "renamed.b"]
    renamed_prototype = ["obs.b", "obs.a"]
    logical_fused = neutral_prototype_rrf(
        logical_profile,
        logical_prototype,
        logical_profile,
        constant=20,
        profile_weight=1.0,
        prototype_weight=3.0,
    )
    renamed_fused = neutral_prototype_rrf(
        renamed_profile,
        renamed_prototype,
        renamed_profile,
        constant=20,
        profile_weight=1.0,
        prototype_weight=3.0,
    )
    logical_zero_indices = [1, 2, 4, 5]
    logical_zero_positions = [
        logical_fused.index(logical_profile[index]) for index in logical_zero_indices
    ]
    renamed_zero_positions = [
        renamed_fused.index(renamed_profile[index]) for index in logical_zero_indices
    ]

    partial_stream_exact_observed_set = set(partial_stream) == set(seen_ids)
    target_absent_from_prototype_stream = target not in set(partial_stream)
    zero_order_preserved = (
        partial_zero_order_15 == profile_zero_order
        and partial_zero_order_30 == profile_zero_order
    )
    all_none_identity = (
        no_prototype_stream == []
        and all_none_15 == profile_ranking
        and all_none_30 == profile_ranking
    )
    profile_only_identity = profile_only == profile_ranking
    renamed_zero_position_invariant = logical_zero_positions == renamed_zero_positions

    target_positions = {
        "profile": profile_ranking.index(target) + 1,
        "partial_weight_1_5": partial_15.index(target) + 1,
        "partial_weight_3_0": partial_30.index(target) + 1,
        "all_none_weight_1_5": all_none_15.index(target) + 1,
        "all_none_weight_3_0": all_none_30.index(target) + 1,
        "profile_only": profile_only.index(target) + 1,
    }

    passed = all(
        [
            len(topic_ids) == 144,
            len(partial_stream) == len(seen_ids),
            partial_stream_exact_observed_set,
            target_absent_from_prototype_stream,
            zero_order_preserved,
            all_none_identity,
            profile_only_identity,
            renamed_zero_position_invariant,
        ]
    )
    return {
        "pass": passed,
        "numpy_version": np.__version__,
        "topic_count": len(topic_ids),
        "seen_topic_count": len(seen_ids),
        "zero_prototype_count": len(zero_ids),
        "partial_stream_count": len(partial_stream),
        "partial_stream_exact_observed_set": partial_stream_exact_observed_set,
        "target_absent_from_prototype_stream": target_absent_from_prototype_stream,
        "zero_prototype_relative_order_preserved": zero_order_preserved,
        "all_no_prototype_stream_empty": no_prototype_stream == [],
        "all_no_prototype_fused_equals_profile": all_none_identity,
        "profile_weight_only_equals_profile": profile_only_identity,
        "zero_prototype_id_rename_position_invariant": renamed_zero_position_invariant,
        "target_positions": target_positions,
    }


def run_public_verification(root: Path = ROOT) -> dict[str, Any]:
    profiles = load_profiles(root)
    candidate = candidate_verification(profiles)
    prototype = prototype_verification(profiles)
    public_gate_pass = bool(candidate["pass"] and prototype["pass"])
    return {
        "package_id": "SCA03-BOUNDED-ARCHITECTURE-AMENDMENT-v0.1",
        "round": "BAA-01",
        "stage": "PUBLIC_GATE_PASS" if public_gate_pass else "PUBLIC_GATE_FAIL",
        "public_gate_pass": public_gate_pass,
        "candidate_assembly": candidate,
        "missing_evidence_neutral_fusion": prototype,
        "guards": {
            "private_artifact_reads": 0,
            "evaluation_records_read": 0,
            "consumed_lockbox_reads": 0,
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "formal_catalog_mutations": 0,
            "closed_sca03_mutations": 0,
            "sca04_started": False,
        },
        "private_run_authorized": False,
        "sca04_authorized": False,
        "winner_selected_for_private_run": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify BAA-01 public architecture amendment")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = run_public_verification()
    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    print(rendered, end="")
    return 0 if result["public_gate_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
