from __future__ import annotations

import os
import unittest

from scripts.sca03_public_synthetic_diagnostics import run_diagnostics


@unittest.skipUnless(
    os.environ.get("SCA03_PUBLIC_DIAG_NUMPY") == "1",
    "Runs only in the isolated public diagnostic step with pinned NumPy.",
)
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
        self.assertEqual(3, retained["current_k8"])
        self.assertEqual(6, retained["sibling_cap4"])
        self.assertEqual(8, retained["sibling_cap2"])

    def test_current_k8_consumes_eight_top10_slots_for_seed_domain(self):
        self.assertEqual(8, self.diag["candidate_budget"]["current_top10_first_domain_count"])

    def test_real_centroid_function_covers_partial_and_all_no_prototype(self):
        row = self.diag["sparse_prototype"]
        self.assertTrue(row["confirmed"])
        self.assertEqual("2.5.3", row["numpy_version"])
        self.assertEqual(144, row["topic_count"])
        self.assertEqual(4, row["seen_topic_count"])
        self.assertEqual(140, row["zero_prototype_count"])
        self.assertEqual([0, 2], row["all_no_prototype"]["input_shape"])
        self.assertTrue(
            row["partial_prototype"]["zero_prototype_tail_is_topic_id_sorted"]
        )
        self.assertTrue(
            row["all_no_prototype"]["centroid_ranking_equals_topic_id_order"]
        )

    def test_real_weighted_rrf_reproduces_zero_prototype_displacement(self):
        row = self.diag["sparse_prototype"]
        self.assertTrue(row["profile_only_control"]["ranking_equals_profile_ranking"])
        self.assertEqual(1, row["profile_only_control"]["target_rank"])
        self.assertEqual(
            10,
            row["all_no_prototype"]["target_fused_rank_weight_1_5"],
        )
        self.assertEqual(
            32,
            row["all_no_prototype"]["target_fused_rank_weight_3_0"],
        )
        self.assertGreater(
            row["partial_prototype"]["target_fused_rank_weight_1_5"],
            row["profile_only_control"]["target_rank"],
        )

    def test_nonempty_context_changes_text_embedding_and_ranking(self):
        row = self.diag["allowed_context_path"]
        self.assertTrue(row["confirmed"])
        self.assertEqual(
            "semantic_lab.rem01.query_representation",
            row["query_entry_point"],
        )
        self.assertTrue(row["current_text_changed_by_allowed_context"])
        self.assertLess(row["query_embedding_cosine"], 0.999999)
        self.assertTrue(row["ranking_changed"])
        self.assertLess(row["interview_rank_allowed_context"], row["interview_rank_current_only"])

    def test_context_diagnostic_does_not_claim_private_causality(self):
        self.assertFalse(self.diag["allowed_context_path"]["private_causality_inference_permitted"])


if __name__ == "__main__":
    unittest.main()
