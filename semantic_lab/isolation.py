from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class IsolationViolation(RuntimeError):
    pass


SAFE_EVIDENCE_CLASSES = frozenset({"public", "synthetic", "catalog_boundary"})
FORBIDDEN_RUNTIME_IMPORTS = frozenset({"requests", "httpx", "aiohttp", "socket", "subprocess"})


@dataclass(frozen=True)
class AuthorizationScope:
    round_id: str
    production_write: bool = False
    real_archive_read: bool = False
    real_input_api_egress: bool = False
    model_training: bool = False


SEM00_SCOPE = AuthorizationScope(round_id="SEM-00")


def assert_capability_allowed(capability: str, scope: AuthorizationScope = SEM00_SCOPE) -> None:
    permissions = {
        "production_write": scope.production_write,
        "real_archive_read": scope.real_archive_read,
        "real_input_api_egress": scope.real_input_api_egress,
        "model_training": scope.model_training,
        "owner_label_task": False,
        "automatic_topic_creation": False,
    }
    if capability not in permissions:
        raise IsolationViolation(f"Unknown capability request: {capability}")
    if permissions[capability] is not True:
        raise IsolationViolation(f"{capability} is denied for {scope.round_id}")


def validate_fixture_pack(pack: dict[str, Any]) -> float:
    cases = pack.get("cases", [])
    if not isinstance(cases, list) or not cases:
        raise IsolationViolation("Fixture pack must contain cases")
    complete = 0
    for case in cases:
        provenance = case.get("provenance")
        if not isinstance(provenance, dict):
            raise IsolationViolation(f"Fixture {case.get('id')} lacks provenance")
        if provenance.get("evidence_class") not in SAFE_EVIDENCE_CLASSES:
            raise IsolationViolation(f"Fixture {case.get('id')} has an unsafe evidence class")
        if provenance.get("contains_real_paia_input") is not False:
            raise IsolationViolation(f"Fixture {case.get('id')} is not synthetic/public-safe")
        if not provenance.get("source"):
            raise IsolationViolation(f"Fixture {case.get('id')} lacks a source")
        complete += 1
    return complete / len(cases)


def treat_as_inert_data(text: str) -> dict[str, str]:
    return {"text": text, "interpretation": "INERT_FIXTURE_DATA"}


def static_runtime_isolation_audit(root: Path) -> list[str]:
    violations: list[str] = []
    for path in sorted((root / "semantic_lab").rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                modules = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                modules = [node.module]
            else:
                modules = []
            for module in modules:
                if module.split(".")[0] in FORBIDDEN_RUNTIME_IMPORTS:
                    violations.append(f"{path.name}: forbidden runtime import {module}")
    return violations
