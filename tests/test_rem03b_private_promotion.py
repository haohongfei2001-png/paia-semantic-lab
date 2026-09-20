from __future__ import annotations

import unittest

from scripts.rem03b_private_promotion import (
    _domain_recovery_metrics,
    _gate_result,
    _selection_key,
)
from semantic_lab.rem03b import load_rem03b_config


def _metrics(r10: float, r20: float):
    def row():
        return {
            "assigned_cases": 10,
            "topic_recall_at_5": min(r10, 0.9),
            "complete_case_recall_at_5": 0.5,
            "topic_recall_at_10": r10,
            "complete_case_recall_at_10": 0.8,
            "topic_recall_at_20": r20,
            "complete_case_recall_at_20": 0.9,
        }
    return {"overall": row(), "context_dependent": row(), "context_free": row()}


class Rem03BPrivatePromotionTests(unittest.TestCase):
    def test_original_gates_are_not_lowered(self):
        cfg = load_rem03b_config()
        self.assertEqual(0.96, cfg["promotion_gate"]["candidate_recall_at_10_min"])
        self.assertEqual(0.99, cfg["promotion_gate"]["candidate_recall_at_20_min"])

    def test_gate_requires_quality_leakage_and_structure(self):
        cfg = load_rem03b_config()
        passed = _gate_result(
            _metrics(0.97, 1.0),
            config=cfg,
            leakage_events=0,
            structural_failure_count=0,
        )
        self.assertTrue(passed["pass"])
        leaked = _gate_result(
            _metrics(0.97, 1.0),
            config=cfg,
            leakage_events=1,
            structural_failure_count=0,
        )
        self.assertFalse(leaked["pass"])
        structural = _gate_result(
            _metrics(0.97, 1.0),
            config=cfg,
            leakage_events=0,
            structural_failure_count=1,
        )
        self.assertFalse(structural["pass"])
        quality = _gate_result(
            _metrics(0.95, 0.98),
            config=cfg,
            leakage_events=0,
            structural_failure_count=0,
        )
        self.assertFalse(quality["pass"])

    def test_critical_slice_failure_cannot_be_hidden(self):
        cfg = load_rem03b_config()
        metrics = _metrics(0.97, 1.0)
        metrics["context_free"]["topic_recall_at_10"] = 0.90
        gate = _gate_result(
            metrics,
            config=cfg,
            leakage_events=0,
            structural_failure_count=0,
        )
        self.assertFalse(gate["pass"])
        self.assertIn("critical_slice:context_free", gate["failures"])

    def test_domain_recovery_metrics_are_multilabel(self):
        cases = [
            {"truth_state": "ASSIGNED", "truth_topics": ["a", "b"]},
            {"truth_state": "ASSIGNED", "truth_topics": ["c"]},
        ]
        mapping = {"a": "D1", "b": "D2", "c": "D1"}
        rankings = [["D1", "D2"], ["D2", "D1"]]
        metrics = _domain_recovery_metrics(cases, rankings, mapping)
        self.assertEqual(0.25, metrics["domain_recall_at_1"])
        self.assertEqual(1.0, metrics["domain_recall_at_2"])
        self.assertEqual(0.0, metrics["complete_case_domain_recall_at_1"])
        self.assertEqual(1.0, metrics["complete_case_domain_recall_at_2"])

    def test_selection_prioritizes_candidate_recall_before_domain_diagnostic(self):
        left = {
            "config": {"config_id": "a"},
            "metrics": {"overall": {"topic_recall_at_10": 0.90, "topic_recall_at_20": 0.99}},
            "domain_metrics": {"domain_recall_at_1": 1.0, "domain_recall_at_2": 1.0},
        }
        right = {
            "config": {"config_id": "b"},
            "metrics": {"overall": {"topic_recall_at_10": 0.91, "topic_recall_at_20": 0.95}},
            "domain_metrics": {"domain_recall_at_1": 0.5, "domain_recall_at_2": 0.5},
        }
        self.assertLess(_selection_key(right), _selection_key(left))


if __name__ == "__main__":
    unittest.main()