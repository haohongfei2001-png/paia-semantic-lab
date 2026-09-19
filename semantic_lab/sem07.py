from __future__ import annotations

import hashlib
import json
import math
from copy import deepcopy
from pathlib import Path
from typing import Any, Sequence

import yaml

from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .isolation import static_runtime_isolation_audit
from .manifest import build_run_manifest
from .owner_attention import OwnerAttentionViolation, open_owner_task
from .sem04 import load_sem04_config

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "sem07_final_v0.1.yaml"


class Sem07GuardError(ValueError):
    pass


def load_sem07_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise Sem07GuardError("SEM-07 config must be a mapping")
    return value


def _safe_div(num: float, den: float) -> float | None:
    return None if den == 0 else num / den


def _mean(values: Sequence[float]) -> float | None:
    return None if not values else sum(values) / len(values)


def _f1(precision: float | None, recall: float | None) -> float | None:
    if precision is None or recall is None:
        return None
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def retrieval_metrics(qrels: Sequence[dict[str, Any]]) -> dict[str, Any]:
    positives = [row for row in qrels if row["relevant"]]
    negatives = [row for row in qrels if not row["relevant"]]
    ndcg = []
    recall20 = []
    mrr10 = []
    for row in positives:
        rank = row.get("rank")
        ndcg.append(0.0 if rank is None or rank > 10 else 1 / math.log2(rank + 1))
        recall20.append(float(rank is not None and rank <= 20))
        mrr10.append(0.0 if rank is None or rank > 10 else 1 / rank)
    neg_hits = [float(row.get("rank") is not None and row["rank"] <= 10) for row in negatives]
    return {
        "judged_pairs": len(qrels),
        "positive_pairs": len(positives),
        "negative_pairs": len(negatives),
        "ndcg_at_10": _mean(ndcg),
        "recall_at_20": _mean(recall20),
        "mrr_at_10": _mean(mrr10),
        "judged_negative_top10_fpr": _mean(neg_hits),
    }


def candidate_metrics(rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    assigned = [row for row in rows if row["truth_state"] == "ASSIGNED" and row["truth_topics"]]
    result: dict[str, Any] = {"assigned_cases": len(assigned)}
    for k in (5, 10, 20):
        partial, complete = [], []
        for row in assigned:
            truth = set(row["truth_topics"])
            got = set(row["candidate_ids"][:k])
            partial.append(len(truth & got) / len(truth))
            complete.append(float(truth <= got))
        result[f"topic_recall_at_{k}"] = _mean(partial)
        result[f"complete_case_recall_at_{k}"] = _mean(complete)
    return result


def router_metrics(rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    labels = sorted({topic for row in rows for topic in row["truth_topics"]})
    total_tp = total_fp = total_fn = 0
    accepted = wrong = route_ok = exact_ok = evidence_ok = 0
    true_defer = hit_defer = true_unassigned = hit_unassigned = 0
    pred_unassigned = correct_pred_unassigned = 0
    for row in rows:
        truth, pred = set(row["truth_topics"]), set(row["pred_topics"])
        total_tp += len(truth & pred)
        total_fp += len(pred - truth)
        total_fn += len(truth - pred)
        route_ok += int(row["truth_state"] == row["pred_state"])
        exact_ok += int(row["truth_state"] == row["pred_state"] and truth == pred)
        evidence_ok += int(pred <= set(row["candidate_ids"]))
        if row["pred_state"] == "ASSIGNED":
            accepted += 1
            wrong += int(not truth or not truth.intersection(pred))
        if row["truth_state"] == "DEFER":
            true_defer += 1
            hit_defer += int(row["pred_state"] == "DEFER")
        if row["truth_state"] == "UNASSIGNED":
            true_unassigned += 1
            hit_unassigned += int(row["pred_state"] == "UNASSIGNED")
        if row["pred_state"] == "UNASSIGNED":
            pred_unassigned += 1
            correct_pred_unassigned += int(row["truth_state"] == "UNASSIGNED")
    accepted_precision = _safe_div(total_tp, total_tp + total_fp)
    micro_p = 0.0 if total_tp + total_fp == 0 and total_fn > 0 else accepted_precision
    micro_r = _safe_div(total_tp, total_tp + total_fn)
    per_label = []
    for label in labels:
        tp = sum(label in row["truth_topics"] and label in row["pred_topics"] for row in rows)
        fp = sum(label not in row["truth_topics"] and label in row["pred_topics"] for row in rows)
        fn = sum(label in row["truth_topics"] and label not in row["pred_topics"] for row in rows)
        precision = 0.0 if tp + fp == 0 else tp / (tp + fp)
        recall = 0.0 if tp + fn == 0 else tp / (tp + fn)
        value = _f1(precision, recall)
        if value is not None:
            per_label.append(value)
    return {
        "cases": len(rows),
        "micro_precision": micro_p,
        "micro_recall": micro_r,
        "micro_f1": _f1(micro_p, micro_r),
        "macro_f1": _mean(per_label),
        "route_state_accuracy": _safe_div(route_ok, len(rows)),
        "exact_match_rate": _safe_div(exact_ok, len(rows)),
        "accepted_precision": accepted_precision,
        "accepted_coverage": _safe_div(accepted, len(rows)),
        "unassigned_precision": _safe_div(correct_pred_unassigned, pred_unassigned),
        "unassigned_recall": _safe_div(hit_unassigned, true_unassigned),
        "defer_recall": _safe_div(hit_defer, true_defer),
        "wrong_certain_rate": _safe_div(wrong, accepted),
        "evidence_validity_rate": _safe_div(evidence_ok, len(rows)),
        "true_unassigned_cases": true_unassigned,
        "true_defer_cases": true_defer,
    }


def _gate_retrieval(metrics: dict[str, Any], gate: dict[str, Any]) -> tuple[str, list[str]]:
    if metrics["ndcg_at_10"] is None or metrics["recall_at_20"] is None:
        return "INCONCLUSIVE", ["positive retrieval qrels unavailable"]
    failures = []
    if metrics["ndcg_at_10"] < float(gate["ndcg_at_10_min"]):
        failures.append("ndcg_at_10")
    if metrics["recall_at_20"] < float(gate["recall_at_20_min"]):
        failures.append("recall_at_20")
    return ("FAIL", failures) if failures else ("PASS", [])


def _gate_candidates(metrics: dict[str, Any], gate: dict[str, Any]) -> tuple[str, list[str]]:
    if metrics["topic_recall_at_10"] is None or metrics["topic_recall_at_20"] is None:
        return "INCONCLUSIVE", ["candidate recall unavailable"]
    failures = []
    if metrics["topic_recall_at_10"] < float(gate["recall_at_10_min"]):
        failures.append("recall_at_10")
    if metrics["topic_recall_at_20"] < float(gate["recall_at_20_min"]):
        failures.append("recall_at_20")
    if failures:
        return "FAIL", failures
    return "INCONCLUSIVE", ["inactive-topic recall unavailable without real UserTopicProfile state"]


def _gate_router(metrics: dict[str, Any], gate: dict[str, Any]) -> tuple[str, list[str]]:
    specs = (
        ("macro_f1", "macro_f1_min", "min"),
        ("accepted_precision", "accepted_precision_min", "min"),
        ("accepted_coverage", "accepted_coverage_min", "min"),
        ("unassigned_precision", "unassigned_precision_min", "min"),
        ("defer_recall", "defer_recall_min", "min"),
        ("wrong_certain_rate", "wrong_certain_rate_max", "max"),
    )
    failures, missing = [], []
    for metric, threshold, direction in specs:
        value = metrics.get(metric)
        if value is None:
            missing.append(metric)
            continue
        target = float(gate[threshold])
        if direction == "min" and value < target:
            failures.append(f"{metric}<{target}")
        if direction == "max" and value > target:
            failures.append(f"{metric}>{target}")
    if failures:
        return "FAIL", failures + [f"missing:{name}" for name in missing]
    if missing:
        return "INCONCLUSIVE", [f"missing:{name}" for name in missing]
    return "PASS", []


def router_variants() -> dict[str, dict[str, Any]]:
    base = load_sem04_config()
    strict = deepcopy(base)
    strict["policy"]["assignment_score_min"] = min(
        0.99, float(base["policy"]["assignment_score_min"]) + 0.08
    )
    permissive = deepcopy(base)
    permissive["policy"]["assignment_score_min"] = max(
        0.50, float(base["policy"]["assignment_score_min"]) - 0.08
    )
    return {"base": base, "strict": strict, "permissive": permissive}


def capability_verdicts(
    retrieval: dict[str, Any],
    candidate: dict[str, Any],
    router: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    rv, rr = _gate_retrieval(retrieval, config["acceptance"]["input_retrieval"])
    cv, cr = _gate_candidates(candidate, config["acceptance"]["candidates"])
    sv, sr = _gate_router(router, config["acceptance"]["router"])
    return {
        "input_retrieval": {"verdict": rv, "reasons": rr},
        "full_catalog_candidates": {"verdict": cv, "reasons": cr},
        "router": {"verdict": sv, "reasons": sr},
        "activation": {
            "verdict": "INCONCLUSIVE",
            "reasons": ["No authorized real UserTopicProfile state or event timestamps."],
        },
        "privacy_local_processing": {"verdict": "PASS", "reasons": []},
    }


def run_sem07(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_sem07_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    isolation = static_runtime_isolation_audit(repo_root())
    owner_policy_failures = []
    for task in (
        "input_to_topic_label",
        "retrieval_relevance_label",
        "per_model_trial",
        "repeated_semantic_judgment",
    ):
        try:
            open_owner_task("SEM-07", task)
            owner_policy_failures.append(task)
        except OwnerAttentionViolation:
            pass
    policy = config["policy"]
    hard_guards = (
        policy["private_artifacts_git_allowed"] is False
        and policy["real_input_api_egress"] == "DENY"
        and policy["model_training"] == "DENY"
        and policy["new_owner_labels"] == "EXCEPTION_ONLY"
    )
    self_test = router_metrics([
        {
            "truth_state": "ASSIGNED",
            "truth_topics": ["sys.test"],
            "pred_state": "ASSIGNED",
            "pred_topics": ["sys.test"],
            "candidate_ids": ["sys.test"],
        },
        {
            "truth_state": "DEFER",
            "truth_topics": [],
            "pred_state": "DEFER",
            "pred_topics": [],
            "candidate_ids": [],
        },
    ])
    metric_contract = self_test["micro_f1"] == 1.0 and self_test["defer_recall"] == 1.0
    passed = not isolation and not owner_policy_failures and hard_guards and metric_contract
    return {
        "round": "SEM-07",
        "manifest": build_run_manifest(
            lab_commit=lab_commit,
            catalog_version=str(catalog["catalog_version"]),
            round_id="SEM-07",
            benchmark_version=str(config["benchmark_version"]),
        ),
        "metrics": {
            "isolation_violations": len(isolation),
            "owner_attention_policy_violations": len(owner_policy_failures),
            "metric_contract_self_test": metric_contract,
            "private_artifacts_git_allowed": policy["private_artifacts_git_allowed"],
            "real_input_api_egress": policy["real_input_api_egress"],
            "model_training": policy["model_training"],
        },
        "findings": {
            "isolation": isolation,
            "owner_attention_policy_failures": owner_policy_failures,
        },
        "gates": {
            "G0_isolation": "PASS" if not isolation else "FAIL",
            "G8_final_engineering_contract": "PASS" if passed else "FAIL",
            "personal_lockbox": "LOCAL_PRIVATE_EXECUTION_REQUIRED",
        },
        "pass": passed,
    }
