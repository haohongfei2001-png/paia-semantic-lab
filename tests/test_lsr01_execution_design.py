from __future__ import annotations

import json
import pathlib
import unittest

import yaml

from scripts.lsr01_compile_index import build_index


ROOT = pathlib.Path(__file__).resolve().parents[1]


class LSR01ExecutionDesignTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = yaml.safe_load(
            (ROOT / "configs" / "lsr01_execution_design_v0.1.yaml").read_text(
                encoding="utf-8"
            )
        )
        cls.fixtures = json.loads(
            (
                ROOT
                / "fixtures"
                / "lightweight_router_v1"
                / "source_separated_v0.1.json"
            ).read_text(encoding="utf-8")
        )
        cls.index = build_index(ROOT)

    def test_private_and_model_guards_are_closed(self):
        auth = self.config["authorization"]
        self.assertTrue(auth["execution_authorized"])
        self.assertEqual("DENY", auth["private_calibration_reads"])
        self.assertEqual("DENY", auth["evaluation_reads"])
        self.assertEqual("DENY", auth["consumed_lockbox_reads"])
        self.assertEqual("DENY", auth["neural_model_runtime"])
        self.assertEqual("DENY", auth["semantic_network_api"])
        self.assertEqual(0, self.config["production_core"]["production_model_assets_bytes"])
        self.assertFalse(self.config["production_core"]["domain_prior"])
        self.assertFalse(self.config["production_core"]["sibling_expansion"])

    def test_candidate_set_is_exactly_bounded_abc(self):
        self.assertEqual({"A", "B", "C"}, set(self.config["candidates"]))
        self.assertTrue(
            self.config["candidates"]["B"]["preregistered_primary_hypothesis"]
        )
        self.assertEqual(1, self.config["threshold_selection"]["per_candidate_global_threshold_count"])
        self.assertEqual("DENY", self.config["threshold_selection"]["parameter_sweep"])
        self.assertEqual("DENY", self.config["threshold_selection"]["per_topic_thresholds"])
        self.assertEqual("DENY", self.config["threshold_selection"]["per_language_thresholds"])

    def test_source_separated_fixture_was_frozen_as_independent_authority(self):
        self.assertEqual("PUBLIC_SOURCE_SEPARATED", self.fixtures["evidence_class"])
        self.assertIn("before reading production semantic profiles", self.fixtures["construction_note"])
        self.assertEqual(50, len(self.fixtures["cases"]))
        dev_families = {
            row["family"] for row in self.fixtures["cases"] if row["split"] == "dev"
        }
        test_families = {
            row["family"] for row in self.fixtures["cases"] if row["split"] == "test"
        }
        self.assertTrue(dev_families)
        self.assertTrue(test_families)
        self.assertFalse(dev_families & test_families)

    def test_compiled_index_is_small_and_excludes_research_leakage(self):
        rendered = json.dumps(
            self.index,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        self.assertEqual(144, self.index["topic_count"])
        self.assertLessEqual(len(rendered), 1024 * 1024)
        forbidden_keys = {
            "synthetic_utterance_patterns",
            "representative_examples",
            "domain",
            "internal_domain",
        }
        for topic in self.index["topics"]:
            self.assertFalse(forbidden_keys & set(topic))
            for values in topic["fields"]["names_anchors"].values():
                self.assertTrue(all(">" not in value for value in values))
            for cue in topic["exclusions"]:
                self.assertNotIn("只作为背景、工具或例子出现", cue)
                self.assertNotIn("Do not assign solely because", cue)

    def test_runtime_core_has_no_model_or_network_dependency(self):
        runtime = (
            ROOT / "runtime" / "lightweight_router_v1" / "router.mjs"
        ).read_text(encoding="utf-8").lower()
        for forbidden in (
            "bge-m3",
            "sentence-transformers",
            "transformers",
            "torch",
            "fetch(",
            "http://",
            "https://",
        ):
            self.assertNotIn(forbidden, runtime)


if __name__ == "__main__":
    unittest.main()
