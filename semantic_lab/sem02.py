from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

from .contracts import repo_root
from .embedding_adapters import HashNgramEmbeddingAdapter, LexicalControl, cosine
from .evidence_browser import render_evidence_browser
from .isolation import SAFE_EVIDENCE_CLASSES, static_runtime_isolation_audit
from .manifest import build_run_manifest
from .owner_attention import OwnerAttentionViolation, SEMANTIC_OWNER_TASKS, open_owner_task


@dataclass(frozen=True)
class RetrievalUnit:
    doc_id: str
    start: int
    end: int
    text: str


def _normalize(text: str) -> str:
    value = unicodedata.normalize("NFKC", text).casefold().strip()
    return re.sub(r"\s+", " ", value)


def load_sem02_config(path: Path | None = None) -> dict[str, Any]:
    target = path or repo_root() / "configs" / "sem02_retrieval_v0.1.yaml"
    value = yaml.safe_load(target.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("SEM-02 config root must be a mapping")
    return value


def load_evidence_schema(path: Path | None = None) -> dict[str, Any]:
    target = path or repo_root() / "contracts" / "sem02_evidence_schema_v0.1.json"
    schema = json.loads(target.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return schema


def _provenance(source: str) -> dict[str, Any]:
    return {
        "evidence_class": "synthetic",
        "source": source,
        "contains_real_paia_input": False,
    }


def _long_text(marker: str, position: str) -> str:
    filler = (
        "background archive context schedule metadata unrelated filler "
        "中文背景材料 不相关信息 "
    ) * 20
    if position == "beginning":
        return marker + " " + filler + filler
    if position == "middle":
        return filler + " " + marker + " " + filler
    if position == "end":
        return filler + filler + " " + marker
    raise ValueError(f"Unknown long fixture position: {position}")


def build_sem02_fixture_pack() -> dict[str, Any]:
    source = "SEM-02 deterministic synthetic retrieval fixture"
    docs = [
        {
            "id": "doc_retrieval",
            "text": (
                "PAIA semantic retrieval engine combines lexical dense hybrid ranking "
                "with evidence span tracking for every hit."
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_router",
            "text": (
                "The Personal Semantic Router assigns existing Topics after full-catalog "
                "candidate retrieval; it never creates a Topic."
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_exact",
            "text": (
                "Synthetic incident ZXQ-9174 records a checksum mismatch and its exact "
                "identifier must remain searchable."
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_exact_hard",
            "text": (
                "Synthetic incidents ZXQ-9173 and ZXQ-9175 are neighboring references "
                "used only as hard negatives."
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_mixed",
            "text": (
                "语义检索 evidence span 必须保留原始字符偏移，并支持中文 English "
                "mixed-language 查询与排序证据。"
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_long_begin",
            "text": _long_text(
                "BEGIN-MARKER-ALPHA evidence anchor semantic span", "beginning"
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_long_middle",
            "text": _long_text(
                "MIDDLE-MARKER-BETA evidence anchor semantic span", "middle"
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_long_end",
            "text": _long_text(
                "END-MARKER-GAMMA evidence anchor semantic span", "end"
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_purge",
            "text": (
                "After authorization withdrawal the semantic index marks derivatives "
                "stale first, then purge removes vectors and chunks."
            ),
            "provenance": _provenance(source),
        },
        {
            "id": "doc_purge_hard",
            "text": (
                "Backup retention describes copies and restore points; it does not define "
                "stale semantic derivative invalidation."
            ),
            "provenance": _provenance(source),
        },
    ]
    queries = [
        {
            "id": "q_retrieval",
            "text": "hybrid semantic retrieval evidence spans",
            "relevant_doc_ids": ["doc_retrieval"],
            "hard_negative_doc_ids": [],
            "challenge_tags": [],
            "provenance": _provenance(source),
        },
        {
            "id": "q_exact",
            "text": "ZXQ-9174",
            "relevant_doc_ids": ["doc_exact"],
            "hard_negative_doc_ids": ["doc_exact_hard"],
            "challenge_tags": ["exact_term", "hard_negative"],
            "provenance": _provenance(source),
        },
        {
            "id": "q_mixed",
            "text": "语义检索 evidence span",
            "relevant_doc_ids": ["doc_mixed"],
            "hard_negative_doc_ids": [],
            "challenge_tags": ["mixed_language"],
            "provenance": _provenance(source),
        },
        {
            "id": "q_long_begin",
            "text": "BEGIN-MARKER-ALPHA evidence anchor",
            "relevant_doc_ids": ["doc_long_begin"],
            "hard_negative_doc_ids": [],
            "challenge_tags": ["long_beginning"],
            "expected_marker": "BEGIN-MARKER-ALPHA",
            "provenance": _provenance(source),
        },
        {
            "id": "q_long_middle",
            "text": "MIDDLE-MARKER-BETA evidence anchor",
            "relevant_doc_ids": ["doc_long_middle"],
            "hard_negative_doc_ids": [],
            "challenge_tags": ["long_middle"],
            "expected_marker": "MIDDLE-MARKER-BETA",
            "provenance": _provenance(source),
        },
        {
            "id": "q_long_end",
            "text": "END-MARKER-GAMMA evidence anchor",
            "relevant_doc_ids": ["doc_long_end"],
            "hard_negative_doc_ids": [],
            "challenge_tags": ["long_end"],
            "expected_marker": "END-MARKER-GAMMA",
            "provenance": _provenance(source),
        },
        {
            "id": "q_purge",
            "text": "withdrawal stale then purge derived vectors",
            "relevant_doc_ids": ["doc_purge"],
            "hard_negative_doc_ids": ["doc_purge_hard"],
            "challenge_tags": ["hard_negative"],
            "provenance": _provenance(source),
        },
        {
            "id": "q_no_answer",
            "text": "volcanic seismology mantle plume tomography",
            "relevant_doc_ids": [],
            "hard_negative_doc_ids": [],
            "challenge_tags": ["no_answer"],
            "provenance": _provenance(source),
        },
    ]
    return {
        "fixture_pack_version": "0.1.0",
        "round": "SEM-02",
        "documents": docs,
        "queries": queries,
    }


def validate_sem02_fixture_pack(pack: dict[str, Any]) -> float:
    docs = list(pack.get("documents", []))
    queries = list(pack.get("queries", []))
    if not docs or not queries:
        raise ValueError("SEM-02 fixture pack requires documents and queries")
    doc_ids = [str(doc["id"]) for doc in docs]
    if len(doc_ids) != len(set(doc_ids)):
        raise ValueError("Document ids must be unique")
    known = set(doc_ids)
    checked = 0
    for item in docs + queries:
        provenance = item.get("provenance")
        if not isinstance(provenance, dict):
            raise ValueError(f"{item.get('id')} lacks provenance")
        if provenance.get("evidence_class") not in SAFE_EVIDENCE_CLASSES:
            raise ValueError(f"{item.get('id')} has unsafe evidence class")
        if provenance.get("contains_real_paia_input") is not False:
            raise ValueError(f"{item.get('id')} is not synthetic/public-safe")
        if not provenance.get("source"):
            raise ValueError(f"{item.get('id')} lacks provenance source")
        checked += 1
    for query in queries:
        relevant = set(str(value) for value in query.get("relevant_doc_ids", []))
        hard = set(str(value) for value in query.get("hard_negative_doc_ids", []))
        if not relevant <= known or not hard <= known:
            raise ValueError(f"{query['id']} references unknown documents")
        if relevant & hard:
            raise ValueError(f"{query['id']} overlaps relevant and hard-negative truth")
    return checked / (len(docs) + len(queries))


def chunk_text(text: str, *, size: int, overlap: int) -> list[tuple[int, int, str]]:
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError("Chunk size/overlap are invalid")
    if not text:
        return [(0, 0, "")]
    chunks: list[tuple[int, int, str]] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        chunks.append((start, end, text[start:end]))
        if end == len(text):
            break
        start = end - overlap
    return chunks


class RetrievalEngine:
    def __init__(self, documents: list[dict[str, Any]], config: dict[str, Any]):
        self.documents = {str(item["id"]): item for item in documents}
        retrieval = config["retrieval"]
        self.chunk_size = int(retrieval["chunk_size_codepoints"])
        self.chunk_overlap = int(retrieval["chunk_overlap_codepoints"])
        self.lexical_weight = float(retrieval["hybrid_lexical_weight"])
        self.dense_weight = float(retrieval["hybrid_dense_weight"])
        self.exact_bonus = float(retrieval["exact_term_bonus"])
        self.threshold = float(retrieval["no_answer_threshold"])
        self.lexical = LexicalControl()
        self.embedder = HashNgramEmbeddingAdapter(
            dimensions=int(retrieval["hash_dense_dimensions"])
        )
        self.units: dict[str, list[RetrievalUnit]] = {
            "whole": [],
            "chunk": [],
        }
        for doc_id, doc in self.documents.items():
            text = str(doc["text"])
            self.units["whole"].append(RetrievalUnit(doc_id, 0, len(text), text))
            for start, end, value in chunk_text(
                text, size=self.chunk_size, overlap=self.chunk_overlap
            ):
                self.units["chunk"].append(RetrievalUnit(doc_id, start, end, value))
        self.vectors = {
            aggregation: self.embedder.embed([unit.text for unit in units])
            for aggregation, units in self.units.items()
        }

    def search(
        self,
        query: str,
        *,
        query_id: str,
        scoring: str,
        aggregation: str,
        k: int = 20,
        challenge_tags: list[str] | None = None,
    ) -> dict[str, Any]:
        if scoring not in {"lexical", "dense", "hybrid"}:
            raise ValueError(f"Unknown scoring mode: {scoring}")
        if aggregation not in {"whole", "chunk"}:
            raise ValueError(f"Unknown aggregation mode: {aggregation}")
        query_vector = self.embedder.embed([query])[0]
        best_by_doc: dict[str, dict[str, Any]] = {}
        for unit, vector in zip(self.units[aggregation], self.vectors[aggregation]):
            lexical = self.lexical.score(query, unit.text)
            dense = max(0.0, cosine(query_vector, vector))
            exact = self.exact_bonus if _normalize(query) in _normalize(unit.text) else 0.0
            hybrid = min(
                1.0,
                self.lexical_weight * lexical
                + self.dense_weight * dense
                + exact,
            )
            score = {"lexical": lexical, "dense": dense, "hybrid": hybrid}[scoring]
            candidate = {
                "doc_id": unit.doc_id,
                "score": float(score),
                "score_components": {
                    "lexical": float(lexical),
                    "dense": float(dense),
                    "exact_term_bonus": float(exact),
                    "hybrid": float(hybrid),
                },
                "evidence_span": {
                    "start": unit.start,
                    "end": unit.end,
                    "text": unit.text,
                    "kind": aggregation,
                },
                "provenance": dict(self.documents[unit.doc_id]["provenance"]),
            }
            current = best_by_doc.get(unit.doc_id)
            if current is None:
                best_by_doc[unit.doc_id] = candidate
            elif candidate["score"] > current["score"]:
                best_by_doc[unit.doc_id] = candidate
            elif (
                math.isclose(candidate["score"], current["score"])
                and candidate["evidence_span"]["start"]
                < current["evidence_span"]["start"]
            ):
                best_by_doc[unit.doc_id] = candidate
        ranked = sorted(
            best_by_doc.values(),
            key=lambda item: (-item["score"], item["doc_id"]),
        )[:k]
        for rank, hit in enumerate(ranked, start=1):
            hit["rank"] = rank
        top_score = float(ranked[0]["score"]) if ranked else 0.0
        record = {
            "schema_version": "0.1.0",
            "query_id": query_id,
            "query_text": query,
            "scoring": scoring,
            "aggregation": aggregation,
            "threshold": self.threshold,
            "top_score": top_score,
            "no_answer": top_score < self.threshold,
            "challenge_tags": list(challenge_tags or []),
            "hits": ranked,
            "provenance": _provenance(
                "SEM-02 deterministic retrieval-engine benchmark"
            ),
        }
        return record


def _ndcg_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    dcg = 0.0
    for index, doc_id in enumerate(ranked[:k], start=1):
        if doc_id in relevant:
            dcg += 1.0 / math.log2(index + 1)
    ideal_hits = min(len(relevant), k)
    ideal = sum(1.0 / math.log2(index + 1) for index in range(1, ideal_hits + 1))
    return dcg / ideal if ideal else 0.0


def _ranking_metrics(
    records: dict[str, dict[str, Any]], queries: list[dict[str, Any]]
) -> dict[str, float]:
    ndcg = 0.0
    recall = 0.0
    reciprocal = 0.0
    count = 0
    for query in queries:
        relevant = set(str(value) for value in query["relevant_doc_ids"])
        if not relevant:
            continue
        ranked = [str(hit["doc_id"]) for hit in records[str(query["id"])]["hits"]]
        ndcg += _ndcg_at_k(ranked, relevant, 10)
        recall += len(relevant & set(ranked[:20])) / len(relevant)
        rr = 0.0
        for index, doc_id in enumerate(ranked[:10], start=1):
            if doc_id in relevant:
                rr = 1.0 / index
                break
        reciprocal += rr
        count += 1
    divisor = max(1, count)
    return {
        "ndcg_at_10": ndcg / divisor,
        "recall_at_20": recall / divisor,
        "mrr_at_10": reciprocal / divisor,
        "evaluated_query_count": float(count),
    }


def _span_integrity(
    records: list[dict[str, Any]], documents: dict[str, dict[str, Any]]
) -> tuple[int, int]:
    total = 0
    valid = 0
    for record in records:
        for hit in record["hits"]:
            total += 1
            text = str(documents[str(hit["doc_id"])]["text"])
            span = hit["evidence_span"]
            start, end = int(span["start"]), int(span["end"])
            if (
                0 <= start <= end <= len(text)
                and text[start:end] == span["text"]
            ):
                valid += 1
    return valid, total


def _rank_index(record: dict[str, Any], doc_id: str) -> int | None:
    for hit in record["hits"]:
        if hit["doc_id"] == doc_id:
            return int(hit["rank"])
    return None


def run_sem02(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_sem02_config()
    schema = load_evidence_schema()
    validator = Draft202012Validator(schema)
    pack = build_sem02_fixture_pack()
    provenance_coverage = validate_sem02_fixture_pack(pack)
    docs = list(pack["documents"])
    queries = list(pack["queries"])
    doc_map = {str(item["id"]): item for item in docs}
    engine = RetrievalEngine(docs, config)

    records_by_config: dict[str, dict[str, dict[str, Any]]] = {}
    all_records: list[dict[str, Any]] = []
    for scoring in ("lexical", "dense", "hybrid"):
        for aggregation in ("whole", "chunk"):
            key = f"{scoring}/{aggregation}"
            records: dict[str, dict[str, Any]] = {}
            for query in queries:
                record = engine.search(
                    str(query["text"]),
                    query_id=str(query["id"]),
                    scoring=scoring,
                    aggregation=aggregation,
                    k=int(config["retrieval"]["evaluation_k"]),
                    challenge_tags=list(query.get("challenge_tags", [])),
                )
                records[str(query["id"])] = record
                all_records.append(record)
            records_by_config[key] = records

    schema_errors: list[str] = []
    for record in all_records:
        for error in validator.iter_errors(record):
            schema_errors.append(
                f"{record['query_id']}:{record['scoring']}/{record['aggregation']}:{error.message}"
            )

    configuration_metrics = {
        key: _ranking_metrics(records, queries)
        for key, records in records_by_config.items()
    }
    browser_records = [
        records_by_config["hybrid/chunk"][str(query["id"])]
        for query in queries
    ]

    exact_queries = [
        query for query in queries if "exact_term" in query.get("challenge_tags", [])
    ]
    exact_checks: list[dict[str, Any]] = []
    for query in exact_queries:
        relevant = set(query["relevant_doc_ids"])
        for key in ("lexical/whole", "lexical/chunk", "hybrid/whole", "hybrid/chunk"):
            top = records_by_config[key][str(query["id"])]["hits"][0]["doc_id"]
            exact_checks.append(
                {
                    "query_id": query["id"],
                    "configuration": key,
                    "top1": top,
                    "pass": top in relevant,
                }
            )
    exact_term_pass = all(item["pass"] for item in exact_checks)

    hard_cases = [
        query for query in queries if query.get("hard_negative_doc_ids")
    ]
    hard_negative_failures: list[dict[str, Any]] = []
    for query in hard_cases:
        record = records_by_config["hybrid/chunk"][str(query["id"])]
        relevant_ranks = [
            _rank_index(record, doc_id) for doc_id in query["relevant_doc_ids"]
        ]
        hard_ranks = [
            _rank_index(record, doc_id) for doc_id in query["hard_negative_doc_ids"]
        ]
        best_relevant = min(rank for rank in relevant_ranks if rank is not None)
        best_hard = min(rank for rank in hard_ranks if rank is not None)
        if best_hard < best_relevant:
            hard_negative_failures.append(
                {
                    "query_id": query["id"],
                    "best_relevant_rank": best_relevant,
                    "best_hard_negative_rank": best_hard,
                }
            )
    hard_negative_rate = (
        len(hard_negative_failures) / len(hard_cases) if hard_cases else 0.0
    )

    no_answer_queries = [
        query for query in queries if not query["relevant_doc_ids"]
    ]
    false_answers = 0
    for query in no_answer_queries:
        if not records_by_config["hybrid/chunk"][str(query["id"])]["no_answer"]:
            false_answers += 1
    no_answer_false_answer_rate = (
        false_answers / len(no_answer_queries) if no_answer_queries else 0.0
    )

    long_position_checks: dict[str, bool] = {}
    for query in queries:
        marker = query.get("expected_marker")
        if not marker:
            continue
        record = records_by_config["hybrid/chunk"][str(query["id"])]
        relevant = str(query["relevant_doc_ids"][0])
        matching = next(
            (hit for hit in record["hits"] if hit["doc_id"] == relevant),
            None,
        )
        tag = next(
            tag for tag in query["challenge_tags"] if tag.startswith("long_")
        )
        long_position_checks[tag] = bool(
            matching
            and matching["rank"] == 1
            and str(marker) in matching["evidence_span"]["text"]
        )

    valid_spans, total_spans = _span_integrity(all_records, doc_map)
    span_integrity = valid_spans / total_spans if total_spans else 0.0

    disagreement_queue: list[dict[str, Any]] = []
    for query in queries:
        query_id = str(query["id"])
        tops = {
            "lexical_chunk": records_by_config["lexical/chunk"][query_id]["hits"][0]["doc_id"],
            "dense_chunk": records_by_config["dense/chunk"][query_id]["hits"][0]["doc_id"],
            "hybrid_chunk": records_by_config["hybrid/chunk"][query_id]["hits"][0]["doc_id"],
            "hybrid_whole": records_by_config["hybrid/whole"][query_id]["hits"][0]["doc_id"],
        }
        if len(set(tops.values())) > 1:
            disagreement_queue.append(
                {
                    "query_id": query_id,
                    "query_text": query["text"],
                    "top1": tops,
                    "relevant_doc_ids": list(query["relevant_doc_ids"]),
                    "challenge_tags": list(query["challenge_tags"]),
                    "provenance": dict(query["provenance"]),
                }
            )

    challenge_queue: list[dict[str, Any]] = []
    for query in queries:
        if not query.get("challenge_tags"):
            continue
        record = records_by_config["hybrid/chunk"][str(query["id"])]
        challenge_queue.append(
            {
                "query_id": query["id"],
                "query_text": query["text"],
                "challenge_tags": list(query["challenge_tags"]),
                "relevant_doc_ids": list(query["relevant_doc_ids"]),
                "hard_negative_doc_ids": list(query["hard_negative_doc_ids"]),
                "hybrid_chunk_top5": [
                    {
                        "doc_id": hit["doc_id"],
                        "rank": hit["rank"],
                        "score": hit["score"],
                        "evidence_span": hit["evidence_span"],
                    }
                    for hit in record["hits"][:5]
                ],
                "no_answer": record["no_answer"],
                "provenance": dict(query["provenance"]),
            }
        )

    browser_html = render_evidence_browser(
        browser_records,
        challenge_queue=challenge_queue,
        disagreement_queue=disagreement_queue,
    )
    browser_digest = hashlib.sha256(browser_html.encode("utf-8")).hexdigest()
    browser_correct = (
        all(f'data-query-id="{query["id"]}"' in browser_html for query in queries)
        and "No owner semantic labeling controls are present." in browser_html
        and "http://" not in browser_html
        and "https://" not in browser_html
    )

    owner_failures: list[str] = []
    for task in SEMANTIC_OWNER_TASKS:
        try:
            open_owner_task("SEM-02", task)
            owner_failures.append(task)
        except OwnerAttentionViolation:
            pass
    isolation = static_runtime_isolation_audit(repo_root())

    retrieval_pass = (
        all(
            math.isclose(metrics["recall_at_20"], 1.0)
            for metrics in configuration_metrics.values()
        )
        and exact_term_pass
        and math.isclose(hard_negative_rate, 0.0)
        and math.isclose(no_answer_false_answer_rate, 0.0)
        and math.isclose(span_integrity, 1.0)
        and all(long_position_checks.values())
        and not schema_errors
        and browser_correct
        and len(disagreement_queue) > 0
    )
    g0 = (
        math.isclose(provenance_coverage, 1.0)
        and not isolation
        and not owner_failures
    )

    manifest = build_run_manifest(
        lab_commit=lab_commit,
        catalog_version="0.2.0",
        round_id="SEM-02",
        benchmark_version=str(config["benchmark_version"]),
        metrics_ref="artifacts/sem-02/retrieval-engine-report.json",
    )
    return {
        "round": "SEM-02",
        "manifest": manifest,
        "benchmark": {
            "version": config["benchmark_version"],
            "fixture_pack_version": pack["fixture_pack_version"],
            "document_count": len(docs),
            "query_count": len(queries),
            "evidence_classes": ["synthetic"],
            "contains_real_paia_input": False,
            "public_benchmark_used": False,
            "personalized_semantic_claim": "WITHHELD",
        },
        "configuration_metrics": configuration_metrics,
        "exact_term_regression": {
            "pass": exact_term_pass,
            "checks": exact_checks,
        },
        "hard_negative": {
            "case_count": len(hard_cases),
            "failure_count": len(hard_negative_failures),
            "failure_rate": hard_negative_rate,
            "failures": hard_negative_failures,
        },
        "no_answer": {
            "case_count": len(no_answer_queries),
            "false_answer_count": false_answers,
            "false_answer_rate": no_answer_false_answer_rate,
        },
        "evidence_spans": {
            "valid": valid_spans,
            "total": total_spans,
            "integrity": span_integrity,
            "long_position_checks": long_position_checks,
        },
        "evidence_browser": {
            "schema_version": schema["properties"]["schema_version"]["const"],
            "record_count": len(browser_records),
            "render_sha256": browser_digest,
            "read_only": True,
            "external_assets": False,
            "correctness_checks_pass": browser_correct and not schema_errors,
            "records": browser_records,
        },
        "challenge_queue": challenge_queue,
        "disagreement_queue": {
            "count": len(disagreement_queue),
            "yield": len(disagreement_queue) / len(queries),
            "cases": disagreement_queue,
        },
        "metrics": {
            "fixture_provenance_coverage": provenance_coverage,
            "schema_validation_errors": len(schema_errors),
            "owner_attention_policy_violations": len(owner_failures),
            "isolation_violations": len(isolation),
            "real_input_api_egress_events": 0,
            "live_api_calls": 0,
            "model_training_runs": 0,
        },
        "findings": {
            "schema_errors": schema_errors,
            "owner_attention_policy_violations": owner_failures,
            "isolation": isolation,
        },
        "gates": {
            "G0_isolation": "PASS" if g0 else "FAIL",
            "G3_retrieval_engineering": "PASS" if retrieval_pass else "FAIL",
            "personalized_retrieval_quality": "INCONCLUSIVE",
        },
        "pass": g0 and retrieval_pass,
    }
