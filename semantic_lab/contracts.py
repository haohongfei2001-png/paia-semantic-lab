from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


class ContractValidationError(ValueError):
    pass


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def load_contract_bundle(path: Path | None = None) -> dict[str, Any]:
    target = path or repo_root() / "contracts" / "semantic_lab_contracts_v0.2.json"
    return json.loads(target.read_text(encoding="utf-8"))


def validate_contract_bundle(bundle: dict[str, Any] | None = None) -> None:
    Draft202012Validator.check_schema(bundle or load_contract_bundle())


def validate_contract(instance: Any, definition: str, bundle: dict[str, Any] | None = None) -> None:
    contract_bundle = bundle or load_contract_bundle()
    definitions = contract_bundle.get("$defs", {})
    if definition not in definitions:
        raise ContractValidationError(f"Unknown contract definition: {definition}")
    validator = Draft202012Validator(definitions[definition])
    errors = sorted(validator.iter_errors(instance), key=lambda error: list(error.path))
    if errors:
        rendered = []
        for error in errors:
            location = ".".join(str(part) for part in error.absolute_path) or "<root>"
            rendered.append(f"{location}: {error.message}")
        raise ContractValidationError("; ".join(rendered))
