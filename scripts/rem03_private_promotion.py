from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import resource
import time
from pathlib import Path
from typing import Any, Sequence

import yaml

from scripts.rem02_private_promotion import (
    build_cases,
    load_labels_allowlisted,
    load_private_context,
    load_split_index,
    sha256_file,
    write_json,
)
from semantic_lab.catalog import load_catalog, validate_catalog_contract
from semantic_lab.embedding_adapters import CandidateSpec, apply_prompt
from semantic_lab.rem01 import query_representation, topic_descriptor_variant
from semantic_lab.rem02_runtime import _candidate_raw
from semantic_lab.rem03 import (
    assemble_remediated_candidates,
    lexical_alias_ranking,
    lexical_descriptor_ranking,
    load_rem03_config,
)
from semantic_lab.sem01 import TASK_INSTRUCTION
from semantic_lab.sem02 import chunk_text
from semantic_lab.sem03 import eligible_topics
from semantic_lab.sem07 import candidate_metrics

BGE_ID = "BAAI/bge-m3"
BGE_REVISION = "cb1779f90b988b8deb01f9155c790ef9417d7648"


def _digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )
    ).hexdigest()


def _rss_bytes() -> int:
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(value * 1024 if platform.system() == "Linux" else value)


def load_plan(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-03 private promotion plan must be a mapping")
    if value.get("status") != "FROZEN_BEFORE_PRIVATE_EVIDENCE":
        raise ValueError("REM-03 private promotion plan is not frozen")
    return value


def load_model() -> tuple[Any, CandidateSpec, dict[str, Any]]:
    import numpy as np
    import sentence_transformers
    import torch
    import transformers
    from sentence_transformers import SentenceTransformer

    raw = _candidate_raw(BGE_ID)
    spec = CandidateSpec.from_dict(raw)
    if str(raw.get("revision")) != BGE_REVISION:
        raise ValueError("BGE revision drifted from frozen REM-02 baseline")
    snapshot = (
        Path.home()
        / ".cache"
        / "huggingface"
        / "hub"
        / "models--BAAI--bge-m3"
        / "snapshots"
        / BGE_REVISION
    )
    if not snapshot.exists():
        raise RuntimeError("Pinned BGE snapshot unavailable locally")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    started = time.perf_counter()
    model = SentenceTransformer(
        str(snapshot),
        device="cpu",
        local_files_only=True,
        trust_remote_code=False,
    )
    model.eval()
    return model, spec, {
        "model_load_seconds": time.perf_counter() - started,
        "python": platform.python_version(),
        "sentence_transformers": sentence_transformers.__version__,
        "transformers": transformers.__version__,
        "torch": torch.__version__,
        "numpy": np.__version__,
        "platform": platform.platform(),
    }


def _token_count(model: Any, text: str) -> int:
    encoded = model.tokenizer(
        text,
        add_special_tokens=True,
        truncation=False,
        return_attention_mask=False,
    )
    return len(encoded["input_ids"])


def _encode(model: Any, texts: Sequence[str]) -> Any:
    return model.encode(
        list(texts),
        batch_size=8,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )


def _dense_rankings(query_vectors: Any, doc_vectors: Any, topic_ids: Sequence[str]) -> list[list[str]]:
    import numpy as np

    scores = np.asarray(query_vectors, dtype="float32") @ np.asarray(
        doc_vectors, dtype="float32"
    ).T
    rows: list[list[str]] = []
    for row in scores:
        order = np.argsort(-row, kind="stable")
        rows.append([str(topic_ids[int(i)]) for i in order])
    return rows


def _chunk_dense_ranking(
    model: Any,
    spec: CandidateSpec,
    query: str,
    doc_vectors: Any,
    topic_ids: Sequence[str],
    config: dict[str, Any],
) -> list[str]:
    import numpy as np

    chunk_cfg = config["representation"]["long_query_chunking"]
    chunks = chunk_text(
        query,
        size=int(chunk_cfg["size_codepoints"]),
        overlap=int(chunk_cfg["overlap_codepoints"]),
    )
    prepared = [
        apply_prompt(spec, "query", text, TASK_INSTRUCTION)
        for _, _, text in chunks
    ]
    qvecs = _encode(model, prepared)
    scores = np.asarray(qvecs, dtype="float32") @ np.asarray(doc_vectors, dtype="float32").T
    max_scores = np.max(scores, axis=0)
    order = np.argsort(-max_scores, kind="stable")
    return [str(topic_ids[int(i)]) for i in order]


def _slice_metrics(rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    overall = candidate_metrics(rows)
    context = candidate_metrics([row for row in rows if row["context_dependent"]])
    context_free = candidate_metrics([row for row in rows if not row["context_dependent"]])
    return {
        "overall": overall,
        "context_dependent": context,
        "context_free": context_free,
    }


def evaluate_cases(cases: Sequence[dict[str, Any]], repo_root: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    import numpy as np

    config = load_rem03_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    topic_ids = [str(topic["topic_id"]) for topic in topics]

    model, spec, runtime = load_model()
    declared = int(spec.context_tokens or 0)
    runtime_limit = int(getattr(model, "max_seq_length", declared) or declared)
    effective_limit = min(declared, runtime_limit) if runtime_limit else declared

    docs_full = [
        apply_prompt(
            spec,
            "document",
            topic_descriptor_variant(topic, "full_boundaries"),
            TASK_INSTRUCTION,
        )
        for topic in topics
    ]
    docs_names = [
        apply_prompt(
            spec,
            "document",
            topic_descriptor_variant(topic, "names_aliases"),
            TASK_INSTRUCTION,
        )
        for topic in topics
    ]

    current_raw = [query_representation(case, "current_only") for case in cases]
    allowed_raw = [query_representation(case, "allowed_context") for case in cases]
    current_prepared = [
        apply_prompt(spec, "query", text, TASK_INSTRUCTION) for text in current_raw
    ]
    allowed_prepared = [
        apply_prompt(spec, "query", text, TASK_INSTRUCTION) for text in allowed_raw
    ]

    max_tokens = 0
    for value in docs_full + docs_names + current_prepared + allowed_prepared:
        max_tokens = max(max_tokens, _token_count(model, value))
    if max_tokens > effective_limit:
        raise RuntimeError(
            f"Private promotion input exceeds context: {max_tokens}>{effective_limit}; silent truncation forbidden"
        )

    started = time.perf_counter()
    full_vectors = _encode(model, docs_full)
    name_vectors = _encode(model, docs_names)
    doc_seconds = time.perf_counter() - started

    started = time.perf_counter()
    current_vectors = _encode(model, current_prepared)
    allowed_vectors = _encode(model, allowed_prepared)
    query_seconds = time.perf_counter() - started

    dense_full_current = _dense_rankings(current_vectors, full_vectors, topic_ids)
    dense_names_current = _dense_rankings(current_vectors, name_vectors, topic_ids)
    dense_full_allowed = _dense_rankings(allowed_vectors, full_vectors, topic_ids)
    dense_names_allowed = _dense_rankings(allowed_vectors, name_vectors, topic_ids)

    output_rows: list[dict[str, Any]] = []
    ranking_digests: list[str] = []
    chunk_trigger = int(config["representation"]["long_query_chunking"]["trigger_codepoints"])

    for i, case in enumerate(cases):
        current = current_raw[i]
        allowed = allowed_raw[i]
        sources: dict[str, list[str]] = {
            "dense_full_current": dense_full_current[i],
            "dense_names_current": dense_names_current[i],
            "lexical_alias_current": lexical_alias_ranking(current, topics),
            "lexical_descriptor_current": lexical_descriptor_ranking(current, topics),
        }
        query_for_policy = current
        if allowed != current:
            query_for_policy = allowed
            sources.update(
                {
                    "dense_full_context": dense_full_allowed[i],
                    "dense_names_context": dense_names_allowed[i],
                    "lexical_alias_context": lexical_alias_ranking(allowed, topics),
                    "lexical_descriptor_context": lexical_descriptor_ranking(allowed, topics),
                }
            )

        if (
            bool(config["representation"]["long_query_chunking"].get("enabled"))
            and len(query_for_policy) >= chunk_trigger
        ):
            sources["dense_chunk_max"] = _chunk_dense_ranking(
                model,
                spec,
                query_for_policy,
                full_vectors,
                topic_ids,
                config,
            )

        candidates = assemble_remediated_candidates(
            query=query_for_policy,
            topics=topics,
            source_rankings=sources,
            profile=None,
            config=config,
        )
        candidate_ids = [str(row["topic_id"]) for row in candidates]
        ranking_digests.append(_digest(candidate_ids))
        output_rows.append(
            {
                "truth_state": case["truth_state"],
                "truth_topics": list(case["truth_topics"]),
                "candidate_ids": candidate_ids,
                "context_dependent": bool(case["context_dependent"]),
            }
        )

    metrics = _slice_metrics(output_rows)
    runtime.update(
        {
            "effective_context_tokens": effective_limit,
            "max_input_tokens": max_tokens,
            "document_encode_seconds": doc_seconds,
            "query_encode_seconds": query_seconds,
            "peak_rss_bytes": _rss_bytes(),
            "embedding_dimensions": int(np.asarray(full_vectors).shape[1]),
        }
    )
    return {
        "case_count": len(cases),
        "assigned_cases": metrics["overall"]["assigned_cases"],
        "metrics": metrics,
        "ranking_digest": _digest(ranking_digests),
    }, runtime


def _gate_metrics(metrics: dict[str, Any], gate: dict[str, Any]) -> dict[str, Any]:
    failures: list[str] = []
    overall = metrics["overall"]
    r10 = overall.get("topic_recall_at_10")
    r20 = overall.get("topic_recall_at_20")
    if r10 is None or r20 is None:
        failures.append("overall_candidate_recall_unavailable")
    else:
        if float(r10) < float(gate["recall_at_10_min"]):
            failures.append("overall_recall_at_10")
        if float(r20) < float(gate["recall_at_20_min"]):
            failures.append("overall_recall_at_20")

    slice_failures: dict[str, list[str]] = {}
    for name in ("context_dependent", "context_free"):
        row = metrics[name]
        if int(row.get("assigned_cases") or 0) == 0:
            continue
        local: list[str] = []
        if row.get("topic_recall_at_10") is None or float(row["topic_recall_at_10"]) < float(
            gate["recall_at_10_min"]
        ):
            local.append("recall_at_10")
        if row.get("topic_recall_at_20") is None or float(row["topic_recall_at_20"]) < float(
            gate["recall_at_20_min"]
        ):
            local.append("recall_at_20")
        if local:
            slice_failures[name] = local
            failures.append(f"critical_slice:{name}")
    return {
        "overall_pass": not [
            value for value in failures if not value.startswith("critical_slice:")
        ],
        "critical_slices_pass": not slice_failures,
        "pass": not failures,
        "failures": failures,
        "slice_failures": slice_failures,
    }


def _public_summary(
    *,
    stage: str,
    plan_hash: str,
    code_hash: str,
    evidence: dict[str, Any],
    runtime: dict[str, Any],
    gate: dict[str, Any],
    evaluation_reads_consumed: int,
) -> dict[str, Any]:
    payload = {
        "round": "REM-03",
        "stage": stage,
        "plan_hash": plan_hash,
        "code_hash": code_hash,
        "candidate_policy_version": load_rem03_config()["benchmark_version"],
        "model_id": BGE_ID,
        "revision": BGE_REVISION,
        "case_count": evidence["case_count"],
        "assigned_cases": evidence["assigned_cases"],
        "metrics": evidence["metrics"],
        "gate": gate,
        "ranking_digest": evidence["ranking_digest"],
        "evaluation_reads_consumed": evaluation_reads_consumed,
        "guards": {
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_sem07_lockbox_tuning_events": 0,
            "config_search_events": 0,
            "threshold_fit_events": 0,
        },
        "runtime": runtime,
    }
    payload["result_digest"] = _digest(payload)
    return payload


def calibration_stage(args: argparse.Namespace) -> int:
    plan = load_plan(args.config)
    freeze = json.loads(args.freeze_receipt.read_text(encoding="utf-8"))
    current_plan_hash = sha256_file(args.config)
    current_code_hash = sha256_file(Path(__file__))
    if freeze.get("plan_sha256") != current_plan_hash:
        raise RuntimeError("REM-03 private plan drifted after freeze")
    if freeze.get("evaluator_sha256") != current_code_hash:
        raise RuntimeError("REM-03 private evaluator drifted after freeze")

    by_split, lockbox_ids = load_split_index(args.gold_index)
    calibration_rows = by_split["calibration"]
    calibration_ids = {str(row["calibration_id"]) for row in calibration_rows}
    if calibration_ids & lockbox_ids:
        raise RuntimeError("Calibration allowlist overlaps consumed lockbox")

    labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    private_context = load_private_context(args.canonical_batch)
    cases = build_cases(calibration_rows, labels, private_context)
    if len(cases) != int(plan["authorization"]["calibration_judgments"]):
        raise RuntimeError("Unexpected REM-03 calibration case count")

    started = time.perf_counter()
    evidence, runtime = evaluate_cases(cases, args.repo_root)
    elapsed = time.perf_counter() - started
    gate = _gate_metrics(evidence["metrics"], plan["candidate_gate"])
    runtime["elapsed_seconds"] = elapsed

    private_payload = {
        "round": "REM-03",
        "stage": "calibration",
        "plan_hash": current_plan_hash,
        "code_hash": current_code_hash,
        "semantic_label_records_parsed": len(cases),
        "evaluation_label_records_parsed": 0,
        "lockbox_label_records_parsed": 0,
        "evidence": evidence,
        "gate": gate,
        "runtime": runtime,
    }
    write_json(args.private_output, private_payload, private=True)

    public_payload = _public_summary(
        stage="CALIBRATION_GATE_PASS" if gate["pass"] else "CALIBRATION_GATE_FAIL",
        plan_hash=current_plan_hash,
        code_hash=current_code_hash,
        evidence=evidence,
        runtime=runtime,
        gate=gate,
        evaluation_reads_consumed=0,
    )
    public_payload["semantic_label_records_parsed"] = len(cases)
    public_payload["evaluation_label_records_parsed"] = 0
    public_payload["lockbox_label_records_parsed"] = 0
    public_payload["evaluation_open_permitted"] = bool(gate["pass"])
    public_payload["result_digest"] = _digest(public_payload)
    write_json(args.public_output, public_payload)

    gate_receipt = {
        "round": "REM-03",
        "state": "CALIBRATION_PASS" if gate["pass"] else "CALIBRATION_FAIL",
        "plan_hash": current_plan_hash,
        "code_hash": current_code_hash,
        "calibration_public_sha256": sha256_file(args.public_output),
        "calibration_private_sha256": sha256_file(args.private_output),
        "result_digest": public_payload["result_digest"],
        "evaluation_open_permitted": bool(gate["pass"]),
        "evaluation_reads_consumed": 0,
    }
    write_json(args.gate_receipt, gate_receipt, private=True)

    print(
        json.dumps(
            {
                "stage": public_payload["stage"],
                "recall_at_10": evidence["metrics"]["overall"].get("topic_recall_at_10"),
                "recall_at_20": evidence["metrics"]["overall"].get("topic_recall_at_20"),
                "critical_slices_pass": gate["critical_slices_pass"],
                "evaluation_open_permitted": gate_receipt["evaluation_open_permitted"],
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            },
            ensure_ascii=False,
        )
    )
    return 0


def evaluation_stage(args: argparse.Namespace) -> int:
    plan = load_plan(args.config)
    freeze = json.loads(args.freeze_receipt.read_text(encoding="utf-8"))
    gate_receipt = json.loads(args.gate_receipt.read_text(encoding="utf-8"))
    current_plan_hash = sha256_file(args.config)
    current_code_hash = sha256_file(Path(__file__))

    if freeze.get("plan_sha256") != current_plan_hash or freeze.get("evaluator_sha256") != current_code_hash:
        raise RuntimeError("REM-03 plan/evaluator drift before evaluation")
    if gate_receipt.get("state") != "CALIBRATION_PASS" or gate_receipt.get(
        "evaluation_open_permitted"
    ) is not True:
        raise RuntimeError("Evaluation forbidden because calibration gate did not pass")

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
        raise RuntimeError("Evaluation marker exists in non-consumed state; refuse second read")

    marker_started = {
        "round": "REM-03",
        "state": "STARTED",
        "plan_hash": current_plan_hash,
        "code_hash": current_code_hash,
        "evaluation_read_budget": 1,
        "evaluation_reads_consumed": 1,
    }
    write_json(args.consumption_marker, marker_started, private=True)

    by_split, lockbox_ids = load_split_index(args.gold_index)
    evaluation_rows = by_split["evaluation"]
    evaluation_ids = {str(row["calibration_id"]) for row in evaluation_rows}
    if evaluation_ids & lockbox_ids:
        raise RuntimeError("Evaluation allowlist overlaps consumed lockbox")

    labels = load_labels_allowlisted(args.calibration_records, evaluation_ids)
    private_context = load_private_context(args.canonical_batch)
    cases = build_cases(evaluation_rows, labels, private_context)
    if len(cases) != int(plan["authorization"]["evaluation_judgments"]):
        raise RuntimeError("Unexpected REM-03 evaluation case count")

    started = time.perf_counter()
    evidence, runtime = evaluate_cases(cases, args.repo_root)
    elapsed = time.perf_counter() - started
    gate = _gate_metrics(evidence["metrics"], plan["candidate_gate"])
    runtime["elapsed_seconds"] = elapsed

    private_payload = {
        "round": "REM-03",
        "stage": "evaluation",
        "plan_hash": current_plan_hash,
        "code_hash": current_code_hash,
        "semantic_label_records_parsed": len(cases),
        "lockbox_label_records_parsed": 0,
        "evidence": evidence,
        "gate": gate,
        "runtime": runtime,
    }
    write_json(args.private_output, private_payload, private=True)

    public_payload = _public_summary(
        stage="BOUNDED_EVALUATION_PASS" if gate["pass"] else "BOUNDED_EVALUATION_FAIL",
        plan_hash=current_plan_hash,
        code_hash=current_code_hash,
        evidence=evidence,
        runtime=runtime,
        gate=gate,
        evaluation_reads_consumed=1,
    )
    public_payload["semantic_label_records_parsed"] = len(cases)
    public_payload["lockbox_label_records_parsed"] = 0
    public_payload["result_digest"] = _digest(public_payload)
    write_json(args.public_output, public_payload)

    marker_consumed = {
        **marker_started,
        "state": "CONSUMED",
        "public_output_sha256": sha256_file(args.public_output),
        "private_output_sha256": sha256_file(args.private_output),
        "result_digest": public_payload["result_digest"],
    }
    write_json(args.consumption_marker, marker_consumed, private=True)

    print(
        json.dumps(
            {
                "stage": public_payload["stage"],
                "recall_at_10": evidence["metrics"]["overall"].get("topic_recall_at_10"),
                "recall_at_20": evidence["metrics"]["overall"].get("topic_recall_at_20"),
                "critical_slices_pass": gate["critical_slices_pass"],
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            },
            ensure_ascii=False,
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="REM-03 private candidate promotion evaluator")
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
        parser.error("--consumption-marker required for evaluation")
    return evaluation_stage(args)


if __name__ == "__main__":
    raise SystemExit(main())
