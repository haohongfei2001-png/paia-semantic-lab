from __future__ import annotations

import hashlib
import platform
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .contracts import repo_root, validate_contract


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_run_manifest(
    *,
    lab_commit: str,
    catalog_version: str,
    started_at: str | None = None,
    completed_at: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    manifest = {
        "run_id": f"sem00-{lab_commit[:12]}",
        "lab_commit": lab_commit,
        "round": "SEM-00",
        "benchmark_version": "sem00-b0-skeleton-0.1",
        "catalog_version": catalog_version,
        "input_snapshot_fingerprint": None,
        "model_fingerprints": [],
        "config_fingerprint": _sha256_file(repo_root() / "configs" / "semantic_lab_v0.2.yaml"),
        "authorization_scope": {
            "production_paia_write": False,
            "real_archive_read": False,
            "real_input_api_egress": False,
            "model_training": False,
            "owner_semantic_labeling": False,
            "evidence_classes": ["public", "synthetic", "catalog_boundary"],
        },
        "egress_ledger_ref": None,
        "hardware": {
            "platform": platform.platform(),
            "python": platform.python_version(),
        },
        "metrics_ref": None,
        "started_at": started_at or now,
        "completed_at": completed_at or now,
    }
    validate_contract(manifest, "RunManifest")
    return manifest
