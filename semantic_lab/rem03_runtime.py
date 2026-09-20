from __future__ import annotations

import hashlib
import json
import os
import platform
import resource
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Sequence

from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .embedding_adapters import CandidateSpec, apply_prompt
from .rem01 import build_rem01_fixture_pack, query_representation, topic_descriptor_variant
from .rem03 import (
    assemble_remediated_candidates,
    lexical_alias_ranking,
    lexical_descriptor_ranking,
    load_rem03_config,
)
from .rem02_runtime import _candidate_raw
from .sem01 import TASK_INSTRUCTION
from .sem02 import chunk_text
from .sem03 import eligible_topics

BGE_ID = "BAAI/bge-m3"
BGE_REVISION = "cb1779f90b988b8deb01f9155c790ef9417d7648"


def _rss_bytes() -> int:
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(value * 1024 if platform.system() == "Linux" else value)


def _digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def _rank_metrics(
    rankings: Sequence[list[str]],
    truth: Sequence[str],
    cutoffs: Sequence[int] = (10, 20),
) -> dict[str, float]:
    total = max(1, len(truth))
    result = {
        f"recall_at_{k}": sum(target in ranked[:k] for ranked, target in zip(rankings, truth)) / total
        for k in cutoffs
    }
    rr = 0.0
    for ranked, target in zip(rankings, truth):
        if target in ranked:
            rr += 1.0 / (ranked.index(target) + 1)
    result["mrr"] = rr / total
    return result


def _dense_rankings(matrix: Any, ids: Sequence[str]) -> list[list[str]]:
    import numpy as np

    rows: list[list[str]] = []
    for scores in np.asarray(matrix):
        order = np.argsort(-scores, kind="stable")
        rows.append([str(ids[int(i)]) for i in order])
    return rows


def _one_family_per_domain(catalog: dict[str, Any]) -> set[str]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for topic in catalog["topics"]:
        if topic.get("lifecycle") == "ACTIVE":
            grouped[str(topic["internal_domain"])].append(str(topic["topic_id"]))
    return {
        sorted(ids)[0]
        for _, ids in sorted(grouped.items())
    }


def run_public_runtime(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    import numpy as np
    import sentence_transformers
    import torch
    import transformers
    from sentence_transformers import SentenceTransformer

    config = load_rem03_config()
    raw = _candidate_raw(BGE_ID)
    spec = CandidateSpec.from_dict(raw)
    if str(raw.get("revision")) != BGE_REVISION:
        raise ValueError("BGE revision drifted from REM-02 baseline")

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
        return {
            "round": "REM-03",
            "runtime_status": "NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE",
            "candidate_id": BGE_ID,
            "revision": BGE_REVISION,
            "pass": False,
        }

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    load_started = time.perf_counter()
    model = SentenceTransformer(
        str(snapshot),
        device="cpu",
        local_files_only=True,
        trust_remote_code=False,
    )
    model.eval()
    load_seconds = time.perf_counter() - load_started

    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    topic_ids = [str(topic["topic_id"]) for topic in topics]
    selected_families = _one_family_per_domain(catalog)
    pack = build_rem01_fixture_pack(catalog)
    cases = [
        case for case in pack["cases"]
        if str(case["family"]) in selected_families
    ]
    context_free = [
        case for case in cases
        if case["slice"] in {"zh_short", "mixed", "boundary_no_alias"}
    ]
    context_cases = [case for case in cases if case["slice"] == "context_dependent"]
    long_cases = [case for case in cases if str(case["slice"]).startswith("long_")]

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

    current_texts = [
        query_representation(case, "current_only")
        for case in context_free
    ]
    context_current_texts = [
        query_representation(case, "current_only")
        for case in context_cases
    ]
    context_allowed_texts = [
        query_representation(case, "allowed_context")
        for case in context_cases
    ]
    long_texts = [
        query_representation(case, "current_only")
        for case in long_cases
    ]

    def prepare_query(text: str) -> str:
        return apply_prompt(spec, "query", text, TASK_INSTRUCTION)

    prepared_groups = {
        "context_free_current": [prepare_query(text) for text in current_texts],
        "context_current": [prepare_query(text) for text in context_current_texts],
        "context_allowed": [prepare_query(text) for text in context_allowed_texts],
        "long_current": [prepare_query(text) for text in long_texts],
    }

    declared = int(spec.context_tokens or 0)
    runtime_limit = int(getattr(model, "max_seq_length", declared) or declared)
    effective_limit = min(declared, runtime_limit) if runtime_limit else declared

    def token_count(text: str) -> int:
        encoded = model.tokenizer(
            text,
            add_special_tokens=True,
            truncation=False,
            return_attention_mask=False,
        )
        return len(encoded["input_ids"])

    max_tokens = max(
        [token_count(text) for text in docs_full + docs_names]
        + [
            token_count(text)
            for values in prepared_groups.values()
            for text in values
        ],
        default=0,
    )
    if max_tokens > effective_limit:
        raise RuntimeError(
            f"REM-03 public runtime input {max_tokens} > {effective_limit}; truncation forbidden"
        )

    encode_kwargs = dict(
        batch_size=8,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    started = time.perf_counter()
    full_vectors = model.encode(docs_full, **encode_kwargs)
    names_vectors = model.encode(docs_names, **encode_kwargs)
    doc_seconds = time.perf_counter() - started

    query_vectors: dict[str, Any] = {}
    query_seconds: dict[str, float] = {}
    for key, values in prepared_groups.items():
        started = time.perf_counter()
        query_vectors[key] = model.encode(values, **encode_kwargs)
        query_seconds[key] = time.perf_counter() - started

    full_matrix = {
        key: np.asarray(vectors, dtype="float32")
        @ np.asarray(full_vectors, dtype="float32").T
        for key, vectors in query_vectors.items()
    }
    names_matrix = {
        key: np.asarray(vectors, dtype="float32")
        @ np.asarray(names_vectors, dtype="float32").T
        for key, vectors in query_vectors.items()
    }
    full_rankings = {
        key: _dense_rankings(matrix, topic_ids)
        for key, matrix in full_matrix.items()
    }
    names_rankings = {
        key: _dense_rankings(matrix, topic_ids)
        for key, matrix in names_matrix.items()
    }

    def policy_rankings(
        cases_: Sequence[dict[str, Any]],
        text_key: str,
        query_texts: Sequence[str],
        *,
        add_context_sources: tuple[str, str] | None = None,
    ) -> list[list[str]]:
        outputs: list[list[str]] = []
        for i, (case, query_text) in enumerate(zip(cases_, query_texts)):
            sources: dict[str, Sequence[str]] = {
                "dense_full_current": full_rankings[text_key][i],
                "dense_names_current": names_rankings[text_key][i],
                "lexical_alias_current": lexical_alias_ranking(query_text, topics),
                "lexical_descriptor_current": lexical_descriptor_ranking(query_text, topics),
            }
            policy_query = query_text
            if add_context_sources is not None:
                full_key, names_key = add_context_sources
                allowed_text = query_representation(case, "allowed_context")
                policy_query = allowed_text
                sources.update(
                    {
                        "dense_full_context": full_rankings[full_key][i],
                        "dense_names_context": names_rankings[names_key][i],
                        "lexical_alias_context": lexical_alias_ranking(allowed_text, topics),
                        "lexical_descriptor_context": lexical_descriptor_ranking(
                            allowed_text, topics
                        ),
                    }
                )
            result = assemble_remediated_candidates(
                query=policy_query,
                topics=topics,
                source_rankings=sources,
                profile=None,
                config=config,
            )
            outputs.append([row["topic_id"] for row in result])
        return outputs

    context_free_rankings = policy_rankings(
        context_free,
        "context_free_current",
        current_texts,
    )
    context_current_rankings = policy_rankings(
        context_cases,
        "context_current",
        context_current_texts,
    )
    context_allowed_rankings = policy_rankings(
        context_cases,
        "context_current",
        context_current_texts,
        add_context_sources=("context_allowed", "context_allowed"),
    )
    long_rankings = policy_rankings(
        long_cases,
        "long_current",
        long_texts,
    )

    context_free_truth = [str(case["topic_id"]) for case in context_free]
    boundary_indices = [
        i for i, case in enumerate(context_free)
        if case["slice"] == "boundary_no_alias"
    ]
    boundary_rankings = [context_free_rankings[i] for i in boundary_indices]
    boundary_truth = [context_free_truth[i] for i in boundary_indices]
    context_truth = [str(case["topic_id"]) for case in context_cases]
    long_truth = [str(case["topic_id"]) for case in long_cases]

    replay = model.encode(
        prepared_groups["context_free_current"][:4],
        **encode_kwargs,
    )
    replay2 = model.encode(
        prepared_groups["context_free_current"][:4],
        **encode_kwargs,
    )
    exact_replay = bool(np.array_equal(np.asarray(replay), np.asarray(replay2)))

    baseline_path = (
        repo_root()
        / "artifacts"
        / "remediation-v0.3"
        / "rem02-public-runtime-bge.json"
    )
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))

    result = {
        "round": "REM-03",
        "benchmark_version": config["benchmark_version"],
        "lab_commit": lab_commit,
        "candidate_id": BGE_ID,
        "revision": BGE_REVISION,
        "runtime_status": "PASS",
        "runtime_qualified": True,
        "contains_real_paia_input": False,
        "private_artifact_reads": 0,
        "api_egress": False,
        "owner_semantic_labeling": False,
        "model_training": False,
        "production_paia_write": False,
        "scope": {
            "selected_family_count": len(selected_families),
            "context_free_cases": len(context_free),
            "context_dependent_cases": len(context_cases),
            "long_cases": len(long_cases),
            "full_catalog_topic_count": len(topics),
        },
        "remediated_policy_metrics": {
            "context_free": _rank_metrics(
                context_free_rankings, context_free_truth
            ),
            "boundary_no_alias": _rank_metrics(
                boundary_rankings, boundary_truth
            ),
            "context_current": _rank_metrics(
                context_current_rankings, context_truth
            ),
            "context_allowed": _rank_metrics(
                context_allowed_rankings, context_truth
            ),
            "long": _rank_metrics(long_rankings, long_truth),
        },
        "rem02_public_baseline": {
            "candidate_rrf_recall_at_20": baseline["public_quality_vector"][
                "candidate_recall_at_20"
            ],
            "boundary_no_alias_recall_at_20": baseline["public_quality_vector"][
                "boundary_no_alias_recall_at_20"
            ],
            "context_allowed_recall_at_20": baseline["public_quality_vector"][
                "context_allowed_recall_at_20"
            ],
            "input_retrieval_ndcg_at_10": baseline["public_quality_vector"][
                "input_retrieval_ndcg_at_10"
            ],
        },
        "reproducibility": {
            "encoding_replay_exact": exact_replay,
            "candidate_ranking_digest": _digest(
                {
                    "context_free": context_free_rankings,
                    "context_current": context_current_rankings,
                    "context_allowed": context_allowed_rankings,
                    "long": long_rankings,
                }
            ),
        },
        "performance": {
            "model_load_seconds": load_seconds,
            "document_encode_seconds": doc_seconds,
            "query_encode_seconds": query_seconds,
            "peak_rss_bytes": _rss_bytes(),
            "embedding_dimensions": int(np.asarray(full_vectors).shape[1]),
            "effective_context_tokens": effective_limit,
            "max_input_tokens": max_tokens,
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
    result["result_digest"] = _digest(
        {
            "candidate_id": result["candidate_id"],
            "revision": result["revision"],
            "metrics": result["remediated_policy_metrics"],
            "ranking_digest": result["reproducibility"]["candidate_ranking_digest"],
        }
    )
    result["pass"] = exact_replay
    return result
