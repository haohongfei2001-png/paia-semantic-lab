from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence

import yaml

from .baa01 import candidate_public_invariants
from .contracts import repo_root

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "baa02_private_calibration_v0.1.yaml"


def load_baa02_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("BAA-02 config must be a mapping")
    if value.get("round") != "BAA-02":
        raise ValueError("BAA-02 config round mismatch")
    if value.get("status") != "FROZEN_BEFORE_PRIVATE_EVIDENCE":
        raise ValueError("BAA-02 config is not frozen")
    auth = value.get("authorization", {})
    if auth.get("private_calibration_execution_authorized") is not True:
        raise ValueError("BAA-02 private calibration is not authorized")
    if auth.get("evaluation_read_authorized") is not False:
        raise ValueError("BAA-02 evaluation must remain unauthorized")
    return value


def config_matrix(config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    cfg = config or load_baa02_config()
    dev = cfg["development"]
    rows: list[dict[str, Any]] = []
    for query_variant in dev["query_variants"]:
        for profile_mode in dev["profile_modes"]:
            for prototype_weight in dev["prototype_weights"]:
                for sibling_cap in dev["sibling_caps"]:
                    row = {
                        "query_variant": str(query_variant),
                        "profile_mode": str(profile_mode),
                        "prototype_weight": float(prototype_weight),
                        "sibling_cap": int(sibling_cap),
                    }
                    row["config_id"] = "baa02-" + hashlib.sha256(
                        json.dumps(row, sort_keys=True, separators=(",", ":")).encode()
                    ).hexdigest()[:16]
                    rows.append(row)
    if len(rows) != int(dev["expected_matrix_size"]):
        raise ValueError("BAA-02 matrix size drift")
    if len(rows) > int(dev["maximum_matrix_size"]):
        raise ValueError("BAA-02 matrix exceeds frozen maximum")
    return rows


def candidate_failures(
    ranking: Sequence[str],
    direct_ranking: Sequence[str],
    profiles: Sequence[dict[str, Any]],
    meta: dict[str, Any],
    *,
    sibling_cap: int,
) -> list[str]:
    invariants = candidate_public_invariants(ranking, direct_ranking, profiles)
    failures = [name for name, passed in invariants.items() if not passed]
    if bool(meta.get("sibling_cap_counts_seed")):
        failures.append("sibling_cap_counts_seed")
    counts = {
        str(domain_id): int(count)
        for domain_id, count in dict(meta.get("injected_sibling_counts", {})).items()
    }
    if any(count > sibling_cap for count in counts.values()):
        failures.append("sibling_cap_exceeded")
    expected_policy = f"direct_reserve6_sibling_cap{sibling_cap}"
    if str(meta.get("policy")) != expected_policy:
        failures.append("candidate_policy_mismatch")
    return failures


def selection_key(result: dict[str, Any]) -> tuple[Any, ...]:
    """Pre-registered ordering used only among configs that already pass every gate."""
    overall = result["metrics"]["overall"]
    cfg = result["config"]
    return (
        -float(overall["topic_recall_at_10"]),
        -float(overall["topic_recall_at_20"]),
        int(cfg["sibling_cap"]),
        float(cfg["prototype_weight"]),
        str(cfg["query_variant"]),
        str(cfg["profile_mode"]),
        str(cfg["config_id"]),
    )
