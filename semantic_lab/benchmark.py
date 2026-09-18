from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from .catalog import audit_catalog, load_catalog, validate_catalog_contract
from .contracts import repo_root, validate_contract_bundle
from .fixtures import build_catalog_boundary_fixtures, load_safe_fixtures
from .isolation import (
    IsolationViolation,
    assert_capability_allowed,
    static_runtime_isolation_audit,
    treat_as_inert_data,
    validate_fixture_pack,
)
from .manifest import build_run_manifest
from .owner_attention import OwnerAttentionViolation, SEMANTIC_OWNER_TASKS, open_owner_task


def run_sem00(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    validate_contract_bundle()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    audit = audit_catalog(catalog)

    safe_pack = load_safe_fixtures()
    safe_provenance = validate_fixture_pack(safe_pack)
    boundary_fixtures = build_catalog_boundary_fixtures(catalog)
    boundary_provenance = validate_fixture_pack({"cases": boundary_fixtures})

    isolation_violations = static_runtime_isolation_audit(repo_root())
    permission_failures: list[str] = []
    for case in safe_pack["cases"]:
        if case["kind"] == "permission":
            try:
                assert_capability_allowed(case["requested_capability"])
                permission_failures.append(case["id"])
            except IsolationViolation:
                pass
        elif case["kind"] == "prompt_injection":
            inert = treat_as_inert_data(case["text"])
            if inert["text"] != case["text"] or inert["interpretation"] != "INERT_FIXTURE_DATA":
                isolation_violations.append(case["id"])

    owner_policy_failures: list[str] = []
    for number in range(6):
        round_id = f"SEM-{number:02d}"
        for task_type in SEMANTIC_OWNER_TASKS:
            try:
                open_owner_task(round_id, task_type)
                owner_policy_failures.append(f"{round_id}:{task_type}")
            except OwnerAttentionViolation:
                pass

    manifest = build_run_manifest(
        lab_commit=lab_commit,
        catalog_version=str(catalog["catalog_version"]),
    )
    g0 = (
        safe_provenance == 1.0
        and boundary_provenance == 1.0
        and not isolation_violations
        and not permission_failures
        and not owner_policy_failures
    )
    g1 = (
        audit["topics_loaded"] == 144
        and audit["domains_loaded"] == 18
        and audit["blocking_error_count"] == 0
    )
    return {
        "round": "SEM-00",
        "manifest": manifest,
        "metrics": {
            "schema_valid": True,
            "catalog_topics_loaded": audit["topics_loaded"],
            "catalog_domains_loaded": audit["domains_loaded"],
            "catalog_blocking_errors": audit["blocking_error_count"],
            "catalog_warnings": audit["warning_count"],
            "safe_fixture_provenance_coverage": safe_provenance,
            "catalog_boundary_fixture_count": len(boundary_fixtures),
            "catalog_boundary_provenance_coverage": boundary_provenance,
            "isolation_violations": len(isolation_violations),
            "permission_fixture_failures": len(permission_failures),
            "owner_attention_policy_violations": len(owner_policy_failures),
        },
        "findings": {
            "catalog": audit["errors"] + audit["warnings"],
            "isolation": isolation_violations,
            "permission_fixture_failures": permission_failures,
            "owner_attention_policy_violations": owner_policy_failures,
        },
        "gates": {
            "G0_isolation": "PASS" if g0 else "FAIL",
            "G1_catalog_integrity": "PASS" if g1 else "FAIL",
            "personalized_semantic_quality": "INCONCLUSIVE",
        },
        "pass": g0 and g1,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Semantic Lab canonical validation")
    parser.add_argument(
        "--round",
        choices=("SEM-00", "SEM-01", "SEM-02", "SEM-03", "SEM-04", "SEM-05", "SEM-06"),
        default="SEM-00",
    )
    parser.add_argument(
        "--lab-commit",
        default=os.environ.get("GITHUB_SHA", "UNCOMMITTED"),
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    if args.round == "SEM-06":
        from .sem06 import run_sem06
        result = run_sem06(args.lab_commit)
    elif args.round == "SEM-05":
        from .sem05 import run_sem05
        result = run_sem05(args.lab_commit)
    elif args.round == "SEM-04":
        from .sem04 import run_sem04
        result = run_sem04(args.lab_commit)
    elif args.round == "SEM-03":
        from .sem03 import run_sem03
        result = run_sem03(args.lab_commit)
    elif args.round == "SEM-02":
        from .sem02 import run_sem02
        result = run_sem02(args.lab_commit)
    elif args.round == "SEM-01":
        from .sem01 import run_sem01
        result = run_sem01(args.lab_commit)
    else:
        result = run_sem00(args.lab_commit)

    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    print(rendered)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())