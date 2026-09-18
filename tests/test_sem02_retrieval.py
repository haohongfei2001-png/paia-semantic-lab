from __future__ import annotations

from copy import deepcopy
import unittest

from jsonschema import Draft202012Validator

from semantic_lab.evidence_browser import render_evidence_browser
from semantic_lab.sem02 import (
    build_sem02_fixture_pack,
    load_evidence_schema,
    run_sem02,
)


class Sem02RetrievalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result = run_sem02("2" * 40)

    def test_sem02_engineering_gate_passes_without_personal_claim(self) -> None:
        self.assertTrue(self.result["pass"])
        self.assertEqual("PASS", self.result["gates"]["G0_isolation"])
        self.assertEqual("PASS", self.result["gates"]["G3_retrieval_engineering"])
        self.assertEqual(
            "INCONCLUSIVE",
            self.result["gates"]["personalized_retrieval_quality"],
        )
        self.assertFalse(self.result["benchmark"]["contains_real_paia_input"])
        self.assertEqual(0, self.result["metrics"]["real_input_api_egress_events"])
        self.assertEqual(0, self.result["metrics"]["live_api_calls"])
        self.assertEqual(0, self.result["metrics"]["model_training_runs"])
        self.assertEqual(
            0, self.result["metrics"]["owner_attention_policy_violations"]
        )

    def test_dense_lexical_hybrid_and_whole_chunk_are_all_evaluated(self) -> None:
        expected = {
            f"{scoring}/{aggregation}"
            for scoring in ("lexical", "dense", "hybrid")
            for aggregation in ("whole", "chunk")
        }
        self.assertEqual(expected, set(self.result["configuration_metrics"]))
        for metrics in self.result["configuration_metrics"].values():
            self.assertEqual(1.0, metrics["recall_at_20"])
            self.assertGreaterEqual(metrics["ndcg_at_10"], 0.0)
            self.assertGreaterEqual(metrics["mrr_at_10"], 0.0)

    def test_exact_term_and_hard_negative_regressions(self) -> None:
        self.assertTrue(self.result["exact_term_regression"]["pass"])
        self.assertEqual(0.0, self.result["hard_negative"]["failure_rate"])

    def test_no_answer_and_long_position_evidence(self) -> None:
        self.assertEqual(0.0, self.result["no_answer"]["false_answer_rate"])
        positions = self.result["evidence_spans"]["long_position_checks"]
        self.assertEqual(
            {"long_beginning", "long_middle", "long_end"},
            set(positions),
        )
        self.assertTrue(all(positions.values()))
        self.assertEqual(1.0, self.result["evidence_spans"]["integrity"])

    def test_frozen_evidence_schema_validates_browser_records(self) -> None:
        validator = Draft202012Validator(load_evidence_schema())
        records = self.result["evidence_browser"]["records"]
        self.assertEqual(self.result["benchmark"]["query_count"], len(records))
        for record in records:
            self.assertEqual([], list(validator.iter_errors(record)))

    def test_disagreement_and_challenge_queues_are_machine_generated(self) -> None:
        self.assertGreater(self.result["disagreement_queue"]["count"], 0)
        self.assertGreater(self.result["disagreement_queue"]["yield"], 0.0)
        self.assertGreaterEqual(len(self.result["challenge_queue"]), 7)
        for case in self.result["disagreement_queue"]["cases"]:
            self.assertFalse(case["provenance"]["contains_real_paia_input"])

    def test_browser_is_read_only_and_escapes_fixture_text(self) -> None:
        record = deepcopy(self.result["evidence_browser"]["records"][0])
        record["query_id"] = "escape-test"
        record["query_text"] = "<script>alert(1)</script>"
        rendered = render_evidence_browser([record])
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", rendered)
        self.assertNotIn("<script>alert(1)</script>", rendered)
        self.assertIn("No owner semantic labeling controls are present.", rendered)
        self.assertNotIn("http://", rendered)
        self.assertNotIn("https://", rendered)

    def test_fixture_pack_is_synthetic_only(self) -> None:
        pack = build_sem02_fixture_pack()
        for item in pack["documents"] + pack["queries"]:
            self.assertEqual("synthetic", item["provenance"]["evidence_class"])
            self.assertFalse(item["provenance"]["contains_real_paia_input"])


if __name__ == "__main__":
    unittest.main()
