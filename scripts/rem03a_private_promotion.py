from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path
from typing import Any, Sequence

from scripts.rem02_private_promotion import (
    build_cases,
    load_labels_allowlisted,
    load_private_context,
    load_split_index,
    sha256_file,
    write_json,
)
from scripts.rem03_private_promotion import (
    _chunk_dense_ranking,
    _dense_rankings,
    _digest,
    _encode,
    _gate_metrics,
    _rss_bytes,
    _slice_metrics,
    _token_count,
    load_model,
)
from semantic_lab.catalog import load_catalog, validate_catalog_contract
from semantic_lab.embedding_adapters import apply_prompt
from semantic_lab.rem01 import query_representation, topic_descriptor_variant
from semantic_lab.rem03 import (
    assemble_remediated_candidates,
    lexical_alias_ranking,
    lexical_descriptor_ranking,
    load_rem03_config,
)
from semantic_lab.rem03a import (
    config_matrix,
    fold_indices,
    held_out_family_leakage_events,
    load_rem03a_config,
    prototype_ranking,
    weighted_rrf_fuse,
)
from semantic_lab.sem01 import TASK_INSTRUCTION
from semantic_lab.sem03 import eligible_topics
from semantic_lab.sem07 import candidate_metrics


def _matrix_digest(rows: Sequence[dict[str, Any]]) -> str:
    return hashlib.sha256(
        json.dumps(list(rows), sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def _load_freeze(path: Path, config_path: Path) -> dict[str, Any]:
    freeze = json.loads(path.read_text(encoding="utf-8"))
    code_hash = sha256_file(Path(__file__))
    config_hash = sha256_file(config_path)
    matrix_hash = _matrix_digest(config_matrix(load_rem03a_config(config_path)))
    if freeze.get("evaluator_sha256") != code_hash:
        raise RuntimeError("REM-03A evaluator drifted after freeze")
    if freeze.get("config_sha256") != config_hash:
        raise RuntimeError("REM-03A config drifted after freeze")
    if freeze.get("matrix_sha256") != matrix_hash:
        raise RuntimeError("REM-03A matrix drifted after freeze")
    return freeze


def _prepare_runtime(
    cases: Sequence[dict[str, Any]],
) -> tuple[Any, Any, list[dict[str, Any]], list[str], dict[str, Any]]:
    import numpy as np

    base_config = load_rem03_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    topic_ids = [str(topic["topic_id"]) for topic in topics]
    model, spec, runtime = load_model()

    docs_full_raw = [topic_descriptor_variant(topic, "full_boundaries") for topic in topics]
    docs_name_raw = [topic_descriptor_variant(topic, "names_aliases") for topic in topics]
    docs_full = [apply_prompt(spec, "document", text, TASK_INSTRUCTION) for text in docs_full_raw]
    docs_name = [apply_prompt(spec, "document", text, TASK_INSTRUCTION) for text in docs_name_raw]

    query_raw: dict[str, list[str]] = {}
    query_prepared: dict[str, list[str]] = {}
    for variant in ("current_only", "allowed_context"):
        query_raw[variant] = [query_representation(case, variant) for case in cases]
        query_prepared[variant] = [
            apply_prompt(spec, "query", text, TASK_INSTRUCTION)
            for text in query_raw[variant]
        ]

    declared = int(spec.context_tokens or 0)
    runtime_limit = int(getattr(model, "max_seq_length", declared) or declared)
    effective_limit = min(declared, runtime_limit) if runtime_limit else declared
    max_tokens = 0
    for value in docs_full + docs_name + query_prepared["current_only"] + query_prepared["allowed_context"]:
        max_tokens = max(max_tokens, _token_count(model, value))
    if max_tokens > effective_limit:
        raise RuntimeError(
            f"REM-03A input exceeds context: {max_tokens}>{effective_limit}; silent truncation forbidden"
        )

    started = time.perf_counter()
    full_vectors = _encode(model, docs_full)
    name_vectors = _encode(model, docs_name)
    document_encode_seconds = time.perf_counter() - started

    started = time.perf_counter()
    query_vectors = {
        variant: _encode(model, prepared)
        for variant, prepared in query_prepared.items()
    }
    query_encode_seconds = time.perf_counter() - started

    dense = {
        "full_current": _dense_rankings(query_vectors["current_only"], full_vectors, topic_ids),
        "names_current": _dense_rankings(query_vectors["current_only"], name_vectors, topic_ids),
        "full_allowed": _dense_rankings(query_vectors["allowed_context"], full_vectors, topic_ids),
        "names_allowed": _dense_rankings(query_vectors["allowed_context"], name_vectors, topic_ids),
    }

    base_orders: list[list[str]] = []
    chunk_trigger = int(base_config["representation"]["long_query_chunking"]["trigger_codepoints"])
    for i, case in enumerate(cases):
        current = query_raw["current_only"][i]
        allowed = query_raw["allowed_context"][i]
        sources: dict[str, list[str]] = {
            "dense_full_current": dense["full_current"][i],
            "dense_names_current": dense["names_current"][i],
            "lexical_alias_current": lexical_alias_ranking(current, topics),
            "lexical_descriptor_current": lexical_descriptor_ranking(current, topics),
        }
        policy_query = current
        if allowed != current:
            policy_query = allowed
            sources.update(
                {
                    "dense_full_context": dense["full_allowed"][i],
                    "dense_names_context": dense["names_allowed"][i],
                    "lexical_alias_context": lexical_alias_ranking(allowed, topics),
                    "lexical_descriptor_context": lexical_descriptor_ranking(allowed, topics),
                }
            )
        if (
            bool(base_config["representation"]["long_query_chunking"].get("enabled"))
            and len(policy_query) >= chunk_trigger
        ):
            sources["dense_chunk_max"] = _chunk_dense_ranking(
                model, spec, policy_query, full_vectors, topic_ids, base_config
            )
        candidates = assemble_remediated_candidates(
            query=policy_query,
            topics=topics,
            source_rankings=sources,
            profile=None,
            config=base_config,
        )
        base_orders.append([str(row["topic_id"]) for row in candidates])

    runtime.update(
        {
            "effective_context_tokens": effective_limit,
            "max_input_tokens": max_tokens,
            "document_encode_seconds": document_encode_seconds,
            "query_encode_seconds": query_encode_seconds,
            "peak_rss_bytes": _rss_bytes(),
            "embedding_dimensions": int(np.asarray(full_vectors).shape[1]),
        }
    )
    return model, spec, topics, topic_ids, {
        "query_vectors": query_vectors,
        "base_orders": base_orders,
        "runtime": runtime,
    }


def _ranking_rows(
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


def _evaluate_oof_config(
    cases: Sequence[dict[str, Any]],
    *,
    topic_ids: Sequence[str],
    base_orders: Sequence[Sequence[str]],
    query_vectors: dict[str, Any],
    row: dict[str, Any],
    fold_count: int,
) -> dict[str, Any]:
    folds = fold_indices(cases, fold_count)
    rankings: list[list[str] | None] = [None] * len(cases)
    leakage_events = 0
    fold_public: list[dict[str, Any]] = []

    for fold_number, test_idx in enumerate(folds):
        if not test_idx:
            continue
        test_set = set(test_idx)
        train_idx = [i for i in range(len(cases)) if i not in test_set]
        train_cases = [cases[i] for i in train_idx]
        test_cases = [cases[i] for i in test_idx]
        leakage_events += held_out_family_leakage_events(train_cases, test_cases)
        train_vectors = query_vectors[row["query_variant"]][train_idx]

        for i in test_idx:
            proto = prototype_ranking(
                query_vectors[row["query_variant"]][i],
                train_vectors,
                train_cases,
                strategy=row["prototype_strategy"],
            )
            rankings[i] = weighted_rrf_fuse(
                base_orders[i],
                proto,
                topic_ids,
                constant=int(row["rrf_constant"]),
                base_weight=float(row["base_weight"]),
                prototype_weight=float(row["prototype_weight"]),
                limit=int(row["candidate_limit"]),
            )

        fold_rows = _ranking_rows(test_cases, [rankings[i] for i in test_idx])
        m10 = candidate_metrics(fold_rows)
        fold_public.append(
            {
                "fold": fold_number,
                "case_count": len(test_cases),
                "family_count": len({str(case["family_ref"]) for case in test_cases}),
                "assigned_cases": m10["assigned_cases"],
                "topic_recall_at_10": m10["topic_recall_at_10"],
                "topic_recall_at_20": m10["topic_recall_at_20"],
            }
        )

    if any(ranking is None for ranking in rankings):
        raise RuntimeError("Family-grouped OOF ranking incomplete")
    final_rankings = [list(ranking) for ranking in rankings if ranking is not None]
    evidence_rows = _ranking_rows(cases, final_rankings)
    metrics = _slice_metrics(evidence_rows)
    gate = _gate_metrics(metrics, {
        "recall_at_10_min": load_rem03a_config()["promotion_gate"]["candidate_recall_at_10_min"],
        "recall_at_20_min": load_rem03a_config()["promotion_gate"]["candidate_recall_at_20_min"],
    })
    if leakage_events:
        gate["pass"] = False
        gate["failures"] = list(gate["failures"]) + ["held_out_family_leakage"]
    return {
        "config": dict(row),
        "metrics": metrics,
        "gate": gate,
        "held_out_family_leakage_events": leakage_events,
        "folds": fold_public,
        "ranking_digest": _digest(final_rankings),
    }


def _selection_key(result: dict[str, Any]) -> tuple[Any, ...]:
    overall = result["metrics"]["overall"]
    return (
        -float(overall["topic_recall_at_10"]),
        -float(overall["topic_recall_at_20"]),
        str(result["config"]["config_id"]),
    )


def _public_result(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "config": result["config"],
        "metrics": result["metrics"],
        "gate": result["gate"],
        "held_out_family_leakage_events": result["held_out_family_leakage_events"],
        "folds": result["folds"],
        "ranking_digest": result["ranking_digest"],
    }


def calibration_stage(args: argparse.Namespace) -> int:
    config = load_rem03a_config(args.config)
    freeze = _load_freeze(args.freeze_receipt, args.config)
    rows = config_matrix(config)

    by_split, lockbox_ids = load_split_index(args.gold_index)
    calibration_meta = by_split["calibration"]
    calibration_ids = {str(row["calibration_id"]) for row in calibration_meta}
    if calibration_ids & lockbox_ids:
        raise RuntimeError("Calibration allowlist overlaps consumed SEM-07 lockbox")

    labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    private_context = load_private_context(args.canonical_batch)
    cases = build_cases(calibration_meta, labels, private_context)
    if len(cases) != 80:
        raise RuntimeError(f"Expected 80 calibration cases, got {len(cases)}")

    started = time.perf_counter()
    _, _, _, topic_ids, prepared = _prepare_runtime(cases)
    results = [
        _evaluate_oof_config(
            cases,
            topic_ids=topic_ids,
            base_orders=prepared["base_orders"],
            query_vectors=prepared["query_vectors"],
            row=row,
            fold_count=int(config["development"]["fold_count"]),
        )
        for row in rows
    ]
    elapsed = time.perf_counter() - started
    passing = sorted([result for result in results if result["gate"]["pass"]], key=_selection_key)
    winner = passing[0] if passing else None

    public_payload = {
        "round": "REM-03A",
        "stage": "CALIBRATION_PASS" if winner else "CALIBRATION_FAIL",
        "config_sha256": sha256_file(args.config),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "matrix_sha256": _matrix_digest(rows),
        "matrix_count": len(rows),
        "calibration_case_count": len(cases),
        "assigned_case_count": sum(case["truth_state"] == "ASSIGNED" for case in cases),
        "context_dependent_case_count": sum(bool(case["context_dependent"]) for case in cases),
        "results": [_public_result(result) for result in sorted(results, key=_selection_key)],
        "selected_config": winner["config"] if winner else None,
        "selected_metrics": winner["metrics"] if winner else None,
        "evaluation_open_permitted": bool(winner),
        "guards": {
            "held_out_family_leakage_events": sum(
                int(result["held_out_family_leakage_events"]) for result in results
            ),
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_lockbox_tuning_events": 0,
        },
        "runtime": {**prepared["runtime"], "elapsed_seconds": elapsed},
    }
    public_payload["result_digest"] = _digest(public_payload)
    write_json(args.public_output, public_payload)

    private_payload = {
        **public_payload,
        "private_case_count": len(cases),
        "private_result_note": "No raw text, refs, labels, families or vectors are copied to Git.",
    }
    write_json(args.private_output, private_payload, private=True)

    frozen_payload = {
        "round": "REM-03A",
        "state": "CALIBRATION_PASS" if winner else "CALIBRATION_FAIL",
        "config_sha256": sha256_file(args.config),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "matrix_sha256": _matrix_digest(rows),
        "selected_config": winner["config"] if winner else None,
        "selected_config_digest": _digest(winner["config"]) if winner else None,
        "evaluation_open_permitted": bool(winner),
        "evaluation_reads_consumed": 0,
        "calibration_public_sha256": sha256_file(args.public_output),
        "calibration_private_sha256": sha256_file(args.private_output),
        "result_digest": public_payload["result_digest"],
    }
    write_json(args.gate_receipt, frozen_payload, private=True)

    print(json.dumps({
        "stage": public_payload["stage"],
        "matrix_count": len(rows),
        "passing_config_count": len(passing),
        "selected_config_id": winner["config"]["config_id"] if winner else None,
        "selected_recall_at_10": (
            winner["metrics"]["overall"]["topic_recall_at_10"] if winner else None
        ),
        "selected_recall_at_20": (
            winner["metrics"]["overall"]["topic_recall_at_20"] if winner else None
        ),
        "evaluation_open_permitted": bool(winner),
        "result_digest": public_payload["result_digest"],
        "elapsed_seconds": elapsed,
    }))
    return 0


def _evaluate_frozen_on_evaluation(
    calibration_cases: Sequence[dict[str, Any]],
    evaluation_cases: Sequence[dict[str, Any]],
    selected: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    combined = list(calibration_cases) + list(evaluation_cases)
    _, _, _, topic_ids, prepared = _prepare_runtime(combined)
    n_cal = len(calibration_cases)
    train_vectors = prepared["query_vectors"][selected["query_variant"]][:n_cal]
    eval_vectors = prepared["query_vectors"][selected["query_variant"]][n_cal:]
    eval_base = prepared["base_orders"][n_cal:]

    rankings: list[list[str]] = []
    for vector, base_order in zip(eval_vectors, eval_base):
        proto = prototype_ranking(
            vector,
            train_vectors,
            calibration_cases,
            strategy=selected["prototype_strategy"],
        )
        rankings.append(
            weighted_rrf_fuse(
                base_order,
                proto,
                topic_ids,
                constant=int(selected["rrf_constant"]),
                base_weight=float(selected["base_weight"]),
                prototype_weight=float(selected["prototype_weight"]),
                limit=int(selected["candidate_limit"]),
            )
        )
    evidence_rows = _ranking_rows(evaluation_cases, rankings)
    metrics = _slice_metrics(evidence_rows)
    gate_cfg = load_rem03a_config()["promotion_gate"]
    gate = _gate_metrics(metrics, {
        "recall_at_10_min": gate_cfg["candidate_recall_at_10_min"],
        "recall_at_20_min": gate_cfg["candidate_recall_at_20_min"],
    })
    return {
        "case_count": len(evaluation_cases),
        "assigned_cases": metrics["overall"]["assigned_cases"],
        "metrics": metrics,
        "gate": gate,
        "ranking_digest": _digest(rankings),
    }, prepared["runtime"]


def evaluation_stage(args: argparse.Namespace) -> int:
    config = load_rem03a_config(args.config)
    _load_freeze(args.freeze_receipt, args.config)
    gate_receipt = json.loads(args.gate_receipt.read_text(encoding="utf-8"))
    if gate_receipt.get("state") != "CALIBRATION_PASS":
        raise RuntimeError("Evaluation forbidden: REM-03A calibration gate did not pass")
    if gate_receipt.get("evaluation_open_permitted") is not True:
        raise RuntimeError("Evaluation forbidden by frozen calibration receipt")
    selected = gate_receipt.get("selected_config")
    if not isinstance(selected, dict):
        raise RuntimeError("Frozen selected config missing")

    if args.consumption_marker.exists():
        marker = json.loads(args.consumption_marker.read_text(encoding="utf-8"))
        if marker.get("state") == "CONSUMED":
            print(json.dumps({
                "stage": "EVALUATION_ALREADY_CONSUMED_NO_REREAD",
                "result_digest": marker.get("result_digest"),
            }))
            return 0
        raise RuntimeError("Evaluation marker exists in non-consumed state")

    marker = {
        "round": "REM-03A",
        "state": "STARTED",
        "selected_config_digest": _digest(selected),
        "evaluation_read_budget": 1,
        "evaluation_reads_consumed": 1,
    }
    write_json(args.consumption_marker, marker, private=True)

    by_split, lockbox_ids = load_split_index(args.gold_index)
    calibration_meta = by_split["calibration"]
    evaluation_meta = by_split["evaluation"]
    calibration_ids = {str(row["calibration_id"]) for row in calibration_meta}
    evaluation_ids = {str(row["calibration_id"]) for row in evaluation_meta}
    if calibration_ids & lockbox_ids or evaluation_ids & lockbox_ids:
        raise RuntimeError("Legacy promotion allowlist overlaps consumed SEM-07 lockbox")

    calibration_labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    evaluation_labels = load_labels_allowlisted(args.calibration_records, evaluation_ids)
    private_context = load_private_context(args.canonical_batch)
    calibration_cases = build_cases(calibration_meta, calibration_labels, private_context)
    evaluation_cases = build_cases(evaluation_meta, evaluation_labels, private_context)
    if len(calibration_cases) != 80 or len(evaluation_cases) != 13:
        raise RuntimeError("Unexpected REM-03A legacy split count")

    started = time.perf_counter()
    evidence, runtime = _evaluate_frozen_on_evaluation(
        calibration_cases, evaluation_cases, selected
    )
    elapsed = time.perf_counter() - started
    runtime["elapsed_seconds"] = elapsed

    public_payload = {
        "round": "REM-03A",
        "stage": "BOUNDED_EVALUATION_PASS" if evidence["gate"]["pass"] else "BOUNDED_EVALUATION_FAIL",
        "selected_config": selected,
        "selected_config_digest": _digest(selected),
        "evaluation_case_count": len(evaluation_cases),
        "assigned_case_count": evidence["assigned_cases"],
        "metrics": evidence["metrics"],
        "gate": evidence["gate"],
        "ranking_digest": evidence["ranking_digest"],
        "evaluation_reads_consumed": 1,
        "guards": {
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_lockbox_tuning_events": 0,
            "post_evaluation_reselection_events": 0,
            "post_evaluation_threshold_changes": 0,
        },
        "runtime": runtime,
    }
    public_payload["result_digest"] = _digest(public_payload)
    write_json(args.public_output, public_payload)
    write_json(args.private_output, public_payload, private=True)

    marker = {
        **marker,
        "state": "CONSUMED",
        "public_output_sha256": sha256_file(args.public_output),
        "private_output_sha256": sha256_file(args.private_output),
        "result_digest": public_payload["result_digest"],
    }
    write_json(args.consumption_marker, marker, private=True)

    print(json.dumps({
        "stage": public_payload["stage"],
        "recall_at_10": evidence["metrics"]["overall"]["topic_recall_at_10"],
        "recall_at_20": evidence["metrics"]["overall"]["topic_recall_at_20"],
        "critical_slices_pass": evidence["gate"]["critical_slices_pass"],
        "result_digest": public_payload["result_digest"],
        "elapsed_seconds": elapsed,
    }))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="REM-03A private calibration-prototype promotion")
    parser.add_argument("--stage", choices=("calibration", "evaluation"), required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--freeze-receipt", type=Path, required=True)
    parser.add_argument("--gold-index", type=Path, required=True)
    parser.add_argument("--calibration-records", type=Path, required=True)
    parser.add_argument("--canonical-batch", type=Path, required=True)
    parser.add_argument("--private-output", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    parser.add_argument("--gate-receipt", type=Path, required=True)
    parser.add_argument("--consumption-marker", type=Path)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.stage == "calibration":
        return calibration_stage(args)
    if args.consumption_marker is None:
        parser.error("--consumption-marker is required for evaluation")
    return evaluation_stage(args)


if __name__ == "__main__":
    raise SystemExit(main())
