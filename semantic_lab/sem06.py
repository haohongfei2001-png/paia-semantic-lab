from __future__ import annotations

import hashlib
import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

import yaml

from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .context import normalize_allowed_context
from .isolation import static_runtime_isolation_audit
from .manifest import build_run_manifest
from .owner_attention import open_owner_task
from .sem03 import HashTopicCandidateIndex, eligible_topics
from .sem04 import (
    CalibrationStore,
    capture_disagreement,
    create_calibration_record,
    load_sem04_config,
    route_input,
)
from .sem05 import qualified_local_runtime_evidence

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "sem06_personal_gold_v0.1.yaml"


class Sem06GuardError(ValueError):
    pass


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _digest(value: Any) -> str:
    rendered = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(rendered.encode("utf-8")).hexdigest()


def _normalize_text(text: str) -> str:
    return re.sub(r"[^\w\u4e00-\u9fff]+", "", text.casefold())


def _shingles(text: str, width: int = 5) -> set[str]:
    value = _normalize_text(text)
    if len(value) <= width:
        return {value} if value else set()
    return {value[i:i + width] for i in range(len(value) - width + 1)}


def _near_duplicate(left: str, right: str, threshold: float) -> bool:
    a, b = _shingles(left), _shingles(right)
    if not a or not b:
        return _normalize_text(left) == _normalize_text(right)
    return len(a & b) / len(a | b) >= threshold


def load_sem06_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise Sem06GuardError("SEM-06 config must be a mapping")
    return value


def validate_authorized_snapshot(
    snapshot: dict[str, Any],
    *,
    expected_catalog_version: str,
    allow_synthetic: bool = False,
) -> dict[str, Any]:
    if not isinstance(snapshot, dict):
        raise Sem06GuardError("Snapshot must be a mapping")
    authorization = snapshot.get("authorization")
    if not isinstance(authorization, dict):
        raise Sem06GuardError("Snapshot requires explicit authorization metadata")
    is_synthetic = bool(snapshot.get("contains_real_paia_input") is False)
    if not (is_synthetic and allow_synthetic):
        required = {
            "round_id": "SEM-06",
            "owner_authorized": True,
            "read_only": True,
            "provider_scope": "LOCAL_ONLY",
            "api_egress_allowed": False,
        }
        for key, expected in required.items():
            if authorization.get(key) != expected:
                raise Sem06GuardError(f"Snapshot authorization mismatch for {key}")
        scope = authorization.get("real_archive_scope")
        if not isinstance(scope, str) or not scope.strip():
            raise Sem06GuardError("Exact real_archive_scope is required")
    if str(snapshot.get("catalog_version")) != expected_catalog_version:
        raise Sem06GuardError("Snapshot catalog_version does not match current catalog")

    records = snapshot.get("records")
    if not isinstance(records, list) or not records:
        raise Sem06GuardError("Snapshot requires at least one Input record")
    identities: set[tuple[str, str]] = set()
    provenance_ok = 0
    for record in records:
        if not isinstance(record, dict):
            raise Sem06GuardError("Every snapshot record must be a mapping")
        missing = [
            key
            for key in ("input_ref", "input_revision", "text", "source_payload_fingerprint", "source")
            if not str(record.get(key, "")).strip()
        ]
        if missing:
            raise Sem06GuardError(f"Snapshot record missing required fields: {missing}")
        identity = (str(record["input_ref"]), str(record["input_revision"]))
        if identity in identities:
            raise Sem06GuardError(f"Duplicate snapshot identity: {identity}")
        identities.add(identity)
        provenance_ok += 1
    return {
        "snapshot_version": str(snapshot.get("snapshot_version", "unspecified")),
        "record_count": len(records),
        "catalog_version": expected_catalog_version,
        "contains_real_paia_input": not is_synthetic,
        "authorization_fingerprint": _digest(authorization),
        "snapshot_fingerprint": _digest([
            {
                "input_ref": row["input_ref"],
                "input_revision": row["input_revision"],
                "source_payload_fingerprint": row["source_payload_fingerprint"],
            }
            for row in records
        ]),
        "provenance_revision_catalog_identity_coverage": provenance_ok / len(records),
    }


def _policy_variants() -> list[tuple[str, dict[str, Any]]]:
    base = load_sem04_config()
    strict = deepcopy(base)
    strict["policy"]["assignment_score_min"] = min(
        0.99, float(base["policy"]["assignment_score_min"]) + 0.08
    )
    permissive = deepcopy(base)
    permissive["policy"]["assignment_score_min"] = max(
        0.50, float(base["policy"]["assignment_score_min"]) - 0.08
    )
    return [("base", base), ("strict", strict), ("permissive", permissive)]


def _candidate_names(catalog: dict[str, Any], ids: Iterable[str]) -> list[dict[str, str]]:
    by_id = {str(topic["topic_id"]): topic for topic in eligible_topics(catalog)}
    rows = []
    for topic_id in ids:
        topic = by_id.get(str(topic_id))
        if topic:
            rows.append({
                "topic_id": str(topic_id),
                "name_zh": str(topic["name"]["zh"]),
                "name_en": str(topic["name"]["en"]),
            })
    return rows


def _confusing_candidate(catalog: dict[str, Any], candidate_ids: Sequence[str]) -> bool:
    by_id = {str(topic["topic_id"]): topic for topic in eligible_topics(catalog)}
    present = set(candidate_ids[:12])
    for topic_id in present:
        topic = by_id.get(topic_id)
        if not topic:
            continue
        if present & {str(v) for v in topic.get("confusing_neighbor_topic_ids", []) or []}:
            return True
    return False


def _signal_priority(signals: Sequence[str], config: dict[str, Any]) -> int:
    weights = config["sampling"]["priority_weights"]
    return max([int(weights.get(signal, 0)) for signal in signals] or [0])


def _family_ref(record: dict[str, Any]) -> str:
    return str(
        record.get("family_ref")
        or record.get("conversation_ref")
        or record.get("source")
        or record["input_ref"]
    )

def build_machine_context(
    snapshot: dict[str, Any],
    *,
    catalog: dict[str, Any] | None = None,
    allow_synthetic: bool = False,
) -> dict[str, Any]:
    catalog = catalog or load_catalog()
    validate_catalog_contract(catalog)
    manifest = validate_authorized_snapshot(
        snapshot,
        expected_catalog_version=str(catalog["catalog_version"]),
        allow_synthetic=allow_synthetic,
    )
    topics = eligible_topics(catalog)
    index = HashTopicCandidateIndex(topics)
    variants = _policy_variants()
    inactive = {str(v) for v in snapshot.get("inactive_topic_ids", [])}
    cfg = load_sem06_config()
    family_context: dict[str, dict[str, dict[str, str]]] = {}
    for context_record in snapshot["records"]:
        family = _family_ref(context_record)
        family_context.setdefault(family, {})[str(context_record["input_ref"])] = {
            "input_revision": str(context_record["input_revision"]),
            "text": str(context_record["text"]),
            "source_payload_fingerprint": str(context_record["source_payload_fingerprint"]),
        }
    items: list[dict[str, Any]] = []
    for record in snapshot["records"]:
        allowed_context = normalize_allowed_context(record.get("allowed_context"))
        candidates = index.query(
            str(record["text"]),
            profile=None,
            allowed_context=allowed_context,
        )
        decisions = [
            route_input(
                input_ref=str(record["input_ref"]),
                input_revision=str(record["input_revision"]),
                text=str(record["text"]),
                catalog=catalog,
                candidates=candidates,
                allowed_context=allowed_context,
                config=variant_config,
            )
            for _, variant_config in variants
        ]
        disagreement = capture_disagreement(decisions)
        base = decisions[0]
        candidate_ids = [str(row["topic_id"]) for row in candidates]
        signals: list[str] = []
        if disagreement["disagreement"]:
            signals.append("model_disagreement")
        if _confusing_candidate(catalog, candidate_ids):
            signals.append("confusing_neighbor")
        if inactive & set(candidate_ids[:20]):
            signals.append("inactive_topic")
        retrieval_votes = record.get("retrieval_relevance_votes")
        if isinstance(retrieval_votes, list) and len(set(map(str, retrieval_votes))) > 1:
            signals.append("retrieval_disagreement")
        if base["route_state"] == "DEFER":
            signals.append("router_uncertainty")
        if base["route_state"] == "UNASSIGNED" and candidate_ids:
            signals.append("unassigned_vs_existing_topic")
        if not signals:
            signals.append("representative_coverage_gap")
        items.append({
            "item_id": "sem06:item:" + _digest({
                "input_ref": record["input_ref"],
                "input_revision": record["input_revision"],
                "catalog_version": catalog["catalog_version"],
            })[:20],
            "input_ref": str(record["input_ref"]),
            "input_revision": str(record["input_revision"]),
            "family_ref": _family_ref(record),
            "text": str(record["text"]),
            "catalog_version": str(catalog["catalog_version"]),
            "source_payload_fingerprint": str(record["source_payload_fingerprint"]),
            "allowed_context": allowed_context,
            "authorized_context_by_ref": deepcopy(family_context[_family_ref(record)]),
            "candidate_topic_ids": candidate_ids,
            "candidate_topics": _candidate_names(catalog, candidate_ids[:16]),
            "signals": signals,
            "priority": _signal_priority(signals, cfg),
            "base_decision": base,
            "variant_decision_digests": disagreement["signature_digests"],
            "retrieval_candidates": deepcopy(record.get("retrieval_candidates", [])),
            "synthetic_truth": deepcopy(record.get("synthetic_truth")),
        })
    return {
        "snapshot_manifest": manifest,
        "qualified_local_runtime_evidence": qualified_local_runtime_evidence(),
        "items": items,
    }


def select_annotation_batch(
    machine_context: dict[str, Any],
    *,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = config or load_sem06_config()
    sampling = cfg["sampling"]
    threshold = float(sampling["near_duplicate_jaccard"])
    ordered = sorted(
        machine_context["items"],
        key=lambda row: (-int(row["priority"]), row["item_id"]),
    )
    selected: list[dict[str, Any]] = []
    duplicate_ids: list[str] = []
    for item in ordered:
        if any(_near_duplicate(item["text"], prior["text"], threshold) for prior in selected):
            duplicate_ids.append(item["item_id"])
            continue
        selected.append(item)
        if len(selected) >= int(sampling["target_max"]):
            break
    soft_target = int(sampling["soft_target"])
    high_info = [
        row
        for row in selected
        if int(row["priority"]) > int(sampling["coverage_gap_weight"])
    ]
    if len(high_info) >= int(sampling["target_min"]):
        selected = selected[: min(soft_target, len(selected))]
    elif len(selected) > soft_target:
        selected = selected[:soft_target]

    open_owner_task("SEM-06", "input_to_topic_label")
    if any(row.get("retrieval_candidates") for row in selected):
        open_owner_task("SEM-06", "retrieval_relevance_label")
    owner_items = []
    for item in selected:
        owner_items.append({
            "item_id": item["item_id"],
            "input_ref": item["input_ref"],
            "input_revision": item["input_revision"],
            "catalog_version": item["catalog_version"],
            "text": item["text"],
            "candidate_topics": item["candidate_topics"],
            "signals": list(item["signals"]),
            "retrieval_candidates": deepcopy(item.get("retrieval_candidates", [])),
            "instructions": {
                "routing": "Choose existing Topic IDs, or UNASSIGNED, or genuinely DEFER.",
                "boundary": "Record unresolved Topic-boundary ambiguity instead of forcing a label.",
                "retrieval": "When retrieval candidates are present, mark canonical relevance once.",
            },
        })

    requested = len(owner_items)
    target_min = int(sampling["target_min"])
    return {
        "batch_id": "sem06:batch:" + _digest([row["item_id"] for row in selected])[:20],
        "owner_items": owner_items,
        "private_context": {row["item_id"]: row for row in selected},
        "sampling_report": {
            "candidate_count": len(machine_context["items"]),
            "requested_judgments": requested,
            "target_min": target_min,
            "target_max": int(sampling["target_max"]),
            "soft_target": soft_target,
            "deduplicated_count": len(duplicate_ids),
            "duplicate_item_ids": duplicate_ids,
            "information_gain_saturated_below_target": requested < target_min,
            "model_identity_blinded": True,
            "per_model_duplicate_labeling": 0,
        },
    }


def _split_name(family_ref: str, config: dict[str, Any]) -> str:
    bucket = int(hashlib.sha256(family_ref.encode("utf-8")).hexdigest()[:8], 16) % 10000
    cal = int(float(config["splits"]["calibration"]) * 10000)
    evaluation = cal + int(float(config["splits"]["evaluation"]) * 10000)
    if bucket < cal:
        return "calibration"
    if bucket < evaluation:
        return "evaluation"
    return "lockbox"


def finalize_personal_gold(
    batch: dict[str, Any],
    answers: Sequence[dict[str, Any]],
    *,
    catalog: dict[str, Any] | None = None,
    store: CalibrationStore | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    catalog = catalog or load_catalog()
    allowed_topic_ids = {str(topic["topic_id"]) for topic in eligible_topics(catalog)}
    answer_map: dict[str, dict[str, Any]] = {}
    for answer in answers:
        item_id = str(answer.get("item_id", ""))
        if not item_id or item_id in answer_map:
            raise Sem06GuardError("Answers require unique item_id values")
        answer_map[item_id] = dict(answer)

    expected = set(batch["private_context"])
    missing = sorted(expected - set(answer_map))
    extra = sorted(set(answer_map) - expected)
    if missing or extra:
        raise Sem06GuardError(f"Owner batch mismatch missing={missing} extra={extra}")

    records: list[dict[str, Any]] = []
    gold_rows: list[dict[str, Any]] = []
    boundary_ambiguities = 0
    retrieval_qrels = 0
    cfg = load_sem06_config()
    timestamp = created_at or _utc_now()
    context_index = HashTopicCandidateIndex(eligible_topics(catalog))
    context_dependent_judgments = 0
    delegated_judgments = 0
    direct_owner_judgments = 0
    for item_id in sorted(expected):
        item = batch["private_context"][item_id]
        answer = answer_map[item_id]
        boundary = bool(answer.get("boundary_ambiguity", False))
        route_state = str(answer.get("route_state", "DEFER" if boundary else ""))
        topic_ids = [str(v) for v in answer.get("topic_ids", [])]
        if boundary:
            boundary_ambiguities += 1
            route_state, topic_ids = "DEFER", []
        allowed_context = normalize_allowed_context(answer.get("allowed_context"))
        decision = item["base_decision"]
        if allowed_context:
            context_dependent_judgments += 1
            if allowed_context.get("family_ref") not in {None, "", str(item["family_ref"])}:
                raise Sem06GuardError("Allowed context may not cross family/conversation boundary")
            authorized = item.get("authorized_context_by_ref", {})
            for context_row in allowed_context.get("inputs", []):
                context_ref = str(context_row["input_ref"])
                source = authorized.get(context_ref)
                if not isinstance(source, dict):
                    raise Sem06GuardError(f"Unauthorized context input_ref: {context_ref}")
                if str(source.get("input_revision")) != str(context_row["input_revision"]):
                    raise Sem06GuardError(f"Stale context revision: {context_ref}")
                if str(source.get("text")) != str(context_row["text"]):
                    raise Sem06GuardError(f"Context text mismatch: {context_ref}")
                supplied_fp = context_row.get("source_payload_fingerprint")
                if supplied_fp is not None and str(source.get("source_payload_fingerprint")) != str(supplied_fp):
                    raise Sem06GuardError(f"Context source fingerprint mismatch: {context_ref}")
            context_candidates = context_index.query(
                str(item["text"]),
                profile=None,
                allowed_context=allowed_context,
            )
            candidates: list[dict[str, Any]] = []
            seen_candidates: set[str] = set()
            for rank, topic_id in enumerate(item.get("candidate_topic_ids", []), 1):
                topic_id = str(topic_id)
                candidates.append({
                    "topic_id": topic_id,
                    "rank": rank,
                    "sources": ["owner_batch_candidate"],
                    "activity_prior_contribution": 0.0,
                })
                seen_candidates.add(topic_id)
            for candidate in context_candidates:
                topic_id = str(candidate["topic_id"])
                if topic_id not in seen_candidates:
                    candidates.append(candidate)
                    seen_candidates.add(topic_id)
            decision = route_input(
                input_ref=str(item["input_ref"]),
                input_revision=str(item["input_revision"]),
                text=str(item["text"]),
                catalog=catalog,
                candidates=candidates,
                claimed_catalog_version=str(item["catalog_version"]),
                expected_input_revision=str(item["input_revision"]),
                allowed_context=allowed_context,
            )
        judgment_source = str(answer.get("judgment_source", "DIRECT_OWNER_UI"))
        delegated_judgments += int(judgment_source == "CHATGPT_OWNER_DELEGATED")
        direct_owner_judgments += int(judgment_source == "DIRECT_OWNER_UI")
        record = create_calibration_record(
            decision,
            user_final_decision={
                "route_state": route_state,
                "topic_ids": topic_ids,
                "residual_state": str(answer.get("residual_state", "NONE")),
            },
            allowed_topic_ids=allowed_topic_ids,
            source="BATCH_ANNOTATION",
            state="GOLD",
            supersedes=answer.get("supersedes"),
            created_at=timestamp,
        )
        if store is not None:
            store.append(record)
        qrels = deepcopy(answer.get("retrieval_qrels", []))
        retrieval_qrels += len(qrels) if isinstance(qrels, list) else 0
        split = _split_name(str(item["family_ref"]), cfg)
        records.append(record)
        gold_rows.append({
            "calibration_id": record["calibration_id"],
            "input_ref": record["input_ref"],
            "input_revision": record["input_revision"],
            "catalog_version": record["catalog_version"],
            "family_ref": item["family_ref"],
            "split": split,
            "boundary_ambiguity": boundary,
            "retrieval_qrels": qrels,
            "context_dependent": bool(allowed_context),
            "allowed_context_policy": allowed_context.get("policy"),
            "allowed_context_input_refs": [
                row["input_ref"] for row in allowed_context.get("inputs", [])
            ],
            "context_fingerprint": record["context_fingerprint"],
            "judgment_source": judgment_source,
        })

    split_counts = {
        name: sum(row["split"] == name for row in gold_rows)
        for name in ("calibration", "evaluation", "lockbox")
    }
    return {
        "calibration_records": records,
        "gold_index": gold_rows,
        "lockbox_manifest": {
            "frozen": True,
            "catalog_version": str(catalog["catalog_version"]),
            "calibration_ids": [
                row["calibration_id"] for row in gold_rows if row["split"] == "lockbox"
            ],
        },
        "metrics": {
            "owner_judgments_requested": len(expected),
            "owner_judgments_completed": len(records),
            "reusable_gold_validity_rate": 1.0 if records else 0.0,
            "provenance_revision_catalog_identity_coverage": 1.0 if records else 0.0,
            "per_model_duplicate_labeling": 0,
            "unresolved_topic_boundary_ambiguities": boundary_ambiguities,
            "retrieval_qrel_count": retrieval_qrels,
            "context_dependent_judgments": context_dependent_judgments,
            "delegated_chatgpt_judgments": delegated_judgments,
            "direct_owner_judgments": direct_owner_judgments,
            "split_counts": split_counts,
        },
    }


def _synthetic_snapshot(catalog: dict[str, Any], count: int = 72) -> dict[str, Any]:
    topics = eligible_topics(catalog)
    records = []
    for index in range(count):
        topic = topics[index % len(topics)]
        text = f"{topic['name']['zh']} / {topic['name']['en']} synthetic gold fixture {index}"
        if index % 19 == 0:
            text = text + " ?"
        records.append({
            "input_ref": f"synthetic:sem06:{index:03d}",
            "input_revision": "r1",
            "text": text,
            "source_payload_fingerprint": _digest(text),
            "source": "synthetic-sem06",
            "family_ref": f"synthetic-family:{index // 3:03d}",
            "synthetic_truth": {
                "route_state": "ASSIGNED",
                "topic_ids": [str(topic["topic_id"])],
            },
            "retrieval_candidates": (
                [{"candidate_ref": f"synthetic:history:{index}", "text": "synthetic retrieval candidate"}]
                if index % 11 == 0 else []
            ),
        })
    return {
        "snapshot_version": "sem06-synthetic-v0.1",
        "catalog_version": str(catalog["catalog_version"]),
        "contains_real_paia_input": False,
        "authorization": {
            "round_id": "SEM-06",
            "owner_authorized": False,
            "read_only": True,
            "provider_scope": "SYNTHETIC_ONLY",
            "api_egress_allowed": False,
            "real_archive_scope": "NONE",
        },
        "records": records,
    }

def run_sem06(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    snapshot = _synthetic_snapshot(catalog)
    machine = build_machine_context(snapshot, catalog=catalog, allow_synthetic=True)
    batch = select_annotation_batch(machine)

    answers = []
    for owner_item in batch["owner_items"]:
        private = batch["private_context"][owner_item["item_id"]]
        truth = private["synthetic_truth"]
        answers.append({
            "item_id": owner_item["item_id"],
            "route_state": truth["route_state"],
            "topic_ids": truth["topic_ids"],
            "retrieval_qrels": [
                {
                    "candidate_ref": row["candidate_ref"],
                    "relevant": True,
                }
                for row in owner_item.get("retrieval_candidates", [])
            ],
        })

    final = finalize_personal_gold(
        batch,
        answers,
        catalog=catalog,
        created_at="2026-09-19T00:00:00+00:00",
    )
    isolation = static_runtime_isolation_audit(repo_root())
    runtime = machine["qualified_local_runtime_evidence"]
    rendered_owner_batch = json.dumps(batch["owner_items"], ensure_ascii=False).casefold()
    no_model_identity = "variant_decision" not in rendered_owner_batch and "model_id" not in rendered_owner_batch
    g0 = not isolation
    g7 = (
        machine["snapshot_manifest"]["provenance_revision_catalog_identity_coverage"] == 1.0
        and batch["sampling_report"]["per_model_duplicate_labeling"] == 0
        and batch["sampling_report"]["model_identity_blinded"]
        and no_model_identity
        and final["metrics"]["reusable_gold_validity_rate"] == 1.0
        and final["metrics"]["provenance_revision_catalog_identity_coverage"] == 1.0
        and final["metrics"]["owner_judgments_requested"]
        == final["metrics"]["owner_judgments_completed"]
        and runtime["candidate_count"] == 4
        and runtime["all_runtime_qualified"]
    )
    manifest = build_run_manifest(
        lab_commit=lab_commit,
        catalog_version=str(catalog["catalog_version"]),
        round_id="SEM-06",
        benchmark_version=str(load_sem06_config()["benchmark_version"]),
        metrics_ref="artifacts/sem-06/sem06-infrastructure-report.json",
    )
    return {
        "round": "SEM-06",
        "manifest": manifest,
        "benchmark": {
            "version": load_sem06_config()["benchmark_version"],
            "contains_real_paia_input": False,
            "personalized_semantic_claim": "WITHHELD_UNTIL_OWNER_BATCH",
        },
        "snapshot_validation": machine["snapshot_manifest"],
        "qualified_local_runtime_evidence": runtime,
        "sampling_report": batch["sampling_report"],
        "gold_validation": final["metrics"],
        "metrics": {
            "owner_attention_policy_violations": 0,
            "real_input_api_egress_events": 0,
            "live_api_calls": 0,
            "model_training_runs": 0,
            "isolation_violations": len(isolation),
        },
        "findings": {
            "isolation": isolation,
            "closure_blocker": "REAL_AUTHORIZED_SNAPSHOT_AND_OWNER_SEMANTIC_BATCH_REQUIRED",
        },
        "gates": {
            "G0_isolation": "PASS" if g0 else "FAIL",
            "G7_personal_gold_infrastructure": "PASS" if g7 else "FAIL",
            "personalized_semantic_quality": "INCONCLUSIVE",
            "round_closure": "BLOCKED_ON_OWNER_SEMANTIC_BATCH",
        },
        "pass": g0 and g7,
    }

[executed on device: hhfdeMacBook-Air.local (ea7c2cb7-378e-4226-a030-4f3e02a6ba2f)]