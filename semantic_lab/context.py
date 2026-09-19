from __future__ import annotations

import hashlib
import json
from typing import Any


class AllowedContextError(ValueError):
    pass


def normalize_allowed_context(value: dict[str, Any] | None) -> dict[str, Any]:
    if value is None or value == {}:
        return {}
    if not isinstance(value, dict):
        raise AllowedContextError("allowed_context must be a mapping")
    policy = str(value.get("policy", "")).strip()
    if not policy:
        raise AllowedContextError("allowed_context requires policy")
    family_ref = str(value.get("family_ref", "")).strip()
    inputs = value.get("inputs", [])
    if not isinstance(inputs, list) or len(inputs) > 32:
        raise AllowedContextError("allowed_context inputs must be a list of at most 32 records")
    normalized_inputs: list[dict[str, Any]] = []
    for row in inputs:
        if not isinstance(row, dict):
            raise AllowedContextError("allowed_context input rows must be mappings")
        input_ref = str(row.get("input_ref", "")).strip()
        input_revision = str(row.get("input_revision", "")).strip()
        text = str(row.get("text", ""))
        if not input_ref or not input_revision or not text.strip():
            raise AllowedContextError("allowed_context input rows require ref/revision/text")
        item = {
            "input_ref": input_ref,
            "input_revision": input_revision,
            "text": text,
        }
        direction = row.get("direction")
        if direction is not None:
            direction = str(direction)
            if direction not in {"before", "after", "same"}:
                raise AllowedContextError("allowed_context direction must be before/after/same")
            item["direction"] = direction
        offset = row.get("offset")
        if offset is not None:
            if not isinstance(offset, int):
                raise AllowedContextError("allowed_context offset must be an integer")
            item["offset"] = offset
        fingerprint = row.get("source_payload_fingerprint")
        if fingerprint is not None:
            fingerprint = str(fingerprint).strip()
            if not fingerprint:
                raise AllowedContextError("allowed_context source fingerprint may not be empty")
            item["source_payload_fingerprint"] = fingerprint
        normalized_inputs.append(item)
    result = {"policy": policy, "inputs": normalized_inputs}
    if family_ref:
        result["family_ref"] = family_ref
    return result


def allowed_context_fingerprint(value: dict[str, Any] | None) -> str:
    normalized = normalize_allowed_context(value)
    rendered = json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(rendered.encode("utf-8")).hexdigest()


def classification_text(text: str, allowed_context: dict[str, Any] | None = None) -> str:
    normalized = normalize_allowed_context(allowed_context)
    if not normalized.get("inputs"):
        return text
    lines = ["[CURRENT INPUT — PRIMARY SEMANTIC TARGET]", text, "", "[ALLOWED SAME-CONVERSATION CONTEXT]"]
    for row in normalized["inputs"]:
        direction = row.get("direction", "same")
        offset = row.get("offset")
        marker = direction if offset is None else f"{direction}:{offset:+d}"
        lines.extend([
            f"<context {marker} ref={row['input_ref']} rev={row['input_revision']}>",
            row["text"],
            "</context>",
        ])
    lines.extend(["", "[END CONTEXT — CLASSIFY THE CURRENT INPUT, NOT THE CONTEXT]"])
    return "\n".join(lines)

[executed on device: hhfdeMacBook-Air.local (ea7c2cb7-378e-4226-a030-4f3e02a6ba2f)]