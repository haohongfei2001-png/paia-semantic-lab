import unittest

from semantic_lab.embedding_adapters import AdapterUnavailable, ApiEmbeddingAdapter, CandidateSpec
from semantic_lab.sem01 import load_sem01_config
from semantic_lab.sem07 import (
    candidate_metrics,
    capability_verdicts,
    load_sem07_config,
    retrieval_metrics,
    router_metrics,
    run_sem07,
)


class Sem07MetricTests(unittest.TestCase):
    def test_retrieval_metrics_keep_negative_pairs_separate(self):
        result = retrieval_metrics([
            {"relevant": True, "rank": 1},
            {"relevant": True, "rank": 20},
            {"relevant": False, "rank": 3},
        ])
        self.assertEqual(2, result["positive_pairs"])
        self.assertEqual(1, result["negative_pairs"])
        self.assertEqual(1.0, result["recall_at_20"])
        self.assertEqual(1.0, result["judged_negative_top10_fpr"])

    def test_candidate_recall_is_multilabel(self):
        result = candidate_metrics([
            {
                "truth_state": "ASSIGNED",
                "truth_topics": ["a", "b"],
                "candidate_ids": ["a", "x", "b"],
            }
        ])
        self.assertEqual(1.0, result["topic_recall_at_5"])
        self.assertEqual(1.0, result["complete_case_recall_at_5"])

    def test_router_missing_classes_is_not_fabricated(self):
        rows = [{
            "truth_state": "ASSIGNED",
            "truth_topics": ["a"],
            "pred_state": "ASSIGNED",
            "pred_topics": ["a"],
            "candidate_ids": ["a"],
        }]
        result = router_metrics(rows)
        self.assertEqual(1.0, result["macro_f1"])
        self.assertIsNone(result["unassigned_precision"])
        self.assertIsNone(result["defer_recall"])

    def test_zero_predictions_count_as_zero_f1(self):
        result = router_metrics([{
            "truth_state": "ASSIGNED",
            "truth_topics": ["a"],
            "pred_state": "DEFER",
            "pred_topics": [],
            "candidate_ids": ["a"],
        }])
        self.assertEqual(0.0, result["micro_f1"])
        self.assertEqual(0.0, result["macro_f1"])
        self.assertIsNone(result["accepted_precision"])

    def test_gate_does_not_hide_failed_measured_metric(self):
        config = load_sem07_config()
        verdicts = capability_verdicts(
            {"ndcg_at_10": 1.0, "recall_at_20": 1.0},
            {"topic_recall_at_10": 1.0, "topic_recall_at_20": 1.0},
            {
                "macro_f1": 0.1,
                "accepted_precision": 0.1,
                "accepted_coverage": 1.0,
                "unassigned_precision": None,
                "defer_recall": None,
                "wrong_certain_rate": 0.9,
            },
            config,
        )
        self.assertEqual("FAIL", verdicts["router"]["verdict"])
        self.assertEqual("INCONCLUSIVE", verdicts["full_catalog_candidates"]["verdict"])

    def test_provider_failure_without_authorized_transport_is_explicit(self):
        raw = next(
            row for row in load_sem01_config()["candidates"]
            if row["id"] == "voyage-4"
        )
        adapter = ApiEmbeddingAdapter(CandidateSpec.from_dict(raw), transport=None)
        with self.assertRaises(AdapterUnavailable):
            adapter.embed(
                ["synthetic"], role="query",
                evidence_class="synthetic", contains_real_paia_input=False,
            )

    def test_public_sem07_engineering_contract_passes(self):
        result = run_sem07("test-commit")
        self.assertTrue(result["pass"])
        self.assertEqual("PASS", result["gates"]["G0_isolation"])
        self.assertEqual("PASS", result["gates"]["G8_final_engineering_contract"])
        self.assertEqual(
            "LOCAL_PRIVATE_EXECUTION_REQUIRED",
            result["gates"]["personal_lockbox"],
        )


if __name__ == "__main__":
    unittest.main()
