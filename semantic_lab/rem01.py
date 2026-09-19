from __future__ import annotations

import hashlib
import json
import math
import statistics
import time
import tracemalloc
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Sequence

import yaml

from .catalog import load_catalog, validate_catalog_contract
from .context import classification_text
from .contracts import repo_root
from .embedding_adapters import (
    HashNgramEmbeddingAdapter,
    InputTooLongError,
    LexicalControl,
    cosine,
)
from .isolation import static_runtime_isolation_audit, validate_fixture_pack
from .sem02 import chunk_text
from .sem03 import eligible_topics

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "rem01_diagnostics_v0.1.yaml"


def load_rem01_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-01 config must be a mapping")
    return value


def _aliases(topic: dict[str, Any]) -> list[str]:
    values: list[str] = []
    for language in ("zh", "en"):
        name = topic.get("name", {}).get(language)
        if name:
            values.append(str(name))
        aliases = topic.get("aliases", {}).get(language, [])
        if isinstance(aliases, str):
            aliases = [aliases]
        values.extend(str(value) for value in aliases or [])
    return [value for value in values if value.strip()]


def topic_field_documents(topic: dict[str, Any]) -> list[str]:
    names_aliases = "\n".join(_aliases(topic))
    fields = [
        names_aliases,
        str(topic.get("definition", "")),
        "\n".join(str(value) for value in topic.get("inclusion_boundary", [])),
        "\n".join(str(value) for value in topic.get("exclusion_boundary", [])),
        "\n".join(str(value) for value in topic.get("representative_examples", [])),
    ]
    return [value for value in fields if value.strip()]


def topic_descriptor_variant(topic: dict[str, Any], variant: str) -> str:
    names_aliases = _aliases(topic)
    definition = str(topic.get("definition", ""))
    inclusion = [str(value) for value in topic.get("inclusion_boundary", [])]
    exclusion = [str(value) for value in topic.get("exclusion_boundary", [])]
    examples = [str(value) for value in topic.get("representative_examples", [])]

    if variant == "names_aliases":
        parts = names_aliases
    elif variant == "semantic_core":
        parts = names_aliases + [definition] + inclusion + examples
    elif variant == "full_boundaries":
        parts = names_aliases + [definition] + inclusion + exclusion + examples
    elif variant == "fielded_full":
        parts = [
            f"name_aliases: {' | '.join(names_aliases)}",
            f"definition: {definition}",
            f"inclusion: {' | '.join(inclusion)}",
            f"exclusion: {' | '.join(exclusion)}",
            f"examples: {' | '.join(examples)}",
            f"internal_domain: {topic.get('internal_domain', '')}",
        ]
    else:
        raise ValueError(f"Unknown descriptor variant: {variant}")
    return "\n".join(value for value in parts if value.strip())


def _provenance(source: str, evidence_class: str = "synthetic") -> dict[str, Any]:
    return {
        "evidence_class": evidence_class,
        "source": source,
        "contains_real_paia_input": False,
    }


def _without_explicit_aliases(topic: dict[str, Any], text: str) -> str:
    value = text
    for alias in sorted(_aliases(topic), key=len, reverse=True):
        value = value.replace(alias, "语义目标")
        value = value.replace(alias.casefold(), "semantic target")
    return value


def _selected_topics(
    catalog: dict[str, Any], topics_per_domain: int
) -> list[dict[str, Any]]:
    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for topic in catalog.get("topics", []):
        if topic.get("lifecycle") == "ACTIVE":
            by_domain[str(topic.get("internal_domain", ""))].append(topic)
    selected: list[dict[str, Any]] = []
    for domain in sorted(by_domain):
        selected.extend(
            sorted(by_domain[domain], key=lambda row: str(row["topic_id"]))[
                :topics_per_domain
            ]
        )
    return selected


def build_rem01_fixture_pack(
    catalog: dict[str, Any], config: dict[str, Any] | None = None
) -> dict[str, Any]:
    cfg = config or load_rem01_config()
    policy = cfg["fixture_policy"]
    selected = _selected_topics(catalog, int(policy["topics_per_domain"]))
    long_limit = int(policy["long_case_topics"])
    context_limit = int(policy["context_case_topics"])
    filler = (
        "synthetic background archive navigation unrelated filler "
        "合成背景信息 与目标主题无关的填充内容 "
    ) * int(policy["long_filler_repetitions"])

    cases: list[dict[str, Any]] = []
    for topic in selected:
        topic_id = str(topic["topic_id"])
        zh = str(topic["name"]["zh"])
        en = str(topic["name"]["en"])
        example = str((topic.get("representative_examples") or [zh])[0])
        family = topic_id

        cases.append(
            {
                "id": f"{topic_id}:zh_short",
                "family": family,
                "topic_id": topic_id,
                "slice": "zh_short",
                "text": zh,
                "allowed_context": None,
                "provenance": _provenance(
                    "system_topic_catalog_v0.2.yaml", "catalog_boundary"
                ),
            }
        )
        cases.append(
            {
                "id": f"{topic_id}:mixed",
                "family": family,
                "topic_id": topic_id,
                "slice": "mixed",
                "text": f"{zh} / {en}: {example}",
                "allowed_context": None,
                "provenance": _provenance(
                    "system_topic_catalog_v0.2.yaml", "catalog_boundary"
                ),
            }
        )
        boundary_text = " ".join(
            [
                str(topic.get("definition", "")),
                *[str(value) for value in topic.get("inclusion_boundary", [])],
                *[str(value) for value in topic.get("representative_examples", [])],
            ]
        )
        cases.append(
            {
                "id": f"{topic_id}:boundary_no_alias",
                "family": family,
                "topic_id": topic_id,
                "slice": "boundary_no_alias",
                "text": _without_explicit_aliases(topic, boundary_text),
                "allowed_context": None,
                "provenance": _provenance(
                    "REM-01 catalog-boundary alias-removal transformation"
                ),
            }
        )

    for index, topic in enumerate(selected[:long_limit]):
        topic_id = str(topic["topic_id"])
        marker = f"{topic['name']['zh']} / {topic['name']['en']}"
        position = ("beginning", "middle", "end")[index % 3]
        if position == "beginning":
            text = marker + " " + filler
        elif position == "middle":
            text = filler + " " + marker + " " + filler
        else:
            text = filler + " " + marker
        cases.append(
            {
                "id": f"{topic_id}:long_{position}",
                "family": topic_id,
                "topic_id": topic_id,
                "slice": f"long_{position}",
                "text": text,
                "allowed_context": None,
                "provenance": _provenance(
                    "REM-01 deterministic long-position fixture"
                ),
            }
        )

    for topic in selected[:context_limit]:
        topic_id = str(topic["topic_id"])
        zh = str(topic["name"]["zh"])
        en = str(topic["name"]["en"])
        definition = str(topic.get("definition", ""))
        allowed_context = {
            "policy": "rem01-synthetic-same-conversation",
            "family_ref": f"fixture-family:{topic_id}",
            "inputs": [
                {
                    "input_ref": f"fixture.context.{hashlib.sha256(topic_id.encode()).hexdigest()[:12]}",
                    "input_revision": "fixture-v1",
                    "direction": "before",
                    "offset": -1,
                    "text": f"此前讨论的主要对象是 {zh} / {en}。{definition}",
                }
            ],
        }
        cases.append(
            {
                "id": f"{topic_id}:context_dependent",
                "family": topic_id,
                "topic_id": topic_id,
                "slice": "context_dependent",
                "text": "这个接下来应该怎么处理？",
                "allowed_context": allowed_context,
                "provenance": _provenance(
                    "REM-01 deterministic allowed-context fixture"
                ),
            }
        )

    pack = {
        "fixture_pack_version": "0.1.0",
        "round": "REM-01",
        "cases": cases,
    }
    validate_fixture_pack(pack)
    return pack


def query_representation(case: dict[str, Any], variant: str) -> str:
    text = str(case["text"])
    allowed = case.get("allowed_context")
    if variant == "current_only":
        return text
    if variant == "allowed_context":
        return classification_text(text, allowed)
    if variant == "compact_context":
        if not allowed or not allowed.get("inputs"):
            return text
        context_text = "\n".join(str(row["text"]) for row in allowed["inputs"])
        return (
            "[CURRENT INPUT]\n"
            + text
            + "\n[RELEVANT ALLOWED CONTEXT]\n"
            + context_text
            + "\n[CLASSIFY CURRENT INPUT]"
        )
    raise ValueError(f"Unknown query representation: {variant}")


def _percentile(values: Sequence[float], q: float) -> float | None:
    if not values:
        return None
    ordered = sorted(float(value) for value in values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * q
    low = math.floor(position)
    high = math.ceil(position)
    if low == high:
        return ordered[low]
    fraction = position - low
    return ordered[low] * (1.0 - fraction) + ordered[high] * fraction


def _rank_metrics(
    rankings: Sequence[list[str]], truth: Sequence[str], cutoffs: Sequence[int]
) -> dict[str, float]:
    total = max(1, len(truth))
    result: dict[str, float] = {}
    for cutoff in cutoffs:
        result[f"recall_at_{cutoff}"] = sum(
            target in ranked[:cutoff] for ranked, target in zip(rankings, truth)
        ) / total
    reciprocal = 0.0
    for ranked, target in zip(rankings, truth):
        if target in ranked:
            reciprocal += 1.0 / (ranked.index(target) + 1)
    result["mrr"] = reciprocal / total
    return result


def _rank_of(ranked: Sequence[str], target: str) -> int | None:
    try:
        return list(ranked).index(target) + 1
    except ValueError:
        return None


def _rrf_ranking(
    dense: Sequence[str],
    lexical: Sequence[str],
    *,
    dense_top_k: int,
    lexical_top_k: int,
) -> list[str]:
    scores: dict[str, float] = {}
    for rank, topic_id in enumerate(dense[:dense_top_k], 1):
        scores[topic_id] = scores.get(topic_id, 0.0) + 1.0 / (60 + rank)
    for rank, topic_id in enumerate(lexical[:lexical_top_k], 1):
        scores[topic_id] = scores.get(topic_id, 0.0) + 1.0 / (30 + rank)
    return [
        topic_id
        for topic_id, _ in sorted(
            scores.items(), key=lambda item: (-item[1], item[0])
        )
    ]


class DiagnosticTopicIndex:
    def __init__(
        self,
        topics: Sequence[dict[str, Any]],
        descriptor_variant: str,
        config: dict[str, Any] | None = None,
    ):
        self.config = config or load_rem01_config()
        self.topics = list(topics)
        self.topic_ids = [str(topic["topic_id"]) for topic in self.topics]
        self.descriptor_variant = descriptor_variant
        dense = self.config["dense_controls"]
        self.embedder = HashNgramEmbeddingAdapter(
            dimensions=int(dense["dimensions"]),
            max_codepoints=int(dense["max_codepoints"]),
        )
        self.lexical = LexicalControl()
        self.descriptors = [
            topic_descriptor_variant(topic, descriptor_variant)
            for topic in self.topics
        ]
        if any(not value.strip() for value in self.descriptors):
            raise ValueError("Topic descriptor variant produced an empty descriptor")
        start = time.perf_counter()
        self.whole_vectors = self.embedder.embed(self.descriptors)
        self.field_documents = [topic_field_documents(topic) for topic in self.topics]
        self.field_vectors = [
            self.embedder.embed(fields) for fields in self.field_documents
        ]
        self.build_seconds = time.perf_counter() - start

    def _query_vectors(self, query: str, query_aggregation: str) -> list[list[float]]:
        if query_aggregation == "whole":
            return self.embedder.embed([query])
        if query_aggregation == "chunk_max":
            chunking = self.config["chunking"]
            chunks = chunk_text(
                query,
                size=int(chunking["size_codepoints"]),
                overlap=int(chunking["overlap_codepoints"]),
            )
            return self.embedder.embed([value for _, _, value in chunks])
        raise ValueError(f"Unknown query aggregation: {query_aggregation}")

    def dense_ranking(
        self,
        query: str,
        *,
        topic_aggregation: str = "whole",
        query_aggregation: str = "whole",
    ) -> list[str]:
        query_vectors = self._query_vectors(query, query_aggregation)
        scored: list[tuple[float, str]] = []
        if topic_aggregation == "whole":
            for topic_id, vector in zip(self.topic_ids, self.whole_vectors):
                score = max(cosine(q, vector) for q in query_vectors)
                scored.append((score, topic_id))
        elif topic_aggregation == "field_max":
            for topic_id, vectors in zip(self.topic_ids, self.field_vectors):
                score = max(
                    cosine(q, vector) for q in query_vectors for vector in vectors
                )
                scored.append((score, topic_id))
        else:
            raise ValueError(f"Unknown topic aggregation: {topic_aggregation}")
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [topic_id for _, topic_id in scored]

    def lexical_ranking(self, query: str) -> list[str]:
        scored: list[tuple[float, str]] = []
        for topic, topic_id in zip(self.topics, self.topic_ids):
            aliases = _aliases(topic)
            score = max(
                (self.lexical.score(query, alias) for alias in aliases),
                default=0.0,
            )
            scored.append((score, topic_id))
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [topic_id for _, topic_id in scored]

    def ranking(
        self,
        query: str,
        *,
        mode: str,
        topic_aggregation: str = "whole",
        query_aggregation: str = "whole",
    ) -> list[str]:
        dense = self.dense_ranking(
            query,
            topic_aggregation=topic_aggregation,
            query_aggregation=query_aggregation,
        )
        if mode == "dense":
            return dense
        lexical = self.lexical_ranking(query)
        if mode == "lexical":
            return lexical
        if mode == "rrf":
            fusion = self.config["fusion"]
            return _rrf_ranking(
                dense,
                lexical,
                dense_top_k=int(fusion["dense_top_k"]),
                lexical_top_k=int(fusion["lexical_top_k"]),
            )
        raise ValueError(f"Unknown ranking mode: {mode}")

    def estimated_index_bytes(self) -> dict[str, int]:
        dims = int(self.config["dense_controls"]["dimensions"])
        whole = len(self.topic_ids) * dims * 8
        fields = sum(len(rows) for rows in self.field_vectors) * dims * 8
        descriptor_utf8 = sum(len(value.encode("utf-8")) for value in self.descriptors)
        return {
            "whole_vector_bytes": whole,
            "field_vector_bytes": fields,
            "descriptor_utf8_bytes": descriptor_utf8,
        }


def _ranking_digest(rankings: Sequence[list[str]]) -> str:
    return hashlib.sha256(
        json.dumps(rankings, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def _evaluate_rankings(
    index: DiagnosticTopicIndex,
    cases: Sequence[dict[str, Any]],
    *,
    query_variant: str,
    mode: str,
    topic_aggregation: str = "whole",
    query_aggregation: str = "whole",
    cutoffs: Sequence[int],
) -> dict[str, Any]:
    rankings: list[list[str]] = []
    latencies: list[float] = []
    truth = [str(case["topic_id"]) for case in cases]
    for case in cases:
        query = query_representation(case, query_variant)
        start = time.perf_counter()
        ranked = index.ranking(
            query,
            mode=mode,
            topic_aggregation=topic_aggregation,
            query_aggregation=query_aggregation,
        )
        latencies.append(time.perf_counter() - start)
        rankings.append(ranked)

    repeat = [
        index.ranking(
            query_representation(case, query_variant),
            mode=mode,
            topic_aggregation=topic_aggregation,
            query_aggregation=query_aggregation,
        )
        for case in cases
    ]
    metrics = _rank_metrics(rankings, truth, cutoffs)
    by_slice: dict[str, Any] = {}
    for slice_name in sorted({str(case["slice"]) for case in cases}):
        indices = [
            index_
            for index_, case in enumerate(cases)
            if str(case["slice"]) == slice_name
        ]
        by_slice[slice_name] = _rank_metrics(
            [rankings[index_] for index_ in indices],
            [truth[index_] for index_ in indices],
            cutoffs,
        )

    return {
        "case_count": len(cases),
        "query_variant": query_variant,
        "mode": mode,
        "topic_aggregation": topic_aggregation,
        "query_aggregation": query_aggregation,
        "metrics": metrics,
        "slice_metrics": by_slice,
        "performance": {
            "latency_p50_seconds": _percentile(latencies, 0.50),
            "latency_p95_seconds": _percentile(latencies, 0.95),
            "latency_mean_seconds": statistics.fmean(latencies) if latencies else None,
        },
        "reproducibility": {
            "repeat_stable": rankings == repeat,
            "ranking_digest": _ranking_digest(rankings),
        },
        "_rankings": rankings,
    }


def _public_probe(result: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in result.items() if key != "_rankings"}


def _family_fold_proxy(
    cases: Sequence[dict[str, Any]],
    rankings: Sequence[list[str]],
    *,
    cutoffs: Sequence[int],
    fold_count: int,
) -> dict[str, Any]:
    families = sorted({str(case["family"]) for case in cases})
    family_to_fold = {
        family: int(hashlib.sha256(family.encode("utf-8")).hexdigest(), 16) % fold_count
        for family in families
    }
    fold_rows: list[dict[str, Any]] = []
    covered: set[str] = set()
    for fold in range(fold_count):
        indices = [
            index_
            for index_, case in enumerate(cases)
            if family_to_fold[str(case["family"])] == fold
        ]
        fold_families = sorted({str(cases[index_]["family"]) for index_ in indices})
        covered.update(fold_families)
        truth = [str(cases[index_]["topic_id"]) for index_ in indices]
        fold_rows.append(
            {
                "fold": fold,
                "family_count": len(fold_families),
                "case_count": len(indices),
                "metrics": _rank_metrics(
                    [rankings[index_] for index_ in indices],
                    truth,
                    cutoffs,
                ),
            }
        )
    disjoint = sum(row["family_count"] for row in fold_rows) == len(families)
    return {
        "kind": "SYNTHETIC_FAMILY_GROUPED_PROXY_ONLY",
        "fold_count": fold_count,
        "family_count": len(families),
        "all_families_covered": covered == set(families),
        "family_disjoint": disjoint,
        "folds": fold_rows,
        "legacy_personal_calibration": "NOT_RUN_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
    }


def _oracle_source_attribution(
    cases: Sequence[dict[str, Any]],
    dense: Sequence[list[str]],
    lexical: Sequence[list[str]],
    fused: Sequence[list[str]],
    cutoff: int = 20,
) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    by_slice: dict[str, Counter[str]] = defaultdict(Counter)
    dense_ranks: list[int] = []
    lexical_ranks: list[int] = []
    fused_ranks: list[int] = []
    for case, dense_row, lexical_row, fused_row in zip(cases, dense, lexical, fused):
        target = str(case["topic_id"])
        dense_rank = _rank_of(dense_row, target)
        lexical_rank = _rank_of(lexical_row, target)
        fused_rank = _rank_of(fused_row, target)
        dense_hit = dense_rank is not None and dense_rank <= cutoff
        lexical_hit = lexical_rank is not None and lexical_rank <= cutoff
        fused_hit = fused_rank is not None and fused_rank <= cutoff
        if dense_hit and lexical_hit:
            category = "DENSE_AND_LEXICAL"
        elif dense_hit:
            category = "DENSE_ONLY"
        elif lexical_hit:
            category = "LEXICAL_ONLY"
        elif fused_hit:
            category = "FUSION_ONLY_RECOVERY"
        else:
            category = "MISS_ALL"
        counts[category] += 1
        by_slice[str(case["slice"])][category] += 1
        if dense_rank is not None:
            dense_ranks.append(dense_rank)
        if lexical_rank is not None:
            lexical_ranks.append(lexical_rank)
        if fused_rank is not None:
            fused_ranks.append(fused_rank)
    return {
        "cutoff": cutoff,
        "case_count": len(cases),
        "counts": dict(sorted(counts.items())),
        "counts_by_slice": {
            name: dict(sorted(row.items())) for name, row in sorted(by_slice.items())
        },
        "rank_summary": {
            "dense_median": statistics.median(dense_ranks) if dense_ranks else None,
            "lexical_median": statistics.median(lexical_ranks) if lexical_ranks else None,
            "fused_median": statistics.median(fused_ranks) if fused_ranks else None,
        },
    }


def run_rem01(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_rem01_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    pack = build_rem01_fixture_pack(catalog, config)
    provenance_coverage = validate_fixture_pack(pack)
    cases = list(pack["cases"])
    cutoffs = [int(value) for value in config["diagnostic_cutoffs"]]

    context_free = [
        case
        for case in cases
        if case["slice"] in {"zh_short", "mixed", "boundary_no_alias"}
    ]
    context_cases = [
        case for case in cases if case["slice"] == "context_dependent"
    ]
    long_cases = [
        case for case in cases if str(case["slice"]).startswith("long_")
    ]

    tracemalloc.start()
    suite_started = time.perf_counter()
    descriptor_indices: dict[str, DiagnosticTopicIndex] = {}
    descriptor_probes: dict[str, Any] = {}
    runtime_failures: list[str] = []

    for variant in config["descriptor_variants"]:
        try:
            index = DiagnosticTopicIndex(topics, str(variant), config)
            descriptor_indices[str(variant)] = index
            probe = _evaluate_rankings(
                index,
                context_free,
                query_variant="current_only",
                mode="dense",
                cutoffs=cutoffs,
            )
            descriptor_probes[str(variant)] = _public_probe(probe)
        except Exception as exc:
            runtime_failures.append(
                f"descriptor:{variant}:{type(exc).__name__}:{exc}"
            )

    required_index = descriptor_indices.get("full_boundaries")
    if required_index is None:
        raise RuntimeError("full_boundaries diagnostic index is required")

    context_probes: dict[str, Any] = {}
    context_raw: dict[str, dict[str, Any]] = {}
    for variant in config["query_variants"]:
        probe = _evaluate_rankings(
            required_index,
            context_cases,
            query_variant=str(variant),
            mode="dense",
            cutoffs=cutoffs,
        )
        context_raw[str(variant)] = probe
        context_probes[str(variant)] = _public_probe(probe)

    chunk_probes: dict[str, Any] = {}
    chunk_raw: dict[str, dict[str, Any]] = {}
    for aggregation in config["chunking"]["aggregation_modes"]:
        probe = _evaluate_rankings(
            required_index,
            long_cases,
            query_variant="current_only",
            mode="dense",
            query_aggregation=str(aggregation),
            cutoffs=cutoffs,
        )
        chunk_raw[str(aggregation)] = probe
        chunk_probes[str(aggregation)] = _public_probe(probe)

    multivector_probe = _evaluate_rankings(
        required_index,
        context_free,
        query_variant="current_only",
        mode="dense",
        topic_aggregation="field_max",
        cutoffs=cutoffs,
    )

    fusion_raw: dict[str, dict[str, Any]] = {}
    fusion_probes: dict[str, Any] = {}
    for mode in config["fusion"]["modes"]:
        probe = _evaluate_rankings(
            required_index,
            context_free,
            query_variant="current_only",
            mode=str(mode),
            cutoffs=cutoffs,
        )
        fusion_raw[str(mode)] = probe
        fusion_probes[str(mode)] = _public_probe(probe)

    fold_proxy = _family_fold_proxy(
        context_free,
        fusion_raw["rrf"]["_rankings"],
        cutoffs=cutoffs,
        fold_count=int(config["fixture_policy"]["family_fold_count"]),
    )
    oracle = _oracle_source_attribution(
        context_free,
        fusion_raw["dense"]["_rankings"],
        fusion_raw["lexical"]["_rankings"],
        fusion_raw["rrf"]["_rankings"],
        cutoff=20,
    )


    max_codepoints = int(config["dense_controls"]["max_codepoints"])
    truncation_control = HashNgramEmbeddingAdapter(
        dimensions=int(config["dense_controls"]["dimensions"]),
        max_codepoints=max_codepoints,
    )
    explicit_overflow_rejected = False
    try:
        truncation_control.embed(["x" * (max_codepoints + 1)])
    except InputTooLongError:
        explicit_overflow_rejected = True

    long_chunk_coverage = []
    for case in long_cases:
        chunks = chunk_text(
            str(case["text"]),
            size=int(config["chunking"]["size_codepoints"]),
            overlap=int(config["chunking"]["overlap_codepoints"]),
        )
        long_chunk_coverage.append(
            bool(chunks)
            and chunks[0][0] == 0
            and chunks[-1][1] == len(str(case["text"]))
        )
    silent_truncation_violations = int(
        not explicit_overflow_rejected or not all(long_chunk_coverage)
    )

    descriptor_count = len(topics) * len(config["descriptor_variants"])
    empty_descriptors = sum(
        not topic_descriptor_variant(topic, str(variant)).strip()
        for variant in config["descriptor_variants"]
        for topic in topics
    )
    descriptor_empty_rate = empty_descriptors / max(1, descriptor_count)

    repeat_flags: list[bool] = []
    for result in descriptor_probes.values():
        repeat_flags.append(bool(result["reproducibility"]["repeat_stable"]))
    for result in context_probes.values():
        repeat_flags.append(bool(result["reproducibility"]["repeat_stable"]))
    for result in chunk_probes.values():
        repeat_flags.append(bool(result["reproducibility"]["repeat_stable"]))
    repeat_flags.append(bool(multivector_probe["reproducibility"]["repeat_stable"]))
    for result in fusion_probes.values():
        repeat_flags.append(bool(result["reproducibility"]["repeat_stable"]))
    deterministic_repeat = all(repeat_flags)

    index_resources = {
        variant: {
            "build_seconds": index.build_seconds,
            **index.estimated_index_bytes(),
        }
        for variant, index in descriptor_indices.items()
    }
    suite_seconds = time.perf_counter() - suite_started
    _, peak_python_memory = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    context_recall20 = float(
        context_probes["allowed_context"]["metrics"]["recall_at_20"]
    )
    context_current_recall20 = float(
        context_probes["current_only"]["metrics"]["recall_at_20"]
    )
    context_gain = context_recall20 - context_current_recall20

    technical_viability = {
        "descriptor_variants": {
            variant: (
                variant in descriptor_indices
                and descriptor_probes.get(variant, {})
                .get("reproducibility", {})
                .get("repeat_stable")
                is True
            )
            for variant in config["descriptor_variants"]
        },
        "topic_multivector_field_max": bool(
            multivector_probe["reproducibility"]["repeat_stable"]
        ),
        "query_chunk_max": bool(
            chunk_probes["chunk_max"]["reproducibility"]["repeat_stable"]
            and all(long_chunk_coverage)
        ),
        "allowed_context": bool(
            context_probes["allowed_context"]["reproducibility"]["repeat_stable"]
            and context_recall20
            >= float(
                config["engineering_gates"][
                    "context_probe_target_recall_at_20_min"
                ]
            )
        ),
        "compact_context": bool(
            context_probes["compact_context"]["reproducibility"]["repeat_stable"]
        ),
        "fusion_modes": {
            mode: bool(result["reproducibility"]["repeat_stable"])
            for mode, result in fusion_probes.items()
        },
    }

    isolation_violations = static_runtime_isolation_audit(repo_root())
    gates = config["engineering_gates"]
    engineering_pass = (
        provenance_coverage >= float(gates["provenance_coverage_min"])
        and deterministic_repeat is bool(gates["deterministic_repeat_required"])
        and silent_truncation_violations <= int(gates["silent_truncation_max"])
        and context_recall20
        >= float(gates["context_probe_target_recall_at_20_min"])
        and fold_proxy["fold_count"]
        >= int(gates["synthetic_family_fold_count_min"])
        and fold_proxy["family_disjoint"]
        and fold_proxy["all_families_covered"]
        and descriptor_empty_rate <= float(gates["descriptor_empty_rate_max"])
        and len(runtime_failures) <= int(gates["runtime_failure_count_max"])
        and not isolation_violations
    )


    config_sha = hashlib.sha256(DEFAULT_CONFIG_PATH.read_bytes()).hexdigest()
    code_sha = hashlib.sha256((repo_root() / "semantic_lab" / "rem01.py").read_bytes()).hexdigest()
    result = {
        "round": "REM-01",
        "benchmark_version": str(config["benchmark_version"]),
        "lab_commit": lab_commit,
        "catalog_version": str(catalog["catalog_version"]),
        "config_sha256": config_sha,
        "evaluation_code_sha256": code_sha,
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
        "fixture_summary": {
            "case_count": len(cases),
            "family_count": len({str(case["family"]) for case in cases}),
            "context_free_cases": len(context_free),
            "context_dependent_cases": len(context_cases),
            "long_cases": len(long_cases),
            "slice_counts": dict(
                sorted(Counter(str(case["slice"]) for case in cases).items())
            ),
            "provenance_coverage": provenance_coverage,
            "contains_real_paia_input": False,
        },
        "descriptor_probe": descriptor_probes,
        "context_probe": {
            **context_probes,
            "allowed_context_recall_at_20_gain_vs_current_only": context_gain,
        },
        "chunk_probe": chunk_probes,
        "multivector_probe": _public_probe(multivector_probe),
        "fusion_probe": fusion_probes,
        "oracle_candidate_attribution": oracle,
        "family_grouped_evaluation": fold_proxy,
        "truncation": {
            "explicit_overflow_rejected": explicit_overflow_rejected,
            "long_chunk_full_coverage": all(long_chunk_coverage),
            "silent_truncation_violations": silent_truncation_violations,
        },
        "resources": {
            "suite_seconds": suite_seconds,
            "peak_python_memory_bytes": peak_python_memory,
            "indices": index_resources,
        },
        "technical_viability": technical_viability,
        "runtime_failures": runtime_failures,
        "isolation_violations": isolation_violations,
        "gates": {
            "REM01_engineering_contract": "PASS" if engineering_pass else "FAIL",
            "deterministic_repeated_rankings": "PASS"
            if deterministic_repeat
            else "FAIL",
            "silent_truncation": "PASS"
            if silent_truncation_violations == 0
            else "FAIL",
            "synthetic_family_grouped_proxy": "PASS"
            if fold_proxy["family_disjoint"] and fold_proxy["all_families_covered"]
            else "FAIL",
            "legacy_family_grouped_calibration": "INCONCLUSIVE_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "personalized_semantic_quality": "WITHHELD",
            "model_selection": "FORBIDDEN_IN_REM01",
        },
        "pass": engineering_pass,
    }
    digest_payload = {
        "descriptor": {
            key: value["reproducibility"]["ranking_digest"]
            for key, value in descriptor_probes.items()
        },
        "context": {
            key: value["reproducibility"]["ranking_digest"]
            for key, value in context_probes.items()
        },
        "chunk": {
            key: value["reproducibility"]["ranking_digest"]
            for key, value in chunk_probes.items()
        },
        "multivector": multivector_probe["reproducibility"]["ranking_digest"],
        "fusion": {
            key: value["reproducibility"]["ranking_digest"]
            for key, value in fusion_probes.items()
        },
        "oracle_counts": oracle["counts"],
        "folds": fold_proxy["folds"],
    }
    result["deterministic_result_digest"] = hashlib.sha256(
        json.dumps(
            digest_payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    return result
