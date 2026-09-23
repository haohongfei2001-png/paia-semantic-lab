from __future__ import annotations

import argparse
import hashlib
import json
import statistics
from pathlib import Path
from typing import Any, Sequence

import yaml

from semantic_lab.baa01 import assemble_direct_preserving_candidates
from semantic_lab.embedding_adapters import HashNgramEmbeddingAdapter
from semantic_lab.rem01 import query_representation
from semantic_lab.sca03 import load_profiles, profile_text

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "configs" / "sca03_post_failure_architecture_diagnostics_v0.1.yaml"


def load_config(path: Path = DEFAULT_CONFIG) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("PAD-01 config must be a mapping")
    if value.get("round") != "PAD-01":
        raise ValueError("PAD-01 config round mismatch")
    if value.get("status") != "ACTIVE_PUBLIC_SYNTHETIC_ONLY":
        raise ValueError("PAD-01 config is not public/synthetic-only")
    if value.get("future_private", {}).get("authorized") is not False:
        raise ValueError("PAD-01 must not authorize future private evidence")
    return value


def load_synthetic_cases(root: Path) -> list[dict[str, Any]]:
    manifest = json.loads(
        (root / "synthetic_contrastive" / "v0.1" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    cases: list[dict[str, Any]] = []
    for shard in manifest["shards"]:
        payload = json.loads((root / shard["path"]).read_text(encoding="utf-8"))
        cases.extend(payload["cases"])
    return cases


def positive_vector_lanes(profile: dict[str, Any]) -> list[str]:
    names = profile["canonical_names"]
    domain = profile["domain"]
    anchors = (
        list(profile["lexical_anchors"]["zh"])
        + list(profile["lexical_anchors"]["en"])
        + list(profile["lexical_anchors"]["mixed"])
    )
    return [
        "\n".join(
            [
                f"Topic: {names['zh']} / {names['en']}",
                f"Domain: {domain['name_zh']} / {domain['name_en']}",
            ]
        ),
        "\n".join(str(value) for value in profile["semantic_core"]),
        "\n".join(str(value) for value in profile["positive_intents"]),
        "Lexical anchors: " + " | ".join(str(value) for value in anchors),
        "\n".join(str(value) for value in profile["synthetic_utterance_patterns"]),
    ]


def concat_positive_text(profile: dict[str, Any]) -> str:
    return "\n".join(positive_vector_lanes(profile))


def _rankings(score_matrix: Any, topic_ids: Sequence[str]) -> list[list[str]]:
    import numpy as np

    scores = np.asarray(score_matrix, dtype="float32")
    order = np.argsort(-scores, axis=1, kind="stable")
    ids = list(topic_ids)
    return [[ids[int(index)] for index in row] for row in order]


def _rank_of(ranking: Sequence[str], expected: str) -> int:
    return list(ranking).index(expected) + 1


def _metrics(
    cases: Sequence[dict[str, Any]],
    rankings: Sequence[Sequence[str]],
    cutoffs: Sequence[int],
) -> dict[str, Any]:
    if len(cases) != len(rankings):
        raise ValueError("cases/rankings length mismatch")

    def summarize(indices: Sequence[int]) -> dict[str, Any]:
        ranks = [
            _rank_of(rankings[index], str(cases[index]["expected_topic_id"]))
            for index in indices
        ]
        row: dict[str, Any] = {
            "case_count": len(indices),
            "mean_expected_rank": (
                sum(ranks) / len(ranks) if ranks else None
            ),
            "median_expected_rank": statistics.median(ranks) if ranks else None,
        }
        for cutoff in cutoffs:
            row[f"hit_at_{cutoff}"] = (
                sum(rank <= cutoff for rank in ranks) / len(ranks) if ranks else None
            )
        return row

    buckets = {
        "all": list(range(len(cases))),
        "positive": [
            index for index, case in enumerate(cases)
            if case["case_type"] == "POSITIVE"
        ],
        "hard_negative": [
            index for index, case in enumerate(cases)
            if case["case_type"] == "HARD_NEGATIVE"
        ],
        "zh": [
            index for index, case in enumerate(cases)
            if case["language"] == "zh"
        ],
        "en": [
            index for index, case in enumerate(cases)
            if case["language"] == "en"
        ],
    }
    return {name: summarize(indices) for name, indices in buckets.items()}


def _candidate_movement(
    cases: Sequence[dict[str, Any]],
    direct: Sequence[Sequence[str]],
    candidate: Sequence[Sequence[str]],
) -> dict[str, Any]:
    movements: dict[str, Any] = {}
    for cutoff in (10, 20):
        lost = 0
        gained = 0
        unchanged_hit = 0
        for case, direct_row, candidate_row in zip(cases, direct, candidate):
            expected = str(case["expected_topic_id"])
            direct_hit = _rank_of(direct_row, expected) <= cutoff
            candidate_hit = _rank_of(candidate_row, expected) <= cutoff
            if direct_hit and not candidate_hit:
                lost += 1
            elif candidate_hit and not direct_hit:
                gained += 1
            elif direct_hit and candidate_hit:
                unchanged_hit += 1
        movements[f"lost_direct_hits_at_{cutoff}"] = lost
        movements[f"gained_hits_at_{cutoff}"] = gained
        movements[f"retained_direct_hits_at_{cutoff}"] = unchanged_hit
    movements["identical_top20_count"] = sum(
        list(left[:20]) == list(right[:20])
        for left, right in zip(direct, candidate)
    )
    return movements


def representation_and_candidate_diagnostic(
    profiles: Sequence[dict[str, Any]],
    cases: Sequence[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    import numpy as np

    dimensions = int(config["control_embedding"]["dimensions"])
    adapter = HashNgramEmbeddingAdapter(dimensions=dimensions)
    topic_ids = [str(profile["topic_id"]) for profile in profiles]
    cutoffs = [int(value) for value in config["cutoffs"]]

    query_vectors = np.asarray(
        adapter.embed([str(case["text"]) for case in cases]),
        dtype="float32",
    )

    full_documents = [profile_text(profile, "full_derived") for profile in profiles]
    positive_documents = [concat_positive_text(profile) for profile in profiles]
    full_vectors = np.asarray(adapter.embed(full_documents), dtype="float32")
    positive_vectors = np.asarray(adapter.embed(positive_documents), dtype="float32")

    lanes = [positive_vector_lanes(profile) for profile in profiles]
    if any(len(row) != 5 for row in lanes):
        raise RuntimeError("PAD-01 positive vector lane count drift")
    flat_lane_vectors = np.asarray(
        adapter.embed([value for row in lanes for value in row]),
        dtype="float32",
    )

    score_matrices = {
        "concat_full_derived": query_vectors @ full_vectors.T,
        "concat_positive_fields": query_vectors @ positive_vectors.T,
        "multivector_positive_max": (
            query_vectors @ flat_lane_vectors.T
        ).reshape(len(cases), len(profiles), 5).max(axis=2),
    }

    direct_rankings = {
        name: _rankings(scores, topic_ids)
        for name, scores in score_matrices.items()
    }

    representation_metrics = {
        name: _metrics(cases, rankings, cutoffs)
        for name, rankings in direct_rankings.items()
    }

    candidate_controls: dict[str, Any] = {}
    for name, rankings in direct_rankings.items():
        cap2: list[list[str]] = []
        cap4: list[list[str]] = []
        for ranking in rankings:
            row2, _ = assemble_direct_preserving_candidates(
                ranking, profiles, sibling_cap=2, limit=144
            )
            row4, _ = assemble_direct_preserving_candidates(
                ranking, profiles, sibling_cap=4, limit=144
            )
            cap2.append(row2)
            cap4.append(row4)

        candidate_controls[name] = {
            "full_catalog_direct": representation_metrics[name],
            "baa01_sibling_cap2": _metrics(cases, cap2, cutoffs),
            "baa01_sibling_cap4": _metrics(cases, cap4, cutoffs),
            "cap2_movement": _candidate_movement(cases, rankings, cap2),
            "cap4_movement": _candidate_movement(cases, rankings, cap4),
        }

    all_metrics = representation_metrics
    exclusion_delta = {
        f"hit_at_{cutoff}": (
            all_metrics["concat_positive_fields"]["all"][f"hit_at_{cutoff}"]
            - all_metrics["concat_full_derived"]["all"][f"hit_at_{cutoff}"]
        )
        for cutoff in cutoffs
    }
    field_separation_delta = {
        f"hit_at_{cutoff}": (
            all_metrics["multivector_positive_max"]["all"][f"hit_at_{cutoff}"]
            - all_metrics["concat_positive_fields"]["all"][f"hit_at_{cutoff}"]
        )
        for cutoff in cutoffs
    }

    return {
        "topic_count": len(profiles),
        "case_count": len(cases),
        "case_type_counts": {
            "positive": sum(case["case_type"] == "POSITIVE" for case in cases),
            "hard_negative": sum(case["case_type"] == "HARD_NEGATIVE" for case in cases),
        },
        "language_counts": {
            "zh": sum(case["language"] == "zh" for case in cases),
            "en": sum(case["language"] == "en" for case in cases),
        },
        "representation_metrics": representation_metrics,
        "candidate_controls": candidate_controls,
        "controlled_deltas": {
            "remove_exclusion_from_positive_concat": exclusion_delta,
            "field_separation_same_positive_content": field_separation_delta,
        },
        "claim_boundary": (
            "HashNgram is a deterministic synthetic architecture control; "
            "these deltas are not BGE/private capability estimates."
        ),
    }


def _context_cases(
    profiles: Sequence[dict[str, Any]],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for profile in profiles:
        topic_id = str(profile["topic_id"])
        names = profile["canonical_names"]
        semantic = "\n".join(str(value) for value in profile["semantic_core"])
        intents = "\n".join(str(value) for value in profile["positive_intents"])
        for language in config["context_probes"]["languages"]:
            current = str(config["context_probes"]["current_text"][language])
            context_text = (
                f"{names['zh']} / {names['en']}\n{semantic}\n{intents}"
            )
            rows.append(
                {
                    "case_id": f"context:{topic_id}:{language}",
                    "expected_topic_id": topic_id,
                    "language": language,
                    "text": current,
                    "allowed_context": {
                        "policy": "pad01-public-synthetic-context",
                        "inputs": [
                            {
                                "input_ref": f"pad01.{topic_id}.{language}",
                                "input_revision": "public-v1",
                                "text": context_text,
                                "direction": "before",
                                "offset": -1,
                            }
                        ],
                    },
                }
            )
    return rows


def context_effect_diagnostic(
    profiles: Sequence[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    import numpy as np

    probes = _context_cases(profiles, config)
    adapter = HashNgramEmbeddingAdapter(
        dimensions=int(config["control_embedding"]["dimensions"])
    )
    topic_ids = [str(profile["topic_id"]) for profile in profiles]
    pseudo_cases = [
        {
            "expected_topic_id": row["expected_topic_id"],
            "case_type": "CONTEXT_PROBE",
            "language": row["language"],
        }
        for row in probes
    ]
    cutoffs = [int(value) for value in config["cutoffs"]]

    current_texts = [
        query_representation(row, "current_only")
        for row in probes
    ]
    allowed_texts = [
        query_representation(row, "allowed_context")
        for row in probes
    ]
    current_vectors = np.asarray(adapter.embed(current_texts), dtype="float32")
    allowed_vectors = np.asarray(adapter.embed(allowed_texts), dtype="float32")

    full_vectors = np.asarray(
        adapter.embed([profile_text(profile, "full_derived") for profile in profiles]),
        dtype="float32",
    )
    positive_vectors = np.asarray(
        adapter.embed([concat_positive_text(profile) for profile in profiles]),
        dtype="float32",
    )
    lanes = [positive_vector_lanes(profile) for profile in profiles]
    flat_lane_vectors = np.asarray(
        adapter.embed([value for row in lanes for value in row]),
        dtype="float32",
    )

    representations: dict[str, tuple[Any, Any]] = {
        "concat_full_derived": (
            current_vectors @ full_vectors.T,
            allowed_vectors @ full_vectors.T,
        ),
        "concat_positive_fields": (
            current_vectors @ positive_vectors.T,
            allowed_vectors @ positive_vectors.T,
        ),
        "multivector_positive_max": (
            (current_vectors @ flat_lane_vectors.T)
            .reshape(len(probes), len(profiles), 5)
            .max(axis=2),
            (allowed_vectors @ flat_lane_vectors.T)
            .reshape(len(probes), len(profiles), 5)
            .max(axis=2),
        ),
    }

    per_representation: dict[str, Any] = {}
    for name, (current_scores, allowed_scores) in representations.items():
        current_rankings = _rankings(current_scores, topic_ids)
        allowed_rankings = _rankings(allowed_scores, topic_ids)

        current_cap2: list[list[str]] = []
        allowed_cap2: list[list[str]] = []
        current_cap4: list[list[str]] = []
        allowed_cap4: list[list[str]] = []
        for current_ranking, allowed_ranking in zip(current_rankings, allowed_rankings):
            c2, _ = assemble_direct_preserving_candidates(
                current_ranking, profiles, sibling_cap=2, limit=144
            )
            a2, _ = assemble_direct_preserving_candidates(
                allowed_ranking, profiles, sibling_cap=2, limit=144
            )
            c4, _ = assemble_direct_preserving_candidates(
                current_ranking, profiles, sibling_cap=4, limit=144
            )
            a4, _ = assemble_direct_preserving_candidates(
                allowed_ranking, profiles, sibling_cap=4, limit=144
            )
            current_cap2.append(c2)
            allowed_cap2.append(a2)
            current_cap4.append(c4)
            allowed_cap4.append(a4)

        improvements = []
        for case, current_ranking, allowed_ranking in zip(
            pseudo_cases, current_rankings, allowed_rankings
        ):
            expected = str(case["expected_topic_id"])
            improvements.append(
                _rank_of(current_ranking, expected)
                - _rank_of(allowed_ranking, expected)
            )

        per_representation[name] = {
            "current_full_catalog": _metrics(pseudo_cases, current_rankings, cutoffs),
            "allowed_full_catalog": _metrics(pseudo_cases, allowed_rankings, cutoffs),
            "current_cap2": _metrics(pseudo_cases, current_cap2, cutoffs),
            "allowed_cap2": _metrics(pseudo_cases, allowed_cap2, cutoffs),
            "current_cap4": _metrics(pseudo_cases, current_cap4, cutoffs),
            "allowed_cap4": _metrics(pseudo_cases, allowed_cap4, cutoffs),
            "pair_identical_full_ranking_count": sum(
                left == right
                for left, right in zip(current_rankings, allowed_rankings)
            ),
            "allowed_target_rank_better_count": sum(value > 0 for value in improvements),
            "allowed_target_rank_worse_count": sum(value < 0 for value in improvements),
            "median_target_rank_improvement": statistics.median(improvements),
            "cap2_allowed_movement": _candidate_movement(
                pseudo_cases, allowed_rankings, allowed_cap2
            ),
            "cap4_allowed_movement": _candidate_movement(
                pseudo_cases, allowed_rankings, allowed_cap4
            ),
        }

    vector_cosines = np.sum(current_vectors * allowed_vectors, axis=1)
    return {
        "probe_count": len(probes),
        "topic_count": len(profiles),
        "languages": list(config["context_probes"]["languages"]),
        "text_changed_count": sum(
            current != allowed
            for current, allowed in zip(current_texts, allowed_texts)
        ),
        "embedding_changed_count": int(
            np.sum(vector_cosines < np.float32(0.999999))
        ),
        "min_query_embedding_cosine": float(vector_cosines.min()),
        "max_query_embedding_cosine": float(vector_cosines.max()),
        "per_representation": per_representation,
        "claim_boundary": (
            "This proves only that deterministic public nonempty context can "
            "survive specific pipeline layers. It does not identify the cause "
            "of current_only/allowed_context equality in the closed private run."
        ),
    }


def sanitized_baa02_reference(root: Path) -> dict[str, Any]:
    path = (
        root
        / "artifacts"
        / "bounded-architecture-amendment-v0.1"
        / "BAA-02_CALIBRATION_RESULT.json"
    )
    payload = json.loads(path.read_text(encoding="utf-8"))
    results = payload.get("results", [])
    return {
        "source": str(path.relative_to(root)),
        "stage": payload.get("stage"),
        "matrix_count": payload.get("matrix_count"),
        "calibration_case_count": payload.get("calibration_case_count"),
        "passing_config_count": payload.get("passing_config_count"),
        "highest_public_aggregate_recall_at_10": max(
            float(row["metrics"]["overall"]["topic_recall_at_10"])
            for row in results
        ),
        "highest_public_aggregate_recall_at_20": max(
            float(row["metrics"]["overall"]["topic_recall_at_20"])
            for row in results
        ),
        "raw_private_payload_read": False,
    }


def _digest(payload: dict[str, Any]) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def run_diagnostics(root: Path = ROOT, config_path: Path = DEFAULT_CONFIG) -> dict[str, Any]:
    config = load_config(config_path)
    profiles = load_profiles(root)
    cases = load_synthetic_cases(root)

    architecture = representation_and_candidate_diagnostic(
        profiles, cases, config
    )
    context = context_effect_diagnostic(profiles, config)
    baa02 = sanitized_baa02_reference(root)

    rep = architecture["representation_metrics"]
    candidate = architecture["candidate_controls"]

    signals = {
        "public_control_exclusion_mixing_signal": (
            architecture["controlled_deltas"][
                "remove_exclusion_from_positive_concat"
            ]["hit_at_10"] != 0
            or architecture["controlled_deltas"][
                "remove_exclusion_from_positive_concat"
            ]["hit_at_20"] != 0
        ),
        "public_control_field_separation_signal": (
            architecture["controlled_deltas"][
                "field_separation_same_positive_content"
            ]["hit_at_10"] != 0
            or architecture["controlled_deltas"][
                "field_separation_same_positive_content"
            ]["hit_at_20"] != 0
        ),
        "candidate_stage_changes_topk_signal": any(
            candidate[name]["cap2_movement"]["lost_direct_hits_at_10"] > 0
            or candidate[name]["cap2_movement"]["gained_hits_at_10"] > 0
            or candidate[name]["cap4_movement"]["lost_direct_hits_at_10"] > 0
            or candidate[name]["cap4_movement"]["gained_hits_at_10"] > 0
            for name in candidate
        ),
        "public_control_upstream_error_present": (
            max(
                float(rep[name]["all"]["hit_at_20"])
                for name in rep
            ) < 1.0
        ),
        "context_changes_every_rendered_query": (
            context["text_changed_count"] == context["probe_count"]
        ),
        "context_changes_every_control_embedding": (
            context["embedding_changed_count"] == context["probe_count"]
        ),
        "context_full_ranking_change_observed": any(
            context["per_representation"][name][
                "pair_identical_full_ranking_count"
            ] < context["probe_count"]
            for name in context["per_representation"]
        ),
    }

    result: dict[str, Any] = {
        "package": "SCA03-POST-FAILURE-ARCHITECTURE-DIAGNOSTICS-v0.1",
        "round": "PAD-01",
        "stage": "PUBLIC_SYNTHETIC_ARCHITECTURE_DECOMPOSITION",
        "evidence_class": "PUBLIC_SYNTHETIC_ONLY",
        "source_failure_reference": baa02,
        "architecture_decomposition": architecture,
        "context_effect_decomposition": context,
        "signals": signals,
        "guards": {
            "private_artifact_reads": 0,
            "evaluation_records_read": 0,
            "consumed_lockbox_reads": 0,
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "model_training_runs": 0,
            "formal_catalog_writes": 0,
            "production_paia_writes": 0,
            "sca04_started": False,
        },
        "diagnostic_pass": (
            architecture["topic_count"] == 144
            and architecture["case_count"] == 1296
            and context["probe_count"] == 288
            and context["text_changed_count"] == 288
            and context["embedding_changed_count"] == 288
        ),
        "claim_boundary": (
            "PAD-01 decomposes architecture with deterministic public/synthetic "
            "controls only. It does not estimate private BGE recall, select a "
            "private configuration, or authorize another private run."
        ),
    }
    result["result_digest"] = _digest(result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run PAD-01 public/synthetic architecture decomposition"
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    result = run_diagnostics(config_path=args.config)
    summary = {
        "diagnostic_pass": result["diagnostic_pass"],
        "result_digest": result["result_digest"],
        "representation_hit_at_10": {
            name: row["all"]["hit_at_10"]
            for name, row in result["architecture_decomposition"][
                "representation_metrics"
            ].items()
        },
        "representation_hit_at_20": {
            name: row["all"]["hit_at_20"]
            for name, row in result["architecture_decomposition"][
                "representation_metrics"
            ].items()
        },
        "signals": result["signals"],
        "context_probe_count": result["context_effect_decomposition"]["probe_count"],
    }
    print("PAD01_SUMMARY " + json.dumps(summary, sort_keys=True))

    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    return 0 if result["diagnostic_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
