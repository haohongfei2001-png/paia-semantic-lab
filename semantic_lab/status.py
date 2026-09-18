from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import yaml

from .contracts import repo_root


class StatusTransitionError(ValueError):
    pass


EXECUTION_STATES = frozenset({"NOT_STARTED", "READY", "IN_PROGRESS", "COMPLETE", "BLOCKED"})
CAPABILITY_VERDICTS = frozenset({"UNTESTED", "PASS", "FAIL", "INCONCLUSIVE"})


def load_status(path: Path | None = None) -> dict[str, Any]:
    target = path or repo_root() / "status" / "SEMANTIC_LAB_STATUS.yaml"
    data = yaml.safe_load(target.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise StatusTransitionError("Status root must be a mapping")
    return data


def transition_round(
    status: dict[str, Any],
    round_id: str,
    target: str,
    *,
    explicit_authorization: bool = False,
    capability_verdict: str | None = None,
) -> dict[str, Any]:
    if target not in EXECUTION_STATES:
        raise StatusTransitionError(f"Unknown target state: {target}")
    updated = deepcopy(status)
    if round_id not in updated.get("rounds", {}):
        raise StatusTransitionError(f"Unknown round: {round_id}")
    state = updated["rounds"][round_id]
    current = state["execution_status"]
    allowed = {
        "NOT_STARTED": {"READY"},
        "READY": {"IN_PROGRESS"},
        "IN_PROGRESS": {"COMPLETE", "BLOCKED"},
        "BLOCKED": {"READY", "IN_PROGRESS"},
        "COMPLETE": set(),
    }
    if target not in allowed[current]:
        raise StatusTransitionError(f"Illegal transition {current} -> {target}")
    if target == "IN_PROGRESS" and not explicit_authorization:
        raise StatusTransitionError("Explicit execution authorization is required")
    state["execution_status"] = target
    if target == "IN_PROGRESS":
        state["explicit_execution_authorized"] = True
    if capability_verdict is not None:
        if capability_verdict not in CAPABILITY_VERDICTS:
            raise StatusTransitionError(f"Unknown capability verdict: {capability_verdict}")
        state["capability_verdict"] = capability_verdict
    return updated


def unlock_immediate_dependency(status: dict[str, Any], completed_round: str) -> dict[str, Any]:
    updated = deepcopy(status)
    if updated["rounds"][completed_round]["execution_status"] != "COMPLETE":
        raise StatusTransitionError("Completed round must be COMPLETE")
    unlocked = 0
    for state in updated["rounds"].values():
        if state.get("depends_on") == completed_round and state.get("execution_status") == "NOT_STARTED":
            state["execution_status"] = "READY"
            state["explicit_execution_authorized"] = False
            unlocked += 1
    if unlocked > 1:
        raise StatusTransitionError("More than one immediate dependency was unlocked")
    return updated
