import json
import pathlib
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Rem03AClosureTests(unittest.TestCase):
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
                / "rem03a-private-calibration-summary.json"
            ).read_text()
        )

    def test_calibration_failure_closes_without_evaluation(self):
        rem03a = self.status["rounds"]["REM-03A"]
        self.assertEqual("COMPLETE", rem03a["execution_status"])
        self.assertEqual("FAIL", rem03a["capability_verdict"])
        self.assertEqual("CALIBRATION_FAIL", self.summary["stage"])
        self.assertFalse(self.summary["evaluation_open_permitted"])
        self.assertFalse(rem03a["evaluation_opened"])
        self.assertEqual(0, rem03a["evaluation_records_read"])

    def test_gates_remain_original_and_unmet(self):
        rem03a = self.status["rounds"]["REM-03A"]
        self.assertEqual(0.96, rem03a["candidate_recall_at_10_min"])
        self.assertEqual(0.99, rem03a["candidate_recall_at_20_min"])
        self.assertLess(rem03a["best_candidate_recall_at_10"], 0.96)
        self.assertLess(rem03a["best_candidate_recall_at_20"], 0.99)
        self.assertEqual(0, rem03a["calibration_passing_configs"])

    def test_router_stays_blocked_and_guards_clean(self):
        self.assertEqual("BLOCKED", self.status["rounds"]["REM-04"]["execution_status"])
        self.assertIn(
            self.status["rounds"]["REM-04"]["blocked_by"],
            {"REM_03A_CANDIDATE_PROMOTION_FAIL", "REM_03B_NOT_COMPLETE", "REM_03B_AMENDMENT_CI_PENDING", "REM_03B_CANDIDATE_PROMOTION_FAIL"},
        )
        self.assertEqual(0, self.summary["guards"]["held_out_family_leakage_events"])
        self.assertEqual(0, self.summary["guards"]["consumed_lockbox_tuning_events"])
        self.assertEqual(0, self.summary["guards"]["model_training_runs"])
        self.assertEqual(0, self.summary["guards"]["production_paia_writes"])


if __name__ == "__main__":
    unittest.main()