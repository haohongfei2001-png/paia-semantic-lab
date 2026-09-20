from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import jsonschema

from scripts.sca01_compile_profiles import compile_profiles


ROOT = Path(__file__).resolve().parents[1]
GRAPH_PATH = ROOT / "contrastive_graph" / "v0.1" / "graph.json"
GRAPH_SCHEMA_PATH = ROOT / "schemas" / "contrastive_boundary_graph_v0.1.schema.json"
SUITE_MANIFEST_PATH = ROOT / "synthetic_contrastive" / "v0.1" / "manifest.json"
SUITE_SCHEMA_PATH = ROOT / "schemas" / "synthetic_contrastive_suite_v0.1.schema.json"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("utf-8")
    return hashlib.sha1(header + data).hexdigest()


def canonical_sha256(value: Any) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_profiles(root: Path) -> list[dict[str, Any]]:
    manifest = json.loads(
        (root / "semantic_profiles" / "v0.1" / "manifest.json").read_text()
    )
    profiles: list[dict[str, Any]] = []
    for shard in manifest["shards"]:
        payload = json.loads((root / shard["path"]).read_text())
        profiles.extend(payload["profiles"])
    return sorted(profiles, key=lambda row: row["topic_id"])


def validate_sca02(root: Path = ROOT) -> dict[str, Any]:
    sca01 = compile_profiles(root)
    profiles = load_profiles(root)
    profile_by_id = {row["topic_id"]: row for row in profiles}
    topic_ids = set(profile_by_id)

    graph_schema = json.loads((root / "schemas" / "contrastive_boundary_graph_v0.1.schema.json").read_text())
    suite_schema = json.loads((root / "schemas" / "synthetic_contrastive_suite_v0.1.schema.json").read_text())
    graph_data = (root / "contrastive_graph" / "v0.1" / "graph.json").read_bytes()
    graph = json.loads(graph_data)
    jsonschema.validate(graph, graph_schema)

    if graph["profile_bundle_sha256"] != sca01["canonical_profiles_sha256"]:
        raise AssertionError("graph profile bundle SHA does not match SCA-01")
    if set(graph["nodes"]) != topic_ids:
        raise AssertionError("graph nodes do not exactly match profile Topic IDs")
    if graph["edge_count"] != len(graph["edges"]):
        raise AssertionError("graph edge_count mismatch")

    seen_pairs: set[tuple[str, str]] = set()
    degree = Counter()
    domain_edge_counts = Counter()
    formal_override_events = 0
    for edge in graph["edges"]:
        a, b = edge["topic_a"], edge["topic_b"]
        if a not in topic_ids or b not in topic_ids:
            raise AssertionError("graph edge references unknown Topic")
        if a == b:
            raise AssertionError("self edge is forbidden")
        if profile_by_id[a]["domain"]["id"] != edge["domain_id"]:
            raise AssertionError("topic_a domain mismatch")
        if profile_by_id[b]["domain"]["id"] != edge["domain_id"]:
            raise AssertionError("topic_b domain mismatch")
        pair = tuple(sorted((a, b)))
        if pair in seen_pairs:
            raise AssertionError("duplicate undirected contrastive edge")
        seen_pairs.add(pair)
        degree[a] += 1
        degree[b] += 1
        domain_edge_counts[edge["domain_id"]] += 1
        if edge["provenance"]["formal_fields_overridden"] is not False:
            formal_override_events += 1
        if edge["topic_a"] not in edge["boundary_rule"]["zh"] or edge["topic_b"] not in edge["boundary_rule"]["zh"]:
            raise AssertionError("zh boundary rule does not bind both Topic IDs")
        if edge["topic_a"] not in edge["boundary_rule"]["en"] or edge["topic_b"] not in edge["boundary_rule"]["en"]:
            raise AssertionError("en boundary rule does not bind both Topic IDs")

    if len(graph["edges"]) != 504:
        raise AssertionError(f"expected 504 contrastive edges, got {len(graph['edges'])}")
    if set(degree.values()) != {7} or len(degree) != 144:
        raise AssertionError("every Topic must have exactly seven sibling contrasts")
    if set(domain_edge_counts.values()) != {28} or len(domain_edge_counts) != 18:
        raise AssertionError("every Domain must have exactly C(8,2)=28 edges")
    if formal_override_events:
        raise AssertionError("contrastive graph attempted formal mutation")

    suite_manifest = json.loads(
        (root / "synthetic_contrastive" / "v0.1" / "manifest.json").read_text()
    )
    if suite_manifest["contrastive_graph_git_blob_sha"] != git_blob_sha(graph_data):
        raise AssertionError("suite manifest graph blob SHA mismatch")
    if suite_manifest["profile_bundle_sha256"] != sca01["canonical_profiles_sha256"]:
        raise AssertionError("suite manifest profile bundle SHA mismatch")

    cases: list[dict[str, Any]] = []
    shard_results = []
    for shard in suite_manifest["shards"]:
        path = root / shard["path"]
        data = path.read_bytes()
        if git_blob_sha(data) != shard["git_blob_sha"]:
            raise AssertionError(f"suite shard blob SHA mismatch: {shard['path']}")
        payload = json.loads(data)
        jsonschema.validate(payload, suite_schema)
        if payload["case_count"] != len(payload["cases"]):
            raise AssertionError("suite shard case_count mismatch")
        if len(payload["cases"]) != shard["case_count"]:
            raise AssertionError("suite manifest case count mismatch")
        cases.extend(payload["cases"])
        shard_results.append(
            {
                "path": shard["path"],
                "git_blob_sha": shard["git_blob_sha"],
                "case_count": len(payload["cases"]),
            }
        )

    if len(cases) != 1296:
        raise AssertionError(f"expected 1296 synthetic cases, got {len(cases)}")
    if len({row["case_id"] for row in cases}) != len(cases):
        raise AssertionError("duplicate synthetic case_id")

    edge_by_id = {row["edge_id"]: row for row in graph["edges"]}
    positive_count = Counter()
    hard_negative_count = Counter()
    language_count = Counter()
    oracle_correct = 0
    provenance_failures = 0

    for case in cases:
        expected = case["expected_topic_id"]
        source = case["source_topic_id"]
        if expected not in topic_ids or source not in topic_ids:
            raise AssertionError("synthetic case references unknown expected/source Topic")
        language_count[case["language"]] += 1
        if case["provenance"]["formal_fields_overridden"] is not False:
            provenance_failures += 1

        if case["case_type"] == "POSITIVE":
            if case["distractor_topic_id"] is not None or case["edge_id"] is not None:
                raise AssertionError("positive case may not carry distractor/edge")
            if expected != source:
                raise AssertionError("positive expected/source mismatch")
            positive_count[expected] += 1
            name = profile_by_id[expected]["canonical_names"][case["language"]]
            if name.lower() in case["text"].lower():
                oracle_correct += 1
        else:
            distractor = case["distractor_topic_id"]
            edge_id = case["edge_id"]
            if distractor not in topic_ids or distractor == expected:
                raise AssertionError("invalid hard-negative distractor")
            if edge_id not in edge_by_id:
                raise AssertionError("hard-negative references unknown edge")
            edge = edge_by_id[edge_id]
            if {expected, distractor} != {edge["topic_a"], edge["topic_b"]}:
                raise AssertionError("hard-negative edge endpoints mismatch")
            hard_negative_count[edge_id] += 1
            expected_name = profile_by_id[expected]["canonical_names"][case["language"]]
            distractor_name = profile_by_id[distractor]["canonical_names"][case["language"]]
            text_lower = case["text"].lower()
            if case["language"] == "zh":
                focus_ok = f'主要目标是“{expected_name}”' in case["text"]
            else:
                focus_ok = f'primary goal is "{expected_name}"'.lower() in text_lower
            if focus_ok and expected_name.lower() in text_lower and distractor_name.lower() in text_lower:
                oracle_correct += 1

    if set(positive_count.values()) != {2} or len(positive_count) != 144:
        raise AssertionError("every Topic must have exactly two positive synthetic cases")
    if set(hard_negative_count.values()) != {2} or len(hard_negative_count) != 504:
        raise AssertionError("every graph edge must have exactly two directional hard negatives")
    if provenance_failures:
        raise AssertionError("synthetic suite provenance attempted formal mutation")

    positive_total = sum(positive_count.values())
    hard_negative_total = sum(hard_negative_count.values())
    if positive_total != 288 or hard_negative_total != 1008:
        raise AssertionError("synthetic case type totals are invalid")

    oracle_accuracy = oracle_correct / len(cases)
    if oracle_accuracy != 1.0:
        raise AssertionError(f"synthetic boundary oracle accuracy must be 1.0, got {oracle_accuracy}")

    return {
        "round": "SCA-02",
        "profile_bundle_sha256": sca01["canonical_profiles_sha256"],
        "node_count": len(graph["nodes"]),
        "edge_count": len(graph["edges"]),
        "domain_edge_counts": dict(sorted(domain_edge_counts.items())),
        "min_node_degree": min(degree.values()),
        "max_node_degree": max(degree.values()),
        "positive_case_count": positive_total,
        "hard_negative_case_count": hard_negative_total,
        "total_case_count": len(cases),
        "language_counts": dict(sorted(language_count.items())),
        "synthetic_boundary_oracle_accuracy": oracle_accuracy,
        "formal_semantic_mutation_events": 0,
        "formal_review_required_count": 0,
        "private_artifact_reads": 0,
        "graph_sha256": canonical_sha256(graph),
        "synthetic_suite_sha256": canonical_sha256(
            sorted(cases, key=lambda row: row["case_id"])
        ),
        "shards": shard_results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SCA-02 contrastive graph and synthetic suite")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    summary = validate_sca02()
    content = json.dumps(summary, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(content)
    print(content, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
