from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .contracts import repo_root
from .isolation import validate_fixture_pack


def load_safe_fixtures(path: Path | None = None) -> dict[str, Any]:
    target = path or repo_root() / "fixtures" / "sem00" / "safe_fixtures.yaml"
    data = yaml.safe_load(target.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Fixture pack root must be a mapping")
    validate_fixture_pack(data)
    return data


def build_catalog_boundary_fixtures(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for topic in catalog.get("topics", []):
        topic_id = topic["topic_id"]
        for boundary_name, field in (
            ("INCLUSION", "inclusion_boundary"),
            ("EXCLUSION", "exclusion_boundary"),
        ):
            for index, text in enumerate(topic.get(field, []), start=1):
                result.append(
                    {
                        "id": f"{topic_id}:{boundary_name.lower()}:{index}",
                        "topic_id": topic_id,
                        "boundary": boundary_name,
                        "text": text,
                        "provenance": {
                            "evidence_class": "catalog_boundary",
                            "source": "system_topic_catalog_v0.2.yaml",
                            "contains_real_paia_input": False,
                        },
                    }
                )
    return result
