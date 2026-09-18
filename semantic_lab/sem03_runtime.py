from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import resource
import time
from itertools import combinations
from pathlib import Path
from typing import Any

import yaml

from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .embedding_adapters import CandidateSpec, apply_prompt, validate_candidate_spec
from .sem01 import TASK_INSTRUCTION
from .sem03 import (
    assemble_candidates,
    build_sem03_fixture_pack,
    eligible_topics,
    lexical_ranking,
    load_sem03_config,
    topic_descriptor,
)


def _sem01_config() -> dict[str, Any]:
    value = yaml.safe_load(
        (repo_root() / "configs" / "sem01_bakeoff_v0.1.yaml").read_text(encoding="utf-8")
    )
    if not isinstance(value, dict):
        raise ValueError("SEM-01 config must be a mapping")
    return value


def _candidate_raw(candidate_id: str) -> dict[str, Any]:
    for item in _sem01_config().get("candidates", []):
        if item.get("id") == candidate_id:
            if item.get("kind") != "local":
                raise ValueError(f"{candidate_id} is not a local candidate")
            return item
    raise ValueError(f"Unknown local candidate: {candidate_id}")


def _rss_bytes() -> int:
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(value * 1024 if platform.system() == "Linux" else value)


def _digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, separators=(",", ":"), ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()


def _recall(rankings: list[list[str]], truth: list[str], k: int) -> float:
    return sum(target in ranked[:k] for ranked, target in zip(rankings, truth)) / max(1, len(truth))


def run_runtime(candidate_id: str, lab_commit: str) -> dict[str, Any]:
    raw = _candidate_raw(candidate_id)
    spec = CandidateSpec.from_dict(raw)
    validate_candidate_spec(spec)
    revision = str(raw.get("revision") or "")
    if len(revision) < 12:
        raise ValueError(f"{candidate_id} must use an immutable pinned revision")

    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    pack = build_sem03_fixture_pack(catalog)
    cases = pack["cases"]
    config = load_sem03_config()
    profile = {
        str(topic["topic_id"]): {
            "activity_state": "ACTIVE" if index % 2 == 0 else "INACTIVE",
            "pinned": index % 17 == 0,
            "calibration_prior": index % 29 == 0,
        }
        for index, topic in enumerate(topics)
    }

    base = {
        "round": "SEM-03",
        "candidate_id": candidate_id,
        "revision": revision,
        "benchmark_version": config["benchmark_version"],
        "case_count": len(cases),
        "topic_count": len(topics),
        "contains_real_paia_input": False,
        "api_egress": False,
        "model_training": False,
        "owner_semantic_labeling": False,
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
            trust_remote_code=bool(raw.get("trust_remote_code", False)),
            device="cpu",
        )
        load_seconds = time.perf_counter() - load_start
        model.eval()

        declared_limit = int(spec.context_tokens or 0)
        runtime_limit = int(getattr(model, "max_seq_length", declared_limit) or declared_limit)
        effective_limit = min(declared_limit, runtime_limit) if runtime_limit else declared_limit
        if effective_limit <= 0:
            raise RuntimeError("No positive effective context limit")

        topic_ids = [str(topic["topic_id"]) for topic in topics]
        prepared_docs = [
            apply_prompt(spec, "document", topic_descriptor(topic), TASK_INSTRUCTION)
            for topic in topics
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

        lengths = [token_count(text) for text in prepared_docs + prepared_queries]
        if max(lengths, default=0) > effective_limit:
            return {
                **base,
                "runtime_status": "INCOMPATIBLE_OVER_CONTEXT",
                "effective_context_tokens": effective_limit,
                "max_input_tokens": max(lengths),
                "runtime_qualified": False,
            }

        encode_kwargs = {
            "batch_size": 8,
            "show_progress_bar": False,
            "convert_to_numpy": True,
            "normalize_embeddings": True,
        }
        start = time.perf_counter()
        doc_vectors = model.encode(prepared_docs, **encode_kwargs)
        doc_seconds = time.perf_counter() - start
        start = time.perf_counter()
        query_vectors = model.encode(prepared_queries, **encode_kwargs)
        query_seconds = time.perf_counter() - start

        score_matrix = np.asarray(query_vectors, dtype="float32") @ np.asarray(
            doc_vectors, dtype="float32"
        ).T
        rankings: list[list[str]] = []
        global_prefixes_on: list[list[str]] = []
        global_prefixes_off: list[list[str]] = []
        reserved = int(config["policy"]["reserved_global_slots"])
        start = time.perf_counter()
        for row, case in enumerate(cases):
            order = np.argsort(-score_matrix[row], kind="stable")
            dense = [topic_ids[int(index)] for index in order]
            lexical = lexical_ranking(str(case["text"]), topics)
            on = assemble_candidates(
                query=str(case["text"]),
                topics=topics,
                dense_ranking=dense,
                lexical_ids=lexical,
                profile=profile,
                config=config,
            )
            off = assemble_candidates(
                query=str(case["text"]),
                topics=topics,
                dense_ranking=dense,
                lexical_ids=lexical,
                profile=None,
                config=config,
            )
            on_ids = [item["topic_id"] for item in on]
            off_ids = [item["topic_id"] for item in off]
            rankings.append(on_ids[:20])
            global_prefixes_on.append(on_ids[:reserved])
            global_prefixes_off.append(off_ids[:reserved])
        policy_seconds = time.perf_counter() - start

        truth = [str(case["topic_id"]) for case in cases]
        inactive_idx = [i for i, case in enumerate(cases) if case["profile_state"] == "INACTIVE"]
        active_idx = [i for i, case in enumerate(cases) if case["profile_state"] == "ACTIVE"]
        inactive_recall = _recall(
            [rankings[i] for i in inactive_idx],
            [truth[i] for i in inactive_idx],
            20,
        )
        active_recall = _recall(
            [rankings[i] for i in active_idx],
            [truth[i] for i in active_idx],
            20,
        )
        metrics = {
            "candidate_recall_at_5": _recall(rankings, truth, 5),
            "candidate_recall_at_10": _recall(rankings, truth, 10),
            "candidate_recall_at_20": _recall(rankings, truth, 20),
            "inactive_candidate_recall_at_20": inactive_recall,
            "active_candidate_recall_at_20": active_recall,
            "active_inactive_recall_gap": abs(active_recall - inactive_recall),
            "global_slot_preservation_rate": sum(
                left == right
                for left, right in zip(global_prefixes_on, global_prefixes_off)
            )
            / max(1, len(cases)),
        }
        acceptance = config["acceptance"]
        pass_gate = (
            metrics["candidate_recall_at_10"] >= float(acceptance["candidate_recall_at_10_min"])
            and metrics["candidate_recall_at_20"] >= float(acceptance["candidate_recall_at_20_min"])
            and metrics["inactive_candidate_recall_at_20"] >= float(
                acceptance["inactive_candidate_recall_at_20_min"]
            )
            and metrics["active_inactive_recall_gap"] <= float(
                acceptance["active_inactive_recall_gap_max"]
            )
            and metrics["global_slot_preservation_rate"] == 1.0
        )
        dimensions = int(np.asarray(doc_vectors).shape[1])
        return {
            **base,
            "runtime_status": "PASS" if pass_gate else "GATE_FAIL",
            "runtime_qualified": bool(pass_gate),
            "effective_context_tokens": effective_limit,
            "metrics": metrics,
            "case_candidates_at_20": {
                str(case["id"]): rankings[index] for index, case in enumerate(cases)
            },
            "ranking_digest": _digest(rankings),
            "performance": {
                "model_load_seconds": load_seconds,
                "document_encode_seconds": doc_seconds,
                "query_encode_seconds": query_seconds,
                "candidate_policy_seconds": policy_seconds,
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
                "github_runner_os": os.environ.get("RUNNER_OS"),
            },
        }
    except Exception as exc:
        return {
            **base,
            "runtime_status": "RUNTIME_ERROR",
            "runtime_qualified": False,
            "error_type": type(exc).__name__,
            "error_message": str(exc)[:2000],
        }


def aggregate_runtime(directory: Path) -> dict[str, Any]:
    files = sorted(path for path in directory.rglob("*.json") if path.is_file())
    records = [json.loads(path.read_text(encoding="utf-8")) for path in files]
    records = [record for record in records if record.get("candidate_id")]
    expected = set(
        json.loads(
            (repo_root() / "artifacts" / "sem-01" / "qualified-shortlist.json").read_text(
                encoding="utf-8"
            )
        )["runtime_qualified_local_candidates"]
    )
    found = {str(record["candidate_id"]) for record in records}
    missing = sorted(expected - found)
    unqualified = sorted(
        str(record["candidate_id"])
        for record in records
        if record.get("runtime_qualified") is not True
    )

    pairwise: list[dict[str, Any]] = []
    by_id = {str(record["candidate_id"]): record for record in records}
    for left_id, right_id in combinations(sorted(found & expected), 2):
        left = by_id[left_id]["case_candidates_at_20"]
        right = by_id[right_id]["case_candidates_at_20"]
        common_cases = sorted(set(left) & set(right))
        jaccards: list[float] = []
        exact_sets = 0
        for case_id in common_cases:
            a, b = set(left[case_id]), set(right[case_id])
            union = a | b
            jaccards.append(len(a & b) / len(union) if union else 1.0)
            exact_sets += int(a == b)
        pairwise.append(
            {
                "left": left_id,
                "right": right_id,
                "case_count": len(common_cases),
                "mean_jaccard_at_20": sum(jaccards) / max(1, len(jaccards)),
                "exact_set_rate_at_20": exact_sets / max(1, len(common_cases)),
            }
        )

    all_metrics_pass = all(
        record.get("runtime_qualified") is True
        for record in records
        if record.get("candidate_id") in expected
    )
    passed = not missing and not unqualified and all_metrics_pass and len(pairwise) > 0
    return {
        "round": "SEM-03",
        "expected_qualified_candidates": sorted(expected),
        "found_candidates": sorted(found),
        "missing_candidates": missing,
        "runtime_unqualified_candidates": unqualified,
        "pairwise_candidate_stability": pairwise,
        "inter_model_disagreement_observed": any(
            item["exact_set_rate_at_20"] < 1.0 for item in pairwise
        ),
        "personalized_semantic_claim": "WITHHELD",
        "contains_real_paia_input": False,
        "owner_semantic_labeling": False,
        "model_training": False,
        "pass": passed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="SEM-03 qualified local candidate stability")
    parser.add_argument("--candidate-id")
    parser.add_argument("--lab-commit", default=os.environ.get("GITHUB_SHA", "UNCOMMITTED"))
    parser.add_argument("--aggregate-dir", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if args.aggregate_dir:
        result = aggregate_runtime(args.aggregate_dir)
    elif args.candidate_id:
        result = run_runtime(args.candidate_id, args.lab_commit)
    else:
        parser.error("Provide --candidate-id or --aggregate-dir")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0 if result.get("pass", result.get("runtime_qualified", False)) else 1


if __name__ == "__main__":
    raise SystemExit(main())
