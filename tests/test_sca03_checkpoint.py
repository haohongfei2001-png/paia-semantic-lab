from __future__ import annotations

import json
import pathlib
import unittest

import yaml

from scripts.sca03_private_calibration import build_parser, load_freeze
from semantic_lab.sca03 import config_matrix, load_sca03_config

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SCA03CheckpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config_path = ROOT / "configs" / "sca03_private_calibration_v0.1.yaml"
        cls.freeze_path = ROOT / "artifacts" / "catalog-architecture-v0.1" / "sca03-private-freeze.json"
        cls.config = load_sca03_config(cls.config_path)
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml").read_text()
        )
        cls.freeze = json.loads(cls.freeze_path.read_text())

    def test_round_closure_preserves_failed_gate(self):
        sca03 = self.status["rounds"]["SCA-03"]
        self.assertIn(self.status["phase"], {"SCA_03_COMPLETE_PENDING_CI", "SCA_03_COMPLETE_FAIL"})
        self.assertEqual("COMPLETE", sca03["execution_status"])
        self.assertTrue(sca03["explicit_execution_authorized"])
        self.assertEqual(80, sca03["calibration_records_read"])
        self.assertEqual("FAIL", sca03["capability_verdict"])
        self.assertEqual("BLOCKED", self.status["rounds"]["SCA-04"]["execution_status"])
        result = json.loads((ROOT / sca03["calibration_report"]).read_text())
        self.assertEqual(12, len(result["results"]))
        self.assertTrue(all(not row["gate"]["pass"] for row in result["results"]))
        self.assertIsNone(result["selected_config"])
        self.assertFalse(result["evaluation_open_permitted"])
        self.assertFalse(sca03["evaluation_opened"])
        self.assertEqual(0, sca03["evaluation_records_read"])

    def test_freeze_is_before_private_metrics(self):
        self.assertEqual("FROZEN_BEFORE_PRIVATE_EVIDENCE", self.freeze["state"])
        self.assertFalse(self.freeze["private_metrics_opened"])
        self.assertEqual(12, self.freeze["matrix_count"])
        self.assertEqual(80, self.freeze["authorization"]["calibration_read_only_count"])
        self.assertEqual(13, self.freeze["authorization"]["evaluation_read_only_after_gate"])

    def test_freeze_hashes_validate_exact_checkout(self):
        loaded = load_freeze(self.freeze_path, self.config_path, ROOT)
        self.assertEqual("SCA-03", loaded["round"])

    def test_evaluator_has_no_evaluation_stage(self):
        parser = build_parser()
        dests = {action.dest for action in parser._actions}
        self.assertNotIn("stage", dests)
        self.assertNotIn("evaluation_records", dests)
        self.assertNotIn("consumption_marker", dests)

    def test_matrix_remains_twelve_configs(self):
        self.assertEqual(12, len(config_matrix(self.config)))


if __name__ == "__main__":
    unittest.main()
