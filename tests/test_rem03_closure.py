from __future__ import annotations

import unittest

from semantic_lab.rem03_closure import run_rem03_closure


class Rem03ClosureTests(unittest.TestCase):
    def test_calibration_failure_closes_round_without_opening_evaluation(self):
        result = run_rem03_closure("TEST")
        self.assertTrue(result["pass"])
        self.assertEqual("COMPLETE", result["execution_status"])
        self.assertEqual("FAIL", result["capability_verdict"])
        self.assertEqual("FAIL", result["gates"]["private_candidate_recall_at_10"])
        self.assertEqual("FAIL", result["gates"]["private_candidate_recall_at_20"])
        self.assertEqual("FAIL", result["gates"]["critical_slices"])
        self.assertEqual(
            "PASS",
            result["gates"]["evaluation_nonconsumption_on_calibration_failure"],
        )
        self.assertEqual("PASS", result["gates"]["consumed_lockbox_exclusion"])
        self.assertEqual("DENY", result["gates"]["rem04_unlock"])
        self.assertEqual(0, result["evaluation"]["reads_consumed"])
        self.assertFalse(result["evaluation"]["opened"])
        self.assertEqual(0, result["guards"]["consumed_lockbox_label_records"])

    def test_frozen_candidate_gate_remains_original(self):
        result = run_rem03_closure("TEST")
        self.assertGreaterEqual(result["candidate_metrics"]["required_recall_at_10"], 0.96)
        self.assertGreaterEqual(result["candidate_metrics"]["required_recall_at_20"], 0.99)
        self.assertTrue(result["guards"]["gate_not_lowered"])
        self.assertTrue(result["guards"]["source_hash_match"])


if __name__ == "__main__":
    unittest.main()
