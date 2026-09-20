from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Sequence

import yaml

from .contracts import repo_root

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "sca03_private_calibration_v0.1.yaml"


def load_sca03_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("SCA-03 config must be a mapping")
    if value.get("status") != "FROZEN_BEFORE_PRIVATE_EVIDENCE":
        raise ValueError("SCA-03 config is not frozen")
    if value.get("authorization", {}).get("execution_authorized") is not True:
        raise ValueError("SCA-03 is not authorized")
    return value


def config_matrix(config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    cfg = config or load_sca03_config()
    dev = cfg["development"]
    rows: list[dict[str, Any]] = []
    for query_variant in dev["query_variants"]:
        for profile_mode in dev["profile_modes"]:
            for calibration_weight in dev["calibration_centroid_weights"]:
                row = {
                    "query_variant": str(query_variant),
                    "profile_mode": str(profile_mode),
                    "calibration_weight": float(calibration_weight),
                }
                row["config_id"] = "sca03-" + hashlib.sha256(
                    json.dumps(row, sort_keys=True, separators=(",", ":")).encode()
                ).hexdigest()[:16]
                rows.append(row)
    if len(rows) > int(dev["maximum_matrix_size"]):
        raise ValueError("SCA-03 matrix exceeds frozen maximum")
    return rows


def load_profiles(root: Path) -> list[dict[str, Any]]:
    manifest = json.loads((root / "semantic_profiles/v0.1/manifest.json").read_text())
    rows: list[dict[str, Any]] = []
    for shard in manifest["shards"]:
        payload = json.loads((root / shard["path"]).read_text())
        rows.extend(payload["profiles"])
    return sorted(rows, key=lambda row: row["topic_id"])


def profile_text(profile: dict[str, Any], mode: str) -> str:
    names = profile["canonical_names"]
    domain = profile["domain"]
    anchors = (
        list(profile["lexical_anchors"]["zh"])
        + list(profile["lexical_anchors"]["en"])
        + list(profile["lexical_anchors"]["mixed"])
    )
    base = [
        f"Topic: {names['zh']} / {names['en']}",
        f"Domain: {domain['name_zh']} / {domain['name_en']}",
        *profile["semantic_core"],
    ]
    if mode == "core":
        parts = base
    elif mode == "core_anchors":
        parts = base + ["Lexical anchors: " + " | ".join(anchors)]
    elif mode == "full_derived":
        parts = base + list(profile["positive_intents"])
        parts += ["Lexical anchors: " + " | ".join(anchors)]
        parts += list(profile["synthetic_utterance_patterns"])
        parts += list(profile["exclusion_cues"])
    else:
        raise ValueError(f"Unsupported profile mode: {mode}")
    return "\n".join(str(value) for value in parts if str(value).strip())


def topic_centroid_ranking(
    query_vector: Any,
    train_vectors: Any,
    train_cases: Sequence[dict[str, Any]],
    topic_ids: Sequence[str],
) -> list[str]:
    import numpy as np

    q = np.asarray(query_vector, dtype="float32")
    grouped: dict[str, list[Any]] = defaultdict(list)
    known = set(topic_ids)
    for vector, case in zip(train_vectors, train_cases):
        if case.get("truth_state") != "ASSIGNED":
            continue
        for raw in case.get("truth_topics", []):
            topic_id = str(raw)
            if topic_id in known:
                grouped[topic_id].append(np.asarray(vector, dtype="float32"))
    scored: list[tuple[float, str]] = []
    for topic_id in topic_ids:
        values = grouped.get(topic_id, [])
        if values:
            centroid = np.mean(np.stack(values, axis=0), axis=0)
            norm = float(np.linalg.norm(centroid))
            if norm:
                centroid = centroid / norm
            score = float(centroid @ q)
        else:
            score = float("-inf")
        scored.append((score, topic_id))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [topic_id for _, topic_id in scored]


def weighted_rrf(
    profile_ranking: Sequence[str],
    calibration_ranking: Sequence[str],
    topic_ids: Sequence[str],
    *,
    constant: int,
    profile_weight: float,
    calibration_weight: float,
) -> list[str]:
    known = set(topic_ids)
    scores: dict[str, float] = {}
    best_rank: dict[str, int] = {}
    for weight, ranking in (
        (profile_weight, profile_ranking),
        (calibration_weight, calibration_ranking),
    ):
        for rank, raw in enumerate(ranking, 1):
            topic_id = str(raw)
            if topic_id not in known:
                continue
            scores[topic_id] = scores.get(topic_id, 0.0) + float(weight) / (constant + rank)
            best_rank[topic_id] = min(best_rank.get(topic_id, 10**9), rank)
    ordered = [
        topic_id
        for topic_id, _ in sorted(
            scores.items(),
            key=lambda item: (-item[1], best_rank[item[0]], item[0]),
        )
    ]
    seen = set(ordered)
    for topic_id in topic_ids:
        if topic_id not in seen:
            seen.add(topic_id)
            ordered.append(topic_id)
    return ordered


def domain_members(profiles: Sequence[dict[str, Any]]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for profile in profiles:
        grouped[str(profile["domain"]["id"])].append(str(profile["topic_id"]))
    return {key: sorted(values) for key, values in grouped.items()}


def topic_to_domain(profiles: Sequence[dict[str, Any]]) -> dict[str, str]:
    return {
        str(profile["topic_id"]): str(profile["domain"]["id"])
        for profile in profiles
    }


def assemble_graph_candidates(
    direct_ranking: Sequence[str],
    profiles: Sequence[dict[str, Any]],
    *,
    limit: int,
) -> tuple[list[str], dict[str, Any]]:
    members = domain_members(profiles)
    mapping = topic_to_domain(profiles)
    known = set(mapping)
    direct = [str(value) for value in direct_ranking if str(value) in known]
    selected: list[str] = []
    seen: set[str] = set()

    def add(topic_id: str) -> None:
        if topic_id in known and topic_id not in seen:
            seen.add(topic_id)
            selected.append(topic_id)

    if not direct:
        return [], {"first_domain": None, "second_domain": None}

    first_seed = direct[0]
    first_domain = mapping[first_seed]
    add(first_seed)
    for topic_id in members[first_domain]:
        add(topic_id)
    for topic_id in direct:
        if len(selected) >= 10:
            break
        add(topic_id)

    second_domain = None
    for topic_id in direct[1:]:
        domain_id = mapping[topic_id]
        if domain_id != first_domain:
            second_domain = domain_id
            break
    if second_domain is not None:
        for topic_id in members[second_domain]:
            add(topic_id)
    for topic_id in direct:
        if len(selected) >= 20:
            break
        add(topic_id)

    for topic_id in direct:
        if len(selected) >= limit:
            break
        add(topic_id)
    for topic_id in sorted(known):
        if len(selected) >= limit:
            break
        add(topic_id)

    return selected[:limit], {
        "first_domain": first_domain,
        "second_domain": second_domain,
    }


def graph_structural_failures(
    ranking: Sequence[str],
    graph_meta: dict[str, Any],
    profiles: Sequence[dict[str, Any]],
) -> list[str]:
    members = domain_members(profiles)
    failures: list[str] = []
    first = graph_meta.get("first_domain")
    second = graph_meta.get("second_domain")
    if first and not set(members[first]) <= set(ranking[:10]):
        failures.append("first_seed_domain_not_fully_in_top10")
    if second and not set(members[second]) <= set(ranking[:20]):
        failures.append("second_seed_domain_not_fully_in_top20")
    if len(ranking) != len(set(ranking)):
        failures.append("duplicate_candidate")
    if len(ranking) != 144:
        failures.append("full_catalog_eligibility_lost")
    return failures


def held_out_family_leakage_events(
    train_cases: Sequence[dict[str, Any]],
    test_cases: Sequence[dict[str, Any]],
) -> int:
    train = {str(case["family_ref"]) for case in train_cases}
    test = {str(case["family_ref"]) for case in test_cases}
    return len(train & test)
