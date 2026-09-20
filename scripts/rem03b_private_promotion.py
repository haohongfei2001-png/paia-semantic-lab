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
from semantic_lab.rem01 import query_representation
from semantic_lab.rem03a import fold_indices
from semantic_lab.rem03b import (
    anchor_ranking,
    assemble_structured_candidates,
    config_matrix,
    domain_anchor_texts,
    domain_evidence_ranking,
    domain_members,
    held_out_family_leakage_events,
    load_rem03b_config,
    topic_anchor_texts,
    topic_centroid_ranking,
    topic_to_domain,
    weighted_rrf,
)
from semantic_lab.sem01 import TASK_INSTRUCTION
from semantic_lab.sem03 import eligible_topics
from semantic_lab.sem07 import candidate_metrics


def _matrix_digest(rows: Sequence[dict[str, Any]]) -> str:
    return hashlib.sha256(
        json.dumps(list(rows), sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def _load_freeze(path: Path, config_path: Path, repo_root: Path) -> dict[str, Any]:
    freeze = json.loads(path.read_text(encoding="utf-8"))
    cfg = load_rem03b_config(config_path)
    checks = {
        "config_sha256": sha256_file(config_path),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "library_sha256": sha256_file(repo_root / "semantic_lab" / "rem03b.py"),
        "matrix_sha256": _matrix_digest(config_matrix(cfg)),
        "plan_config_sha256": sha256_file(repo_root / cfg["plan"]["plan_config"]),
    }
    for key, value in checks.items():
        if freeze.get(key) != value:
            raise RuntimeError(f"REM-03B freeze drift: {key}")
    return freeze


def _prepare_anchor_map(
    model: Any,
    spec: Any,
    texts_by_id: dict[str, list[str]],
) -> tuple[dict[str, Any], list[str]]:
    import numpy as np

    flat: list[str] = []
    spans: dict[str, tuple[int, int]] = {}
    for item_id, texts in texts_by_id.items():
        start = len(flat)
        flat.extend(
            apply_prompt(spec, "document", text, TASK_INSTRUCTION)
            for text in texts
        )
        spans[item_id] = (start, len(flat))
    vectors = _encode(model, flat)
    result = {
        item_id: np.asarray(vectors[start:end], dtype="float32")
        for item_id, (start, end) in spans.items()
    }
    return result, flat


def _prepare_runtime(cases: Sequence[dict[str, Any]]) -> dict[str, Any]:
    import numpy as np

    cfg = load_rem03b_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    topic_ids = [str(topic["topic_id"]) for topic in topics]
    domains = [dict(row) for row in catalog.get("domains", [])]
    domains_by_id = {str(row["id"]): row for row in domains}
    domain_ids = [str(row["id"]) for row in domains]
    topic_domain_map = topic_to_domain(topics)

    model, spec, runtime = load_model()
    query_raw = {
        variant: [query_representation(case, variant) for case in cases]
        for variant in ("current_only", "allowed_context")
    }
    query_prepared = {
        variant: [
            apply_prompt(spec, "query", text, TASK_INSTRUCTION)
            for text in values
        ]
        for variant, values in query_raw.items()
    }

    topic_anchor_texts_by_mode = {
        mode: {
            str(topic["topic_id"]): topic_anchor_texts(
                topic, domains_by_id, mode=mode
            )
            for topic in topics
        }
        for mode in cfg["development"]["anchor_modes"]
    }
    domain_anchor_texts_by_id = {
        str(domain["id"]): domain_anchor_texts(domain)
        for domain in domains
    }

    declared = int(spec.context_tokens or 0)
    runtime_limit = int(getattr(model, "max_seq_length", declared) or declared)
    effective_limit = min(declared, runtime_limit) if runtime_limit else declared
    max_tokens = 0
    for values in query_prepared.values():
        for value in values:
            max_tokens = max(max_tokens, _token_count(model, value))
    for mode_map in topic_anchor_texts_by_mode.values():
        for texts in mode_map.values():
            for text in texts:
                prepared = apply_prompt(spec, "document", text, TASK_INSTRUCTION)
                max_tokens = max(max_tokens, _token_count(model, prepared))
    for texts in domain_anchor_texts_by_id.values():
        for text in texts:
            prepared = apply_prompt(spec, "document", text, TASK_INSTRUCTION)
            max_tokens = max(max_tokens, _token_count(model, prepared))
    if max_tokens > effective_limit:
        raise RuntimeError(
            f"REM-03B input exceeds context: {max_tokens}>{effective_limit}; silent truncation forbidden"
        )

    started = time.perf_counter()
    query_vectors = {
        variant: _encode(model, prepared)
        for variant, prepared in query_prepared.items()
    }
    query_encode_seconds = time.perf_counter() - started

    started = time.perf_counter()
    topic_anchor_vectors: dict[str, dict[str, Any]] = {}
    topic_anchor_prepared_count = 0
    for mode, texts_by_id in topic_anchor_texts_by_mode.items():
        vectors, prepared = _prepare_anchor_map(model, spec, texts_by_id)
        topic_anchor_vectors[mode] = vectors
        topic_anchor_prepared_count += len(prepared)
    domain_anchor_vectors, domain_anchor_prepared = _prepare_anchor_map(
        model, spec, domain_anchor_texts_by_id
    )
    anchor_encode_seconds = time.perf_counter() - started

    runtime.update(
        {
            "effective_context_tokens": effective_limit,
            "max_input_tokens": max_tokens,
            "query_encode_seconds": query_encode_seconds,
            "anchor_encode_seconds": anchor_encode_seconds,
            "topic_anchor_vector_count": topic_anchor_prepared_count,
            "domain_anchor_vector_count": len(domain_anchor_prepared),
            "embedding_dimensions": int(np.asarray(query_vectors["current_only"]).shape[1]),
            "peak_rss_bytes": _rss_bytes(),
        }
    )
    return {
        "topics": topics,
        "topic_ids": topic_ids,
        "domains": domains,
        "domain_ids": domain_ids,
        "topic_domain_map": topic_domain_map,
        "query_raw": query_raw,
        "query_vectors": query_vectors,
        "topic_anchor_vectors": topic_anchor_vectors,
        "domain_anchor_vectors": domain_anchor_vectors,
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


def _rank_case(
    *,
    case_index: int,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    prepared: dict[str, Any],
    row: dict[str, Any],
    config: dict[str, Any],
) -> tuple[list[str], list[str]]:
    query_variant = str(row["query_variant"])
    query_vector = prepared["query_vectors"][query_variant][case_index]
    topic_ids = prepared["topic_ids"]
    domain_ids = prepared["domain_ids"]

    topic_anchor = anchor_ranking(
        query_vector,
        prepared["topic_anchor_vectors"][str(row["anchor_mode"])],
    )
    topic_centroid = topic_centroid_ranking(
        query_vector,
        train_vectors,
        train_cases,
        topic_ids=topic_ids,
    )
    topic_fusion = config["topic_policy"]["direct_fusion"]
    topic_ranking = weighted_rrf(
        [
            (float(topic_fusion["anchor_weight"]), topic_anchor),
            (float(topic_fusion["topic_centroid_weight"]), topic_centroid),
        ],
        all_ids=topic_ids,
        constant=int(topic_fusion["rrf_constant"]),
    )

    domain_catalog = anchor_ranking(
        query_vector,
        prepared["domain_anchor_vectors"],
    )
    domain_calibration = domain_evidence_ranking(
        query_vector,
        train_vectors,
        train_cases,
        topic_domain_map=prepared["topic_domain_map"],
        domain_ids=domain_ids,
        strategy=str(row["domain_evidence"]),
        neighbor_count=int(config["domain_policy"]["exemplar_vote_neighbor_count"]),
        hybrid_rrf_constant=int(config["domain_policy"]["hybrid_rrf_constant"]),
    )
    domain_fusion = config["domain_policy"]["catalog_calibration_fusion"]
    domain_ranking = weighted_rrf(
        [
            (float(domain_fusion["catalog_anchor_weight"]), domain_catalog),
            (float(domain_fusion["calibration_weight"]), domain_calibration),
        ],
        all_ids=domain_ids,
        constant=int(domain_fusion["rrf_constant"]),
    )

    exact_source = str(config["candidate_policy"]["exact_alias_query_source"])
    exact_query = prepared["query_raw"][exact_source][case_index]
    candidates = assemble_structured_candidates(
        query_text=exact_query,
        topics=prepared["topics"],
        topic_ranking=topic_ranking,
        domain_ranking=domain_ranking,
        config=config,
    )
    return candidates, domain_ranking


def _structural_failures(
    ranking: Sequence[str],
    domain_ranking: Sequence[str],
    prepared: dict[str, Any],
) -> list[str]:
    failures: list[str] = []
    member_map = domain_members(prepared["topics"])
    if domain_ranking:
        first = set(member_map.get(str(domain_ranking[0]), []))
        if first and not first <= set(ranking[:10]):
            failures.append("top_domain_not_fully_in_top10")
    if len(domain_ranking) > 1:
        second = set(member_map.get(str(domain_ranking[1]), []))
        if second and not second <= set(ranking[:20]):
            failures.append("second_domain_not_fully_in_top20")
    if set(ranking) & set(prepared["domain_ids"]):
        failures.append("domain_id_returned_as_candidate")
    if len(ranking) != len(set(ranking)):
        failures.append("duplicate_candidate")
    return failures


def _gate_result(
    metrics: dict[str, Any],
    *,
    config: dict[str, Any],
    leakage_events: int,
    structural_failure_count: int,
) -> dict[str, Any]:
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
        failures.append("structural_candidate_invariant")
    gate["failures"] = failures
    gate["pass"] = not failures
    gate["leakage_pass"] = leakage_events == 0
    gate["structural_pass"] = structural_failure_count == 0
    return gate


def _domain_recovery_metrics(
    cases: Sequence[dict[str, Any]],
    domain_rankings: Sequence[Sequence[str]],
    topic_domain_map: dict[str, str],
) -> dict[str, Any]:
    assigned: list[tuple[set[str], Sequence[str]]] = []
    for case, ranking in zip(cases, domain_rankings):
        if case.get("truth_state") != "ASSIGNED" or not case.get("truth_topics"):
            continue
        truth = {
            topic_domain_map.get(str(topic_id), "")
            for topic_id in case.get("truth_topics", [])
        }
        truth.discard("")
        if truth:
            assigned.append((truth, ranking))
    result: dict[str, Any] = {"assigned_cases": len(assigned)}
    for k in (1, 2):
        partial: list[float] = []
        complete: list[float] = []
        for truth, ranking in assigned:
            got = set(str(value) for value in ranking[:k])
            partial.append(len(truth & got) / len(truth))
            complete.append(float(truth <= got))
        result[f"domain_recall_at_{k}"] = sum(partial) / len(partial) if partial else None
        result[f"complete_case_domain_recall_at_{k}"] = (
            sum(complete) / len(complete) if complete else None
        )
    return result


def _evaluate_oof_config(
    cases: Sequence[dict[str, Any]],
    *,
    prepared: dict[str, Any],
    row: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    fold_count = int(config["development"]["fold_count"])
    folds = fold_indices(cases, fold_count)
    rankings: list[list[str] | None] = [None] * len(cases)
    domain_rankings: list[list[str] | None] = [None] * len(cases)
    leakage_events = 0
    structural_failure_count = 0
    fold_public: list[dict[str, Any]] = []
    query_variant = str(row["query_variant"])

    for fold_number, test_idx in enumerate(folds):
        if not test_idx:
            continue
        test_set = set(test_idx)
        train_idx = [i for i in range(len(cases)) if i not in test_set]
        train_cases = [cases[i] for i in train_idx]
        test_cases = [cases[i] for i in test_idx]
        leakage_events += held_out_family_leakage_events(train_cases, test_cases)
        train_vectors = prepared["query_vectors"][query_variant][train_idx]

        for i in test_idx:
            ranking, domain_ranking = _rank_case(
                case_index=i,
                train_vectors=train_vectors,
                train_cases=train_cases,
                prepared=prepared,
                row=row,
                config=config,
            )
            rankings[i] = ranking
            domain_rankings[i] = domain_ranking
            structural_failure_count += len(
                _structural_failures(ranking, domain_ranking, prepared)
            )

        fold_rankings = [rankings[i] for i in test_idx]
        fold_domains = [domain_rankings[i] for i in test_idx]
        if any(value is None for value in fold_rankings + fold_domains):
            raise RuntimeError("REM-03B fold ranking incomplete")
        fold_rows = _ranking_rows(
            test_cases,
            [list(value) for value in fold_rankings if value is not None],
        )
        fold_metrics = candidate_metrics(fold_rows)
        fold_domain = _domain_recovery_metrics(
            test_cases,
            [list(value) for value in fold_domains if value is not None],
            prepared["topic_domain_map"],
        )
        fold_public.append(
            {
                "fold": fold_number,
                "case_count": len(test_cases),
                "family_count": len({str(case["family_ref"]) for case in test_cases}),
                "assigned_cases": fold_metrics["assigned_cases"],
                "topic_recall_at_10": fold_metrics["topic_recall_at_10"],
                "topic_recall_at_20": fold_metrics["topic_recall_at_20"],
                "domain_recall_at_1": fold_domain["domain_recall_at_1"],
                "domain_recall_at_2": fold_domain["domain_recall_at_2"],
            }
        )

    if any(value is None for value in rankings) or any(value is None for value in domain_rankings):
        raise RuntimeError("REM-03B family-grouped OOF ranking incomplete")
    final_rankings = [list(value) for value in rankings if value is not None]
    final_domains = [list(value) for value in domain_rankings if value is not None]
    evidence_rows = _ranking_rows(cases, final_rankings)
    metrics = _slice_metrics(evidence_rows)
    domain_metrics = _domain_recovery_metrics(
        cases, final_domains, prepared["topic_domain_map"]
    )
    gate = _gate_result(
        metrics,
        config=config,
        leakage_events=leakage_events,
        structural_failure_count=structural_failure_count,
    )
    return {
        "config": dict(row),
        "metrics": metrics,
        "domain_metrics": domain_metrics,
        "gate": gate,
        "held_out_family_leakage_events": leakage_events,
        "structural_failure_count": structural_failure_count,
        "folds": fold_public,
        "ranking_digest": _digest(final_rankings),
        "domain_ranking_digest": _digest(final_domains),
    }


def _selection_key(result: dict[str, Any]) -> tuple[Any, ...]:
    overall = result["metrics"]["overall"]
    domain = result["domain_metrics"]
    return (
        -float(overall["topic_recall_at_10"]),
        -float(overall["topic_recall_at_20"]),
        -float(domain.get("domain_recall_at_1") or 0.0),
        -float(domain.get("domain_recall_at_2") or 0.0),
        str(result["config"]["config_id"]),
    )


def _public_result(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "config": result["config"],
        "metrics": result["metrics"],
        "domain_metrics": result["domain_metrics"],
        "gate": result["gate"],
        "held_out_family_leakage_events": result["held_out_family_leakage_events"],
        "structural_failure_count": result["structural_failure_count"],
        "folds": result["folds"],
        "ranking_digest": result["ranking_digest"],
        "domain_ranking_digest": result["domain_ranking_digest"],
    }


def calibration_stage(args: argparse.Namespace) -> int:
    config = load_rem03b_config(args.config)
    _load_freeze(args.freeze_receipt, args.config, args.repo_root)
    rows = config_matrix(config)

    by_split, lockbox_ids = load_split_index(args.gold_index)
    calibration_meta = by_split["calibration"]
    calibration_ids = {str(row["calibration_id"]) for row in calibration_meta}
    if calibration_ids & lockbox_ids:
        raise RuntimeError("REM-03B calibration allowlist overlaps consumed SEM-07 lockbox")

    labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    private_context = load_private_context(args.canonical_batch)
    cases = build_cases(calibration_meta, labels, private_context)
    expected = int(config["authorization"]["legacy_calibration_read_only"])
    if len(cases) != expected:
        raise RuntimeError(f"Expected {expected} calibration cases, got {len(cases)}")

    started = time.perf_counter()
    prepared = _prepare_runtime(cases)
    results = [
        _evaluate_oof_config(
            cases,
            prepared=prepared,
            row=row,
            config=config,
        )
        for row in rows
    ]
    elapsed = time.perf_counter() - started
    passing = sorted(
        [result for result in results if result["gate"]["pass"]],
        key=_selection_key,
    )
    winner = passing[0] if passing else None
    ordered = sorted(results, key=_selection_key)

    public_payload = {
        "round": "REM-03B",
        "stage": "CALIBRATION_PASS" if winner else "CALIBRATION_FAIL",
        "config_sha256": sha256_file(args.config),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "library_sha256": sha256_file(args.repo_root / "semantic_lab" / "rem03b.py"),
        "matrix_sha256": _matrix_digest(rows),
        "matrix_count": len(rows),
        "calibration_case_count": len(cases),
        "assigned_case_count": sum(case["truth_state"] == "ASSIGNED" for case in cases),
        "context_dependent_case_count": sum(bool(case["context_dependent"]) for case in cases),
        "results": [_public_result(result) for result in ordered],
        "selected_config": winner["config"] if winner else None,
        "selected_metrics": winner["metrics"] if winner else None,
        "selected_domain_metrics": winner["domain_metrics"] if winner else None,
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
            "production_paia_writes": 0,
            "consumed_lockbox_tuning_events": 0,
            "generated_semantic_expansion_events": 0,
            "catalog_edit_events": 0,
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

    gate_receipt = {
        "round": "REM-03B",
        "state": "CALIBRATION_PASS" if winner else "CALIBRATION_FAIL",
        "config_sha256": sha256_file(args.config),
        "evaluator_sha256": sha256_file(Path(__file__)),
        "library_sha256": sha256_file(args.repo_root / "semantic_lab" / "rem03b.py"),
        "matrix_sha256": _matrix_digest(rows),
        "selected_config": winner["config"] if winner else None,
        "selected_config_digest": _digest(winner["config"]) if winner else None,
        "evaluation_open_permitted": bool(winner),
        "evaluation_reads_consumed": 0,
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
                "selected_config_id": winner["config"]["config_id"] if winner else None,
                "best_config_id": best["config"]["config_id"],
                "best_recall_at_10": best["metrics"]["overall"]["topic_recall_at_10"],
                "best_recall_at_20": best["metrics"]["overall"]["topic_recall_at_20"],
                "best_domain_recall_at_1": best["domain_metrics"]["domain_recall_at_1"],
                "best_domain_recall_at_2": best["domain_metrics"]["domain_recall_at_2"],
                "evaluation_open_permitted": bool(winner),
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            },
            ensure_ascii=False,
        )
    )
    return 0


def _evaluate_frozen_on_evaluation(
    calibration_cases: Sequence[dict[str, Any]],
    evaluation_cases: Sequence[dict[str, Any]],
    *,
    selected: dict[str, Any],
    config: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    combined = list(calibration_cases) + list(evaluation_cases)
    prepared = _prepare_runtime(combined)
    n_cal = len(calibration_cases)
    query_variant = str(selected["query_variant"])
    train_vectors = prepared["query_vectors"][query_variant][:n_cal]
    rankings: list[list[str]] = []
    domain_rankings: list[list[str]] = []
    structural_failure_count = 0

    for i in range(n_cal, len(combined)):
        ranking, domain_ranking = _rank_case(
            case_index=i,
            train_vectors=train_vectors,
            train_cases=calibration_cases,
            prepared=prepared,
            row=selected,
            config=config,
        )
        rankings.append(ranking)
        domain_rankings.append(domain_ranking)
        structural_failure_count += len(
            _structural_failures(ranking, domain_ranking, prepared)
        )

    evidence_rows = _ranking_rows(evaluation_cases, rankings)
    metrics = _slice_metrics(evidence_rows)
    domain_metrics = _domain_recovery_metrics(
        evaluation_cases,
        domain_rankings,
        prepared["topic_domain_map"],
    )
    leakage_events = held_out_family_leakage_events(
        calibration_cases, evaluation_cases
    )
    gate = _gate_result(
        metrics,
        config=config,
        leakage_events=leakage_events,
        structural_failure_count=structural_failure_count,
    )
    evidence = {
        "case_count": len(evaluation_cases),
        "assigned_cases": metrics["overall"]["assigned_cases"],
        "metrics": metrics,
        "domain_metrics": domain_metrics,
        "gate": gate,
        "family_leakage_events": leakage_events,
        "structural_failure_count": structural_failure_count,
        "ranking_digest": _digest(rankings),
        "domain_ranking_digest": _digest(domain_rankings),
    }
    return evidence, prepared["runtime"]


def evaluation_stage(args: argparse.Namespace) -> int:
    config = load_rem03b_config(args.config)
    _load_freeze(args.freeze_receipt, args.config, args.repo_root)
    gate_receipt = json.loads(args.gate_receipt.read_text(encoding="utf-8"))
    if gate_receipt.get("state") != "CALIBRATION_PASS":
        raise RuntimeError("Evaluation forbidden: REM-03B calibration gate did not pass")
    if gate_receipt.get("evaluation_open_permitted") is not True:
        raise RuntimeError("Evaluation forbidden by REM-03B calibration receipt")
    selected = gate_receipt.get("selected_config")
    if not isinstance(selected, dict):
        raise RuntimeError("Frozen REM-03B selected config missing")
    if gate_receipt.get("selected_config_digest") != _digest(selected):
        raise RuntimeError("Frozen REM-03B selected config digest mismatch")

    if args.consumption_marker.exists():
        marker = json.loads(args.consumption_marker.read_text(encoding="utf-8"))
        if marker.get("state") == "CONSUMED":
            print(
                json.dumps(
                    {
                        "stage": "EVALUATION_ALREADY_CONSUMED_NO_REREAD",
                        "result_digest": marker.get("result_digest"),
                    }
                )
            )
            return 0
        raise RuntimeError("REM-03B evaluation marker exists in non-consumed state")

    marker = {
        "round": "REM-03B",
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
        raise RuntimeError("REM-03B legacy promotion allowlist overlaps consumed lockbox")

    calibration_labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    evaluation_labels = load_labels_allowlisted(args.calibration_records, evaluation_ids)
    private_context = load_private_context(args.canonical_batch)
    calibration_cases = build_cases(calibration_meta, calibration_labels, private_context)
    evaluation_cases = build_cases(evaluation_meta, evaluation_labels, private_context)
    if len(calibration_cases) != int(config["authorization"]["legacy_calibration_read_only"]):
        raise RuntimeError("Unexpected REM-03B calibration count during evaluation")
    if len(evaluation_cases) != int(config["authorization"]["legacy_evaluation_read_only_after_gate"]):
        raise RuntimeError("Unexpected REM-03B evaluation count")

    started = time.perf_counter()
    evidence, runtime = _evaluate_frozen_on_evaluation(
        calibration_cases,
        evaluation_cases,
        selected=selected,
        config=config,
    )
    elapsed = time.perf_counter() - started
    runtime["elapsed_seconds"] = elapsed

    public_payload = {
        "round": "REM-03B",
        "stage": "BOUNDED_EVALUATION_PASS" if evidence["gate"]["pass"] else "BOUNDED_EVALUATION_FAIL",
        "selected_config": selected,
        "selected_config_digest": _digest(selected),
        "evaluation_case_count": len(evaluation_cases),
        "assigned_case_count": evidence["assigned_cases"],
        "metrics": evidence["metrics"],
        "domain_metrics": evidence["domain_metrics"],
        "gate": evidence["gate"],
        "family_leakage_events": evidence["family_leakage_events"],
        "structural_failure_count": evidence["structural_failure_count"],
        "ranking_digest": evidence["ranking_digest"],
        "domain_ranking_digest": evidence["domain_ranking_digest"],
        "evaluation_reads_consumed": 1,
        "guards": {
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_lockbox_tuning_events": 0,
            "generated_semantic_expansion_events": 0,
            "catalog_edit_events": 0,
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

    print(
        json.dumps(
            {
                "stage": public_payload["stage"],
                "recall_at_10": evidence["metrics"]["overall"]["topic_recall_at_10"],
                "recall_at_20": evidence["metrics"]["overall"]["topic_recall_at_20"],
                "domain_recall_at_1": evidence["domain_metrics"]["domain_recall_at_1"],
                "domain_recall_at_2": evidence["domain_metrics"]["domain_recall_at_2"],
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            },
            ensure_ascii=False,
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="REM-03B structured candidate private promotion")
    parser.add_argument("--stage", choices=("calibration", "evaluation"), required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--freeze-receipt", type=Path, required=True)
    parser.add_argument("--repo-root", type=Path, required=True)
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
