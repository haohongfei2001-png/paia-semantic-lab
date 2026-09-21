from __future__ import annotations

import pathlib
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SCA03BoundedAmendmentDesignTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.design = yaml.safe_load(
            (
                ROOT
                / "configs"
                / "sca03_bounded_architecture_amendment_design_v0.1.yaml"
            ).read_text()
        )

    def test_design_has_no_execution_or_private_authority(self):
        self.assertEqual("DESIGN_ONLY_NOT_AUTHORIZED", self.design["status"])
        self.assertFalse(self.design["implementation_authorized"])
        self.assertFalse(self.design["private_run_authorized"])
        self.assertFalse(self.design["sca04_authorized"])

    def test_direct_evidence_invariants_are_explicit(self):
        inv = self.design["candidate_assembly_design"]["invariants"]
        self.assertTrue(inv["direct_rank_1_to_6_must_remain_within_candidate_top10"])
        self.assertTrue(inv["direct_rank_1_to_10_must_remain_within_candidate_top20"])
        self.assertEqual(144, inv["full_catalog_candidate_count"])
        self.assertFalse(self.design["candidate_assembly_design"]["sibling_cap_counts_seed"])

    def test_missing_evidence_is_neutral_by_contract(self):
        inv = self.design["missing_evidence_neutral_design"]["invariants"]
        self.assertTrue(inv["zero_prototype_topic_absent_from_prototype_ranking"])
        self.assertTrue(inv["zero_prototype_topic_receives_no_prototype_rrf_term"])
        self.assertTrue(inv["all_no_prototype_fused_ranking_equals_profile_ranking"])
        self.assertTrue(
            inv["zero_prototype_relative_order_independent_of_topic_id_when_profile_order_fixed"]
        )

    def test_future_private_gate_is_unchanged_and_not_authorized(self):
        gate = self.design["future_private_gate"]
        self.assertFalse(gate["automatically_authorized"])
        self.assertTrue(gate["requires_separate_owner_authorization"])
        self.assertEqual(0.96, gate["candidate_recall_at_10_min"])
        self.assertEqual(0.99, gate["candidate_recall_at_20_min"])
        self.assertEqual(0, gate["family_leakage_events_max"])
        self.assertTrue(gate["evaluation_remains_closed_until_new_calibration_pass"])


if __name__ == "__main__":
    unittest.main()
