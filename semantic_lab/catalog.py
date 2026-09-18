from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any

import yaml

from .contracts import repo_root, validate_contract


def load_catalog(path: Path | None = None) -> dict[str, Any]:
    target = path or repo_root() / "catalog" / "system_topic_catalog_v0.2.yaml"
    data = yaml.safe_load(target.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Catalog root must be a mapping")
    return data


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold().strip()
    return re.sub(r"[^\w\u4e00-\u9fff]+", "", value)


def validate_catalog_contract(catalog: dict[str, Any]) -> None:
    validate_contract(catalog, "TopicCatalog")


def audit_catalog(catalog: dict[str, Any]) -> dict[str, Any]:
    topics = catalog.get("topics", [])
    domains = catalog.get("domains", [])
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    def add_error(code: str, ids: list[str] | None = None) -> None:
        errors.append({"code": code, "topic_ids": ids or []})

    if catalog.get("system_topic_count") != len(topics):
        add_error("DECLARED_TOPIC_COUNT_MISMATCH")
    if catalog.get("internal_domain_count") != len(domains):
        add_error("DECLARED_DOMAIN_COUNT_MISMATCH")

    domain_ids = [item.get("id") for item in domains]
    if len(domain_ids) != len(set(domain_ids)):
        add_error("DUPLICATE_DOMAIN_ID")
    if any(item.get("assignable") is not False for item in domains):
        add_error("ASSIGNABLE_INTERNAL_DOMAIN")

    topic_ids = [item.get("topic_id") for item in topics]
    if len(topic_ids) != len(set(topic_ids)):
        add_error("DUPLICATE_TOPIC_ID")
    topic_id_set = set(topic_ids)
    topic_by_id = {item["topic_id"]: item for item in topics}

    primary: dict[tuple[str, str], list[str]] = {}
    alias_map: dict[tuple[str, str], list[str]] = {}
    lineage: dict[str, list[str]] = {}

    for topic in topics:
        topic_id = topic["topic_id"]
        if topic.get("internal_domain") not in set(domain_ids):
            add_error("INVALID_INTERNAL_DOMAIN", [topic_id])
        if not str(topic.get("definition", "")).strip():
            add_error("MISSING_DEFINITION", [topic_id])
        for field in ("inclusion_boundary", "exclusion_boundary"):
            value = topic.get(field)
            if not isinstance(value, list) or not value:
                add_error("MISSING_BOUNDARY", [topic_id])

        for language in ("zh", "en"):
            name = topic.get("name", {}).get(language, "")
            key = (language, normalize(name))
            primary.setdefault(key, []).append(topic_id)
        for language, values in topic.get("aliases", {}).items():
            if isinstance(values, str):
                values = [values]
            for value in values or []:
                alias_map.setdefault((language, normalize(value)), []).append(topic_id)

        for neighbor in topic.get("confusing_neighbor_topic_ids", []):
            if neighbor == topic_id or neighbor not in topic_id_set:
                add_error("INVALID_NEIGHBOR_REFERENCE", [topic_id, str(neighbor)])

        successors = list(topic.get("successor_topic_ids", []))
        lineage[topic_id] = successors
        if any(successor not in topic_id_set for successor in successors):
            add_error("INVALID_LINEAGE_REFERENCE", [topic_id])
        if topic.get("lifecycle") == "MERGED" and len(successors) != 1:
            add_error("INVALID_MERGE_LINEAGE", [topic_id])
        if topic.get("lifecycle") == "SPLIT" and len(successors) < 2:
            add_error("INVALID_SPLIT_LINEAGE", [topic_id])

    for (_, normalized), ids in primary.items():
        unique = sorted(set(ids))
        if normalized and len(unique) > 1:
            add_error("DUPLICATE_PRIMARY_NAME", unique)

    for (_, normalized), ids in alias_map.items():
        unique = sorted(set(ids))
        if not normalized or len(unique) <= 1:
            continue
        unresolved = False
        for left_id in unique:
            left_neighbors = set(topic_by_id[left_id].get("confusing_neighbor_topic_ids", []))
            for right_id in unique:
                if left_id >= right_id:
                    continue
                right_neighbors = set(topic_by_id[right_id].get("confusing_neighbor_topic_ids", []))
                if right_id not in left_neighbors and left_id not in right_neighbors:
                    unresolved = True
        if unresolved:
            add_error("UNDECLARED_ALIAS_COLLISION", unique)

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visiting:
            add_error("LINEAGE_CYCLE", [node])
            return
        if node in visited:
            return
        visiting.add(node)
        for child in lineage.get(node, []):
            if child in topic_id_set:
                visit(child)
        visiting.remove(node)
        visited.add(node)

    for topic_id in topic_ids:
        visit(topic_id)

    return {
        "catalog_version": str(catalog.get("catalog_version", "")),
        "topics_loaded": len(topics),
        "domains_loaded": len(domains),
        "errors": errors,
        "warnings": warnings,
        "blocking_error_count": len(errors),
        "warning_count": len(warnings),
    }
