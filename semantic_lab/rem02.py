from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .contracts import repo_root
from .isolation import static_runtime_isolation_audit

BASE = repo_root() / "artifacts" / "remediation-v0.3"
AGGREGATE_PATH = BASE / "rem02-public-runtime-aggregate.json"
CALIBRATION_PATH = BASE / "rem02-private-calibration-summary.json"
EVALUATION_PATH = BASE / "rem02-private-evaluation-summary.json"
PROMOTION_PLAN_PATH = BASE / "rem02-private-promotion-plan.json"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"REM-02 artifact must be a mapping: {path}")
    return value


def load_public_runtime(path: Path | None = None) -> dict[str, Any]:
    return _load(path or AGGREGATE_PATH)


def run_rem02(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    aggregate = load_public_runtime()
    calibration = _load(CALIBRATION_PATH)
    evaluation = _load(EVALUATION_PATH)
    plan = _load(PROMOTION_PLAN_PATH)

    expected_public_hashes = {
        "rem02_runtime_py_sha256": _sha256(repo_root() / "semantic_lab/rem02_runtime.py"),
        "rem02_config_sha256": _sha256(repo_root() / "configs/rem02_bakeoff_v0.1.yaml"),
        "rem01_harness_sha256": _sha256(repo_root() / "semantic_lab/rem01.py"),
    }
    public_hash_match = aggregate.get("source_hashes", {}) == expected_public_hashes

    private_plan_hash = _sha256(repo_root() / "configs/rem02_private_promotion_v0.1.yaml")
    private_code_hash = _sha256(repo_root() / "scripts/rem02_private_promotion.py")
    private_hash_match = (
        calibration.get("plan_hash") == private_plan_hash
        and evaluation.get("plan_hash") == private_plan_hash
        and calibration.get("code_hash") == private_code_hash
        and evaluation.get("code_hash") == private_code_hash
    )

    executed = set(str(value) for value in aggregate.get("executed_candidate_ids", []))
    expected_executed = {"Qwen/Qwen3-Embedding-0.6B", "BAAI/bge-m3"}
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

    public_auth = aggregate.get("authorization", {})
    public_authorization_clean = all(
        int(public_auth.get(key, -1)) == 0
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
    separation = aggregate.get("separation", {})
    retrieval_separated = (
        separation.get("input_retrieval_reported_separately") is True
        and separation.get("topic_candidate_retrieval_reported_separately") is True
    )

    shortlist_hash = calibration.get("shortlist_hash")
    shortlist_match = (
        shortlist_hash
        and shortlist_hash == evaluation.get("shortlist_hash")
        and shortlist_hash
        == hashlib.sha256(
            json.dumps(
                calibration.get("frozen_shortlist", []),
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest()
    )
    calibration_complete = (
        calibration.get("stage") == "CALIBRATION_SHORTLIST_FROZEN"
        and calibration.get("calibration_case_count") == 80
        and calibration.get("semantic_label_records_parsed") == 80
        and calibration.get("evaluation_label_records_parsed") == 0
        and calibration.get("lockbox_label_records_parsed") == 0
        and calibration.get("config_count") == 16
        and len(calibration.get("frozen_shortlist", [])) == 2
    )
    evaluation_complete = (
        evaluation.get("stage") == "BOUNDED_LEGACY_EVALUATION_CONSUMED"
        and evaluation.get("evaluation_case_count") == 13
        and evaluation.get("semantic_label_records_parsed") == 13
        and evaluation.get("lockbox_label_records_parsed") == 0
        and evaluation.get("evaluation_reads_consumed") == 1
        and evaluation.get("evaluated_config_count") == 2
        and len(evaluation.get("validated_shortlist", [])) == 2
    )
    eval_guards = evaluation.get("guards", {})
    evaluation_guard_clean = all(
        int(eval_guards.get(key, -1)) == 0
        for key in (
            "live_archive_reads",
            "real_input_api_egress_events",
            "new_owner_labels",
            "model_training_runs",
            "production_paia_writes",
            "consumed_lockbox_tuning_events",
            "reselection_after_evaluation",
            "threshold_or_representation_changes_after_evaluation",
        )
    )

    config_ids = [str(row["config_id"]) for row in evaluation["validated_shortlist"]]
    expected_config_ids = {
        "rem02cfg-30ed3156c71fd270",
        "rem02cfg-d2af02a6913bddf3",
    }
    shortlist_identity_valid = set(config_ids) == expected_config_ids

    baseline_topic_recall20 = min(
        float(row["evaluation_overall"]["topic_recall_at_20"])
        for row in evaluation["validated_shortlist"]
    )
    rem03_gate_gap = {
        "evaluation_topic_recall_at_20": baseline_topic_recall20,
        "rem03_required_candidate_recall_at_20": 0.99,
        "baseline_below_rem03_gate": baseline_topic_recall20 < 0.99,
    }

    isolation_violations = static_runtime_isolation_audit(repo_root())
    engineering_pass = (
        public_hash_match
        and private_hash_match
        and executed == expected_executed
        and revision_match
        and executed_pass
        and unavailable_explicit
        and public_authorization_clean
        and retrieval_separated
        and calibration_complete
        and evaluation_complete
        and evaluation_guard_clean
        and shortlist_match
        and shortlist_identity_valid
        and not isolation_violations
    )

    return {
        "round": "REM-02",
        "lab_commit": lab_commit,
        "benchmark_version": aggregate.get("benchmark_version"),
        "public_runtime_digest": aggregate.get("deterministic_result_digest"),
        "calibration_result_digest": calibration.get("result_digest"),
        "evaluation_result_digest": evaluation.get("result_digest"),
        "source_hash_match": public_hash_match and private_hash_match,
        "executed_candidate_ids": sorted(executed),
        "pinned_revision_match": revision_match,
        "unavailable_candidates": unavailable,
        "public_authorization_clean": public_authorization_clean,
        "retrieval_objectives_separated": retrieval_separated,
        "calibration_case_count": calibration.get("calibration_case_count"),
        "evaluation_case_count": evaluation.get("evaluation_case_count"),
        "evaluation_reads_consumed": evaluation.get("evaluation_reads_consumed"),
        "consumed_lockbox_label_records": evaluation.get("lockbox_label_records_parsed"),
        "promotion_shortlist_config_ids": config_ids,
        "promotion_shortlist": evaluation.get("validated_shortlist"),
        "rem03_gate_gap": rem03_gate_gap,
        "isolation_violations": isolation_violations,
        "gates": {
            "REM02_public_runtime_evidence": "PASS"
            if public_hash_match and executed_pass
            else "FAIL",
            "family_grouped_calibration": "PASS" if calibration_complete else "FAIL",
            "bounded_legacy_evaluation": "PASS" if evaluation_complete else "FAIL",
            "evaluation_single_read_guard": "PASS"
            if evaluation.get("evaluation_reads_consumed") == 1
            else "FAIL",
            "consumed_lockbox_exclusion": "PASS"
            if evaluation.get("lockbox_label_records_parsed") == 0
            else "FAIL",
            "round_completion": "PASS" if engineering_pass else "FAIL",
            "candidate_quality_for_rem03": "REMEDIATION_REQUIRED",
        },
        "pass": engineering_pass,
    }
