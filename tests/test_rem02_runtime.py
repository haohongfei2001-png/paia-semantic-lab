from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from semantic_lab.rem02 import run_rem02
from semantic_lab.rem02_runtime import (
    _dominates,
    aggregate_runtime,
    load_rem02_config,
)


class Rem02RuntimeTests(unittest.TestCase):
    def test_config_keeps_private_promotion_blocked_without_authorization(self):
        config = load_rem02_config()
        self.assertFalse(config["authorization"]["private_sem06_sem07_artifacts"])
        self.assertEqual(
            "BLOCKED_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            config["private_promotion"]["state_without_authorization"],
        )
        self.assertEqual(
            "WITHHELD_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            config["claims"]["promotion_shortlist"],
        )

    def test_public_frontier_dominance_requires_quality_and_resource_no_worse(self):
        left = {
            "public_quality_vector": {
                "candidate_recall_at_20": 0.9,
                "boundary_no_alias_recall_at_20": 0.7,
                "context_allowed_recall_at_20": 0.95,
                "input_retrieval_ndcg_at_10": 0.8,
                "input_retrieval_recall_at_20": 1.0,
            },
            "performance": {"peak_rss_bytes": 100},
        }
        right = {
            "public_quality_vector": {
                "candidate_recall_at_20": 0.8,
                "boundary_no_alias_recall_at_20": 0.6,
                "context_allowed_recall_at_20": 0.9,
                "input_retrieval_ndcg_at_10": 0.7,
                "input_retrieval_recall_at_20": 1.0,
            },
            "performance": {"peak_rss_bytes": 120},
        }
        self.assertTrue(_dominates(left, right))
        self.assertFalse(_dominates(right, left))

    def test_aggregate_never_converts_public_frontier_into_promotion_shortlist(self):
        config = load_rem02_config()
        candidate = config["runtime_candidates"][0]
        fake = {
            "candidate_id": candidate["id"],
            "revision": candidate["revision"],
            "runtime_status": "PASS",
            "runtime_qualified": True,
            "reproducibility": {"encoding_replay_exact": True},
            "public_quality_vector": {
                "candidate_recall_at_20": 1.0,
                "boundary_no_alias_recall_at_20": 0.5,
                "context_allowed_recall_at_20": 1.0,
                "input_retrieval_ndcg_at_10": 1.0,
                "input_retrieval_recall_at_20": 1.0,
            },
            "performance": {"peak_rss_bytes": 100},
            "descriptor_bakeoff": {},
            "context_bakeoff": {},
            "fusion_bakeoff": {},
            "input_retrieval": {},
        }
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "candidate.json").write_text(
                json.dumps(fake), encoding="utf-8"
            )
            result = aggregate_runtime(Path(directory), "TEST")
        self.assertEqual(
            "WITHHELD_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            result["private_promotion"]["promotion_shortlist"],
        )
        self.assertEqual(
            "BLOCKED_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            result["gates"]["private_promotion_evidence"],
        )
        self.assertEqual("BLOCKED", result["gates"]["rem02_round_completion"])
        self.assertEqual(0, result["authorization"]["private_artifact_reads"])
        self.assertEqual(0, result["authorization"]["real_input_api_egress_events"])

    def test_committed_public_runtime_evidence_passes_without_unblocking_round(self):
        result = run_rem02("TEST")
        self.assertTrue(result["pass"])
        self.assertEqual("PASS", result["gates"]["REM02_public_runtime_evidence"])
        self.assertEqual(
            "BLOCKED_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            result["gates"]["private_promotion_evidence"],
        )
        self.assertEqual("BLOCKED", result["gates"]["round_completion"])
        self.assertEqual(
            "WITHHELD_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            result["promotion_shortlist"],
        )


if __name__ == "__main__":
    unittest.main()
