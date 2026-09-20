from __future__ import annotations

import unittest

from scripts.rem03_private_promotion import _gate_metrics


class Rem03PrivatePromotionTests(unittest.TestCase):
    def test_candidate_gate_uses_topic_recall(self):
        gate = {"recall_at_10_min": 0.96, "recall_at_20_min": 0.99}
        metrics = {
            "overall": {
                "assigned_cases": 10,
                "topic_recall_at_10": 0.97,
                "topic_recall_at_20": 1.0,
            },
            "context_dependent": {
                "assigned_cases": 0,
                "topic_recall_at_10": None,
                "topic_recall_at_20": None,
            },
            "context_free": {
                "assigned_cases": 10,
                "topic_recall_at_10": 0.97,
                "topic_recall_at_20": 1.0,
            },
        }
        result = _gate_metrics(metrics, gate)
        self.assertTrue(result["pass"])

    def test_overall_failure_blocks_promotion(self):
        gate = {"recall_at_10_min": 0.96, "recall_at_20_min": 0.99}
        metrics = {
            "overall": {
                "assigned_cases": 10,
                "topic_recall_at_10": 0.95,
                "topic_recall_at_20": 1.0,
            },
            "context_dependent": {
                "assigned_cases": 0,
                "topic_recall_at_10": None,
                "topic_recall_at_20": None,
            },
            "context_free": {
                "assigned_cases": 10,
                "topic_recall_at_10": 0.95,
                "topic_recall_at_20": 1.0,
            },
        }
        result = _gate_metrics(metrics, gate)
        self.assertFalse(result["pass"])
        self.assertIn("overall_recall_at_10", result["failures"])

    def test_measurable_critical_slice_cannot_be_hidden(self):
        gate = {"recall_at_10_min": 0.96, "recall_at_20_min": 0.99}
        metrics = {
            "overall": {
                "assigned_cases": 20,
                "topic_recall_at_10": 1.0,
                "topic_recall_at_20": 1.0,
            },
            "context_dependent": {
                "assigned_cases": 2,
                "topic_recall_at_10": 0.5,
                "topic_recall_at_20": 0.5,
            },
            "context_free": {
                "assigned_cases": 18,
                "topic_recall_at_10": 1.0,
                "topic_recall_at_20": 1.0,
            },
        }
        result = _gate_metrics(metrics, gate)
        self.assertFalse(result["pass"])
        self.assertFalse(result["critical_slices_pass"])
        self.assertIn("context_dependent", result["slice_failures"])

    def test_empty_critical_slice_is_not_fabricated_failure(self):
        gate = {"recall_at_10_min": 0.96, "recall_at_20_min": 0.99}
        metrics = {
            "overall": {
                "assigned_cases": 10,
                "topic_recall_at_10": 1.0,
                "topic_recall_at_20": 1.0,
            },
            "context_dependent": {
                "assigned_cases": 0,
                "topic_recall_at_10": None,
                "topic_recall_at_20": None,
            },
            "context_free": {
                "assigned_cases": 10,
                "topic_recall_at_10": 1.0,
                "topic_recall_at_20": 1.0,
            },
        }
        result = _gate_metrics(metrics, gate)
        self.assertTrue(result["pass"])


if __name__ == "__main__":
    unittest.main()
