from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import resource
import time
from pathlib import Path
from typing import Any

import yaml

from .b0 import benchmark_fingerprint, build_fixture_pack, ranking_metrics, topic_document
from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .embedding_adapters import CandidateSpec, apply_prompt, validate_candidate_spec
from .sem01 import TASK_INSTRUCTION


def _load_config() -> dict[str, Any]:
    path = repo_root() / "configs" / "sem01_bakeoff_v0.1.yaml"
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("SEM-01 config must be a mapping")
    return value


def _candidate_raw(candidate_id: str) -> dict[str, Any]:
    for item in _load_config().get("candidates", []):
        if item.get("id") == candidate_id:
            if item.get("kind") != "local":
                raise ValueError(f"{candidate_id} is not a local candidate")
            return item
    raise ValueError(f"Unknown local candidate: {candidate_id}")


def _digest_rankings(rankings: list[list[str]]) -> str:
    return hashlib.sha256(json.dumps(rankings, separators=(",", ":")).encode()).hexdigest()


def _rss_bytes() -> int:
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(value * 1024 if platform.system() == "Linux" else value)


def _rank(matrix: Any, query_vectors: Any, topic_ids: list[str], supported: list[int], total: int) -> list[list[str]]:
    import numpy as np

    rankings: list[list[str]] = [[] for _ in range(total)]
    if len(supported) == 0:
        return rankings
    scores = np.asarray(query_vectors, dtype="float32") @ np.asarray(matrix, dtype="float32").T
    for row, case_index in enumerate(supported):
        order = np.argsort(-scores[row], kind="stable")
        rankings[case_index] = [topic_ids[int(index)] for index in order]
    return rankings


def _slice_metrics(cases: list[dict[str, Any]], rankings: list[list[str]]) -> dict[str, Any]:
    truth = [str(case["topic_id"]) for case in cases]
    result: dict[str, Any] = {}
    for slice_name in sorted({str(case["slice"]) for case in cases}):
        indices = [i for i, case in enumerate(cases) if case["slice"] == slice_name]
        result[slice_name] = ranking_metrics(
            [rankings[i] for i in indices],
            [truth[i] for i in indices],
        )
    return result


def run_local_runtime(candidate_id: str, lab_commit: str) -> dict[str, Any]:
    raw = _candidate_raw(candidate_id)
    spec = CandidateSpec.from_dict(raw)
    validate_candidate_spec(spec)
    revision = str(raw.get("revision") or "")
    if len(revision) < 12:
        raise ValueError(f"{candidate_id} must use an immutable pinned revision")
    trust_remote_code = bool(raw.get("trust_remote_code", False))

    catalog = load_catalog()
    validate_catalog_contract(catalog)
    active = [topic for topic in catalog.get("topics", []) if topic.get("lifecycle") == "ACTIVE"]
    topic_docs = {str(topic["topic_id"]): topic_document(topic) for topic in active}
    fixture_pack = build_fixture_pack(catalog)
    cases = fixture_pack["cases"]
    fingerprint = benchmark_fingerprint(topic_docs, cases)

    base = {
        "round": "SEM-01",
        "candidate_id": candidate_id,
        "revision": revision,
        "benchmark_version": _load_config()["benchmark_version"],
        "benchmark_fingerprint": fingerprint,
        "case_count": len(cases),
        "topic_count": len(topic_docs),
        "contains_real_paia_input": False,
        "api_egress": False,
        "model_training": False,
        "owner_semantic_labeling": False,
        "trust_remote_code": trust_remote_code,
        "lab_commit": lab_commit,
    }

    try:
        import numpy as np
        import sentence_transformers
        import torch
        import transformers
        from sentence_transformers import SentenceTransformer

        load_start = time.perf_counter()
        model = SentenceTransformer(
            candidate_id,
            revision=revision,
            trust_remote_code=trust_remote_code,
            device="cpu",
        )
        load_seconds = time.perf_counter() - load_start
        model.eval()

        declared_limit = int(spec.context_tokens or 0)
        runtime_limit = int(getattr(model, "max_seq_length", declared_limit) or declared_limit)
        effective_limit = min(declared_limit, runtime_limit) if runtime_limit else declared_limit
        if effective_limit <= 0:
            raise RuntimeError("No positive effective context limit")

        topic_ids = list(topic_docs)
        prepared_docs = [
            apply_prompt(spec, "document", topic_docs[topic_id], TASK_INSTRUCTION)
            for topic_id in topic_ids
        ]
        prepared_queries = [
            apply_prompt(spec, "query", str(case["text"]), TASK_INSTRUCTION)
            for case in cases
        ]

        def token_count(text: str) -> int:
            encoded = model.tokenizer(
                text,
                add_special_tokens=True,
                truncation=False,
                return_attention_mask=False,
            )
            return len(encoded["input_ids"])

        doc_lengths = [token_count(text) for text in prepared_docs]
        if any(length > effective_limit for length in doc_lengths):
            return {
                **base,
                "runtime_status": "INCOMPATIBLE_TOPIC_DOCUMENT_OVER_CONTEXT",
                "effective_context_tokens": effective_limit,
                "max_topic_document_tokens": max(doc_lengths),
                "runtime_qualified": False,
            }

        query_lengths = [token_count(text) for text in prepared_queries]
        supported = [i for i, length in enumerate(query_lengths) if length <= effective_limit]
        over_context = [i for i, length in enumerate(query_lengths) if length > effective_limit]

        encode_kwargs = {
            "batch_size": 8,
            "show_progress_bar": False,
            "convert_to_numpy": True,
            "normalize_embeddings": True,
        }

        start = time.perf_counter()
        doc_vectors = model.encode(prepared_docs, **encode_kwargs)
        doc_seconds = time.perf_counter() - start

        supported_texts = [prepared_queries[i] for i in supported]
        start = time.perf_counter()
        query_vectors = model.encode(supported_texts, **encode_kwargs)
        query_seconds = time.perf_counter() - start
        rankings = _rank(doc_vectors, query_vectors, topic_ids, supported, len(cases))

        start = time.perf_counter()
        query_vectors_repeat = model.encode(supported_texts, **encode_kwargs)
        repeat_seconds = time.perf_counter() - start
        repeat_rankings = _rank(doc_vectors, query_vectors_repeat, topic_ids, supported, len(cases))

        truth = [str(case["topic_id"]) for case in cases]
        dimensions = int(np.asarray(doc_vectors).shape[1])
        stability = _digest_rankings(rankings) == _digest_rankings(repeat_rankings)
        result = {
            **base,
            "runtime_status": "PASS",
            "runtime_qualified": bool(stability),
            "effective_context_tokens": effective_limit,
            "max_topic_document_tokens": max(doc_lengths),
            "max_query_tokens": max(query_lengths),
            "over_context_case_count": len(over_context),
            "over_context_case_ids": [cases[i]["id"] for i in over_context],
            "truncation_policy": "PREFLIGHT_ERROR_SKIP_NO_SILENT_TRUNCATION",
            "metrics": ranking_metrics(rankings, truth),
            "slice_metrics": _slice_metrics(cases, rankings),
            "performance": {
                "model_load_seconds": load_seconds,
                "document_encode_seconds": doc_seconds,
                "query_encode_seconds": query_seconds,
                "repeat_query_encode_seconds": repeat_seconds,
                "supported_query_throughput_per_second": (
                    len(supported) / query_seconds if query_seconds else None
                ),
                "peak_rss_bytes": _rss_bytes(),
                "index_size_bytes_float32": len(topic_ids) * dimensions * 4,
                "embedding_dimensions": dimensions,
            },
            "reproducibility": {
                "repeated_run_stable": stability,
                "ranking_digest": _digest_rankings(rankings),
                "repeat_ranking_digest": _digest_rankings(repeat_rankings),
            },
            "runtime": {
                "python": platform.python_version(),
                "sentence_transformers": sentence_transformers.__version__,
                "transformers": transformers.__version__,
                "torch": torch.__version__,
                "numpy": np.__version__,
                "platform": platform.platform(),
                "github_runner_os": os.environ.get("RUNNER_OS"),
            },
        }
        return result
    except Exception as exc:
        return {
            **base,
            "runtime_status": "RUNTIME_ERROR",
            "runtime_qualified": False,
            "error_type": type(exc).__name__,
            "error_message": str(exc)[:2000],
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="SEM-01 pinned local runtime B0")
    parser.add_argument("--candidate-id", required=True)
    parser.add_argument("--lab-commit", default=os.environ.get("GITHUB_SHA", "UNCOMMITTED"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    result = run_local_runtime(args.candidate_id, args.lab_commit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
