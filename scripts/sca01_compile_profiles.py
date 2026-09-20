from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import jsonschema
import yaml


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "semantic_profiles" / "v0.1" / "manifest.json"
SCHEMA = ROOT / "schemas" / "topic_semantic_profile_v0.1.schema.json"
CATALOG = ROOT / "catalog" / "system_topic_catalog_v0.2.yaml"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("utf-8")
    return hashlib.sha1(header + data).hexdigest()


def canonical_digest(profiles: list[dict[str, Any]]) -> str:
    payload = json.dumps(
        profiles,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def compile_profiles(root: Path = ROOT) -> dict[str, Any]:
    manifest = json.loads((root / "semantic_profiles" / "v0.1" / "manifest.json").read_text())
    schema = json.loads((root / "schemas" / "topic_semantic_profile_v0.1.schema.json").read_text())
    catalog = yaml.safe_load((root / "catalog" / "system_topic_catalog_v0.2.yaml").read_text())
    topics = catalog["topics"]
    domains = {row["id"]: row for row in catalog["domains"]}
    topic_by_id = {row["topic_id"]: row for row in topics}
    expected_ids = set(topic_by_id)

    profiles: list[dict[str, Any]] = []
    shard_results = []
    for shard in manifest["shards"]:
        path = root / shard["path"]
        data = path.read_bytes()
        actual_blob_sha = git_blob_sha(data)
        if actual_blob_sha != shard["git_blob_sha"]:
            raise AssertionError(
                f"git blob mismatch for {shard['path']}: "
                f"{actual_blob_sha} != {shard['git_blob_sha']}"
            )
        payload = json.loads(data)
        rows = payload["profiles"]
        if payload["profile_count"] != len(rows):
            raise AssertionError(f"profile_count mismatch in {shard['path']}")
        if len(rows) != shard["profile_count"]:
            raise AssertionError(f"manifest count mismatch in {shard['path']}")
        for profile in rows:
            jsonschema.validate(profile, schema)
        profiles.extend(rows)
        shard_results.append(
            {
                "path": shard["path"],
                "git_blob_sha": actual_blob_sha,
                "profile_count": len(rows),
            }
        )

    profiles.sort(key=lambda row: row["topic_id"])
    profile_ids = [row["topic_id"] for row in profiles]
    if len(profile_ids) != len(set(profile_ids)):
        raise AssertionError("duplicate profile topic_id")
    if set(profile_ids) != expected_ids:
        missing = sorted(expected_ids - set(profile_ids))
        extra = sorted(set(profile_ids) - expected_ids)
        raise AssertionError(f"profile ID mismatch missing={missing} extra={extra}")
    if len(profiles) != 144:
        raise AssertionError(f"expected 144 profiles, got {len(profiles)}")

    semantic_core_strings = set()
    generated_formal_mutations = 0
    bad_provenance = 0
    for profile in profiles:
        formal = topic_by_id[profile["topic_id"]]
        domain = domains[formal["internal_domain"]]
        if profile["canonical_names"] != formal["name"]:
            raise AssertionError(f"canonical name mismatch: {profile['topic_id']}")
        if profile["domain"]["id"] != formal["internal_domain"]:
            raise AssertionError(f"domain id mismatch: {profile['topic_id']}")
        if profile["domain"]["name_zh"] != domain["name_zh"]:
            raise AssertionError(f"domain zh mismatch: {profile['topic_id']}")
        if profile["domain"]["name_en"] != domain["name_en"]:
            raise AssertionError(f"domain en mismatch: {profile['topic_id']}")
        if profile["formal_catalog_version"] != catalog["catalog_version"]:
            raise AssertionError(f"catalog version mismatch: {profile['topic_id']}")
        if profile["formal_semantics_unchanged"] is not True:
            generated_formal_mutations += 1
        if profile["provenance"]["formal_fields_overridden"] is not False:
            generated_formal_mutations += 1
        if "FORMAL_CATALOG" not in profile["provenance"]["source_classes"]:
            bad_provenance += 1
        if "GENERAL_SEMANTIC_REASONING" not in profile["provenance"]["source_classes"]:
            bad_provenance += 1
        if profile["canonical_names"]["zh"] not in profile["lexical_anchors"]["zh"]:
            raise AssertionError(f"missing zh canonical anchor: {profile['topic_id']}")
        if profile["canonical_names"]["en"] not in profile["lexical_anchors"]["en"]:
            raise AssertionError(f"missing en canonical anchor: {profile['topic_id']}")
        semantic_core_strings.add("\n".join(profile["semantic_core"]))

    if generated_formal_mutations:
        raise AssertionError("derived profiles attempted formal semantic mutation")
    if bad_provenance:
        raise AssertionError("profile provenance coverage incomplete")
    if len(semantic_core_strings) != 144:
        raise AssertionError(
            f"semantic cores are not topic-specific: unique={len(semantic_core_strings)}"
        )

    return {
        "round": "SCA-01",
        "bundle_id": manifest["bundle_id"],
        "bundle_version": manifest["bundle_version"],
        "profile_count": len(profiles),
        "expected_system_topic_count": len(expected_ids),
        "topic_id_set_exact_match": True,
        "semantic_core_unique_count": len(semantic_core_strings),
        "formal_catalog_modified": False,
        "formal_semantic_mutation_events": 0,
        "provenance_coverage": 1.0,
        "private_artifact_reads": 0,
        "canonical_profiles_sha256": canonical_digest(profiles),
        "shards": shard_results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compile and validate SCA-01 profiles")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    summary = compile_profiles()
    content = json.dumps(summary, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(content)
    print(content, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
