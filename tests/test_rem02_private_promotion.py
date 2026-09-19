from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.rem02_private_promotion import (
    candidate_metrics,
    dominates,
    fold_id,
    load_labels_allowlisted,
)


class Rem02PrivatePromotionTests(unittest.TestCase):
    def test_label_loader_parses_only_allowlisted_records(self):
        rows = [
            {
                "calibration_id": "cal-a",
                "user_final_decision": {"route_state": "ASSIGNED", "topic_ids": ["t.a"]},
            },
            {
                "calibration_id": "eval-b",
                "user_final_decision": {"route_state": "ASSIGNED", "topic_ids": ["t.secret"]},
            },
            {
                "calibration_id": "lock-c",
                "user_final_decision": {"route_state": "DEFER", "topic_ids": []},
            },
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "records.jsonl"
            path.write_text(
                "".join(json.dumps(row) + "\n" for row in rows),
                encoding="utf-8",
            )
            loaded = load_labels_allowlisted(path, {"cal-a"})
        self.assertEqual({"cal-a"}, set(loaded))
        self.assertEqual(["t.a"], loaded["cal-a"]["user_final_decision"]["topic_ids"])

    def test_family_fold_is_stable(self):
        first = fold_id("family-x", 6)
        second = fold_id("family-x", 6)
        self.assertEqual(first, second)
        self.assertGreaterEqual(first, 0)
        self.assertLess(first, 6)

    def test_candidate_metrics_are_multilabel_complete_case(self):
        cases = [
            {
                "truth_state": "ASSIGNED",
                "truth_topics": ["a", "b"],
                "context_dependent": True,
            },
            {
                "truth_state": "DEFER",
                "truth_topics": [],
                "context_dependent": False,
            },
        ]
        metrics = candidate_metrics(cases, [["a", "x", "b"], ["a"]], 2)
        self.assertEqual(1, metrics["assigned_cases"])
        self.assertEqual(0.5, metrics["topic_recall"])
        self.assertEqual(0.0, metrics["complete_case_recall"])
        self.assertEqual(0.0, metrics["context_complete_case_recall"])

    def test_pareto_dominance_respects_quality_and_memory(self):
        def row(complete, topic, context, rss):
            return {
                "config_id": f"{complete}-{topic}-{context}-{rss}",
                "family_grouped": {
                    "macro": {
                        "complete_case_recall_at_20": complete,
                        "topic_recall_at_20": topic,
                        "complete_case_recall_at_10": complete,
                        "context_complete_case_recall_at_20": context,
                    }
                },
                "public_peak_rss_bytes": rss,
            }

        better = row(0.8, 0.9, 0.7, 100)
        worse = row(0.7, 0.8, 0.6, 120)
        tradeoff = row(0.9, 0.9, 0.7, 150)
        self.assertTrue(dominates(better, worse))
        self.assertFalse(dominates(worse, better))
        self.assertFalse(dominates(better, tradeoff))
        self.assertFalse(dominates(tradeoff, better))


if __name__ == "__main__":
    unittest.main()
