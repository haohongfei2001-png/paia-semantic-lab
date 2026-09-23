from __future__ import annotations

import json
import os
import pathlib
import unittest

import yaml

from scripts.sca03_post_failure_architecture_diagnostics import (
    load_config,
    run_diagnostics,
)


ROOT = pathlib.Path(__file__).resolve().parents[1]


class PAD01PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_config(
            ROOT / "configs" / "sca03_post_failure_architecture_diagnostics_v0.1.yaml"
        )
        cls.status = yaml.safe_load(
            (
                ROOT
                / "status"
                / "SCA03_POST_FAILURE_ARCHITECTURE_DIAGNOSTICS_STATUS.yaml"
            ).read_text(encoding="utf-8")
        )

    def test_scope_is_public_synthetic_only(self):
        self.assertEqual(
            "SCA03-POST-FAILURE-ARCHITECTURE-DIAGNOSTICS-v0.1",
            self.config["package_id"],
        )
        self.assertEqual("ACTIVE_PUBLIC_SYNTHETIC_ONLY", self.config["status"])
        self.assertFalse(self.config["future_private"]["authorized"])
        self.assertFalse(self.config["future_private"]["automatic_transition"])
        self.assertIn("raw_private_calibration", self.config["evidence"]["forbidden"])
        self.assertIn("legacy_evaluation", self.config["evidence"]["forbidden"])
        self.assertIn("consumed_sem07_lockbox", self.config["evidence"]["forbidden"])

    def test_frozen_controls_are_bounded(self):
        self.assertEqual(
            [
                "concat_full_derived",
                "concat_positive_fields",
                "multivector_positive_max",
            ],
            self.config["representation_controls"],
        )
        self.assertEqual(
            ["full_catalog_direct", "baa01_sibling_cap2", "baa01_sibling_cap4"],
            self.config["candidate_controls"],
        )
        self.assertEqual([5, 10, 20], self.config["cutoffs"])
        self.assertEqual(5, len(self.config["positive_vector_lanes"]))
        self.assertEqual(["zh", "en"], self.config["context_probes"]["languages"])

    def test_status_preserves_all_private_guards(self):
        phase = self.status["phase"]
        self.assertIn(
            phase,
            {
                "PAD_01_IN_PROGRESS",
                "PAD_01_COMPLETE_PENDING_CLOSURE_CI",
                "PAD_01_COMPLETE_PASS",
            },
        )
        self.assertEqual("PUBLIC_SYNTHETIC_ONLY", self.status["evidence_class"])
        self.assertEqual(0, self.status["private_artifact_reads"])
        self.assertEqual(0, self.status["evaluation_records_read"])
        self.assertEqual(0, self.status["consumed_lockbox_reads"])
        self.assertFalse(self.status["future_private_authorized"])
        self.assertFalse(self.status["future_architecture_amendment_authorized"])
        self.assertFalse(self.status["sca04_started"])

        pad01 = self.status["rounds"]["PAD-01"]
        if phase == "PAD_01_IN_PROGRESS":
            self.assertEqual("IN_PROGRESS", pad01["execution_status"])
            self.assertEqual("UNTESTED", pad01["diagnostic_verdict"])
        else:
            self.assertEqual("COMPLETE", pad01["execution_status"])
            self.assertEqual("PASS", pad01["diagnostic_verdict"])
            self.assertEqual("PASS", pad01["pr_head_required_ci"])
            self.assertEqual("PASS", pad01["merged_main_required_ci"])
            self.assertEqual(
                "PENDING" if phase == "PAD_01_COMPLETE_PENDING_CLOSURE_CI" else "PASS",
                pad01["closure_required_ci"],
            )

    @unittest.skipUnless(
        os.environ.get("PAD01_PUBLIC_RESULT") == "1",
        "PAD-01 executable result is checked only in its isolated CI step",
    )
    def test_public_architecture_decomposition_result(self):
        path = ROOT / "artifacts" / "ci" / "pad01-post-failure-architecture.json"
        result = json.loads(path.read_text(encoding="utf-8"))
        self.assertTrue(result["diagnostic_pass"])
        self.assertEqual("PUBLIC_SYNTHETIC_ONLY", result["evidence_class"])
        self.assertEqual(144, result["architecture_decomposition"]["topic_count"])
        self.assertEqual(1296, result["architecture_decomposition"]["case_count"])
        self.assertEqual(288, result["context_effect_decomposition"]["probe_count"])
        self.assertEqual(0, result["guards"]["private_artifact_reads"])
        self.assertEqual(0, result["guards"]["evaluation_records_read"])
        self.assertEqual(0, result["guards"]["consumed_lockbox_reads"])
        self.assertFalse(result["guards"]["sca04_started"])


if __name__ == "__main__":
    unittest.main()
