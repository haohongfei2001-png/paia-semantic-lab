from __future__ import annotations

from collections import defaultdict
from typing import Any, Sequence


ALLOWED_SIBLING_CAPS = (2, 4)


def _domain_members(profiles: Sequence[dict[str, Any]]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for profile in profiles:
        grouped[str(profile["domain"]["id"])].append(str(profile["topic_id"]))
    return {domain_id: sorted(topic_ids) for domain_id, topic_ids in grouped.items()}


def _topic_to_domain(profiles: Sequence[dict[str, Any]]) -> dict[str, str]:
    return {
        str(profile["topic_id"]): str(profile["domain"]["id"])
        for profile in profiles
    }


def assemble_direct_preserving_candidates(
    direct_ranking: Sequence[str],
    profiles: Sequence[dict[str, Any]],
    *,
    sibling_cap: int,
    limit: int = 144,
) -> tuple[list[str], dict[str, Any]]:
    """Public BAA-01 candidate assembler.

    Preserve direct evidence first, then inject a bounded number of additional
    same-domain siblings. The sibling cap excludes the seed and counts only
    candidates injected by the sibling lane.
    """
    if sibling_cap not in ALLOWED_SIBLING_CAPS:
        raise ValueError(f"Unsupported BAA-01 sibling cap: {sibling_cap}")

    mapping = _topic_to_domain(profiles)
    members = _domain_members(profiles)
    known = set(mapping)

    direct: list[str] = []
    direct_seen: set[str] = set()
    for raw in direct_ranking:
        topic_id = str(raw)
        if topic_id in known and topic_id not in direct_seen:
            direct_seen.add(topic_id)
            direct.append(topic_id)
    if len(direct) < 10:
        raise ValueError("BAA-01 requires at least ten unique eligible direct candidates")

    selected: list[str] = []
    seen: set[str] = set()
    injected_counts: dict[str, int] = defaultdict(int)
    injected_topics: list[str] = []

    def add(topic_id: str) -> bool:
        if topic_id in known and topic_id not in seen:
            seen.add(topic_id)
            selected.append(topic_id)
            return True
        return False

    def inject_siblings(seed: str, *, stop_at: int) -> None:
        domain_id = mapping[seed]
        if injected_counts[domain_id] >= sibling_cap:
            return
        for topic_id in members[domain_id]:
            if len(selected) >= stop_at:
                break
            if topic_id == seed or topic_id in seen:
                continue
            if injected_counts[domain_id] >= sibling_cap:
                break
            if add(topic_id):
                injected_counts[domain_id] += 1
                injected_topics.append(topic_id)

    # Lane 1: direct evidence is authoritative for the first six slots.
    for topic_id in direct[:6]:
        add(topic_id)

    # Lane 2: bounded siblings from the strongest seed, then refill with direct
    # evidence so direct ranks 1-6 always remain inside top-10.
    inject_siblings(direct[0], stop_at=10)
    for topic_id in direct:
        if len(selected) >= 10:
            break
        add(topic_id)

    # Lane 3: guarantee all direct top-10 before any top-20 expansion.
    for topic_id in direct[:10]:
        add(topic_id)

    # Lane 4: bounded expansion from seeded Domains while preserving top-20
    # room already claimed by direct ranks 1-10.
    for seed in direct[:10]:
        if len(selected) >= 20:
            break
        inject_siblings(seed, stop_at=20)

    for topic_id in direct:
        if len(selected) >= 20:
            break
        add(topic_id)

    # Full-catalog eligibility is preserved after the bounded early lanes.
    for topic_id in direct:
        if len(selected) >= limit:
            break
        add(topic_id)
    for topic_id in sorted(known):
        if len(selected) >= limit:
            break
        add(topic_id)

    ranking = selected[:limit]
    return ranking, {
        "policy": f"direct_reserve6_sibling_cap{sibling_cap}",
        "sibling_cap": sibling_cap,
        "sibling_cap_counts_seed": False,
        "injected_sibling_counts": dict(sorted(injected_counts.items())),
        "injected_topics": injected_topics,
    }


def candidate_public_invariants(
    ranking: Sequence[str],
    direct_ranking: Sequence[str],
    profiles: Sequence[dict[str, Any]],
) -> dict[str, bool]:
    mapping = _topic_to_domain(profiles)
    known = set(mapping)
    direct = []
    seen_direct: set[str] = set()
    for raw in direct_ranking:
        topic_id = str(raw)
        if topic_id in known and topic_id not in seen_direct:
            seen_direct.add(topic_id)
            direct.append(topic_id)
    ranked = list(ranking)
    return {
        "direct_top6_in_top10": set(direct[:6]) <= set(ranked[:10]),
        "direct_top10_in_top20": set(direct[:10]) <= set(ranked[:20]),
        "full_catalog_144": len(ranked) == 144 and set(ranked) == known,
        "unique_candidates": len(ranked) == len(set(ranked)),
        "domain_ids_absent": not (set(ranked) & set(_domain_members(profiles))),
    }


def observed_topic_centroid_ranking(
    query_vector: Any,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    *,
    topic_ids: Sequence[str],
) -> list[str]:
    """Rank only Topics that actually have fold-local prototype evidence."""
    import numpy as np

    query = np.asarray(query_vector, dtype="float32")
    matrix = np.asarray(train_vectors, dtype="float32")
    if len(matrix) != len(train_cases):
        raise ValueError("train_vectors and train_cases length mismatch")

    known = {str(value) for value in topic_ids}
    grouped: dict[str, list[Any]] = defaultdict(list)
    for vector, case in zip(matrix, train_cases):
        if case.get("truth_state") != "ASSIGNED":
            continue
        for raw in case.get("truth_topics", []):
            topic_id = str(raw)
            if topic_id in known:
                grouped[topic_id].append(np.asarray(vector, dtype="float32"))

    scored: list[tuple[float, str]] = []
    for raw in topic_ids:
        topic_id = str(raw)
        values = grouped.get(topic_id, [])
        if not values:
            continue
        centroid = np.mean(np.stack(values, axis=0), axis=0)
        norm = float(np.linalg.norm(centroid))
        if norm:
            centroid = centroid / norm
        scored.append((float(centroid @ query), topic_id))

    scored.sort(key=lambda item: (-item[0], item[1]))
    return [topic_id for _, topic_id in scored]


def neutral_prototype_rrf(
    profile_ranking: Sequence[str],
    prototype_ranking: Sequence[str],
    all_ids: Sequence[str],
    *,
    constant: int,
    profile_weight: float,
    prototype_weight: float,
) -> list[str]:
    """Fuse observed prototype evidence without assigning ranks to missing evidence."""
    if constant <= 0:
        raise ValueError("RRF constant must be positive")
    if profile_weight < 0 or prototype_weight < 0:
        raise ValueError("RRF weights must be non-negative")

    ids = [str(value) for value in all_ids]
    known = set(ids)
    profile = [str(value) for value in profile_ranking]
    prototype = [str(value) for value in prototype_ranking]

    if len(profile) != len(set(profile)) or set(profile) != known:
        raise ValueError("profile_ranking must contain every eligible Topic exactly once")
    if len(prototype) != len(set(prototype)) or not set(prototype) <= known:
        raise ValueError("prototype_ranking must be a unique subset of eligible Topics")

    base_rank = {topic_id: rank for rank, topic_id in enumerate(profile, 1)}
    scores = {
        topic_id: profile_weight / (constant + rank)
        for topic_id, rank in base_rank.items()
    }

    for rank, topic_id in enumerate(prototype, 1):
        scores[topic_id] += prototype_weight / (constant + rank)

    # Base rank is the only tie-break. Topic IDs never order missing evidence.
    return sorted(profile, key=lambda topic_id: (-scores[topic_id], base_rank[topic_id]))
