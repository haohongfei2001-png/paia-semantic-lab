from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

import yaml

from .b0 import benchmark_fingerprint, build_fixture_pack, evaluate_controls, topic_document
from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .embedding_adapters import (
    AdapterUnavailable, ApiEmbeddingAdapter, CandidateSpec, InputTooLongError,
    LocalEmbeddingAdapter, UnsafeEgressError, apply_prompt,
    deterministic_fake_encoder, validate_candidate_spec, vector_digest,
    whitespace_token_counter,
)
from .isolation import static_runtime_isolation_audit
from .manifest import build_run_manifest
from .owner_attention import OwnerAttentionViolation, SEMANTIC_OWNER_TASKS, open_owner_task

TASK_INSTRUCTION = "Retrieve relevant durable Topics from the complete PAIA System Topic Catalog."
MAX_DISAGREEMENTS = 200


def _yaml(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected mapping in {path}")
    return value


def load_sem01_config(path: Path | None = None) -> dict[str, Any]:
    return _yaml(path or repo_root() / "configs" / "sem01_bakeoff_v0.1.yaml")


def _frozen_ids() -> set[str]:
    config = _yaml(repo_root() / "configs" / "semantic_lab_v0.2.yaml")
    models = config.get("model_candidates", {})
    return {
        str(item["id"])
        for group in ("local", "control", "api")
        for item in models.get(group, []) or []
        if isinstance(item, dict) and item.get("id")
    }


def _specs(config: dict[str, Any]) -> list[CandidateSpec]:
    specs = [CandidateSpec.from_dict(item) for item in config.get("candidates", [])]
    for spec in specs:
        validate_candidate_spec(spec)
    ids = [spec.candidate_id for spec in specs]
    if len(ids) != len(set(ids)):
        raise ValueError("Candidate ids must be unique")
    return specs


def validate_adapter_contract(spec: CandidateSpec) -> dict[str, Any]:
    evidence: dict[str, Any] = {
        "candidate_id": spec.candidate_id,
        "kind": spec.kind,
        "prompt_policy": spec.prompt_policy,
        "manifest_valid": True,
        "runtime_model_evaluated": False,
        "model_quality_metrics": None,
        "live_network_calls": 0,
    }
    sample = "语义检索 semantic retrieval"
    try:
        if spec.kind == "local":
            adapter = LocalEmbeddingAdapter(
                spec,
                token_counter=whitespace_token_counter,
                encoder=lambda texts: deterministic_fake_encoder(texts, dimensions=16),
                task_instruction=TASK_INSTRUCTION,
            )
            first = adapter.embed([sample], role="query")
            second = adapter.embed([sample], role="query")
            evidence["contract_vector_stable"] = vector_digest(first) == vector_digest(second)
            evidence["prepared_query"] = apply_prompt(spec, "query", sample, TASK_INSTRUCTION)
            denied = LocalEmbeddingAdapter(
                spec, token_counter=None, encoder=None, task_instruction=TASK_INSTRUCTION
            )
            try:
                denied.embed([sample], role="query")
                evidence["missing_runtime_default_denied"] = False
            except AdapterUnavailable:
                evidence["missing_runtime_default_denied"] = True
        else:
            captured: list[dict[str, Any]] = []
            def fake_transport(payload: dict[str, Any]) -> dict[str, Any]:
                captured.append(payload)
                return {"data": [[0.0, 1.0]]}
            adapter = ApiEmbeddingAdapter(
                spec, transport=fake_transport, token_counter=whitespace_token_counter
            )
            adapter.embed(
                [sample], role="query", evidence_class="synthetic",
                contains_real_paia_input=False,
            )
            evidence["payload"] = captured[0]
            try:
                adapter.embed(
                    [sample], role="query", evidence_class="synthetic",
                    contains_real_paia_input=True,
                )
                evidence["real_input_egress_default_denied"] = False
            except UnsafeEgressError:
                evidence["real_input_egress_default_denied"] = True

        overlong = "x " * (int(spec.context_tokens or 1) + 1)
        if spec.kind == "local":
            over = LocalEmbeddingAdapter(
                spec,
                token_counter=whitespace_token_counter,
                encoder=lambda texts: deterministic_fake_encoder(texts, dimensions=8),
                task_instruction=TASK_INSTRUCTION,
            )
            try:
                over.embed([overlong], role="query")
                evidence["truncation_error_enforced"] = False
            except InputTooLongError:
                evidence["truncation_error_enforced"] = True
        else:
            over = ApiEmbeddingAdapter(
                spec, transport=lambda payload: {"data": []},
                token_counter=whitespace_token_counter,
            )
            try:
                over.build_payload([overlong], role="query")
                evidence["truncation_error_enforced"] = False
            except InputTooLongError:
                evidence["truncation_error_enforced"] = True
    except Exception as exc:
        evidence["contract_error"] = f"{type(exc).__name__}: {exc}"

    evidence["contract_pass"] = bool(
        evidence.get("truncation_error_enforced")
        and (
            evidence.get("missing_runtime_default_denied")
            or evidence.get("real_input_egress_default_denied")
        )
        and "contract_error" not in evidence
    )
    return evidence


def run_sem01(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_sem01_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    specs = _specs(config)

    frozen = _frozen_ids()
    manifest_ids = {spec.candidate_id for spec in specs}
    coverage = len(manifest_ids & frozen) / len(frozen) if frozen else 0.0
    missing, unexpected = sorted(frozen - manifest_ids), sorted(manifest_ids - frozen)

    active = [topic for topic in catalog.get("topics", []) if topic.get("lifecycle") == "ACTIVE"]
    topic_docs = {str(topic["topic_id"]): topic_document(topic) for topic in active}
    fixture_pack = build_fixture_pack(catalog)
    cases = fixture_pack["cases"]
    controls, rankings = evaluate_controls(topic_docs, cases)
    fingerprint = benchmark_fingerprint(topic_docs, cases)

    contracts = [validate_adapter_contract(spec) for spec in specs]
    owner_failures: list[str] = []
    for task in SEMANTIC_OWNER_TASKS:
        try:
            open_owner_task("SEM-01", task)
            owner_failures.append(task)
        except OwnerAttentionViolation:
            pass
    isolation = static_runtime_isolation_audit(repo_root())

    disagreements: list[dict[str, Any]] = []
    for index, case in enumerate(cases):
        lexical = rankings["lexical"][index][0]
        vector = rankings["exact_vector"][index][0]
        if lexical != vector:
            disagreements.append({
                "case_id": case["id"],
                "slice": case["slice"],
                "expected_topic_id": case["topic_id"],
                "lexical_top1": lexical,
                "exact_vector_top1": vector,
                "text": case["text"],
                "provenance": case["provenance"],
            })
    stored = disagreements[:MAX_DISAGREEMENTS]

    same_benchmark = all(item["case_count"] == len(cases) for item in controls.values())
    stable = all(item["reproducibility"]["repeated_run_stable"] for item in controls.values())
    contract_pass = all(item["contract_pass"] for item in contracts)
    truncation_failures = sum(not item.get("truncation_error_enforced", False) for item in contracts)
    g0 = not isolation and not owner_failures and truncation_failures == 0
    g2 = (
        same_benchmark and math.isclose(coverage, 1.0) and not missing and not unexpected
        and stable and contract_pass
    )

    fingerprints = []
    for spec in specs:
        raw = {
            "id": spec.candidate_id, "kind": spec.kind, "provider": spec.provider,
            "license": spec.license, "context_tokens": spec.context_tokens,
            "dimensions": list(spec.dimensions), "prompt_policy": spec.prompt_policy,
            "runtime_policy": spec.runtime_policy, "revision": spec.revision,
            "trust_remote_code": spec.trust_remote_code,
        }
        fingerprints.append({
            "candidate_id": spec.candidate_id,
            "manifest_fingerprint": hashlib.sha256(
                json.dumps(raw, sort_keys=True).encode()
            ).hexdigest(),
        })

    manifest = build_run_manifest(
        lab_commit=lab_commit,
        catalog_version=str(catalog["catalog_version"]),
        round_id="SEM-01",
        benchmark_version=str(config["benchmark_version"]),
        model_fingerprints=fingerprints,
        metrics_ref="artifacts/sem-01/model-scorecard.json",
    )
    scorecard = [{
        "candidate_id": spec.candidate_id,
        "kind": spec.kind,
        "provider": spec.provider,
        "license": spec.license,
        "context_tokens": spec.context_tokens,
        "dimensions": list(spec.dimensions),
        "runtime_policy": spec.runtime_policy,
        "revision": spec.revision,
        "trust_remote_code": spec.trust_remote_code,
        "price_usd_per_million_input_tokens": spec.price_usd_per_million_input_tokens,
        "price_status": spec.price_status,
        "adapter_contract": "PASS" if contract["contract_pass"] else "FAIL",
        "runtime_model_evaluated": False,
        "runtime_qualification": "NOT_QUALIFIED_RUNTIME_NOT_EXECUTED",
        "quality_metrics": None,
        "personalized_semantic_claim": "WITHHELD",
    } for spec, contract in zip(specs, contracts)]

    return {
        "round": "SEM-01",
        "manifest": manifest,
        "benchmark": {
            "version": config["benchmark_version"],
            "fingerprint": fingerprint,
            "case_count": len(cases),
            "topic_count": len(topic_docs),
            "evidence_classes": sorted({c["provenance"]["evidence_class"] for c in cases}),
            "contains_real_paia_input": False,
            "public_benchmark_quality_evaluated": False,
            "note": "No model score is fabricated for an unexecuted runtime.",
        },
        "controls": controls,
        "candidate_scorecard": scorecard,
        "candidate_contract_evidence": contracts,
        "qualified_shortlist": {
            "adapter_contract_qualified": [c["candidate_id"] for c in contracts if c["contract_pass"]],
            "runtime_qualified": [],
            "winner": None,
            "winner_claim": "WITHHELD_UNTIL_ACTUAL_PINNED_RUNTIME_BAKEOFF",
        },
        "machine_disagreement": {
            "total_count": len(disagreements),
            "stored_count": len(stored),
            "max_stored": MAX_DISAGREEMENTS,
            "cases": stored,
        },
        "metrics": {
            "same_benchmark_for_all_executed_controls": same_benchmark,
            "candidate_manifest_coverage": coverage,
            "candidate_missing": missing,
            "candidate_unexpected": unexpected,
            "candidate_count": len(specs),
            "adapter_contract_pass_count": sum(c["contract_pass"] for c in contracts),
            "repeated_run_reproducibility_reported": True,
            "executed_controls_stable": stable,
            "truncation_policy_failures": truncation_failures,
            "owner_attention_policy_violations": len(owner_failures),
            "isolation_violations": len(isolation),
            "real_input_api_egress_events": 0,
            "live_api_calls": 0,
            "runtime_model_quality_runs": 0,
        },
        "gates": {
            "G0_isolation": "PASS" if g0 else "FAIL",
            "G2_bakeoff_engineering": "PASS" if g2 else "FAIL",
            "runtime_model_qualification": "NO_CANDIDATE_QUALIFIED_WITHOUT_EXECUTED_RUNTIME",
            "personalized_semantic_quality": "INCONCLUSIVE",
        },
        "pass": g0 and g2,
    }
