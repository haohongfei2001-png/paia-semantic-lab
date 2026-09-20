import json
import pathlib
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Rem03BClosureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_REMEDIATION_STATUS.yaml").read_text()
        )
        cls.summary = json.loads(
            (
                ROOT
                / "artifacts"
                / "remediation-v0.3"
                / "rem03b-private-calibration-summary.json"
            ).read_text()
        )

    def test_calibration_failure_closes_without_evaluation(self):
        rem03b = self.status["rounds"]["REM-03B"]
        self.assertEqual("COMPLETE", rem03b["execution_status"])
        self.assertEqual("FAIL", rem03b["capability_verdict"])
        self.assertEqual("CALIBRATION_FAIL", self.summary["stage"])
        self.assertFalse(self.summary["evaluation_open_permitted"])
        self.assertFalse(rem03b["evaluation_opened"])
        self.assertEqual(0, rem03b["evaluation_records_read"])

    def test_original_candidate_gates_remain_unmet(self):
        rem03b = self.status["rounds"]["REM-03B"]
        self.assertEqual(0.96, rem03b["candidate_recall_at_10_min"])
        self.assertEqual(0.99, rem03b["candidate_recall_at_20_min"])
        self.assertLess(rem03b["best_candidate_recall_at_10"], 0.96)
        self.assertLess(rem03b["best_candidate_recall_at_20"], 0.99)
        self.assertEqual(0, rem03b["calibration_passing_configs"])

    def test_domain_recovery_is_recorded_and_escalates_catalog_review(self):
        rem03b = self.status["rounds"]["REM-03B"]
        self.assertLess(rem03b["best_domain_recall_at_1"], 0.96)
        self.assertLess(rem03b["best_domain_recall_at_2"], 0.99)
        self.assertTrue(rem03b["catalog_semantic_information_deficiency_review_required"])

    def test_router_stays_blocked_and_guards_clean(self):
        self.assertEqual("BLOCKED", self.status["rounds"]["REM-04"]["execution_status"])
        self.assertEqual(
            "REM_03B_CANDIDATE_PROMOTION_FAIL",
            self.status["rounds"]["REM-04"]["blocked_by"],
        )
        guards = self.summary["guards"]
        self.assertEqual(0, guards["held_out_family_leakage_events"])
        self.assertEqual(0, guards["structural_failure_events"])
        self.assertEqual(0, guards["consumed_lockbox_tuning_events"])
        self.assertEqual(0, guards["model_training_runs"])
        self.assertEqual(0, guards["production_paia_writes"])


if __name__ == "__main__":
    unittest.main()