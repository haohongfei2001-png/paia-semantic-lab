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

from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .embedding_adapters import CandidateSpec, LexicalControl, apply_prompt
from .rem01 import (
    build_rem01_fixture_pack,
    query_representation,
    topic_descriptor_variant,
)
from .sem01 import TASK_INSTRUCTION, load_sem01_config
from .sem02 import build_sem02_fixture_pack
from .sem03 import eligible_topics, lexical_ranking

CONFIG_PATH = repo_root() / "configs" / "rem02_bakeoff_v0.1.yaml"


def load_rem02_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-02 config must be a mapping")
    return value


def _candidate_raw(candidate_id: str) -> dict[str, Any]:
    for item in load_sem01_config().get("candidates", []):
        if item.get("id") == candidate_id:
            if item.get("kind") != "local":
                raise ValueError(f"{candidate_id} is not a local candidate")
            return item
    raise ValueError(f"Unknown local candidate: {candidate_id}")


def _cache_snapshot(config: dict[str, Any], candidate_id: str) -> tuple[Path, str]:
    row = next(
        item for item in config["runtime_candidates"] if item["id"] == candidate_id
    )
    revision = str(row["revision"])
    root = (
        Path.home()
        / ".cache"
        / "huggingface"
        / "hub"
        / str(row["cache_dir_name"])
        / "snapshots"
        / revision
    )
    return root, revision


def _rss_bytes() -> int:
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(value * 1024 if platform.system() == "Linux" else value)


def _digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )
    ).hexdigest()


def _rank_metrics(
    rankings: Sequence[list[str]], truth: Sequence[str], cutoffs: Sequence[int]
) -> dict[str, float]:
    total = max(1, len(truth))
    result: dict[str, float] = {}
    for k in cutoffs:
        result[f"recall_at_{k}"] = sum(
            target in ranked[:k] for ranked, target in zip(rankings, truth)
        ) / total
    rr = 0.0
    for ranked, target in zip(rankings, truth):
        if target in ranked:
            rr += 1.0 / (ranked.index(target) + 1)
    result["mrr"] = rr / total
    return result


def _slice_metrics(
    cases: Sequence[dict[str, Any]],
    rankings: Sequence[list[str]],
    cutoffs: Sequence[int],
) -> dict[str, Any]:
    truth = [str(case["topic_id"]) for case in cases]
    result = {"overall": _rank_metrics(rankings, truth, cutoffs)}
    for name in sorted({str(case["slice"]) for case in cases}):
        idx = [i for i, case in enumerate(cases) if str(case["slice"]) == name]
        result[name] = _rank_metrics(
            [rankings[i] for i in idx],
            [truth[i] for i in idx],
            cutoffs,
        )
    return result


def _rrf(dense: Sequence[str], lexical: Sequence[str]) -> list[str]:
    scores: dict[str, float] = {}
    for rank, topic_id in enumerate(dense[:32], 1):
        scores[topic_id] = scores.get(topic_id, 0.0) + 1.0 / (60 + rank)
    for rank, topic_id in enumerate(lexical[:16], 1):
        scores[topic_id] = scores.get(topic_id, 0.0) + 1.0 / (30 + rank)
    return [
        topic_id
        for topic_id, _ in sorted(
            scores.items(), key=lambda item: (-item[1], item[0])
        )
    ]


def _dense_rankings(score_matrix: Any, ids: Sequence[str]) -> list[list[str]]:
    import numpy as np

    rankings: list[list[str]] = []
    for row in np.asarray(score_matrix):
        order = np.argsort(-row, kind="stable")
        rankings.append([str(ids[int(index)]) for index in order])
    return rankings


def _retrieval_metrics(
    rankings: Sequence[list[str]], queries: Sequence[dict[str, Any]]
) -> dict[str, float]:
    import math

    ndcg = 0.0
    recall = 0.0
    rr = 0.0
    judged = 0
    hard_negative_top10 = 0
    hard_negative_total = 0
    for ranked, query in zip(rankings, queries):
        relevant = [str(value) for value in query.get("relevant_doc_ids", [])]
        if relevant:
            target = relevant[0]
            judged += 1
            if target in ranked[:10]:
                rank = ranked.index(target) + 1
                ndcg += 1.0 / math.log2(rank + 1)
                rr += 1.0 / rank
            recall += float(target in ranked[:20])
        for negative in query.get("hard_negative_doc_ids", []):
            hard_negative_total += 1
            hard_negative_top10 += int(str(negative) in ranked[:10])
    return {
        "ndcg_at_10": ndcg / max(1, judged),
        "recall_at_20": recall / max(1, judged),
        "mrr_at_10": rr / max(1, judged),
        "hard_negative_top10_fpr": hard_negative_top10 / max(1, hard_negative_total),
    }


def _token_count(model: Any, text: str) -> int:
    encoded = model.tokenizer(
        text,
        add_special_tokens=True,
        truncation=False,
        return_attention_mask=False,
    )
    return len(encoded["input_ids"])


def _encode(
    model: Any,
    spec: CandidateSpec,
    texts: Sequence[str],
    *,
    role: str,
    batch_size: int,
) -> Any:
    prepared = [
        apply_prompt(spec, role, text, TASK_INSTRUCTION) for text in texts
    ]
    return model.encode(
        prepared,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )


def run_candidate(candidate_id: str, lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    import numpy as np
    import sentence_transformers
    import torch
    import transformers
    from sentence_transformers import SentenceTransformer

    config = load_rem02_config()
    raw = _candidate_raw(candidate_id)
    spec = CandidateSpec.from_dict(raw)
    snapshot, revision = _cache_snapshot(config, candidate_id)

    base = {
        "round": "REM-02",
        "benchmark_version": config["benchmark_version"],
        "candidate_id": candidate_id,
        "revision": revision,
        "lab_commit": lab_commit,
        "contains_real_paia_input": False,
        "private_artifact_reads": 0,
        "api_egress": False,
        "owner_semantic_labeling": False,
        "model_training": False,
        "production_paia_write": False,
    }
    if not snapshot.exists():
        return {
            **base,
            "runtime_status": "NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE",
            "runtime_qualified": False,
            "cache_snapshot_present": False,
        }

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

    started = time.perf_counter()
    model = SentenceTransformer(
        candidate_id,
        revision=revision,
        trust_remote_code=bool(raw.get("trust_remote_code", False)),
        device="cpu",
        local_files_only=True,
    )
    model.eval()
    load_seconds = time.perf_counter() - started

    declared_limit = int(spec.context_tokens or 0)
    runtime_limit = int(getattr(model, "max_seq_length", declared_limit) or declared_limit)
    effective_limit = min(declared_limit, runtime_limit) if runtime_limit else declared_limit
    if effective_limit <= 0:
        raise RuntimeError("No positive effective context limit")

    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    topic_ids = [str(topic["topic_id"]) for topic in topics]
    rem01_pack = build_rem01_fixture_pack(catalog)
    cases = list(rem01_pack["cases"])
    runtime_matrix = config["public_runtime_matrix"]
    by_domain: dict[str, list[str]] = {}
    for topic in topics:
        by_domain.setdefault(str(topic.get("internal_domain", "")), []).append(
            str(topic["topic_id"])
        )
    selected_topic_ids = {
        sorted(ids)[0]
        for _, ids in sorted(by_domain.items())
        if ids
    }
    context_free = [
        case
        for case in cases
        if str(case["topic_id"]) in selected_topic_ids
        and case["slice"] in {"zh_short", "mixed", "boundary_no_alias"}
    ]
    context_cases = [
        case
        for case in cases
        if str(case["topic_id"]) in selected_topic_ids
        and case["slice"] == "context_dependent"
    ]
    long_cases = [
        case for case in cases if str(case["slice"]).startswith("long_")
    ][: int(runtime_matrix["long_case_limit"])]
    cutoffs = [int(value) for value in config["diagnostic_cutoffs"]]
    batch_size = int(config["batch_size"])

    descriptor_variants = [
        str(value) for value in runtime_matrix["descriptor_variants"]
    ]
    descriptor_vectors: dict[str, Any] = {}
    descriptor_metrics: dict[str, Any] = {}

    current_queries = [query_representation(case, "current_only") for case in context_free]
    current_prepared = [
        apply_prompt(spec, "query", text, TASK_INSTRUCTION) for text in current_queries
    ]
    context_prepared_by_variant = {
        variant: [
            apply_prompt(
                spec,
                "query",
                query_representation(case, variant),
                TASK_INSTRUCTION,
            )
            for case in context_cases
        ]
        for variant in runtime_matrix["context_query_variants"]
    }
    long_prepared = [
        apply_prompt(
            spec,
            "query",
            query_representation(case, "current_only"),
            TASK_INSTRUCTION,
        )
        for case in long_cases
    ]

    all_query_texts = list(current_prepared)
    for rows in context_prepared_by_variant.values():
        all_query_texts.extend(rows)
    all_query_texts.extend(long_prepared)

    descriptor_prepared_by_variant: dict[str, list[str]] = {}
    for variant in descriptor_variants:
        prepared = [
            apply_prompt(
                spec,
                "document",
                topic_descriptor_variant(topic, variant),
                TASK_INSTRUCTION,
            )
            for topic in topics
        ]
        descriptor_prepared_by_variant[variant] = prepared

    max_tokens = 0
    for text in all_query_texts:
        max_tokens = max(max_tokens, _token_count(model, text))
    for prepared in descriptor_prepared_by_variant.values():
        for text in prepared:
            max_tokens = max(max_tokens, _token_count(model, text))
    if max_tokens > effective_limit:
        return {
            **base,
            "runtime_status": "INCOMPATIBLE_OVER_CONTEXT",
            "runtime_qualified": False,
            "effective_context_tokens": effective_limit,
            "max_input_tokens": max_tokens,
        }

    encode_started = time.perf_counter()
    current_query_vectors = model.encode(
        current_prepared,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    context_query_vectors = {
        variant: model.encode(
            rows,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        for variant, rows in context_prepared_by_variant.items()
    }
    long_query_vectors = model.encode(
        long_prepared,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    query_encode_seconds = time.perf_counter() - encode_started

    doc_encode_seconds: dict[str, float] = {}
    for variant, prepared in descriptor_prepared_by_variant.items():
        started_variant = time.perf_counter()
        descriptor_vectors[variant] = model.encode(
            prepared,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        doc_encode_seconds[variant] = time.perf_counter() - started_variant

        matrix = np.asarray(current_query_vectors, dtype="float32") @ np.asarray(
            descriptor_vectors[variant], dtype="float32"
        ).T
        rankings = _dense_rankings(matrix, topic_ids)
        descriptor_metrics[variant] = {
            "metrics": _slice_metrics(context_free, rankings, cutoffs),
            "ranking_digest": _digest(rankings),
        }

    baseline_variant = "full_boundaries"
    baseline_docs = np.asarray(descriptor_vectors[baseline_variant], dtype="float32")

    context_metrics: dict[str, Any] = {}
    for variant, vectors in context_query_vectors.items():
        matrix = np.asarray(vectors, dtype="float32") @ baseline_docs.T
        rankings = _dense_rankings(matrix, topic_ids)
        context_metrics[variant] = {
            "metrics": _slice_metrics(context_cases, rankings, cutoffs),
            "ranking_digest": _digest(rankings),
        }

    long_matrix = np.asarray(long_query_vectors, dtype="float32") @ baseline_docs.T
    long_rankings = _dense_rankings(long_matrix, topic_ids)
    long_metrics = {
        "metrics": _slice_metrics(long_cases, long_rankings, cutoffs),
        "ranking_digest": _digest(long_rankings),
    }

    dense_matrix = (
        np.asarray(current_query_vectors, dtype="float32") @ baseline_docs.T
    )
    dense_rankings = _dense_rankings(dense_matrix, topic_ids)
    lexical_rankings = [
        lexical_ranking(str(case["text"]), topics) for case in context_free
    ]
    rrf_rankings = [
        _rrf(dense, lexical)
        for dense, lexical in zip(dense_rankings, lexical_rankings)
    ]
    fusion_metrics = {
        "dense": {
            "metrics": _slice_metrics(context_free, dense_rankings, cutoffs),
            "ranking_digest": _digest(dense_rankings),
        },
        "lexical": {
            "metrics": _slice_metrics(context_free, lexical_rankings, cutoffs),
            "ranking_digest": _digest(lexical_rankings),
        },
        "rrf": {
            "metrics": _slice_metrics(context_free, rrf_rankings, cutoffs),
            "ranking_digest": _digest(rrf_rankings),
        },
    }

    retrieval_pack = build_sem02_fixture_pack()
    documents = list(retrieval_pack["documents"])
    queries = list(retrieval_pack["queries"])
    document_ids = [str(row["id"]) for row in documents]
    document_prepared = [
        apply_prompt(spec, "document", str(row["text"]), TASK_INSTRUCTION)
        for row in documents
    ]
    retrieval_query_prepared = [
        apply_prompt(spec, "query", str(row["text"]), TASK_INSTRUCTION)
        for row in queries
    ]
    for text in document_prepared + retrieval_query_prepared:
        tokens = _token_count(model, text)
        if tokens > effective_limit:
            raise RuntimeError("Public retrieval fixture unexpectedly exceeds context")
    doc_vectors = model.encode(
        document_prepared,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    retrieval_query_vectors = model.encode(
        retrieval_query_prepared,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    retrieval_scores = (
        np.asarray(retrieval_query_vectors, dtype="float32")
        @ np.asarray(doc_vectors, dtype="float32").T
    )
    retrieval_rankings = _dense_rankings(retrieval_scores, document_ids)
    input_retrieval_metrics = _retrieval_metrics(retrieval_rankings, queries)

    replay_sample = current_prepared[: min(4, len(current_prepared))]
    first = model.encode(
        replay_sample,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    second = model.encode(
        replay_sample,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    deterministic_encoding = bool(
        np.array_equal(np.asarray(first), np.asarray(second))
    )

    dimensions = int(np.asarray(baseline_docs).shape[1])
    public_quality_vector = {
        "candidate_recall_at_20": fusion_metrics["rrf"]["metrics"]["overall"][
            "recall_at_20"
        ],
        "boundary_no_alias_recall_at_20": fusion_metrics["rrf"]["metrics"][
            "boundary_no_alias"
        ]["recall_at_20"],
        "context_allowed_recall_at_20": context_metrics["allowed_context"]["metrics"][
            "overall"
        ]["recall_at_20"],
        "input_retrieval_ndcg_at_10": input_retrieval_metrics["ndcg_at_10"],
        "input_retrieval_recall_at_20": input_retrieval_metrics["recall_at_20"],
    }

    return {
        **base,
        "runtime_status": "PASS",
        "runtime_qualified": True,
        "cache_snapshot_present": True,
        "effective_context_tokens": effective_limit,
        "max_input_tokens": max_tokens,
        "public_runtime_scope": {
            "selected_family_count": len(selected_topic_ids),
            "context_free_cases": len(context_free),
            "context_dependent_cases": len(context_cases),
            "long_cases": len(long_cases),
            "full_catalog_topic_count": len(topics),
            "descriptor_variants": descriptor_variants,
            "context_query_variants": list(runtime_matrix["context_query_variants"]),
        },
        "descriptor_bakeoff": descriptor_metrics,
        "context_bakeoff": context_metrics,
        "long_input_bakeoff": long_metrics,
        "fusion_bakeoff": fusion_metrics,
        "input_retrieval": {
            "metrics": input_retrieval_metrics,
            "ranking_digest": _digest(retrieval_rankings),
        },
        "public_quality_vector": public_quality_vector,
        "reproducibility": {
            "encoding_replay_exact": deterministic_encoding,
        },
        "performance": {
            "model_load_seconds": load_seconds,
            "query_encode_seconds": query_encode_seconds,
            "document_encode_seconds": doc_encode_seconds,
            "peak_rss_bytes": _rss_bytes(),
            "embedding_dimensions": dimensions,
        },
        "runtime": {
            "python": platform.python_version(),
            "sentence_transformers": sentence_transformers.__version__,
            "transformers": transformers.__version__,
            "torch": torch.__version__,
            "numpy": np.__version__,
            "platform": platform.platform(),
        },
    }


def _dominates(left: dict[str, Any], right: dict[str, Any]) -> bool:
    lq = left["public_quality_vector"]
    rq = right["public_quality_vector"]
    quality_keys = [
        "candidate_recall_at_20",
        "boundary_no_alias_recall_at_20",
        "context_allowed_recall_at_20",
        "input_retrieval_ndcg_at_10",
        "input_retrieval_recall_at_20",
    ]
    quality_no_worse = all(float(lq[key]) >= float(rq[key]) for key in quality_keys)
    quality_better = any(float(lq[key]) > float(rq[key]) for key in quality_keys)
    lmem = int(left["performance"]["peak_rss_bytes"])
    rmem = int(right["performance"]["peak_rss_bytes"])
    resource_no_worse = lmem <= rmem
    resource_better = lmem < rmem
    return quality_no_worse and resource_no_worse and (quality_better or resource_better)


def aggregate_runtime(directory: Path, lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_rem02_config()
    expected = {
        str(row["id"]): {
            "revision": str(row["revision"]),
            "cache_dir_name": str(row["cache_dir_name"]),
        }
        for row in config["runtime_candidates"]
    }
    records: dict[str, dict[str, Any]] = {}
    for path in sorted(directory.glob("*.json")):
        value = json.loads(path.read_text(encoding="utf-8"))
        candidate_id = value.get("candidate_id")
        if candidate_id:
            records[str(candidate_id)] = value

    runtime_rows: list[dict[str, Any]] = []
    for candidate_id, meta in expected.items():
        row = records.get(candidate_id)
        if row is None:
            snapshot = (
                Path.home()
                / ".cache"
                / "huggingface"
                / "hub"
                / meta["cache_dir_name"]
                / "snapshots"
                / meta["revision"]
            )
            runtime_rows.append(
                {
                    "candidate_id": candidate_id,
                    "revision": meta["revision"],
                    "runtime_status": (
                        "NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE"
                        if not snapshot.exists()
                        else "NOT_RUN_AVAILABLE_CACHE"
                    ),
                    "runtime_qualified": False,
                    "cache_snapshot_present": snapshot.exists(),
                }
            )
        else:
            runtime_rows.append(row)

    executed = [
        row
        for row in runtime_rows
        if row.get("runtime_status") == "PASS"
        and row.get("runtime_qualified") is True
    ]
    frontier: list[str] = []
    for row in executed:
        if not any(
            other["candidate_id"] != row["candidate_id"] and _dominates(other, row)
            for other in executed
        ):
            frontier.append(str(row["candidate_id"]))

    missing_or_unrun = [
        {
            "candidate_id": row["candidate_id"],
            "runtime_status": row["runtime_status"],
            "revision": row.get("revision"),
        }
        for row in runtime_rows
        if row.get("runtime_status") != "PASS"
    ]
    all_executed_reproducible = all(
        bool(row.get("reproducibility", {}).get("encoding_replay_exact"))
        for row in executed
    )

    payload = {
        "round": "REM-02",
        "benchmark_version": config["benchmark_version"],
        "lab_commit": lab_commit,
        "authorization": {
            "private_sem06_sem07_artifacts": False,
            "private_artifact_reads": 0,
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "owner_semantic_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_sem07_lockbox_tuning_events": 0,
        },
        "runtime_candidates": runtime_rows,
        "executed_candidate_ids": sorted(
            str(row["candidate_id"]) for row in executed
        ),
        "unexecuted_candidates": missing_or_unrun,
        "public_engineering_frontier": sorted(frontier),
        "public_frontier_claim": (
            "PUBLIC_SYNTHETIC_ENGINEERING_ONLY_NOT_A_PROMOTION_SHORTLIST"
        ),
        "private_promotion": {
            "family_grouped_calibration": "NOT_RUN_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "bounded_legacy_evaluation": "NOT_RUN_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "promotion_shortlist": "WITHHELD_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
        },
        "separation": {
            "input_retrieval_reported_separately": True,
            "topic_candidate_retrieval_reported_separately": True,
        },
        "mechanism_evidence_from_rem01": {
            "field_multivector": "TECHNICALLY_VIABLE_REM01_NOT_REPEATED_IN_REM02_RUNTIME",
            "long_chunk_max": "TECHNICALLY_VIABLE_REM01_NOT_REPEATED_IN_REM02_RUNTIME",
        },
        "gates": {
            "public_runtime_bakeoff": (
                "PASS" if executed and all_executed_reproducible else "FAIL"
            ),
            "private_promotion_evidence": "BLOCKED_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "rem02_round_completion": "BLOCKED",
            "personalized_semantic_quality": "WITHHELD",
        },
    }
    digest_payload = {
        "candidate_id": [
            {
                "candidate_id": row.get("candidate_id"),
                "revision": row.get("revision"),
                "runtime_status": row.get("runtime_status"),
                "descriptor": {
                    key: value.get("ranking_digest")
                    for key, value in row.get("descriptor_bakeoff", {}).items()
                },
                "context": {
                    key: value.get("ranking_digest")
                    for key, value in row.get("context_bakeoff", {}).items()
                },
                "fusion": {
                    key: value.get("ranking_digest")
                    for key, value in row.get("fusion_bakeoff", {}).items()
                },
                "input_retrieval": row.get("input_retrieval", {}).get(
                    "ranking_digest"
                ),
            }
            for row in runtime_rows
        ],
        "frontier": payload["public_engineering_frontier"],
    }
    payload["deterministic_result_digest"] = _digest(digest_payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="REM-02 public runtime bake-off")
    parser.add_argument("--candidate-id")
    parser.add_argument("--aggregate-dir", type=Path)
    parser.add_argument("--lab-commit", default=os.environ.get("GITHUB_SHA", "UNCOMMITTED"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if args.candidate_id:
        result = run_candidate(args.candidate_id, args.lab_commit)
    elif args.aggregate_dir:
        result = aggregate_runtime(args.aggregate_dir, args.lab_commit)
    else:
        parser.error("Provide --candidate-id or --aggregate-dir")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    if args.candidate_id:
        return 0 if result.get("runtime_status") in {
            "PASS",
            "NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE",
        } else 1
    return 0 if result["gates"]["public_runtime_bakeoff"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
