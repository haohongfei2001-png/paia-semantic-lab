from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import resource
import platform
import time
from pathlib import Path
from typing import Any, Sequence

import yaml

from semantic_lab.catalog import load_catalog, validate_catalog_contract
from semantic_lab.embedding_adapters import CandidateSpec, apply_prompt
from semantic_lab.rem01 import query_representation, topic_descriptor_variant
from semantic_lab.rem02_runtime import _candidate_raw, _rrf
from semantic_lab.sem01 import TASK_INSTRUCTION
from semantic_lab.sem03 import eligible_topics, lexical_ranking

CALIBRATION_ID_RE = re.compile(r'"calibration_id"\s*:\s*"([^"]+)"')


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_config(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-02 private promotion config must be a mapping")
    return value


def load_split_index(index_path: Path) -> tuple[dict[str, list[dict[str, Any]]], set[str]]:
    rows = json.loads(index_path.read_text(encoding="utf-8"))
    by_split: dict[str, list[dict[str, Any]]] = {}
    all_ids: set[str] = set()
    for row in rows:
        split = str(row["split"])
        by_split.setdefault(split, []).append(row)
        cid = str(row["calibration_id"])
        if cid in all_ids:
            raise ValueError("Duplicate calibration_id in gold index")
        all_ids.add(cid)
    expected = {"calibration": 80, "evaluation": 13, "lockbox": 35}
    counts = {key: len(by_split.get(key, [])) for key in expected}
    if counts != expected:
        raise ValueError(f"Unexpected split counts: {counts}")
    sets = {key: {str(row["calibration_id"]) for row in by_split[key]} for key in expected}
    if sets["calibration"] & sets["evaluation"] or sets["calibration"] & sets["lockbox"] or sets["evaluation"] & sets["lockbox"]:
        raise ValueError("Gold splits overlap")
    return by_split, sets["lockbox"]


def load_labels_allowlisted(records_path: Path, allowed_ids: set[str]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    with records_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            match = CALIBRATION_ID_RE.search(line)
            if not match:
                continue
            cid = match.group(1)
            if cid not in allowed_ids:
                continue
            row = json.loads(line)
            if str(row["calibration_id"]) != cid:
                raise ValueError("Calibration id extraction mismatch")
            result[cid] = row
    if set(result) != allowed_ids:
        missing = sorted(allowed_ids - set(result))
        raise ValueError(f"Missing allowlisted labels: {len(missing)}")
    return result


def load_private_context(batch_path: Path) -> dict[tuple[str, str], dict[str, Any]]:
    payload = json.loads(batch_path.read_text(encoding="utf-8"))
    rows = payload.get("private_context", {})
    if not isinstance(rows, dict):
        raise ValueError("canonical_batch.private.json lacks private_context")
    by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows.values():
        if not isinstance(row, dict):
            continue
        key = (str(row["input_ref"]), str(row["input_revision"]))
        by_key[key] = row
    return by_key


def build_cases(
    split_rows: Sequence[dict[str, Any]],
    labels: dict[str, dict[str, Any]],
    private_context: dict[tuple[str, str], dict[str, Any]],
) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for meta in split_rows:
        cid = str(meta["calibration_id"])
        record = labels[cid]
        key = (str(meta["input_ref"]), str(meta["input_revision"]))
        context = private_context.get(key)
        if context is None:
            raise ValueError("Private context missing for allowlisted case")
        decision = record["user_final_decision"]
        cases.append(
            {
                "calibration_id": cid,
                "family_ref": str(meta["family_ref"]),
                "truth_state": str(decision["route_state"]),
                "truth_topics": [str(value) for value in decision.get("topic_ids", [])],
                "context_dependent": bool(meta.get("context_dependent")),
                "text": str(context["text"]),
                "allowed_context": context.get("allowed_context"),
            }
        )
    return cases


def fold_id(family_ref: str, fold_count: int) -> int:
    return int(hashlib.sha256(family_ref.encode("utf-8")).hexdigest(), 16) % fold_count


def candidate_metrics(cases: Sequence[dict[str, Any]], rankings: Sequence[list[str]], k: int) -> dict[str, float | int | None]:
    assigned = [(case, ranked) for case, ranked in zip(cases, rankings) if case["truth_state"] == "ASSIGNED" and case["truth_topics"]]
    if not assigned:
        return {
            "assigned_cases": 0,
            "topic_recall": None,
            "complete_case_recall": None,
            "context_complete_case_recall": None,
        }
    topic_recall_sum = 0.0
    complete = 0
    context_total = 0
    context_complete = 0
    for case, ranked in assigned:
        truth = set(case["truth_topics"])
        top = set(ranked[:k])
        topic_recall_sum += len(truth & top) / len(truth)
        is_complete = truth <= top
        complete += int(is_complete)
        if case["context_dependent"]:
            context_total += 1
            context_complete += int(is_complete)
    return {
        "assigned_cases": len(assigned),
        "topic_recall": topic_recall_sum / len(assigned),
        "complete_case_recall": complete / len(assigned),
        "context_complete_case_recall": (
            context_complete / context_total if context_total else None
        ),
    }


def fold_metrics(
    cases: Sequence[dict[str, Any]],
    rankings: Sequence[list[str]],
    *,
    fold_count: int,
) -> dict[str, Any]:
    folds: list[dict[str, Any]] = []
    for fold in range(fold_count):
        idx = [i for i, case in enumerate(cases) if fold_id(case["family_ref"], fold_count) == fold]
        fold_cases = [cases[i] for i in idx]
        fold_rankings = [rankings[i] for i in idx]
        m10 = candidate_metrics(fold_cases, fold_rankings, 10)
        m20 = candidate_metrics(fold_cases, fold_rankings, 20)
        folds.append(
            {
                "fold": fold,
                "family_count": len({case["family_ref"] for case in fold_cases}),
                "case_count": len(fold_cases),
                "assigned_cases": m20["assigned_cases"],
                "topic_recall_at_20": m20["topic_recall"],
                "complete_case_recall_at_20": m20["complete_case_recall"],
                "complete_case_recall_at_10": m10["complete_case_recall"],
                "context_complete_case_recall_at_20": m20["context_complete_case_recall"],
            }
        )

    def macro(key: str) -> float | None:
        values = [float(row[key]) for row in folds if row[key] is not None and row["assigned_cases"] > 0]
        return sum(values) / len(values) if values else None

    complete20_values = [
        float(row["complete_case_recall_at_20"])
        for row in folds
        if row["complete_case_recall_at_20"] is not None and row["assigned_cases"] > 0
    ]
    return {
        "folds": folds,
        "macro": {
            "complete_case_recall_at_20": macro("complete_case_recall_at_20"),
            "topic_recall_at_20": macro("topic_recall_at_20"),
            "complete_case_recall_at_10": macro("complete_case_recall_at_10"),
            "context_complete_case_recall_at_20": macro("context_complete_case_recall_at_20"),
        },
        "robustness": {
            "minimum_fold_complete_case_recall_at_20": min(complete20_values) if complete20_values else None,
        },
    }


def model_snapshot(model_id: str, revision: str) -> Path:
    cache_name = "models--" + "--".join(model_id.split("/"))
    return Path.home() / ".cache" / "huggingface" / "hub" / cache_name / "snapshots" / revision


def load_model(model_id: str, revision: str) -> tuple[Any, CandidateSpec, dict[str, Any]]:
    import sentence_transformers
    import torch
    import transformers
    import numpy as np
    from sentence_transformers import SentenceTransformer

    raw = _candidate_raw(model_id)
    spec = CandidateSpec.from_dict(raw)
    if str(raw.get("revision")) != revision:
        raise ValueError("Pinned revision mismatch against SEM-01 manifest")
    snapshot = model_snapshot(model_id, revision)
    if not snapshot.exists():
        raise RuntimeError(f"Pinned local snapshot unavailable: {model_id}@{revision}")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    started = time.perf_counter()
    model = SentenceTransformer(
        str(snapshot),
        trust_remote_code=bool(raw.get("trust_remote_code", False)),
        device="cpu",
        local_files_only=True,
    )
    model.eval()
    runtime = {
        "model_load_seconds": time.perf_counter() - started,
        "python": platform.python_version(),
        "sentence_transformers": sentence_transformers.__version__,
        "transformers": transformers.__version__,
        "torch": torch.__version__,
        "numpy": np.__version__,
        "platform": platform.platform(),
    }
    return model, spec, runtime


def token_count(model: Any, text: str) -> int:
    encoded = model.tokenizer(
        text,
        add_special_tokens=True,
        truncation=False,
        return_attention_mask=False,
    )
    return len(encoded["input_ids"])


def encode_prepared(model: Any, texts: Sequence[str], batch_size: int = 8) -> Any:
    return model.encode(
        list(texts),
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )


def dense_rankings(query_vectors: Any, document_vectors: Any, topic_ids: Sequence[str]) -> list[list[str]]:
    import numpy as np

    scores = np.asarray(query_vectors, dtype="float32") @ np.asarray(
        document_vectors, dtype="float32"
    ).T
    rankings: list[list[str]] = []
    for row in scores:
        order = np.argsort(-row, kind="stable")
        rankings.append([str(topic_ids[int(index)]) for index in order])
    return rankings


def config_id(model_id: str, descriptor: str, query_variant: str, mode: str) -> str:
    payload = {
        "model_id": model_id,
        "descriptor": descriptor,
        "query_variant": query_variant,
        "mode": mode,
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()[:16]
    return f"rem02cfg-{digest}"


def public_rss_by_model(repo_root: Path) -> dict[str, int]:
    mapping = {}
    paths = {
        "Qwen/Qwen3-Embedding-0.6B": repo_root / "artifacts/remediation-v0.3/rem02-public-runtime-qwen.json",
        "BAAI/bge-m3": repo_root / "artifacts/remediation-v0.3/rem02-public-runtime-bge.json",
    }
    for model_id, path in paths.items():
        payload = json.loads(path.read_text(encoding="utf-8"))
        mapping[model_id] = int(payload["performance"]["peak_rss_bytes"])
    return mapping


def evaluate_matrix(
    *,
    cases: Sequence[dict[str, Any]],
    config: dict[str, Any],
    repo_root: Path,
    restrict_config_ids: set[str] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    import numpy as np

    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    topic_ids = [str(topic["topic_id"]) for topic in topics]
    rss = public_rss_by_model(repo_root)
    all_results: list[dict[str, Any]] = []
    runtime_meta: dict[str, Any] = {}

    for model_row in config["models"]:
        model_id = str(model_row["id"])
        revision = str(model_row["revision"])
        model, spec, runtime = load_model(model_id, revision)
        runtime_meta[model_id] = runtime

        descriptor_vectors: dict[str, Any] = {}
        descriptor_seconds: dict[str, float] = {}
        needed_descriptors = set(config["representation_matrix"]["descriptor_variants"])
        if restrict_config_ids is not None:
            needed_descriptors = {
                row["descriptor"]
                for row in decoded_config_space(config)
                if row["config_id"] in restrict_config_ids and row["model_id"] == model_id
            }

        max_tokens = 0
        for descriptor in sorted(needed_descriptors):
            docs = [
                apply_prompt(
                    spec,
                    "document",
                    topic_descriptor_variant(topic, descriptor),
                    TASK_INSTRUCTION,
                )
                for topic in topics
            ]
            for value in docs:
                max_tokens = max(max_tokens, token_count(model, value))
            started = time.perf_counter()
            descriptor_vectors[descriptor] = encode_prepared(model, docs)
            descriptor_seconds[descriptor] = time.perf_counter() - started

        needed_queries = set(config["representation_matrix"]["query_variants"])
        if restrict_config_ids is not None:
            needed_queries = {
                row["query_variant"]
                for row in decoded_config_space(config)
                if row["config_id"] in restrict_config_ids and row["model_id"] == model_id
            }

        query_vectors: dict[str, Any] = {}
        query_texts: dict[str, list[str]] = {}
        query_seconds: dict[str, float] = {}
        for variant in sorted(needed_queries):
            raw_texts = [query_representation(case, variant) for case in cases]
            prepared = [
                apply_prompt(spec, "query", text, TASK_INSTRUCTION)
                for text in raw_texts
            ]
            for value in prepared:
                max_tokens = max(max_tokens, token_count(model, value))
            query_texts[variant] = raw_texts
            started = time.perf_counter()
            query_vectors[variant] = encode_prepared(model, prepared)
            query_seconds[variant] = time.perf_counter() - started

        declared = int(spec.context_tokens or 0)
        runtime_limit = int(getattr(model, "max_seq_length", declared) or declared)
        effective_limit = min(declared, runtime_limit) if runtime_limit else declared
        if max_tokens > effective_limit:
            raise RuntimeError(
                f"{model_id} private promotion input {max_tokens} > {effective_limit}; truncation forbidden"
            )

        dense_by_pair: dict[tuple[str, str], list[list[str]]] = {}
        lexical_by_query: dict[str, list[list[str]]] = {}
        for variant in sorted(needed_queries):
            lexical_by_query[variant] = [
                lexical_ranking(text, topics) for text in query_texts[variant]
            ]
            for descriptor in sorted(needed_descriptors):
                dense_by_pair[(descriptor, variant)] = dense_rankings(
                    query_vectors[variant],
                    descriptor_vectors[descriptor],
                    topic_ids,
                )

        for descriptor in sorted(needed_descriptors):
            for query_variant in sorted(needed_queries):
                dense = dense_by_pair[(descriptor, query_variant)]
                for mode in config["representation_matrix"]["ranking_modes"]:
                    cid = config_id(model_id, descriptor, query_variant, str(mode))
                    if restrict_config_ids is not None and cid not in restrict_config_ids:
                        continue
                    rankings = (
                        dense
                        if mode == "dense"
                        else [
                            _rrf(dense_row, lexical_row)
                            for dense_row, lexical_row in zip(
                                dense, lexical_by_query[query_variant]
                            )
                        ]
                    )
                    m10 = candidate_metrics(cases, rankings, 10)
                    m20 = candidate_metrics(cases, rankings, 20)
                    folds = fold_metrics(
                        cases,
                        rankings,
                        fold_count=int(config["development_protocol"]["family_grouped_folds"]),
                    )
                    all_results.append(
                        {
                            "config_id": cid,
                            "model_id": model_id,
                            "revision": revision,
                            "descriptor": descriptor,
                            "query_variant": query_variant,
                            "ranking_mode": str(mode),
                            "overall": {
                                "assigned_cases": m20["assigned_cases"],
                                "topic_recall_at_20": m20["topic_recall"],
                                "complete_case_recall_at_20": m20["complete_case_recall"],
                                "complete_case_recall_at_10": m10["complete_case_recall"],
                                "context_complete_case_recall_at_20": m20["context_complete_case_recall"],
                            },
                            "family_grouped": folds,
                            "public_peak_rss_bytes": rss[model_id],
                            "ranking_digest": hashlib.sha256(
                                json.dumps(rankings, separators=(",", ":")).encode("utf-8")
                            ).hexdigest(),
                        }
                    )

        runtime_meta[model_id]["effective_context_tokens"] = effective_limit
        runtime_meta[model_id]["max_input_tokens"] = max_tokens
        runtime_meta[model_id]["document_encode_seconds"] = descriptor_seconds
        runtime_meta[model_id]["query_encode_seconds"] = query_seconds
        runtime_meta[model_id]["peak_rss_bytes_after_stage"] = _rss_bytes()

        del model
        del descriptor_vectors
        del query_vectors

    return all_results, runtime_meta


def decoded_config_space(config: dict[str, Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for model in config["models"]:
        model_id = str(model["id"])
        for descriptor in config["representation_matrix"]["descriptor_variants"]:
            for query_variant in config["representation_matrix"]["query_variants"]:
                for mode in config["representation_matrix"]["ranking_modes"]:
                    rows.append(
                        {
                            "config_id": config_id(
                                model_id, str(descriptor), str(query_variant), str(mode)
                            ),
                            "model_id": model_id,
                            "descriptor": str(descriptor),
                            "query_variant": str(query_variant),
                            "ranking_mode": str(mode),
                        }
                    )
    return rows


def _rss_bytes() -> int:
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(value * 1024 if platform.system() == "Linux" else value)


def _metric_value(row: dict[str, Any], key: str, default: float = -1.0) -> float:
    value = row["family_grouped"]["macro"].get(key)
    return float(value) if value is not None else default


def dominates(left: dict[str, Any], right: dict[str, Any]) -> bool:
    quality_keys = [
        "complete_case_recall_at_20",
        "topic_recall_at_20",
        "context_complete_case_recall_at_20",
    ]
    quality_no_worse = all(
        _metric_value(left, key) >= _metric_value(right, key) for key in quality_keys
    )
    resource_no_worse = int(left["public_peak_rss_bytes"]) <= int(
        right["public_peak_rss_bytes"]
    )
    quality_better = any(
        _metric_value(left, key) > _metric_value(right, key) for key in quality_keys
    )
    resource_better = int(left["public_peak_rss_bytes"]) < int(
        right["public_peak_rss_bytes"]
    )
    return quality_no_worse and resource_no_worse and (quality_better or resource_better)


def pareto_frontier(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if not any(
            other["config_id"] != row["config_id"] and dominates(other, row)
            for other in rows
        )
    ]


def selection_key(row: dict[str, Any]) -> tuple[Any, ...]:
    return (
        -_metric_value(row, "complete_case_recall_at_20"),
        -_metric_value(row, "topic_recall_at_20"),
        -_metric_value(row, "complete_case_recall_at_10"),
        -_metric_value(row, "context_complete_case_recall_at_20"),
        int(row["public_peak_rss_bytes"]),
        str(row["config_id"]),
    )


def freeze_shortlist(
    calibration_results: Sequence[dict[str, Any]],
    config: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    frontier = pareto_frontier(calibration_results)
    ranked = sorted(frontier, key=selection_key)
    maximum = int(config["development_protocol"]["maximum_configs_to_promote"])
    shortlist = ranked[:maximum]
    if len(shortlist) < int(config["development_protocol"]["minimum_configs_to_promote"]):
        raise RuntimeError("Calibration produced no promotion shortlist")
    return frontier, shortlist


def public_result_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "config_id": row["config_id"],
        "model_id": row["model_id"],
        "revision": row["revision"],
        "descriptor": row["descriptor"],
        "query_variant": row["query_variant"],
        "ranking_mode": row["ranking_mode"],
        "overall": row["overall"],
        "family_grouped": row["family_grouped"],
        "public_peak_rss_bytes": row["public_peak_rss_bytes"],
        "ranking_digest": row["ranking_digest"],
    }


def write_json(path: Path, payload: Any, *, private: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    if private:
        path.chmod(0o600)


def calibration_stage(args: argparse.Namespace) -> int:
    config = load_config(args.config)
    if config["status"] != "FROZEN_BEFORE_PRIVATE_EVIDENCE":
        raise RuntimeError("Private promotion plan is not frozen")

    by_split, lockbox_ids = load_split_index(args.gold_index)
    calibration_rows = by_split["calibration"]
    calibration_ids = {str(row["calibration_id"]) for row in calibration_rows}
    if calibration_ids & lockbox_ids:
        raise RuntimeError("Calibration allowlist overlaps consumed lockbox")

    labels = load_labels_allowlisted(args.calibration_records, calibration_ids)
    private_context = load_private_context(args.canonical_batch)
    cases = build_cases(calibration_rows, labels, private_context)

    if len(cases) != 80:
        raise RuntimeError(f"Expected 80 calibration cases, got {len(cases)}")

    started = time.perf_counter()
    results, runtime_meta = evaluate_matrix(
        cases=cases,
        config=config,
        repo_root=args.repo_root,
    )
    frontier, shortlist = freeze_shortlist(results, config)
    elapsed = time.perf_counter() - started

    plan_hash = sha256_file(args.config)
    code_hash = sha256_file(Path(__file__))
    shortlist_public = [
        {
            "config_id": row["config_id"],
            "model_id": row["model_id"],
            "revision": row["revision"],
            "descriptor": row["descriptor"],
            "query_variant": row["query_variant"],
            "ranking_mode": row["ranking_mode"],
            "calibration_family_macro": row["family_grouped"]["macro"],
            "calibration_robustness": row["family_grouped"]["robustness"],
            "public_peak_rss_bytes": row["public_peak_rss_bytes"],
        }
        for row in shortlist
    ]
    shortlist_hash = hashlib.sha256(
        json.dumps(
            shortlist_public,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()

    private_payload = {
        "round": "REM-02",
        "stage": "calibration",
        "plan_hash": plan_hash,
        "code_hash": code_hash,
        "semantic_label_records_parsed": 80,
        "evaluation_label_records_parsed": 0,
        "lockbox_label_records_parsed": 0,
        "case_count": len(cases),
        "assigned_cases": sum(case["truth_state"] == "ASSIGNED" for case in cases),
        "context_dependent_cases": sum(case["context_dependent"] for case in cases),
        "all_config_results": results,
        "pareto_frontier_config_ids": [row["config_id"] for row in frontier],
        "frozen_shortlist": shortlist_public,
        "shortlist_hash": shortlist_hash,
        "runtime": runtime_meta,
        "elapsed_seconds": elapsed,
    }
    write_json(args.private_output, private_payload, private=True)

    shortlist_payload = {
        "round": "REM-02",
        "status": "FROZEN_AFTER_CALIBRATION_BEFORE_EVALUATION",
        "plan_hash": plan_hash,
        "code_hash": code_hash,
        "shortlist_hash": shortlist_hash,
        "shortlist": shortlist_public,
        "evaluation_read_budget": 1,
        "evaluation_reads_consumed": 0,
        "consumed_sem07_lockbox_tuning_or_promotion": "DENY",
    }
    write_json(args.shortlist_output, shortlist_payload, private=True)

    public_payload = {
        "round": "REM-02",
        "stage": "CALIBRATION_SHORTLIST_FROZEN",
        "plan_hash": plan_hash,
        "code_hash": code_hash,
        "calibration_case_count": len(cases),
        "assigned_case_count": private_payload["assigned_cases"],
        "context_dependent_case_count": private_payload["context_dependent_cases"],
        "family_count": len({case["family_ref"] for case in cases}),
        "semantic_label_records_parsed": 80,
        "evaluation_label_records_parsed": 0,
        "lockbox_label_records_parsed": 0,
        "config_count": len(results),
        "pareto_frontier": [
            public_result_row(row) for row in sorted(frontier, key=selection_key)
        ],
        "frozen_shortlist": shortlist_public,
        "shortlist_hash": shortlist_hash,
        "runtime": runtime_meta,
        "elapsed_seconds": elapsed,
        "guards": {
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_lockbox_tuning_events": 0,
        },
    }
    public_payload["result_digest"] = hashlib.sha256(
        json.dumps(
            public_payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    write_json(args.public_output, public_payload)
    print(
        json.dumps(
            {
                "stage": public_payload["stage"],
                "config_count": len(results),
                "frontier_count": len(frontier),
                "shortlist_count": len(shortlist),
                "shortlist_hash": shortlist_hash,
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            },
            ensure_ascii=False,
        )
    )
    return 0


def evaluation_stage(args: argparse.Namespace) -> int:
    config = load_config(args.config)
    shortlist = json.loads(args.shortlist_input.read_text(encoding="utf-8"))
    current_plan_hash = sha256_file(args.config)
    current_code_hash = sha256_file(Path(__file__))
    if shortlist["status"] != "FROZEN_AFTER_CALIBRATION_BEFORE_EVALUATION":
        raise RuntimeError("Shortlist is not frozen for evaluation")
    if shortlist["plan_hash"] != current_plan_hash:
        raise RuntimeError("Promotion plan changed after calibration")
    if shortlist["code_hash"] != current_code_hash:
        raise RuntimeError("Evaluation code changed after calibration")
    frozen_ids = {str(row["config_id"]) for row in shortlist["shortlist"]}
    if not frozen_ids:
        raise RuntimeError("Frozen shortlist is empty")

    if args.consumption_marker.exists():
        marker = json.loads(args.consumption_marker.read_text(encoding="utf-8"))
        if marker.get("state") == "CONSUMED":
            if not args.public_output.exists() or not args.private_output.exists():
                raise RuntimeError("Evaluation marked consumed but output is missing")
            existing = json.loads(args.public_output.read_text(encoding="utf-8"))
            print(
                json.dumps(
                    {
                        "stage": "EVALUATION_ALREADY_CONSUMED_NO_REREAD",
                        "shortlist_hash": shortlist["shortlist_hash"],
                        "result_digest": existing.get("result_digest"),
                    }
                )
            )
            return 0
        raise RuntimeError(
            "Evaluation read marker exists in non-consumed state; refuse a second read"
        )

    marker_started = {
        "round": "REM-02",
        "state": "STARTED",
        "plan_hash": current_plan_hash,
        "code_hash": current_code_hash,
        "shortlist_hash": shortlist["shortlist_hash"],
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
    if len(cases) != 13:
        raise RuntimeError(f"Expected 13 evaluation cases, got {len(cases)}")

    started = time.perf_counter()
    results, runtime_meta = evaluate_matrix(
        cases=cases,
        config=config,
        repo_root=args.repo_root,
        restrict_config_ids=frozen_ids,
    )
    elapsed = time.perf_counter() - started

    by_id = {str(row["config_id"]): row for row in results}
    if set(by_id) != frozen_ids:
        raise RuntimeError("Evaluation did not execute exactly the frozen shortlist")

    validated_shortlist: list[dict[str, Any]] = []
    for frozen in shortlist["shortlist"]:
        row = by_id[str(frozen["config_id"])]
        validated_shortlist.append(
            {
                "config_id": row["config_id"],
                "model_id": row["model_id"],
                "revision": row["revision"],
                "descriptor": row["descriptor"],
                "query_variant": row["query_variant"],
                "ranking_mode": row["ranking_mode"],
                "calibration_family_macro": frozen["calibration_family_macro"],
                "calibration_robustness": frozen["calibration_robustness"],
                "evaluation_overall": row["overall"],
                "evaluation_family_grouped": row["family_grouped"],
                "public_peak_rss_bytes": row["public_peak_rss_bytes"],
                "evaluation_ranking_digest": row["ranking_digest"],
            }
        )

    private_payload = {
        "round": "REM-02",
        "stage": "evaluation",
        "plan_hash": current_plan_hash,
        "code_hash": current_code_hash,
        "shortlist_hash": shortlist["shortlist_hash"],
        "semantic_label_records_parsed": 13,
        "calibration_label_records_parsed": 0,
        "lockbox_label_records_parsed": 0,
        "case_count": len(cases),
        "assigned_cases": sum(case["truth_state"] == "ASSIGNED" for case in cases),
        "context_dependent_cases": sum(case["context_dependent"] for case in cases),
        "evaluated_config_ids": sorted(frozen_ids),
        "validated_shortlist": validated_shortlist,
        "runtime": runtime_meta,
        "elapsed_seconds": elapsed,
    }
    write_json(args.private_output, private_payload, private=True)

    public_payload = {
        "round": "REM-02",
        "stage": "BOUNDED_LEGACY_EVALUATION_CONSUMED",
        "plan_hash": current_plan_hash,
        "code_hash": current_code_hash,
        "shortlist_hash": shortlist["shortlist_hash"],
        "evaluation_case_count": len(cases),
        "assigned_case_count": private_payload["assigned_cases"],
        "context_dependent_case_count": private_payload["context_dependent_cases"],
        "semantic_label_records_parsed": 13,
        "lockbox_label_records_parsed": 0,
        "evaluation_reads_consumed": 1,
        "evaluated_config_count": len(results),
        "validated_shortlist": validated_shortlist,
        "runtime": runtime_meta,
        "elapsed_seconds": elapsed,
        "guards": {
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_lockbox_tuning_events": 0,
            "reselection_after_evaluation": 0,
            "threshold_or_representation_changes_after_evaluation": 0,
        },
    }
    public_payload["result_digest"] = hashlib.sha256(
        json.dumps(
            public_payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    write_json(args.public_output, public_payload)

    marker_consumed = {
        **marker_started,
        "state": "CONSUMED",
        "private_output_sha256": sha256_file(args.private_output),
        "public_output_sha256": sha256_file(args.public_output),
        "result_digest": public_payload["result_digest"],
    }
    write_json(args.consumption_marker, marker_consumed, private=True)

    print(
        json.dumps(
            {
                "stage": public_payload["stage"],
                "evaluated_config_count": len(results),
                "shortlist_hash": shortlist["shortlist_hash"],
                "result_digest": public_payload["result_digest"],
                "elapsed_seconds": elapsed,
            },
            ensure_ascii=False,
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="REM-02 private promotion evaluator")
    parser.add_argument("--stage", choices=("calibration", "evaluation"), required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--gold-index", type=Path, required=True)
    parser.add_argument("--calibration-records", type=Path, required=True)
    parser.add_argument("--canonical-batch", type=Path, required=True)
    parser.add_argument("--private-output", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    parser.add_argument("--shortlist-output", type=Path)
    parser.add_argument("--shortlist-input", type=Path)
    parser.add_argument("--consumption-marker", type=Path)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.stage == "calibration":
        if args.shortlist_output is None:
            parser.error("--shortlist-output is required for calibration")
        return calibration_stage(args)
    if args.shortlist_input is None or args.consumption_marker is None:
        parser.error("--shortlist-input and --consumption-marker are required for evaluation")
    return evaluation_stage(args)


if __name__ == "__main__":
    raise SystemExit(main())
