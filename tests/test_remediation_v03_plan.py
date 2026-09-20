import pathlib
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]


class RemediationV03PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = yaml.safe_load(
            (ROOT / "configs" / "semantic_remediation_v0.3.yaml").read_text()
        )
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_REMEDIATION_STATUS.yaml").read_text()
        )

    def test_package_state_machine_has_single_current_round(self):
        self.assertEqual("FROZEN", self.status["plan_status"])
        ready = [
            round_id for round_id, row in self.status["rounds"].items()
            if row["execution_status"] == "READY"
        ]
        running = [
            round_id for round_id, row in self.status["rounds"].items()
            if row["execution_status"] == "IN_PROGRESS"
        ]
        self.assertLessEqual(len(ready), 1)
        self.assertLessEqual(len(running), 1)
        self.assertLessEqual(len(ready) + len(running), 1)
        if running:
            self.assertTrue(
                self.status["rounds"][running[0]]["explicit_execution_authorized"]
            )
        if ready:
            self.assertFalse(
                self.status["rounds"][ready[0]].get("explicit_execution_authorized", False)
            )

    def test_consumed_lockbox_cannot_be_reused_for_tuning(self):
        self.assertEqual(
            "LEGACY_DIAGNOSTIC_ONLY",
            self.status["consumed_sem07_lockbox_role"],
        )
        self.assertEqual(
            "DENY",
            self.config["guards"]["consumed_sem07_lockbox_for_tuning"],
        )

    def test_final_quality_gates_are_not_lowered(self):
        gates = self.config["final_gates"]
        self.assertGreaterEqual(gates["input_retrieval"]["ndcg_at_10_min"], 0.75)
        self.assertGreaterEqual(gates["input_retrieval"]["recall_at_20_min"], 0.90)
        self.assertGreaterEqual(gates["candidates"]["recall_at_10_min"], 0.96)
        self.assertGreaterEqual(gates["candidates"]["recall_at_20_min"], 0.99)
        self.assertGreaterEqual(gates["router"]["macro_f1_min"], 0.80)
        self.assertGreaterEqual(gates["router"]["accepted_precision_min"], 0.95)
        self.assertGreaterEqual(gates["router"]["accepted_coverage_min"], 0.60)
        self.assertLessEqual(gates["router"]["wrong_certain_rate_max"], 0.05)

    def test_owner_attention_and_training_guards(self):
        self.assertEqual("REM-04", self.config["owner_attention"]["new_labels_forbidden_through"])
        self.assertEqual("REM-05", self.config["owner_attention"]["planned_label_round"])
        self.assertEqual(0, self.config["owner_attention"]["final_round_new_labels"])
        self.assertEqual("DENY", self.config["guards"]["model_training"])
        self.assertEqual("DENY", self.config["guards"]["production_paia_write"])
        self.assertEqual("DENY", self.config["guards"]["real_input_api_egress"])

    def test_new_lockbox_is_independent_and_not_yet_created(self):
        box = self.config["data_roles"]["future_rem06_lockbox"]
        self.assertEqual("NOT_CREATED", box["state"])
        self.assertTrue(box["family_disjoint_from_all_v02_gold"])
        self.assertTrue(box["fixed_before_labels"])
        self.assertFalse(box["label_adaptive_topup"])
        self.assertTrue(box["model_identity_blinded"])
        self.assertEqual(96, box["target_cases"])

    def test_rem03a_amendment_preserves_failed_rem03_and_blocks_router(self):
        self.assertEqual("REM-03A_CALIBRATION_PROTOTYPE", self.status["plan_amendment"])
        self.assertEqual("FROZEN_PLAN_ONLY", self.status["plan_amendment_status"])
        self.assertEqual("REM_03A_READY", self.status["phase"])
        rem03 = self.status["rounds"]["REM-03"]
        self.assertEqual("COMPLETE", rem03["execution_status"])
        self.assertEqual("FAIL", rem03["capability_verdict"])
        rem03a = self.status["rounds"]["REM-03A"]
        self.assertEqual("READY", rem03a["execution_status"])
        self.assertEqual("UNTESTED", rem03a["capability_verdict"])
        self.assertFalse(rem03a["explicit_execution_authorized"])
        self.assertEqual("requires_fresh_explicit_round_authorization", rem03a["existing_private_artifacts_read"])
        rem04 = self.status["rounds"]["REM-04"]
        self.assertEqual("BLOCKED", rem04["execution_status"])
        self.assertEqual("REM-03A", rem04["depends_on"])
        self.assertEqual("REM_03A_CANDIDATE_PROMOTION_PASS", rem04["prerequisite"])

    def test_rem03a_amendment_keeps_candidate_gates_and_bounded_surface(self):
        rem03a = self.status["rounds"]["REM-03A"]
        self.assertGreaterEqual(rem03a["candidate_recall_at_10_min"], 0.96)
        self.assertGreaterEqual(rem03a["candidate_recall_at_20_min"], 0.99)
        self.assertEqual(
            {"exemplar_max", "centroid", "hybrid"},
            set(rem03a["allowed_prototype_strategies"]),
        )
        self.assertTrue(rem03a["family_grouped_leakage_required_zero"])
        self.assertEqual("BOUNDED_AFTER_CALIBRATION_PASS", rem03a["legacy_evaluation_policy"])
        self.assertEqual("FORBIDDEN_FOR_TUNING_OR_PROMOTION", rem03a["consumed_sem07_lockbox_use"])
        self.assertEqual(0, rem03a["new_owner_labels"])


if __name__ == "__main__":
    unittest.main()
