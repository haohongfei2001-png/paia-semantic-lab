from __future__ import annotations

import hashlib
import json
import time
import tracemalloc
from typing import Any, Callable, Sequence

from .embedding_adapters import HashNgramEmbeddingAdapter, LexicalControl, cosine
from .isolation import validate_fixture_pack


def topic_document(topic: dict[str, Any]) -> str:
    values = [str(topic["name"]["zh"]), str(topic["name"]["en"]), str(topic.get("definition", ""))]
    for language in ("zh", "en"):
        aliases = topic.get("aliases", {}).get(language, [])
        values.extend([aliases] if isinstance(aliases, str) else (aliases or []))
    values.extend(topic.get("inclusion_boundary", []))
    values.extend(topic.get("representative_examples", []))
    return "\n".join(str(value) for value in values if str(value).strip())


def build_fixture_pack(catalog: dict[str, Any]) -> dict[str, Any]:
    active = [topic for topic in catalog.get("topics", []) if topic.get("lifecycle") == "ACTIVE"]
    cases: list[dict[str, Any]] = []
    for topic in active:
        topic_id = str(topic["topic_id"])
        zh, en = str(topic["name"]["zh"]), str(topic["name"]["en"])
        examples = list(topic.get("representative_examples", []))
        example = str(examples[0]) if examples else zh
        for slice_name, text in (
            ("zh_short", zh),
            ("en_short", en),
            ("mixed", f"{zh} / {en}: {example}"),
        ):
            cases.append({
                "id": f"{topic_id}:{slice_name}",
                "topic_id": topic_id,
                "slice": slice_name,
                "text": text,
                "provenance": {
                    "evidence_class": "catalog_boundary",
                    "source": "system_topic_catalog_v0.2.yaml",
                    "contains_real_paia_input": False,
                },
            })
    filler = "用于长度位置诊断的合成填充文本 synthetic filler token " * 80
    for topic in active[:6]:
        topic_id = str(topic["topic_id"])
        marker = f"{topic['name']['zh']} / {topic['name']['en']}"
        for slice_name, text in (
            ("long_beginning", marker + " " + filler),
            ("long_middle", filler + " " + marker + " " + filler),
            ("long_end", filler + " " + marker),
        ):
            cases.append({
                "id": f"{topic_id}:{slice_name}",
                "topic_id": topic_id,
                "slice": slice_name,
                "text": text,
                "provenance": {
                    "evidence_class": "synthetic",
                    "source": "SEM-01 machine-generated long-position fixture",
                    "contains_real_paia_input": False,
                },
            })
    pack = {"fixture_pack_version": "0.1.0", "round": "SEM-01", "cases": cases}
    validate_fixture_pack(pack)
    return pack


def benchmark_fingerprint(topic_docs: dict[str, str], cases: Sequence[dict[str, Any]]) -> str:
    payload = {
        "topics": sorted(topic_docs.items()),
        "cases": [{"id": c["id"], "topic_id": c["topic_id"], "slice": c["slice"], "text": c["text"]} for c in cases],
    }
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def ranking_metrics(rankings: Sequence[list[str]], truth: Sequence[str]) -> dict[str, float]:
    hits = {1: 0, 5: 0, 10: 0, 20: 0}
    reciprocal = 0.0
    for ranked, target in zip(rankings, truth):
        for cutoff in hits:
            hits[cutoff] += int(target in ranked[:cutoff])
        if target in ranked:
            reciprocal += 1.0 / (ranked.index(target) + 1)
    total = max(1, len(truth))
    return {
        "recall_at_1": hits[1] / total,
        "recall_at_5": hits[5] / total,
        "recall_at_10": hits[10] / total,
        "recall_at_20": hits[20] / total,
        "mrr": reciprocal / total,
    }


def profile_ranker(
    name: str,
    cases: Sequence[dict[str, Any]],
    rank_one: Callable[[str], list[str]],
    index_size_bytes: int,
) -> tuple[dict[str, Any], list[list[str]]]:
    tracemalloc.start()
    start = time.perf_counter()
    first = rank_one(str(cases[0]["text"]))
    cold = time.perf_counter() - start
    start = time.perf_counter()
    rankings = [rank_one(str(case["text"])) for case in cases]
    warm = time.perf_counter() - start
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    repeat = [rank_one(str(case["text"])) for case in cases]
    truth = [str(case["topic_id"]) for case in cases]
    slices: dict[str, Any] = {}
    for slice_name in sorted({str(case["slice"]) for case in cases}):
        idx = [i for i, case in enumerate(cases) if case["slice"] == slice_name]
        slices[slice_name] = ranking_metrics([rankings[i] for i in idx], [truth[i] for i in idx])
    digest = hashlib.sha256(json.dumps(rankings, separators=(",", ":")).encode()).hexdigest()
    result = {
        "control": name,
        "case_count": len(cases),
        "metrics": ranking_metrics(rankings, truth),
        "slice_metrics": slices,
        "performance": {
            "cold_seconds": cold,
            "warm_total_seconds": warm,
            "throughput_cases_per_second": len(cases) / warm if warm else None,
            "peak_python_memory_bytes": peak,
            "index_size_bytes": index_size_bytes,
        },
        "reproducibility": {"repeated_run_stable": rankings == repeat and rankings[0] == first, "ranking_digest": digest},
    }
    return result, rankings


def evaluate_controls(topic_docs: dict[str, str], cases: Sequence[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, list[list[str]]]]:
    lexical = LexicalControl()
    def lexical_rank(query: str) -> list[str]:
        scored = [(lexical.score(query, doc), topic_id) for topic_id, doc in topic_docs.items()]
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [topic_id for _, topic_id in scored]

    embedder = HashNgramEmbeddingAdapter(dimensions=128)
    topic_ids = list(topic_docs)
    matrix = embedder.embed([topic_docs[topic_id] for topic_id in topic_ids])
    vectors = dict(zip(topic_ids, matrix))
    def vector_rank(query: str) -> list[str]:
        q = embedder.embed([query])[0]
        scored = [(cosine(q, vector), topic_id) for topic_id, vector in vectors.items()]
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [topic_id for _, topic_id in scored]

    lexical_result, lexical_rankings = profile_ranker(
        "lexical_char_trigram_jaccard", cases, lexical_rank,
        sum(len(value.encode("utf-8")) for value in topic_docs.values()),
    )
    vector_result, vector_rankings = profile_ranker(
        "deterministic_hash_ngram_exact_cosine", cases, vector_rank,
        len(topic_ids) * embedder.dimensions * 8,
    )
    return {"lexical": lexical_result, "exact_vector": vector_result}, {
        "lexical": lexical_rankings,
        "exact_vector": vector_rankings,
    }
