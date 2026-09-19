from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .contracts import repo_root
from .isolation import static_runtime_isolation_audit

AGGREGATE_PATH = (
    repo_root()
    / "artifacts"
    / "remediation-v0.3"
    / "rem02-public-runtime-aggregate.json"
)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_public_runtime(path: Path | None = None) -> dict[str, Any]:
    target = path or AGGREGATE_PATH
    value = json.loads(target.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-02 public runtime artifact must be a mapping")
    return value


def run_rem02(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    aggregate = load_public_runtime()
    expected_hashes = {
        "rem02_runtime_py_sha256": _sha256(repo_root() / "semantic_lab/rem02_runtime.py"),
        "rem02_config_sha256": _sha256(repo_root() / "configs/rem02_bakeoff_v0.1.yaml"),
        "rem01_harness_sha256": _sha256(repo_root() / "semantic_lab/rem01.py"),
    }
    source_hashes = aggregate.get("source_hashes", {})
    hash_match = source_hashes == expected_hashes

    executed = set(str(value) for value in aggregate.get("executed_candidate_ids", []))
    expected_executed = {
        "Qwen/Qwen3-Embedding-0.6B",
        "BAAI/bge-m3",
    }
    runtime_by_id = {
        str(row["candidate_id"]): row
        for row in aggregate.get("runtime_candidates", [])
        if row.get("candidate_id")
    }
    revisions = {
        "Qwen/Qwen3-Embedding-0.6B": "e692b5a16e45607c7e85d81c53e944ac90e6260a",
        "BAAI/bge-m3": "cb1779f90b988b8deb01f9155c790ef9417d7648",
        "nomic-ai/nomic-embed-text-v2-moe": "c8bdf8c81cb2a168d47cc2265e6cbc99933ef19f",
        "intfloat/multilingual-e5-large-instruct": "9d7f719b76091b81b77635d6b652f87cfb6d1509",
    }
    revision_match = all(
        runtime_by_id.get(candidate_id, {}).get("revision") == revision
        for candidate_id, revision in revisions.items()
    )
    executed_pass = all(
        runtime_by_id.get(candidate_id, {}).get("runtime_status") == "PASS"
        and runtime_by_id.get(candidate_id, {}).get("runtime_qualified") is True
        and runtime_by_id.get(candidate_id, {})
        .get("reproducibility", {})
        .get("encoding_replay_exact")
        is True
        for candidate_id in expected_executed
    )
    unavailable = {
        candidate_id: runtime_by_id.get(candidate_id, {}).get("runtime_status")
        for candidate_id in (
            "nomic-ai/nomic-embed-text-v2-moe",
            "intfloat/multilingual-e5-large-instruct",
        )
    }
    unavailable_explicit = all(
        value == "NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE"
        for value in unavailable.values()
    )

    auth = aggregate.get("authorization", {})
    authorization_clean = all(
        int(auth.get(key, -1)) == 0
        for key in (
            "private_artifact_reads",
            "live_archive_reads",
            "real_input_api_egress_events",
            "owner_semantic_labels",
            "model_training_runs",
            "production_paia_writes",
            "consumed_sem07_lockbox_tuning_events",
        )
    )
    private = aggregate.get("private_promotion", {})
    promotion_blocked = (
        private.get("family_grouped_calibration")
        == "NOT_RUN_PRIVATE_EVIDENCE_NOT_AUTHORIZED"
        and private.get("bounded_legacy_evaluation")
        == "NOT_RUN_PRIVATE_EVIDENCE_NOT_AUTHORIZED"
        and private.get("promotion_shortlist")
        == "WITHHELD_PRIVATE_EVIDENCE_NOT_AUTHORIZED"
    )
    separation = aggregate.get("separation", {})
    retrieval_separated = (
        separation.get("input_retrieval_reported_separately") is True
        and separation.get("topic_candidate_retrieval_reported_separately") is True
    )
    public_gate = aggregate.get("gates", {}).get("public_runtime_bakeoff") == "PASS"
    round_blocked = (
        aggregate.get("gates", {}).get("private_promotion_evidence")
        == "BLOCKED_PRIVATE_EVIDENCE_NOT_AUTHORIZED"
        and aggregate.get("gates", {}).get("rem02_round_completion") == "BLOCKED"
    )
    isolation_violations = static_runtime_isolation_audit(repo_root())

    engineering_pass = (
        hash_match
        and executed == expected_executed
        and revision_match
        and executed_pass
        and unavailable_explicit
        and authorization_clean
        and promotion_blocked
        and retrieval_separated
        and public_gate
        and round_blocked
        and not isolation_violations
    )

    return {
        "round": "REM-02",
        "lab_commit": lab_commit,
        "benchmark_version": aggregate.get("benchmark_version"),
        "public_runtime_digest": aggregate.get("deterministic_result_digest"),
        "source_hash_match": hash_match,
        "executed_candidate_ids": sorted(executed),
        "expected_executed_candidate_ids": sorted(expected_executed),
        "pinned_revision_match": revision_match,
        "unavailable_candidates": unavailable,
        "authorization_clean": authorization_clean,
        "retrieval_objectives_separated": retrieval_separated,
        "public_engineering_frontier": aggregate.get("public_engineering_frontier", []),
        "promotion_shortlist": "WITHHELD_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
        "isolation_violations": isolation_violations,
        "gates": {
            "REM02_public_runtime_evidence": "PASS" if engineering_pass else "FAIL",
            "private_promotion_evidence": "BLOCKED_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "round_completion": "BLOCKED",
            "personalized_semantic_quality": "WITHHELD",
        },
        "pass": engineering_pass,
    }
