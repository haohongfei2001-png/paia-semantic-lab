from __future__ import annotations

import pathlib
import unittest

import yaml


ROOT = pathlib.Path(__file__).resolve().parents[1]


class BAA01PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = yaml.safe_load(
            (ROOT / "configs" / "sca03_bounded_architecture_amendment_v0.1.yaml").read_text()
        )
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SCA03_BOUNDED_ARCHITECTURE_AMENDMENT_STATUS.yaml").read_text()
        )
        cls.sca = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml").read_text()
        )

    def test_package_registration_is_public_only(self):
        self.assertEqual(
            "SCA03-BOUNDED-ARCHITECTURE-AMENDMENT-v0.1",
            self.config["package_id"],
        )
        self.assertTrue(self.config["authorization"]["baa01_implementation_authorized"])
        self.assertFalse(self.config["authorization"]["private_run_authorized"])
        self.assertFalse(self.config["authorization"]["sca04_authorized"])

    def test_scope_is_exactly_two_confirmed_mechanisms(self):
        scope = self.config["scope"]
        self.assertTrue(scope["direct_evidence_preservation"])
        self.assertTrue(scope["missing_evidence_neutral_fusion"])
        self.assertFalse(scope["allowed_context_changes"])
        self.assertFalse(scope["embedding_model_changes"])
        self.assertFalse(scope["profile_changes"])
        self.assertFalse(scope["graph_content_changes"])
        self.assertFalse(scope["formal_catalog_changes"])
        self.assertFalse(scope["multivector_changes"])

    def test_candidate_invariants_match_frozen_design(self):
        policies = self.config["candidate_policies"]
        self.assertEqual(
            {
                "direct_reserve6_sibling_cap2",
                "direct_reserve6_sibling_cap4",
            },
            set(policies["allowed_variants"]),
        )
        self.assertTrue(policies["direct_top6_in_top10_required"])
        self.assertTrue(policies["direct_top10_in_top20_required"])
        self.assertFalse(policies["sibling_cap_counts_seed"])
        self.assertEqual(144, policies["full_catalog_candidate_count"])

    def test_missing_evidence_is_declared_neutral(self):
        fusion = self.config["prototype_fusion"]
        self.assertEqual("NEUTRAL_ABSENT", fusion["missing_evidence_semantics"])
        self.assertFalse(fusion["zero_prototype_in_prototype_stream"])
        self.assertFalse(fusion["zero_prototype_receives_rrf_term"])
        self.assertTrue(fusion["all_no_prototype_fused_equals_profile"])
        self.assertFalse(fusion["zero_prototype_id_order_may_affect_relative_order"])

    def test_closed_sca03_and_sca04_remain_immutable(self):
        self.assertEqual("SCA_03_COMPLETE_FAIL", self.sca["phase"])
        self.assertEqual("COMPLETE", self.sca["rounds"]["SCA-03"]["execution_status"])
        self.assertEqual("FAIL", self.sca["rounds"]["SCA-03"]["capability_verdict"])
        self.assertEqual(80, self.sca["rounds"]["SCA-03"]["calibration_records_read"])
        self.assertEqual(0, self.sca["rounds"]["SCA-03"]["evaluation_records_read"])
        self.assertEqual("BLOCKED", self.sca["rounds"]["SCA-04"]["execution_status"])

    def test_baa01_lifecycle_and_future_private_guard(self):
        baa01 = self.status["rounds"]["BAA-01"]
        self.assertIn(baa01["execution_status"], {"IN_PROGRESS", "COMPLETE"})
        if baa01["execution_status"] == "IN_PROGRESS":
            self.assertEqual("BAA_01_IN_PROGRESS", self.status["phase"])
            self.assertEqual("PENDING", baa01["public_gate"])
        else:
            self.assertEqual("BAA_01_COMPLETE_PASS", self.status["phase"])
            self.assertEqual("PASS", baa01["capability_verdict"])
            self.assertEqual("PASS", baa01["public_gate"])
        baa02 = self.status["rounds"]["BAA-02"]
        self.assertEqual("NOT_STARTED", baa02["execution_status"])
        self.assertFalse(baa02["explicit_execution_authorized"])
        self.assertTrue(baa02["fresh_private_authorization_required"])


if __name__ == "__main__":
    unittest.main()
