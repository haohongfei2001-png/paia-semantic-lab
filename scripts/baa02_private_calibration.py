from __future__ import annotations

import argparse
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
from scripts.rem03_private_promotion import _digest, _gate_metrics, _slice_metrics
from scripts.sca03_private_calibration import (
    git_blob_sha,
    matrix_digest,
    prepare_runtime,
    ranking_rows,
)
from semantic_lab.baa01 import (
    assemble_direct_preserving_candidates,
    neutral_prototype_rrf,
    observed_topic_centroid_ranking,
)
from semantic_lab.baa02 import (
    candidate_failures,
    config_matrix,
    load_baa02_config,
    selection_key,
)
from semantic_lab.sca03 import held_out_family_leakage_events


def load_freeze(path: Path, config_path: Path, root: Path) -> dict[str, Any]:
    freeze = json.loads(path.read_text(encoding="utf-8"))
    cfg = load_baa02_config(config_path)
    checks = {
        "config_git_blob_sha": git_blob_sha(config_path),
        "evaluator_git_blob_sha": git_blob_sha(Path(__file__)),
        "baa01_library_git_blob_sha": git_blob_sha(root / "semantic_lab" / "baa01.py"),
        "baa02_library_git_blob_sha": git_blob_sha(root / "semantic_lab" / "baa02.py"),
        "sca03_helper_git_blob_sha": git_blob_sha(root / "scripts" / "sca03_private_calibration.py"),
        "matrix_sha256": matrix_digest(config_matrix(cfg)),
        "profile_manifest_git_blob_sha": git_blob_sha(
            root / "semantic_profiles" / "v0.1" / "manifest.json"
        ),
        "graph_git_blob_sha": git_blob_sha(
            root / "contrastive_graph" / "v0.1" / "graph.json"
        ),
        "suite_manifest_git_blob_sha": git_blob_sha(
            root / "synthetic_contrastive" / "v0.1" / "manifest.json"
        ),
    }
    for key, actual in checks.items():
        if freeze.get(key) != actual:
            raise RuntimeError(f"BAA-02 freeze drift: {key}")
    if freeze.get("round") != "BAA-02":
        raise RuntimeError("BAA-02 freeze round mismatch")
    if freeze.get("state") != "FROZEN_BEFORE_PRIVATE_EVIDENCE":
        raise RuntimeError("BAA-02 freeze state mismatch")
    if freeze.get("private_metrics_opened") is not False:
        raise RuntimeError("BAA-02 freeze already marks private metrics opened")
    if int(freeze.get("calibration_records_read", -1)) != 0:
        raise RuntimeError("BAA-02 freeze calibration read counter is not zero")
    if int(freeze.get("evaluation_records_read", -1)) != 0:
        raise RuntimeError("BAA-02 freeze evaluation read counter is not zero")
    return freeze


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
            i
            for i, case in enumerate(cases)
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
            profile_rank = prepared["profile_rankings"][row["query_variant"]][
                row["profile_mode"]
            ][i]
            prototype_rank = observed_topic_centroid_ranking(
                qvecs[i],
                train_vectors,
                train_cases,
                topic_ids=prepared["topic_ids"],
            )
            direct = neutral_prototype_rrf(
                profile_rank,
                prototype_rank,
                prepared["topic_ids"],
                constant=int(config["fusion"]["constant"]),
                profile_weight=float(config["fusion"]["profile_weight"]),
                prototype_weight=float(row["prototype_weight"]),
            )
            candidate, meta = assemble_direct_preserving_candidates(
                direct,
                prepared["profiles"],
                sibling_cap=int(row["sibling_cap"]),
                limit=int(config["candidate_assembly"]["candidate_limit"]),
            )
            structural_failure_count += len(
                candidate_failures(
                    candidate,
                    direct,
                    prepared["profiles"],
                    meta,
                    sibling_cap=int(row["sibling_cap"]),
                )
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
        raise RuntimeError("BAA-02 OOF ranking incomplete")
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
        failures.append("candidate_structural_invariant")
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
    config = load_baa02_config(args.config)
    load_freeze(args.freeze_receipt, args.config, args.repo_root)
    rows = config_matrix(config)

    by_split, lockbox_ids = load_split_index(args.gold_index)
    calibration_meta = by_split["calibration"]
    calibration_ids = {str(row["calibration_id"]) for row in calibration_meta}
    if calibration_ids & lockbox_ids:
        raise RuntimeError("BAA-02 calibration overlaps consumed SEM-07 lockbox")

    labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    private_context = load_private_context(args.canonical_batch)
    cases = build_cases(calibration_meta, labels, private_context)
    expected = int(config["authorization"]["calibration_read_only_count"])
    if len(cases) != expected:
        raise RuntimeError(f"Expected {expected} calibration cases, got {len(cases)}")

    started = time.perf_counter()
    prepared = prepare_runtime(cases, args.repo_root, config)
    results = [evaluate_config(cases, prepared, row, config) for row in rows]
    elapsed = time.perf_counter() - started

    passing = sorted(
        [result for result in results if result["gate"]["pass"]],
        key=selection_key,
    )
    ordered = sorted(
        results,
        key=lambda result: (
            not result["gate"]["pass"],
            selection_key(result),
        ),
    )
    winner = passing[0] if passing else None
    stage = "BAA02_CALIBRATION_PASS" if winner else "BAA02_CALIBRATION_FAIL"

    public_payload = {
        "round": "BAA-02",
        "stage": stage,
        "matrix_count": len(rows),
        "calibration_case_count": len(cases),
        "assigned_case_count": sum(case["truth_state"] == "ASSIGNED" for case in cases),
        "context_dependent_case_count": sum(
            bool(case["context_dependent"]) for case in cases
        ),
        "config_sha256": sha256_file(args.config),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "matrix_sha256": matrix_digest(rows),
        "selection_policy": config["selection_policy"],
        "passing_config_count": len(passing),
        "results": [public_result(result) for result in ordered],
        "selected_config": winner["config"] if winner else None,
        "selected_metrics": winner["metrics"] if winner else None,
        "future_evaluation_eligible": bool(winner),
        "evaluation_open_permitted": False,
        "next_action": (
            "STOP_AND_REQUEST_SEPARATE_OWNER_AUTHORIZATION_FOR_EVALUATION"
            if winner
            else "STOP_BAA02_FAIL_NO_EVALUATION"
        ),
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
        "private_result_note": (
            "No raw text, refs, families, labels or vectors are copied to Git."
        ),
    }
    write_json(args.private_output, private_payload, private=True)

    gate_receipt = {
        "round": "BAA-02",
        "state": stage,
        "selected_config": winner["config"] if winner else None,
        "selected_config_digest": _digest(winner["config"]) if winner else None,
        "future_evaluation_eligible": bool(winner),
        "evaluation_open_permitted": False,
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
                "stage": stage,
                "matrix_count": len(rows),
                "passing_config_count": len(passing),
                "best_config_id": best["config"]["config_id"],
                "best_recall_at_10": best["metrics"]["overall"]["topic_recall_at_10"],
                "best_recall_at_20": best["metrics"]["overall"]["topic_recall_at_20"],
                "future_evaluation_eligible": bool(winner),
                "evaluation_open_permitted": False,
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            }
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="BAA-02 frozen bounded private family-grouped calibration"
    )
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
