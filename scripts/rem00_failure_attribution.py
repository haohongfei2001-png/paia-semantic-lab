from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
import yaml

from semantic_lab.sem07 import candidate_metrics, retrieval_metrics, router_metrics


def load_config(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-00 config must be a mapping")
    return value


def case_hash(calibration_id: str) -> str:
    payload = f"rem00-public-case-v1|{calibration_id}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:20]


def rank_of_pair(matrix: np.ndarray, refs: list[str], query_i: int, target_i: int) -> int:
    scores = matrix @ matrix[query_i]
    target = float(scores[target_i])
    target_ref = refs[target_i]
    better = 0
    for idx, score in enumerate(scores):
        if idx == query_i:
            continue
        value = float(score)
        if value > target or (value == target and refs[idx] < target_ref):
            better += 1
    return better + 1


def _truth_complete(truth_topics: list[str], candidates: list[str], k: int) -> bool:
    truth = set(truth_topics)
    if not truth:
        return False
    return truth <= set(candidates[:k])


def _truth_recall(truth_topics: list[str], candidates: list[str], k: int) -> float | None:
    truth = set(truth_topics)
    if not truth:
        return None
    return len(truth & set(candidates[:k])) / len(truth)


def primary_attribution(case: dict[str, Any], model_facts: dict[str, dict[str, Any]]) -> str:
    truth_state = case["truth_state"]
    if truth_state in {"UNASSIGNED", "DEFER"}:
        return "DATA_CLASS_GAP"
    if case["boundary_ambiguity"]:
        return "CATALOG_BOUNDARY"

    facts = list(model_facts.values())
    complete20 = [row["candidate_complete_top20"] for row in facts]
    complete10 = [row["candidate_complete_top10"] for row in facts]

    if case["context_dependent"] and not any(complete20):
        return "CONTEXT_REPRESENTATION"
    if not any(complete20):
        return "CANDIDATE_MISS"
    if any(complete20) and not any(complete10):
        return "CANDIDATE_LOW_RANK"

    if any(complete10):
        if all(row["router_state"] != "ASSIGNED" for row in facts):
            return "ROUTER_ABSTENTION"
        if any(row["router_state"] == "ASSIGNED" and not row["router_exact"] for row in facts):
            return "ROUTER_WRONG_ASSIGNMENT"

    return "EVIDENCE_GAP"


def _model_summary(rows: list[dict[str, Any]], qrels: list[dict[str, Any]]) -> dict[str, Any]:
    assigned = [row for row in rows if row["truth_state"] == "ASSIGNED"]
    return {
        "cases": len(rows),
        "assigned_cases": len(assigned),
        "candidate_complete_top10_cases": sum(row["candidate_complete_top10"] for row in assigned),
        "candidate_complete_top20_cases": sum(row["candidate_complete_top20"] for row in assigned),
        "candidate_any_partial_miss_top20_cases": sum(
            row["candidate_recall_top20"] is not None and row["candidate_recall_top20"] < 1.0
            for row in assigned
        ),
        "router_assigned_cases": sum(row["router_state"] == "ASSIGNED" for row in rows),
        "router_exact_cases": sum(row["router_exact"] for row in rows),
        "router_abstention_cases": sum(
            row["truth_state"] == "ASSIGNED" and row["router_state"] != "ASSIGNED"
            for row in rows
        ),
        "positive_qrel_pairs": sum(bool(row["relevant"]) for row in qrels),
        "positive_qrel_miss_at_20_pairs": sum(
            bool(row["relevant"]) and (row["rank"] is None or int(row["rank"]) > 20)
            for row in qrels
        ),
    }


def _safe_float_equal(a: float | None, b: float | None, tol: float = 1e-12) -> bool:
    if a is None or b is None:
        return a is None and b is None
    return abs(float(a) - float(b)) <= tol


def analyze(
    sem06_dir: Path,
    sem07_scorecard: Path,
    private_output: Path,
    public_output: Path,
    config_path: Path,
) -> dict[str, Any]:
    config = load_config(config_path)
    gold = json.loads((sem06_dir / "personal_gold_v1.json").read_text(encoding="utf-8"))
    snapshot = json.loads((sem06_dir / "snapshot.json").read_text(encoding="utf-8"))
    machine = json.loads((sem06_dir / "machine_summary.json").read_text(encoding="utf-8"))
    scorecard = json.loads(sem07_scorecard.read_text(encoding="utf-8"))

    expected_models = list(config["scope"]["models"])
    if sorted(scorecard["predictions"]) != sorted(expected_models):
        raise ValueError("SEM-07 prediction model set does not match frozen REM-00 scope")

    refs = [str(row["input_ref"]) for row in snapshot["records"]]
    ref_index = {ref: idx for idx, ref in enumerate(refs)}
    calibrations = {
        str(row["calibration_id"]): row for row in gold["calibration_records"]
    }
    gold_rows = [
        row for row in gold["gold_index"]
        if row["split"] == config["scope"]["split"]
    ]
    if len(gold_rows) != int(config["scope"]["expected_cases"]):
        raise ValueError("Unexpected legacy lockbox case count")

    predictions = {
        model_id: {
            str(row["calibration_id"]): row
            for row in rows if row["split"] == config["scope"]["split"]
        }
        for model_id, rows in scorecard["predictions"].items()
    }
    vector_paths = {}
    for label, meta in machine["models"].items():
        model_id = str(meta["model_id"])
        if model_id in expected_models:
            vector_paths[model_id] = sem06_dir / "vectors" / f"{label}.npy"
    if set(vector_paths) != set(expected_models):
        raise ValueError("Frozen private vector coverage mismatch")
    matrices = {model_id: np.load(path) for model_id, path in vector_paths.items()}


    private_cases: list[dict[str, Any]] = []
    public_cases: list[dict[str, Any]] = []
    per_model_rows: dict[str, list[dict[str, Any]]] = {model_id: [] for model_id in expected_models}
    per_model_qrels: dict[str, list[dict[str, Any]]] = {model_id: [] for model_id in expected_models}

    for row in gold_rows:
        calibration_id = str(row["calibration_id"])
        calibration = calibrations[calibration_id]
        final = calibration["user_final_decision"]
        truth_state = str(final["route_state"])
        truth_topics = [str(value) for value in final.get("topic_ids", [])]
        input_ref = str(row["input_ref"])
        query_i = ref_index[input_ref]

        case = {
            "calibration_id": calibration_id,
            "input_ref": input_ref,
            "family_ref": str(row["family_ref"]),
            "truth_state": truth_state,
            "truth_topics": truth_topics,
            "context_dependent": bool(row.get("context_dependent")),
            "boundary_ambiguity": bool(row.get("boundary_ambiguity")),
        }
        model_facts: dict[str, dict[str, Any]] = {}

        for model_id in expected_models:
            prediction = predictions[model_id][calibration_id]
            candidates = [str(value) for value in prediction["candidate_ids"]]
            router = prediction["routers"][config["scope"]["router_variant"]]
            pred_state = str(router["route_state"])
            pred_topics = [str(value) for value in router.get("topic_ids", [])]
            router_exact = (
                pred_state == truth_state
                and set(pred_topics) == set(truth_topics)
            )
            positive_ranks: list[int | None] = []
            matrix = matrices[model_id]
            for qrel in row.get("retrieval_qrels", []):
                target_ref = str(qrel["candidate_ref"])
                target_i = ref_index.get(target_ref)
                rank = None
                if target_i is not None and target_i != query_i:
                    rank = rank_of_pair(matrix, refs, query_i, target_i)
                qrel_row = {
                    "relevant": bool(qrel["relevant"]),
                    "rank": rank,
                }
                per_model_qrels[model_id].append(qrel_row)
                if qrel_row["relevant"]:
                    positive_ranks.append(rank)


            fact = {
                "candidate_complete_top10": _truth_complete(truth_topics, candidates, 10),
                "candidate_complete_top20": _truth_complete(truth_topics, candidates, 20),
                "candidate_recall_top10": _truth_recall(truth_topics, candidates, 10),
                "candidate_recall_top20": _truth_recall(truth_topics, candidates, 20),
                "router_state": pred_state,
                "router_topics": pred_topics,
                "router_exact": router_exact,
                "positive_qrel_ranks": positive_ranks,
                "input_retrieval_miss": any(
                    rank is None or int(rank) > 20 for rank in positive_ranks
                ),
            }
            model_facts[model_id] = fact
            per_model_rows[model_id].append({
                "truth_state": truth_state,
                "truth_topics": truth_topics,
                "pred_state": pred_state,
                "pred_topics": pred_topics,
                "candidate_ids": candidates,
                **{k: fact[k] for k in (
                    "candidate_complete_top10",
                    "candidate_complete_top20",
                    "candidate_recall_top10",
                    "candidate_recall_top20",
                    "router_state",
                    "router_exact",
                    "input_retrieval_miss",
                )},
            })

        primary = primary_attribution(case, model_facts)
        private_cases.append({
            **case,
            "primary_attribution": primary,
            "models": model_facts,
        })
        public_cases.append({
            "case_hash": case_hash(calibration_id),
            "truth_state": truth_state,
            "context_dependent": case["context_dependent"],
            "boundary_ambiguity": case["boundary_ambiguity"],
            "primary_attribution": primary,
            "model_flags": {
                model_id: {
                    "input_retrieval_miss": facts["input_retrieval_miss"],
                    "candidate_complete_top10": facts["candidate_complete_top10"],
                    "candidate_complete_top20": facts["candidate_complete_top20"],
                    "router_state": facts["router_state"],
                    "router_exact": facts["router_exact"],
                }
                for model_id, facts in model_facts.items()
            },
        })


    primary_counts = Counter(row["primary_attribution"] for row in private_cases)
    model_summary: dict[str, Any] = {}
    reconciliation: dict[str, Any] = {}

    for model_id in expected_models:
        candidate = candidate_metrics(per_model_rows[model_id])
        router = router_metrics(per_model_rows[model_id])
        retrieval = retrieval_metrics(per_model_qrels[model_id])
        model_summary[model_id] = {
            **_model_summary(per_model_rows[model_id], per_model_qrels[model_id]),
            "candidate_metrics": candidate,
            "router_metrics": router,
            "retrieval_metrics": retrieval,
        }

        frozen = scorecard["public_summary"]["personalized_models"][model_id]["splits"]["lockbox"]
        frozen_candidate = frozen["routers"][config["scope"]["router_variant"]]["candidate"]
        frozen_router = frozen["routers"][config["scope"]["router_variant"]]["router"]
        frozen_retrieval = frozen["retrieval"]
        checks = {
            "candidate_topic_recall_at_10": _safe_float_equal(
                candidate["topic_recall_at_10"], frozen_candidate["topic_recall_at_10"]
            ),
            "candidate_topic_recall_at_20": _safe_float_equal(
                candidate["topic_recall_at_20"], frozen_candidate["topic_recall_at_20"]
            ),
            "router_macro_f1": _safe_float_equal(
                router["macro_f1"], frozen_router["macro_f1"]
            ),
            "router_accepted_coverage": _safe_float_equal(
                router["accepted_coverage"], frozen_router["accepted_coverage"]
            ),
            "router_exact_match_rate": _safe_float_equal(
                router["exact_match_rate"], frozen_router["exact_match_rate"]
            ),
            "retrieval_ndcg_at_10": _safe_float_equal(
                retrieval["ndcg_at_10"], frozen_retrieval["ndcg_at_10"]
            ),
            "retrieval_recall_at_20": _safe_float_equal(
                retrieval["recall_at_20"], frozen_retrieval["recall_at_20"]
            ),
            "retrieval_mrr_at_10": _safe_float_equal(
                retrieval["mrr_at_10"], frozen_retrieval["mrr_at_10"]
            ),
        }
        reconciliation[model_id] = {
            "checks": checks,
            "pass": all(checks.values()),
        }

    if not all(row["pass"] for row in reconciliation.values()):
        raise RuntimeError("REM-00 reconstruction does not reconcile with frozen SEM-07 metrics")


    assigned_cases = sum(row["truth_state"] == "ASSIGNED" for row in private_cases)
    context_cases = sum(row["context_dependent"] for row in private_cases)
    hypotheses = [
        {
            "rank": 1,
            "hypothesis": "REPRESENTATION_AND_CANDIDATE_RECALL_IS_PRIMARY_REMEDIATION_SURFACE",
            "causal_stage": "representation_candidate",
            "evidence_cases": (
                primary_counts["CONTEXT_REPRESENTATION"]
                + primary_counts["CANDIDATE_MISS"]
                + primary_counts["CANDIDATE_LOW_RANK"]
            ),
            "action_for_next_round": "Probe Topic descriptors, Input+context representation, chunk/multi-vector and fusion contribution before Router changes.",
        },
        {
            "rank": 2,
            "hypothesis": "ROUTER_ABSTENTION_REMAINS_A_SEPARATE_DOWNSTREAM_BOTTLENECK",
            "causal_stage": "router",
            "evidence_cases": primary_counts["ROUTER_ABSTENTION"],
            "action_for_next_round": "Measure Router only on cases where at least one model already provides complete truth candidates in top10; do not tune Router yet.",
        },
        {
            "rank": 3,
            "hypothesis": "INPUT_RETRIEVAL_FAILURE_IS_MODEL_SPECIFIC_AND_SEPARATE_FROM_TOPIC_CANDIDATES",
            "causal_stage": "input_retrieval",
            "evidence_pairs_by_model": {
                model_id: model_summary[model_id]["positive_qrel_miss_at_20_pairs"]
                for model_id in expected_models
            },
            "action_for_next_round": "Keep Input retrieval and Topic candidate retrieval as separate objectives in REM-01 diagnostics.",
        },
        {
            "rank": 4,
            "hypothesis": "CONTEXT_DEPENDENT_CASES_REQUIRE_EXPLICIT_REPRESENTATION_PROBES",
            "causal_stage": "context",
            "evidence_cases": context_cases,
            "primary_context_failures": primary_counts["CONTEXT_REPRESENTATION"],
            "action_for_next_round": "Ablate current-input-only versus allowed-context composition without using legacy lockbox for config selection.",
        },
        {
            "rank": 5,
            "hypothesis": "LEGACY_CLASS_SUPPORT_CANNOT_CERTIFY_UNASSIGNED_DEFER",
            "causal_stage": "benchmark_coverage",
            "evidence_cases": primary_counts["DATA_CLASS_GAP"],
            "action_for_next_round": "Preserve class-specific INCONCLUSIVE semantics until the new independent lockbox; do not create ad-hoc labels now.",
        },
    ]


    public_summary = {
        "round": "REM-00",
        "attribution_version": config["attribution_version"],
        "consumed_lockbox_role": config["scope"]["consumed_lockbox_role"],
        "case_count": len(private_cases),
        "assigned_cases": assigned_cases,
        "context_dependent_cases": context_cases,
        "primary_attribution_counts": dict(sorted(primary_counts.items())),
        "model_failure_matrix": model_summary,
        "reconciliation": reconciliation,
        "hypotheses": hypotheses,
        "sanitized_case_ledger": public_cases,
        "guards": {
            "remediation_config_changes": 0,
            "new_owner_labels": 0,
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "model_training_runs": 0,
            "production_paia_modifications": 0,
            "consumed_lockbox_tuning_events": 0,
        },
        "privacy": {
            "contains_raw_text": False,
            "contains_input_ref": False,
            "contains_family_ref": False,
            "contains_calibration_id": False,
            "contains_per_case_topic_ids": False,
        },
    }
    public_summary["summary_digest"] = hashlib.sha256(
        json.dumps(public_summary, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    private_payload = {
        "round": "REM-00",
        "attribution_version": config["attribution_version"],
        "cases": private_cases,
        "reconciliation": reconciliation,
        "hypotheses": hypotheses,
        "public_summary_digest": public_summary["summary_digest"],
    }

    private_output.parent.mkdir(parents=True, exist_ok=True)
    private_output.write_text(
        json.dumps(private_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    private_output.chmod(0o600)
    public_output.parent.mkdir(parents=True, exist_ok=True)
    public_output.write_text(
        json.dumps(public_summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return public_summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sem06-dir", type=Path, required=True)
    parser.add_argument("--sem07-scorecard", type=Path, required=True)
    parser.add_argument("--private-output", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    result = analyze(
        args.sem06_dir,
        args.sem07_scorecard,
        args.private_output,
        args.public_output,
        args.config,
    )
    print(json.dumps({
        "case_count": result["case_count"],
        "primary_attribution_counts": result["primary_attribution_counts"],
        "reconciliation_pass": all(
            row["pass"] for row in result["reconciliation"].values()
        ),
        "summary_digest": result["summary_digest"],
        "private_output": str(args.private_output),
        "public_output": str(args.public_output),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
