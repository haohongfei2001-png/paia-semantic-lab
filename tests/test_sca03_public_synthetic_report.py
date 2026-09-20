from __future__ import annotations

import json
import pathlib
import unittest

from scripts.sca03_public_synthetic_diagnostics import run_diagnostics

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SCA03PublicSyntheticReportTests(unittest.TestCase):
    def test_committed_result_matches_executable_diagnostic(self):
        committed = json.loads(
            (
                ROOT
                / "artifacts"
                / "diagnostics"
                / "sca03-public-synthetic-v0.1"
                / "RESULT.json"
            ).read_text()
        )
        self.assertEqual(committed, run_diagnostics())

    def test_committed_result_preserves_public_only_guards(self):
        committed = json.loads(
            (
                ROOT
                / "artifacts"
                / "diagnostics"
                / "sca03-public-synthetic-v0.1"
                / "RESULT.json"
            ).read_text()
        )
        self.assertEqual(0, committed["private_artifact_reads"])
        self.assertEqual(0, committed["evaluation_reads"])
        self.assertEqual(0, committed["lockbox_reads"])
        self.assertFalse(committed["production_algorithm_modified"])
        self.assertEqual(3, committed["confirmed_count"])


if __name__ == "__main__":
    unittest.main()
