from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import yaml

from .contracts import repo_root
from .isolation import static_runtime_isolation_audit

BASE = repo_root() / "artifacts" / "remediation-v0.3"
PUBLIC_PATH = BASE / "rem03-public-validation.json"
PRIVATE_CALIBRATION_PATH = BASE / "rem03-private-calibration-summary.json"
FREEZE_PATH = BASE / "rem03-private-freeze.json"
PRIVATE_PLAN_PATH = repo_root() / "configs" / "rem03_private_promotion_v0.1.yaml"
PRIVATE_EVALUATOR_PATH = repo_root() / "scripts" / "rem03_private_promotion.py"
CANDIDATE_POLICY_PATH = repo_root() / "configs" / "rem03_candidate_remediation_v0.1.yaml"
CANDIDATE_CODE_PATH = repo_root() / "semantic_lab" / "rem03.py"
EVALUATION_PUBLIC_PATH = BASE / "rem03-private-evaluation-summary.json"


def _load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected mapping in {path}")
    return value


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_rem03_closure(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    public = _load_json(PUBLIC_PATH)
    calibration = _load_json(PRIVATE_CALIBRATION_PATH)
    freeze = _load_json(FREEZE_PATH)
    private_plan = yaml.safe_load(PRIVATE_PLAN_PATH.read_text(encoding="utf-8"))
    if not isinstance(private_plan, dict):
        raise ValueError("REM-03 private promotion plan must be a mapping")

    gate_cfg = private_plan["candidate_gate"]
    recall10_min = float(gate_cfg["recall_at_10_min"])
    recall20_min = float(gate_cfg["recall_at_20_min"])
    metrics = calibration["metrics"]["overall"]
    recall10 = float(metrics["topic_recall_at_10"])
    recall20 = float(metrics["topic_recall_at_20"])

    hash_match = (
        freeze.get("plan_sha256") == _sha256(PRIVATE_PLAN_PATH)
        and freeze.get("evaluator_sha256") == _sha256(PRIVATE_EVALUATOR_PATH)
        and freeze.get("candidate_policy_sha256") == _sha256(CANDIDATE_POLICY_PATH)
        and freeze.get("candidate_code_sha256") == _sha256(CANDIDATE_CODE_PATH)
    )

    public_structural_pass = (
        public.get("gates", {}).get("public_structural_candidate_policy") == "PASS"
        and public.get("structural_audits", {})
        .get("activity_invariance", {})
        .get("top20_activity_invariant")
        is True
        and public.get("structural_audits", {})
        .get("full_catalog_reachability", {})
        .get("failure_count")
        == 0
    )

    calibration_schema_pass = (
        calibration.get("stage") == "CALIBRATION_GATE_FAIL"
        and calibration.get("case_count") == 80
        and calibration.get("assigned_cases") == 80
        and calibration.get("semantic_label_records_parsed") == 80
        and calibration.get("evaluation_label_records_parsed") == 0
        and calibration.get("lockbox_label_records_parsed") == 0
        and calibration.get("evaluation_reads_consumed") == 0
        and calibration.get("evaluation_open_permitted") is False
    )

    gate_failed_as_recorded = (
        calibration.get("gate", {}).get("pass") is False
        and calibration.get("gate", {}).get("overall_pass") is False
        and calibration.get("gate", {}).get("critical_slices_pass") is False
        and recall10 < recall10_min
        and recall20 < recall20_min
    )

    evaluation_not_opened = not EVALUATION_PUBLIC_PATH.exists()
    gate_not_lowered = recall10_min >= 0.96 and recall20_min >= 0.99
    isolation = static_runtime_isolation_audit(repo_root())

    engineering_pass = (
        hash_match
        and public_structural_pass
        and calibration_schema_pass
        and gate_failed_as_recorded
        and evaluation_not_opened
        and gate_not_lowered
        and not isolation
    )

    return {
        "round": "REM-03",
        "lab_commit": lab_commit,
        "execution_status": "COMPLETE" if engineering_pass else "BLOCKED",
        "capability_verdict": "FAIL" if engineering_pass else "INCONCLUSIVE",
        "public_structural_evidence": "PASS" if public_structural_pass else "FAIL",
        "private_calibration_evidence": "PASS" if calibration_schema_pass else "FAIL",
        "candidate_metrics": {
            "topic_recall_at_10": recall10,
            "topic_recall_at_20": recall20,
            "required_recall_at_10": recall10_min,
            "required_recall_at_20": recall20_min,
        },
        "critical_slices": {
            "context_dependent": calibration["metrics"]["context_dependent"],
            "context_free": calibration["metrics"]["context_free"],
            "pass": calibration.get("gate", {}).get("critical_slices_pass"),
        },
        "evaluation": {
            "read_condition": "CALIBRATION_GATE_PASS",
            "reads_consumed": calibration.get("evaluation_reads_consumed"),
            "public_artifact_present": EVALUATION_PUBLIC_PATH.exists(),
            "opened": not evaluation_not_opened,
        },
        "guards": {
            "consumed_lockbox_label_records": calibration.get("lockbox_label_records_parsed"),
            "config_search_events": calibration.get("guards", {}).get("config_search_events"),
            "threshold_fit_events": calibration.get("guards", {}).get("threshold_fit_events"),
            "gate_not_lowered": gate_not_lowered,
            "source_hash_match": hash_match,
            "isolation_violations": isolation,
        },
        "gates": {
            "public_structural_candidate_policy": "PASS" if public_structural_pass else "FAIL",
            "private_candidate_recall_at_10": "FAIL" if recall10 < recall10_min else "PASS",
            "private_candidate_recall_at_20": "FAIL" if recall20 < recall20_min else "PASS",
            "critical_slices": "FAIL"
            if calibration.get("gate", {}).get("critical_slices_pass") is False
            else "PASS",
            "evaluation_nonconsumption_on_calibration_failure": "PASS"
            if evaluation_not_opened and calibration.get("evaluation_reads_consumed") == 0
            else "FAIL",
            "consumed_lockbox_exclusion": "PASS"
            if calibration.get("lockbox_label_records_parsed") == 0
            else "FAIL",
            "round_closure": "PASS" if engineering_pass else "FAIL",
            "rem04_unlock": "DENY",
        },
        "pass": engineering_pass,
    }
