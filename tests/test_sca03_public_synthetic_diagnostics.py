from __future__ import annotations

import unittest

from scripts.sca03_public_synthetic_diagnostics import run_diagnostics


class SCA03PublicSyntheticDiagnosticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = run_diagnostics()
        cls.diag = cls.result["diagnostics"]

    def test_is_public_synthetic_only(self):
        self.assertEqual("PUBLIC_SYNTHETIC_ONLY", self.result["evidence_class"])
        self.assertEqual(0, self.result["private_artifact_reads"])
        self.assertEqual(0, self.result["evaluation_reads"])
        self.assertEqual(0, self.result["lockbox_reads"])
        self.assertFalse(self.result["production_algorithm_modified"])

    def test_candidate_budget_counterexample_is_confirmed(self):
        row = self.diag["candidate_budget"]
        self.assertTrue(row["confirmed"])
        self.assertGreater(row["direct_rank4_position_after_current_k8"], 10)
        retained = row["direct_top10_retained_at_10"]
        self.assertEqual(10, retained["direct_only"])
        self.assertLess(retained["current_k8"], retained["sibling_cap4"])
        self.assertLess(retained["sibling_cap4"], retained["sibling_cap2"])

    def test_current_k8_consumes_eight_top10_slots_for_seed_domain(self):
        self.assertEqual(8, self.diag["candidate_budget"]["current_top10_first_domain_count"])

    def test_zero_prototype_rank_displacement_is_confirmed(self):
        row = self.diag["sparse_prototype"]
        self.assertTrue(row["confirmed"])
        self.assertEqual(1, row["target_profile_rank"])
        self.assertGreater(row["target_fused_rank_weight_3_0"], 1)

    def test_zero_prototype_ties_use_topic_id_order_control(self):
        row = self.diag["sparse_prototype"]
        self.assertEqual(row["zero_prototype_lexical_order"], row["zero_prototype_centroid_order"])
        self.assertEqual(row["all_no_prototype_expected_tie_order"], row["all_no_prototype_ranking"])

    def test_nonempty_context_changes_text_embedding_and_ranking(self):
        row = self.diag["allowed_context_path"]
        self.assertTrue(row["confirmed"])
        self.assertTrue(row["current_text_changed_by_allowed_context"])
        self.assertLess(row["query_embedding_cosine"], 0.999999)
        self.assertTrue(row["ranking_changed"])
        self.assertLess(row["interview_rank_allowed_context"], row["interview_rank_current_only"])

    def test_context_diagnostic_does_not_claim_private_causality(self):
        self.assertFalse(self.diag["allowed_context_path"]["private_causality_inference_permitted"])


if __name__ == "__main__":
    unittest.main()
