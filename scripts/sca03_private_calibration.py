from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path
from typing import Any, Sequence

from scripts.rem02_private_promotion import (
    build_cases,
    fold_id,
    load_labels_allowlisted,
    load_private_context,
    load_split_index,
    sha256_file,
    write_json,
)
from scripts.rem03_private_promotion import (
    _dense_rankings,
    _digest,
    _encode,
    _gate_metrics,
    _rss_bytes,
    _slice_metrics,
    _token_count,
    load_model,
)
from semantic_lab.embedding_adapters import apply_prompt
from semantic_lab.rem01 import query_representation
from semantic_lab.sca03 import (
    assemble_graph_candidates,
    config_matrix,
    graph_structural_failures,
    held_out_family_leakage_events,
    load_profiles,
    load_sca03_config,
    profile_text,
    topic_centroid_ranking,
    weighted_rrf,
)
from semantic_lab.sem01 import TASK_INSTRUCTION


def matrix_digest(rows: Sequence[dict[str, Any]]) -> str:
    return hashlib.sha256(
        json.dumps(list(rows), sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    header = f"blob {len(data)}\\0".encode("utf-8")
    return hashlib.sha1(header + data).hexdigest()


def load_freeze(path: Path, config_path: Path, root: Path) -> dict[str, Any]:
    freeze = json.loads(path.read_text(encoding="utf-8"))
    cfg = load_sca03_config(config_path)
    checks = {
        "config_git_blob_sha": git_blob_sha(config_path),
        "evaluator_git_blob_sha": git_blob_sha(Path(__file__)),
        "library_git_blob_sha": git_blob_sha(root / "semantic_lab" / "sca03.py"),
        "matrix_sha256": matrix_digest(config_matrix(cfg)),
        "profile_manifest_git_blob_sha": git_blob_sha(root / "semantic_profiles" / "v0.1" / "manifest.json"),
        "graph_git_blob_sha": git_blob_sha(root / "contrastive_graph" / "v0.1" / "graph.json"),
        "suite_manifest_git_blob_sha": git_blob_sha(root / "synthetic_contrastive" / "v0.1" / "manifest.json"),
    }
    for key, actual in checks.items():
        if freeze.get(key) != actual:
            raise RuntimeError(f"SCA-03 freeze drift: {key}")
    if freeze.get("private_metrics_opened") is not False:
        raise RuntimeError("SCA-03 freeze receipt already marks private metrics opened")
    return freeze


def prepare_runtime(
    cases: Sequence[dict[str, Any]],
    root: Path,
    config: dict[str, Any],
) -> dict[str, Any]:
    import numpy as np

    profiles = load_profiles(root)
    topic_ids = [str(row["topic_id"]) for row in profiles]
    model, spec, runtime = load_model()

    query_raw = {
        variant: [query_representation(case, variant) for case in cases]
        for variant in config["development"]["query_variants"]
    }
    query_prepared = {
        variant: [apply_prompt(spec, "query", text, TASK_INSTRUCTION) for text in values]
        for variant, values in query_raw.items()
    }
    profile_prepared = {
        mode: [
            apply_prompt(spec, "document", profile_text(profile, mode), TASK_INSTRUCTION)
            for profile in profiles
        ]
        for mode in config["development"]["profile_modes"]
    }

    declared = int(spec.context_tokens or 0)
    runtime_limit = int(getattr(model, "max_seq_length", declared) or declared)
    effective_limit = min(declared, runtime_limit) if runtime_limit else declared
    max_tokens = 0
    for values in list(query_prepared.values()) + list(profile_prepared.values()):
        for text in values:
            max_tokens = max(max_tokens, _token_count(model, text))
    if max_tokens > effective_limit:
        raise RuntimeError(f"SCA-03 input exceeds context: {max_tokens}>{effective_limit}")

    started = time.perf_counter()
    query_vectors = {
        variant: _encode(model, values)
        for variant, values in query_prepared.items()
    }
    query_encode_seconds = time.perf_counter() - started

    started = time.perf_counter()
    profile_vectors = {
        mode: _encode(model, values)
        for mode, values in profile_prepared.items()
    }
    profile_encode_seconds = time.perf_counter() - started

    profile_rankings = {
        variant: {
            mode: _dense_rankings(query_vectors[variant], profile_vectors[mode], topic_ids)
            for mode in config["development"]["profile_modes"]
        }
        for variant in config["development"]["query_variants"]
    }

    runtime.update(
        {
            "effective_context_tokens": effective_limit,
            "max_input_tokens": max_tokens,
            "query_encode_seconds": query_encode_seconds,
            "profile_encode_seconds": profile_encode_seconds,
            "embedding_dimensions": int(np.asarray(query_vectors["current_only"]).shape[1]),
            "peak_rss_bytes": _rss_bytes(),
        }
    )
    return {
        "profiles": profiles,
        "topic_ids": topic_ids,
        "query_vectors": query_vectors,
        "profile_rankings": profile_rankings,
        "runtime": runtime,
    }


def ranking_rows(
    cases: Sequence[dict[str, Any]],
    rankings: Sequence[Sequence[str]],
) -> list[dict[str, Any]]:
    return [
        {
            "truth_state": case["truth_state"],
            "truth_topics": list(case["truth_topics"]),
            "candidate_ids": list(ranking),
            "context_dependent": bool(case["context_dependent"]),
        }
        for case, ranking in zip(cases, rankings)
    ]


def evaluate_config(
    cases: Sequence[dict[str, Any]],
    prepared: dict[str, Any],
    row: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    import numpy as np

    fold_count = int(config["development"]["fold_count"])
    rankings: list[list[str] | None] = [None] * len(cases)
    leakage_events = 0
    structural_failure_count = 0
    fold_public: list[dict[str, Any]] = []

    for fold in range(fold_count):
        test_idx = [
            i for i, case in enumerate(cases)
            if fold_id(str(case["family_ref"]), fold_count) == fold
        ]
        if not test_idx:
            continue
        test_set = set(test_idx)
        train_idx = [i for i in range(len(cases)) if i not in test_set]
        train_cases = [cases[i] for i in train_idx]
        test_cases = [cases[i] for i in test_idx]
        leakage_events += held_out_family_leakage_events(train_cases, test_cases)

        qvecs = prepared["query_vectors"][row["query_variant"]]
        train_vectors = np.asarray(qvecs, dtype="float32")[train_idx]
        fold_rankings: list[list[str]] = []

        for i in test_idx:
            profile_rank = prepared["profile_rankings"][row["query_variant"]][row["profile_mode"]][i]
            centroid_rank = topic_centroid_ranking(
                qvecs[i],
                train_vectors,
                train_cases,
                prepared["topic_ids"],
            )
            direct = weighted_rrf(
                profile_rank,
                centroid_rank,
                prepared["topic_ids"],
                constant=int(config["fusion"]["constant"]),
                profile_weight=float(config["fusion"]["profile_weight"]),
                calibration_weight=float(row["calibration_weight"]),
            )
            candidate, meta = assemble_graph_candidates(
                direct,
                prepared["profiles"],
                limit=int(config["graph_safety_lane"]["candidate_limit"]),
            )
            structural_failure_count += len(
                graph_structural_failures(candidate, meta, prepared["profiles"])
            )
            rankings[i] = candidate
            fold_rankings.append(candidate)

        fold_metrics = _slice_metrics(ranking_rows(test_cases, fold_rankings))
        fold_public.append(
            {
                "fold": fold,
                "case_count": len(test_cases),
                "family_count": len({str(case["family_ref"]) for case in test_cases}),
                "assigned_cases": fold_metrics["overall"]["assigned_cases"],
                "topic_recall_at_10": fold_metrics["overall"]["topic_recall_at_10"],
                "topic_recall_at_20": fold_metrics["overall"]["topic_recall_at_20"],
            }
        )

    if any(value is None for value in rankings):
        raise RuntimeError("SCA-03 OOF ranking incomplete")
    final_rankings = [list(value) for value in rankings if value is not None]
    metrics = _slice_metrics(ranking_rows(cases, final_rankings))
    gate = _gate_metrics(
        metrics,
        {
            "recall_at_10_min": config["promotion_gate"]["candidate_recall_at_10_min"],
            "recall_at_20_min": config["promotion_gate"]["candidate_recall_at_20_min"],
        },
    )
    failures = list(gate["failures"])
    if leakage_events:
        failures.append("held_out_family_leakage")
    if structural_failure_count:
        failures.append("graph_structural_invariant")
    gate["failures"] = failures
    gate["pass"] = not failures
    gate["leakage_pass"] = leakage_events == 0
    gate["structural_pass"] = structural_failure_count == 0
    return {
        "config": dict(row),
        "metrics": metrics,
        "gate": gate,
        "held_out_family_leakage_events": leakage_events,
        "structural_failure_count": structural_failure_count,
        "folds": fold_public,
        "ranking_digest": _digest(final_rankings),
    }


def selection_key(result: dict[str, Any]) -> tuple[Any, ...]:
    overall = result["metrics"]["overall"]
    return (
        -float(overall["topic_recall_at_10"]),
        -float(overall["topic_recall_at_20"]),
        str(result["config"]["config_id"]),
    )


def public_result(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "config": result["config"],
        "metrics": result["metrics"],
        "gate": result["gate"],
        "held_out_family_leakage_events": result["held_out_family_leakage_events"],
        "structural_failure_count": result["structural_failure_count"],
        "folds": result["folds"],
        "ranking_digest": result["ranking_digest"],
    }


def calibration_stage(args: argparse.Namespace) -> int:
    config = load_sca03_config(args.config)
    load_freeze(args.freeze_receipt, args.config, args.repo_root)
    rows = config_matrix(config)

    by_split, lockbox_ids = load_split_index(args.gold_index)
    calibration_meta = by_split["calibration"]
    calibration_ids = {str(row["calibration_id"]) for row in calibration_meta}
    if calibration_ids & lockbox_ids:
        raise RuntimeError("SCA-03 calibration overlaps consumed SEM-07 lockbox")

    labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    private_context = load_private_context(args.canonical_batch)
    cases = build_cases(calibration_meta, labels, private_context)
    if len(cases) != 80:
        raise RuntimeError(f"Expected 80 calibration cases, got {len(cases)}")

    started = time.perf_counter()
    prepared = prepare_runtime(cases, args.repo_root, config)
    results = [
        evaluate_config(cases, prepared, row, config)
        for row in rows
    ]
    elapsed = time.perf_counter() - started
    ordered = sorted(results, key=selection_key)
    passing = [result for result in ordered if result["gate"]["pass"]]
    winner = passing[0] if passing else None

    public_payload = {
        "round": "SCA-03",
        "stage": "CALIBRATION_PASS" if winner else "CALIBRATION_FAIL",
        "matrix_count": len(rows),
        "calibration_case_count": len(cases),
        "assigned_case_count": sum(case["truth_state"] == "ASSIGNED" for case in cases),
        "context_dependent_case_count": sum(bool(case["context_dependent"]) for case in cases),
        "config_sha256": sha256_file(args.config),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "matrix_sha256": matrix_digest(rows),
        "results": [public_result(result) for result in ordered],
        "selected_config": winner["config"] if winner else None,
        "selected_metrics": winner["metrics"] if winner else None,
        "evaluation_open_permitted": bool(winner),
        "guards": {
            "held_out_family_leakage_events": sum(
                int(result["held_out_family_leakage_events"]) for result in results
            ),
            "structural_failure_events": sum(
                int(result["structural_failure_count"]) for result in results
            ),
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "formal_catalog_writes": 0,
            "production_paia_writes": 0,
            "consumed_lockbox_tuning_events": 0,
            "evaluation_records_read": 0,
        },
        "runtime": {**prepared["runtime"], "elapsed_seconds": elapsed},
    }
    public_payload["result_digest"] = _digest(public_payload)
    write_json(args.public_output, public_payload)

    private_payload = {
        **public_payload,
        "private_case_count": len(cases),
        "private_result_note": "No raw text, refs, families, labels or vectors are copied to Git.",
    }
    write_json(args.private_output, private_payload, private=True)

    gate_receipt = {
        "round": "SCA-03",
        "state": "CALIBRATION_PASS" if winner else "CALIBRATION_FAIL",
        "selected_config": winner["config"] if winner else None,
        "selected_config_digest": _digest(winner["config"]) if winner else None,
        "evaluation_open_permitted": bool(winner),
        "evaluation_records_read": 0,
        "config_sha256": sha256_file(args.config),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "matrix_sha256": matrix_digest(rows),
        "calibration_public_sha256": sha256_file(args.public_output),
        "calibration_private_sha256": sha256_file(args.private_output),
        "result_digest": public_payload["result_digest"],
    }
    write_json(args.gate_receipt, gate_receipt, private=True)

    best = ordered[0]
    print(
        json.dumps(
            {
                "stage": public_payload["stage"],
                "matrix_count": len(rows),
                "passing_config_count": len(passing),
                "best_config_id": best["config"]["config_id"],
                "best_recall_at_10": best["metrics"]["overall"]["topic_recall_at_10"],
                "best_recall_at_20": best["metrics"]["overall"]["topic_recall_at_20"],
                "evaluation_open_permitted": bool(winner),
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            }
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SCA-03 private family-grouped calibration")
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--freeze-receipt", type=Path, required=True)
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--gold-index", type=Path, required=True)
    parser.add_argument("--calibration-records", type=Path, required=True)
    parser.add_argument("--canonical-batch", type=Path, required=True)
    parser.add_argument("--private-output", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    parser.add_argument("--gate-receipt", type=Path, required=True)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return calibration_stage(args)


if __name__ == "__main__":
    raise SystemExit(main())
