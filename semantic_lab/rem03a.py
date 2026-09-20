from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Sequence

import yaml

from .contracts import repo_root

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "rem03a_calibration_prototype_v0.1.yaml"


def load_rem03a_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-03A config must be a mapping")
    if value.get("status") != "FROZEN_BEFORE_PRIVATE_EVIDENCE":
        raise ValueError("REM-03A config is not frozen before private evidence")
    return value


def config_matrix(config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    cfg = config or load_rem03a_config()
    dev = cfg["development"]
    fusion = dev["fusion"]
    rows: list[dict[str, Any]] = []
    for query_variant in dev["query_variants"]:
        for strategy in dev["prototype_strategies"]:
            for prototype_weight in fusion["prototype_weights"]:
                row = {
                    "query_variant": str(query_variant),
                    "prototype_strategy": str(strategy),
                    "fusion_method": str(fusion["method"]),
                    "rrf_constant": int(fusion["constant"]),
                    "base_weight": float(fusion["base_weight"]),
                    "prototype_weight": float(prototype_weight),
                    "candidate_limit": int(dev["candidate_limit"]),
                }
                row["config_id"] = "rem03a-" + hashlib.sha256(
                    json.dumps(row, sort_keys=True, separators=(",", ":")).encode("utf-8")
                ).hexdigest()[:16]
                rows.append(row)
    return rows


def fold_id(family_ref: str, fold_count: int) -> int:
    if fold_count < 2:
        raise ValueError("fold_count must be >= 2")
    return int(hashlib.sha256(family_ref.encode("utf-8")).hexdigest(), 16) % fold_count


def fold_indices(cases: Sequence[dict[str, Any]], fold_count: int) -> list[list[int]]:
    folds = [[] for _ in range(fold_count)]
    family_to_fold: dict[str, int] = {}
    for index, case in enumerate(cases):
        family = str(case["family_ref"])
        family_to_fold.setdefault(family, fold_id(family, fold_count))
        folds[family_to_fold[family]].append(index)
    return folds


def _normalize(vector: Any) -> Any:
    import numpy as np

    value = np.asarray(vector, dtype="float32")
    norm = float(np.linalg.norm(value))
    if norm == 0.0:
        return value
    return value / norm


def _topic_support(
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
) -> dict[str, Any]:
    import numpy as np

    grouped: dict[str, list[Any]] = defaultdict(list)
    for vector, case in zip(train_vectors, train_cases):
        if case.get("truth_state") != "ASSIGNED":
            continue
        for topic_id in case.get("truth_topics", []):
            grouped[str(topic_id)].append(np.asarray(vector, dtype="float32"))
    return {
        topic_id: np.stack(vectors, axis=0)
        for topic_id, vectors in grouped.items()
        if vectors
    }


def prototype_ranking(
    query_vector: Any,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    *,
    strategy: str,
) -> list[str]:
    import numpy as np

    if strategy not in {"exemplar_max", "centroid", "hybrid"}:
        raise ValueError(f"Unsupported prototype strategy: {strategy}")
    query = _normalize(query_vector)
    support = _topic_support(train_vectors, train_cases)
    scored: list[tuple[float, str]] = []
    for topic_id, vectors in support.items():
        exemplar = float(np.max(vectors @ query))
        centroid = _normalize(np.mean(vectors, axis=0))
        centroid_score = float(centroid @ query)
        if strategy == "exemplar_max":
            score = exemplar
        elif strategy == "centroid":
            score = centroid_score
        else:
            score = 0.5 * exemplar + 0.5 * centroid_score
        scored.append((score, topic_id))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [topic_id for _, topic_id in scored]


def weighted_rrf_fuse(
    base_ranking: Sequence[str],
    prototype_ranking_ids: Sequence[str],
    all_topic_ids: Sequence[str],
    *,
    constant: int,
    base_weight: float,
    prototype_weight: float,
    limit: int,
) -> list[str]:
    if constant <= 0 or limit <= 0:
        raise ValueError("RRF constant and limit must be positive")
    known = set(str(value) for value in all_topic_ids)
    scores: dict[str, float] = {}
    best_source_rank: dict[str, int] = {}

    for weight, ranking in (
        (base_weight, base_ranking),
        (prototype_weight, prototype_ranking_ids),
    ):
        for rank, raw in enumerate(ranking, 1):
            topic_id = str(raw)
            if topic_id not in known:
                continue
            scores[topic_id] = scores.get(topic_id, 0.0) + weight / (constant + rank)
            best_source_rank[topic_id] = min(best_source_rank.get(topic_id, 10**9), rank)

    ordered = [
        topic_id
        for topic_id, _ in sorted(
            scores.items(),
            key=lambda item: (-item[1], best_source_rank[item[0]], item[0]),
        )
    ]
    seen = set(ordered)
    for raw in list(base_ranking) + list(all_topic_ids):
        topic_id = str(raw)
        if topic_id in known and topic_id not in seen:
            seen.add(topic_id)
            ordered.append(topic_id)
    return ordered[:limit]


def held_out_family_leakage_events(
    train_cases: Sequence[dict[str, Any]],
    test_cases: Sequence[dict[str, Any]],
) -> int:
    train_families = {str(case["family_ref"]) for case in train_cases}
    test_families = {str(case["family_ref"]) for case in test_cases}
    return len(train_families & test_families)
