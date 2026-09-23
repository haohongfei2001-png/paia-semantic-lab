from __future__ import annotations

import pathlib
import unittest

import yaml

from semantic_lab.baa01 import assemble_direct_preserving_candidates
from semantic_lab.baa02 import candidate_failures, config_matrix, load_baa02_config
from semantic_lab.sca03 import load_profiles


ROOT = pathlib.Path(__file__).resolve().parents[1]


class BAA02PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_baa02_config(ROOT / "configs" / "baa02_private_calibration_v0.1.yaml")
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SCA03_BOUNDED_ARCHITECTURE_AMENDMENT_STATUS.yaml").read_text()
        )

    def test_matrix_is_pre_registered_and_exact(self):
        rows = config_matrix(self.config)
        self.assertEqual(24, len(rows))
        self.assertEqual({2, 4}, {row["sibling_cap"] for row in rows})
        self.assertEqual({1.5, 3.0}, {row["prototype_weight"] for row in rows})
        self.assertEqual(
            {"current_only", "allowed_context"},
            {row["query_variant"] for row in rows},
        )
        self.assertEqual(
            {"core", "core_anchors", "full_derived"},
            {row["profile_mode"] for row in rows},
        )
        self.assertEqual(24, len({row["config_id"] for row in rows}))

    def test_original_private_gates_are_not_lowered(self):
        gate = self.config["promotion_gate"]
        self.assertEqual(0.96, gate["candidate_recall_at_10_min"])
        self.assertEqual(0.99, gate["candidate_recall_at_20_min"])
        self.assertTrue(gate["critical_slice_same_thresholds"])
        self.assertEqual(0, gate["family_leakage_events_max"])

    def test_private_authority_is_calibration_only(self):
        auth = self.config["authorization"]
        self.assertTrue(auth["private_calibration_execution_authorized"])
        self.assertEqual(80, auth["calibration_read_only_count"])
        self.assertFalse(auth["evaluation_read_authorized"])
        self.assertEqual("DENY", auth["consumed_sem07_lockbox_tuning_or_promotion"])
        self.assertEqual("DENY", auth["production_paia_write"])
        self.assertFalse(self.config["evaluation"]["read_authorized"])

    def test_baa01_candidate_invariants_hold_for_both_caps(self):
        profiles = load_profiles(ROOT)
        direct = [str(row["topic_id"]) for row in profiles]
        self.assertEqual(144, len(direct))
        for cap in (2, 4):
            candidate, meta = assemble_direct_preserving_candidates(
                direct, profiles, sibling_cap=cap, limit=144
            )
            self.assertEqual(
                [],
                candidate_failures(
                    candidate, direct, profiles, meta, sibling_cap=cap
                ),
            )

    def test_status_preserves_bounded_baa02_lifecycle(self):
        phase = self.status["phase"]
        self.assertIn(
            phase,
            {
                "BAA_02_PRE_EVIDENCE_FREEZE",
                "BAA_02_FREEZE_CLOSURE_PENDING_CI",
                "BAA_02_COMPLETE_FAIL",
                "BAA_02_CALIBRATION_PASS",
            },
        )
        baa02 = self.status["rounds"]["BAA-02"]
        self.assertTrue(baa02["explicit_execution_authorized"])
        self.assertFalse(baa02["evaluation_authorized"])
        self.assertFalse(baa02["evaluation_opened"])
        self.assertEqual(0, baa02["evaluation_records_read"])

        if phase == "BAA_02_PRE_EVIDENCE_FREEZE":
            self.assertEqual("IN_PROGRESS", baa02["execution_status"])
            self.assertEqual(0, baa02["calibration_records_read"])
            self.assertEqual("PENDING", baa02["pre_evidence_freeze_required_ci"])
        elif phase == "BAA_02_FREEZE_CLOSURE_PENDING_CI":
            self.assertEqual("IN_PROGRESS", baa02["execution_status"])
            self.assertEqual(0, baa02["calibration_records_read"])
            self.assertEqual("PASS", baa02["pre_evidence_freeze_required_ci"])
            self.assertEqual("PENDING", baa02["freeze_closure_required_ci"])
        else:
            self.assertEqual("COMPLETE", baa02["execution_status"])
            self.assertEqual(80, baa02["calibration_records_read"])
            self.assertEqual("PASS", baa02["pre_evidence_freeze_required_ci"])


if __name__ == "__main__":
    unittest.main()
