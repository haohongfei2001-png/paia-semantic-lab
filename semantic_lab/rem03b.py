from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Sequence

import yaml

from .catalog import normalize
from .contracts import repo_root

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "rem03b_private_promotion_v0.1.yaml"


def load_rem03b_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-03B execution config must be a mapping")
    if value.get("status") != "FROZEN_BEFORE_PRIVATE_EVIDENCE":
        raise ValueError("REM-03B execution config is not frozen before private evidence")
    if value.get("authorization", {}).get("execution_authorized") is not True:
        raise ValueError("REM-03B execution is not authorized")
    return value


def config_matrix(config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    cfg = config or load_rem03b_config()
    dev = cfg["development"]
    rows: list[dict[str, Any]] = []
    for query_variant in dev["query_variants"]:
        for domain_evidence in dev["domain_evidence"]:
            for anchor_mode in dev["anchor_modes"]:
                row = {
                    "query_variant": str(query_variant),
                    "domain_evidence": str(domain_evidence),
                    "anchor_mode": str(anchor_mode),
                }
                row["config_id"] = "rem03b-" + hashlib.sha256(
                    json.dumps(row, sort_keys=True, separators=(",", ":")).encode("utf-8")
                ).hexdigest()[:16]
                rows.append(row)
    if len(rows) > int(dev["maximum_matrix_size"]):
        raise ValueError("REM-03B configuration matrix exceeds frozen maximum")
    return rows


def _dedupe_texts(values: Sequence[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for raw in values:
        value = str(raw).strip()
        key = normalize(value)
        if not value or not key or key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def topic_anchor_texts(
    topic: dict[str, Any],
    domains_by_id: dict[str, dict[str, Any]],
    *,
    mode: str,
) -> list[str]:
    if mode not in {"names_aliases", "names_aliases_plus_domain_path"}:
        raise ValueError(f"Unsupported REM-03B anchor mode: {mode}")
    names = topic.get("name", {})
    aliases = topic.get("aliases", {})
    values = [
        str(names.get("zh", "")),
        str(names.get("en", "")),
        *[str(v) for v in aliases.get("zh", []) or []],
        *[str(v) for v in aliases.get("en", []) or []],
    ]
    if mode == "names_aliases_plus_domain_path":
        domain = domains_by_id.get(str(topic.get("internal_domain", "")), {})
        zh_domain = str(domain.get("name_zh", ""))
        en_domain = str(domain.get("name_en", ""))
        zh_topic = str(names.get("zh", ""))
        en_topic = str(names.get("en", ""))
        if zh_domain and zh_topic:
            values.append(f"{zh_domain} > {zh_topic}")
        if en_domain and en_topic:
            values.append(f"{en_domain} > {en_topic}")
    return _dedupe_texts(values)


def domain_anchor_texts(domain: dict[str, Any]) -> list[str]:
    return _dedupe_texts(
        [
            str(domain.get("name_zh", "")),
            str(domain.get("name_en", "")),
            str(domain.get("slug", "")).replace("_", " "),
        ]
    )


def _normalize_vector(vector: Any) -> Any:
    import numpy as np

    value = np.asarray(vector, dtype="float32")
    norm = float(np.linalg.norm(value))
    return value if norm == 0.0 else value / norm


def anchor_ranking(query_vector: Any, vectors_by_id: dict[str, Any]) -> list[str]:
    import numpy as np

    query = _normalize_vector(query_vector)
    scored: list[tuple[float, str]] = []
    for item_id, vectors in vectors_by_id.items():
        matrix = np.asarray(vectors, dtype="float32")
        if matrix.ndim == 1:
            matrix = matrix.reshape(1, -1)
        score = float(np.max(matrix @ query))
        scored.append((score, str(item_id)))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [item_id for _, item_id in scored]


def weighted_rrf(
    rankings: Sequence[tuple[float, Sequence[str]]],
    *,
    all_ids: Sequence[str],
    constant: int,
) -> list[str]:
    if constant <= 0:
        raise ValueError("RRF constant must be positive")
    known = {str(value) for value in all_ids}
    scores: dict[str, float] = {}
    best_rank: dict[str, int] = {}
    for weight, ranking in rankings:
        for rank, raw in enumerate(ranking, 1):
            item_id = str(raw)
            if item_id not in known:
                continue
            scores[item_id] = scores.get(item_id, 0.0) + float(weight) / (constant + rank)
            best_rank[item_id] = min(best_rank.get(item_id, 10**9), rank)
    ordered = [
        item_id
        for item_id, _ in sorted(
            scores.items(),
            key=lambda item: (-item[1], best_rank[item[0]], item[0]),
        )
    ]
    seen = set(ordered)
    for raw in all_ids:
        item_id = str(raw)
        if item_id not in seen:
            seen.add(item_id)
            ordered.append(item_id)
    return ordered


def topic_to_domain(topics: Sequence[dict[str, Any]]) -> dict[str, str]:
    return {
        str(topic["topic_id"]): str(topic.get("internal_domain", ""))
        for topic in topics
    }


def _case_domains(
    case: dict[str, Any],
    mapping: dict[str, str],
    known_domains: set[str],
) -> list[str]:
    if case.get("truth_state") != "ASSIGNED":
        return []
    values = {
        mapping.get(str(topic_id), "")
        for topic_id in case.get("truth_topics", [])
    }
    return sorted(value for value in values if value in known_domains)


def domain_exemplar_vote_ranking(
    query_vector: Any,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    *,
    topic_domain_map: dict[str, str],
    domain_ids: Sequence[str],
    neighbor_count: int,
) -> list[str]:
    import numpy as np

    query = _normalize_vector(query_vector)
    matrix = np.asarray(train_vectors, dtype="float32")
    sims = matrix @ query
    order = np.argsort(-sims, kind="stable")
    known = {str(value) for value in domain_ids}
    scores = {str(value): 0.0 for value in domain_ids}
    for neighbor_rank, index in enumerate(order[:neighbor_count], 1):
        similarity = max(0.0, float(sims[int(index)]))
        for domain_id in _case_domains(
            train_cases[int(index)], topic_domain_map, known
        ):
            scores[domain_id] += similarity / neighbor_rank
    return [
        domain_id
        for domain_id, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    ]


def domain_centroid_ranking(
    query_vector: Any,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    *,
    topic_domain_map: dict[str, str],
    domain_ids: Sequence[str],
) -> list[str]:
    import numpy as np

    query = _normalize_vector(query_vector)
    known = {str(value) for value in domain_ids}
    grouped: dict[str, list[Any]] = defaultdict(list)
    for vector, case in zip(train_vectors, train_cases):
        for domain_id in _case_domains(case, topic_domain_map, known):
            grouped[domain_id].append(np.asarray(vector, dtype="float32"))
    scored: list[tuple[float, str]] = []
    for domain_id in domain_ids:
        values = grouped.get(str(domain_id), [])
        if values:
            centroid = _normalize_vector(np.mean(np.stack(values, axis=0), axis=0))
            score = float(centroid @ query)
        else:
            score = float("-inf")
        scored.append((score, str(domain_id)))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [domain_id for _, domain_id in scored]


def domain_evidence_ranking(
    query_vector: Any,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    *,
    topic_domain_map: dict[str, str],
    domain_ids: Sequence[str],
    strategy: str,
    neighbor_count: int,
    hybrid_rrf_constant: int,
) -> list[str]:
    exemplar = domain_exemplar_vote_ranking(
        query_vector,
        train_vectors,
        train_cases,
        topic_domain_map=topic_domain_map,
        domain_ids=domain_ids,
        neighbor_count=neighbor_count,
    )
    if strategy == "exemplar_vote":
        return exemplar
    centroid = domain_centroid_ranking(
        query_vector,
        train_vectors,
        train_cases,
        topic_domain_map=topic_domain_map,
        domain_ids=domain_ids,
    )
    if strategy == "centroid":
        return centroid
    if strategy == "hybrid":
        return weighted_rrf(
            [(1.0, exemplar), (1.0, centroid)],
            all_ids=domain_ids,
            constant=hybrid_rrf_constant,
        )
    raise ValueError(f"Unsupported REM-03B domain evidence: {strategy}")


def topic_centroid_ranking(
    query_vector: Any,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    *,
    topic_ids: Sequence[str],
) -> list[str]:
    import numpy as np

    query = _normalize_vector(query_vector)
    known = {str(value) for value in topic_ids}
    grouped: dict[str, list[Any]] = defaultdict(list)
    for vector, case in zip(train_vectors, train_cases):
        if case.get("truth_state") != "ASSIGNED":
            continue
        for raw in case.get("truth_topics", []):
            topic_id = str(raw)
            if topic_id in known:
                grouped[topic_id].append(np.asarray(vector, dtype="float32"))
    scored: list[tuple[float, str]] = []
    for topic_id in topic_ids:
        values = grouped.get(str(topic_id), [])
        if values:
            centroid = _normalize_vector(np.mean(np.stack(values, axis=0), axis=0))
            score = float(centroid @ query)
        else:
            score = float("-inf")
        scored.append((score, str(topic_id)))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [topic_id for _, topic_id in scored]


def exact_alias_topic_ids(
    query_text: str,
    topics: Sequence[dict[str, Any]],
    *,
    maximum: int,
) -> list[str]:
    qn = normalize(query_text)
    if not qn:
        return []
    matches: list[str] = []
    for topic in topics:
        names = topic.get("name", {})
        aliases = topic.get("aliases", {})
        values = [
            str(names.get("zh", "")),
            str(names.get("en", "")),
            *[str(v) for v in aliases.get("zh", []) or []],
            *[str(v) for v in aliases.get("en", []) or []],
        ]
        if any(normalize(value) == qn for value in values if value):
            matches.append(str(topic["topic_id"]))
    return sorted(set(matches))[:maximum]


def domain_members(topics: Sequence[dict[str, Any]]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for topic in topics:
        domain_id = str(topic.get("internal_domain", ""))
        if domain_id:
            grouped[domain_id].append(str(topic["topic_id"]))
    return {key: sorted(values) for key, values in grouped.items()}


def assemble_structured_candidates(
    *,
    query_text: str,
    topics: Sequence[dict[str, Any]],
    topic_ranking: Sequence[str],
    domain_ranking: Sequence[str],
    config: dict[str, Any] | None = None,
) -> list[str]:
    cfg = config or load_rem03b_config()
    policy = cfg["candidate_policy"]
    known = {str(topic["topic_id"]) for topic in topics}
    direct = [str(value) for value in topic_ranking if str(value) in known]
    rank = {topic_id: index for index, topic_id in enumerate(direct)}
    members = domain_members(topics)
    selected: list[str] = []
    seen: set[str] = set()

    def add(topic_id: str) -> None:
        if topic_id in known and topic_id not in seen:
            seen.add(topic_id)
            selected.append(topic_id)

    for topic_id in exact_alias_topic_ids(
        query_text,
        topics,
        maximum=int(policy["exact_alias_slots_max"]),
    ):
        add(topic_id)

    def ordered_domain(domain_id: str) -> list[str]:
        values = members.get(domain_id, [])
        return sorted(values, key=lambda topic_id: (rank.get(topic_id, 10**9), topic_id))

    ranked_domains = [str(value) for value in domain_ranking if str(value) in members]
    if ranked_domains:
        for topic_id in ordered_domain(ranked_domains[0])[: int(policy["top_domain_topic_count"])]:
            add(topic_id)

    for topic_id in direct:
        if len(selected) >= int(policy["top10_fill_target"]):
            break
        add(topic_id)

    if len(ranked_domains) > 1:
        for topic_id in ordered_domain(ranked_domains[1])[: int(policy["second_domain_topic_count"])]:
            add(topic_id)

    for topic_id in direct:
        if len(selected) >= int(policy["top20_fill_target"]):
            break
        add(topic_id)

    for topic_id in direct:
        if len(selected) >= int(policy["candidate_limit"]):
            break
        add(topic_id)

    for topic_id in sorted(known):
        if len(selected) >= int(policy["candidate_limit"]):
            break
        add(topic_id)

    return selected[: int(policy["candidate_limit"])]


def held_out_family_leakage_events(
    train_cases: Sequence[dict[str, Any]],
    test_cases: Sequence[dict[str, Any]],
) -> int:
    train = {str(case["family_ref"]) for case in train_cases}
    test = {str(case["family_ref"]) for case in test_cases}
    return len(train & test)
