from __future__ import annotations

import json
import pathlib
import unittest

import yaml


ROOT = pathlib.Path(__file__).resolve().parents[1]


class LSR01ClosedResultTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = json.loads(
            (
                ROOT
                / "artifacts"
                / "lightweight-semantic-router-v1"
                / "LSR-01_PUBLIC_RESULT.json"
            ).read_text(encoding="utf-8")
        )
        cls.status = yaml.safe_load(
            (
                ROOT
                / "status"
                / "LIGHTWEIGHT_SEMANTIC_ROUTER_STATUS.yaml"
            ).read_text(encoding="utf-8")
        )

    def test_public_failure_is_preserved_not_hidden(self):
        self.assertEqual("PUBLIC_BASELINE_FAIL", self.result["stage"])
        self.assertEqual("FAIL", self.result["capability_verdict"])
        self.assertFalse(
            self.result["candidates"]["B"]["test"]["assigned_precision"]
            >= self.result["frozen_credibility_floor"]["assigned_precision_min"]
        )
        self.assertFalse(
            self.result["candidates"]["B"]["test"]["coverage"]
            >= self.result["frozen_credibility_floor"]["coverage_min"]
        )
        self.assertFalse(
            self.result["candidates"]["B"]["test"]["topic_macro_recall"]
            >= self.result["frozen_credibility_floor"]["topic_macro_recall_min"]
        )
        self.assertGreater(
            self.result["candidates"]["B"]["test"][
                "insufficient_evidence_false_assignment_rate"
            ],
            self.result["frozen_credibility_floor"][
                "insufficient_false_assignment_max"
            ],
        )

    def test_source_separated_test_is_consumed_and_not_retunable(self):
        self.assertTrue(self.result["public_test_consumed"])
        policy = self.result["post_test_policy"]
        self.assertEqual("DENY", policy["candidate_reselection"])
        self.assertEqual("DENY", policy["tune_on_consumed_test"])
        self.assertEqual("DENY", policy["automatic_lsr02"])
        self.assertEqual("LSR_01_COMPLETE_FAIL", self.status["phase"])
        self.assertEqual(
            "FAIL", self.status["rounds"]["LSR-01"]["capability_verdict"]
        )
        self.assertTrue(self.status["rounds"]["LSR-01"]["public_test_consumed"])
        self.assertEqual(
            "BLOCKED", self.status["rounds"]["LSR-02"]["execution_status"]
        )

    def test_lightweight_resource_evidence_is_preserved(self):
        resources = self.result["resources"]
        self.assertLessEqual(resources["generated_index_bytes"], 1024 * 1024)
        self.assertLessEqual(resources["router_plus_index_bytes"], 2 * 1024 * 1024)
        self.assertLessEqual(resources["incremental_heap_bytes"], 32 * 1024 * 1024)
        self.assertLessEqual(resources["cold_init_ms"], 100)
        self.assertGreater(resources["warm_p95_ms"], 20)

    def test_same_source_suite_is_diagnostic_only(self):
        legacy = self.result["legacy_contrastive"]
        self.assertFalse(legacy["selection_authority"])
        self.assertEqual("REGRESSION_INTEGRITY_ONLY", legacy["role"])
        self.assertEqual(1.0, legacy["hit_at_10"])
        self.assertEqual(1.0, legacy["hit_at_20"])

    def test_private_boundaries_remain_zero(self):
        guards = self.result["guards"]
        self.assertEqual(0, guards["neural_model_assets_bytes"])
        self.assertEqual(0, guards["semantic_network_calls"])
        self.assertEqual(0, guards["private_calibration_reads"])
        self.assertEqual(0, guards["evaluation_reads"])
        self.assertEqual(0, guards["consumed_lockbox_reads"])
        self.assertEqual(0, guards["production_paia_writes"])


if __name__ == "__main__":
    unittest.main()
