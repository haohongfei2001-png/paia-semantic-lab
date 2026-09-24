from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "semantic_profiles" / "v0.1" / "manifest.json"
CATALOG = ROOT / "catalog" / "system_topic_catalog_v0.2.yaml"

_GENERIC_EXCLUSION = (
    "只作为背景、工具或例子出现",
    "不应仅因词面出现",
    "do not assign solely because",
)
_GENERIC_POSITIVE_ZH = re.compile(r"常见线索包括(.+?)[。.]?$")
_GENERIC_POSITIVE_EN = re.compile(r"with signals such as (.+?)[.]?$", re.I)


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for raw in values:
        value = str(raw).strip()
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _lang_rows(values: list[str]) -> dict[str, list[str]]:
    zh: list[str] = []
    en: list[str] = []
    for value in values:
        text = str(value).strip()
        if not text:
            continue
        if re.search(r"[\u3400-\u9fff]", text):
            zh.append(text)
        else:
            en.append(text)
    return {"zh": _dedupe(zh), "en": _dedupe(en)}


def _concrete_positive(values: list[str]) -> dict[str, list[str]]:
    rows = _lang_rows(values)
    zh: list[str] = []
    en: list[str] = []
    for text in rows["zh"]:
        match = _GENERIC_POSITIVE_ZH.search(text)
        zh.append(match.group(1).strip("。,. ") if match else text)
    for text in rows["en"]:
        match = _GENERIC_POSITIVE_EN.search(text)
        en.append(match.group(1).strip(" .") if match else text)
    return {"zh": _dedupe(zh), "en": _dedupe(en)}


def _executable_exclusions(values: list[str]) -> list[str]:
    result: list[str] = []
    for raw in values:
        text = str(raw).strip()
        lowered = text.lower()
        if any(marker in lowered for marker in _GENERIC_EXCLUSION):
            continue
        result.append(text)
    return _dedupe(result)


def build_index(root: Path = ROOT) -> dict[str, Any]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    catalog = yaml.safe_load(CATALOG.read_text(encoding="utf-8"))

    profiles: dict[str, dict[str, Any]] = {}
    for shard in manifest["shards"]:
        payload = json.loads((root / shard["path"]).read_text(encoding="utf-8"))
        for profile in payload["profiles"]:
            profiles[str(profile["topic_id"])] = profile

    topics: list[dict[str, Any]] = []
    for formal in catalog["topics"]:
        if formal.get("lifecycle") != "ACTIVE":
            continue
        topic_id = str(formal["topic_id"])
        profile = profiles[topic_id]
        names = profile["canonical_names"]
        aliases = formal.get("aliases", {})
        anchors = profile.get("lexical_anchors", {})

        names_anchors = {
            "zh": _dedupe(
                [names["zh"]]
                + list(aliases.get("zh", []))
                + [
                    value
                    for value in anchors.get("zh", [])
                    if ">" not in str(value)
                ]
            ),
            "en": _dedupe(
                [names["en"]]
                + list(aliases.get("en", []))
                + [
                    value
                    for value in anchors.get("en", [])
                    if ">" not in str(value)
                ]
            ),
        }

        core = _lang_rows(list(profile.get("semantic_core", [])))
        positive = _concrete_positive(list(profile.get("positive_intents", [])))
        core_positive = {
            "zh": _dedupe(core["zh"] + positive["zh"]),
            "en": _dedupe(core["en"] + positive["en"]),
        }

        topics.append(
            {
                "topic_id": topic_id,
                "catalog_version": str(profile["formal_catalog_version"]),
                "profile_version": str(profile["profile_version"]),
                "lifecycle": str(formal["lifecycle"]),
                "names": {"zh": names["zh"], "en": names["en"]},
                "fields": {
                    "names_anchors": names_anchors,
                    "core_positive": core_positive,
                },
                "exclusions": _executable_exclusions(
                    list(profile.get("exclusion_cues", []))
                ),
                "contrastive_neighbor_ids": [
                    str(value)
                    for value in profile.get("contrastive_neighbors", [])
                ],
            }
        )

    if len(topics) != 144:
        raise RuntimeError(f"Expected 144 ACTIVE Topics, got {len(topics)}")

    result = {
        "format": "paia-lightweight-topic-index-v1",
        "package": "PAIA-LIGHTWEIGHT-SEMANTIC-ROUTER-v1",
        "round": "LSR-01",
        "catalog_version": manifest["formal_catalog_version"],
        "profile_bundle_version": manifest["bundle_version"],
        "profile_bundle_sha256": manifest["canonical_profiles_sha256"],
        "topic_count": len(topics),
        "excluded_scoring_sources": [
            "synthetic_utterance_patterns",
            "representative_examples",
            "mixed_domain_paths",
            "internal_domain_positive_terms",
            "benchmark_text",
            "private_or_evaluation_derived_information",
        ],
        "topics": topics,
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    result = build_index(ROOT)
    rendered = json.dumps(
        result,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(
        "LSR01_INDEX "
        + json.dumps(
            {
                "topic_count": result["topic_count"],
                "bytes": len(rendered.encode("utf-8")),
                "output": str(args.output),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
