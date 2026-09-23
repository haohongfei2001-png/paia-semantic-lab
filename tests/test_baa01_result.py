from __future__ import annotations

import json
import os
import pathlib
import unittest

from scripts.baa01_public_verification import run_public_verification


ROOT = pathlib.Path(__file__).resolve().parents[1]


@unittest.skipUnless(
    os.environ.get("BAA01_PUBLIC_NUMPY") == "1",
    "Runs only in the isolated BAA-01 public verification step with pinned NumPy.",
)
class BAA01CommittedResultTests(unittest.TestCase):
    def test_committed_result_matches_executable_public_verification(self):
        committed = json.loads(
            (
                ROOT
                / "artifacts"
                / "bounded-architecture-amendment-v0.1"
                / "BAA-01_RESULT.json"
            ).read_text()
        )
        self.assertEqual(committed, run_public_verification())

    def test_committed_result_has_no_private_authority_or_activity(self):
        committed = json.loads(
            (
                ROOT
                / "artifacts"
                / "bounded-architecture-amendment-v0.1"
                / "BAA-01_RESULT.json"
            ).read_text()
        )
        self.assertTrue(committed["public_gate_pass"])
        self.assertFalse(committed["private_run_authorized"])
        self.assertFalse(committed["sca04_authorized"])
        self.assertFalse(committed["winner_selected_for_private_run"])
        self.assertEqual(0, committed["guards"]["private_artifact_reads"])
        self.assertEqual(0, committed["guards"]["evaluation_records_read"])
        self.assertEqual(0, committed["guards"]["consumed_lockbox_reads"])


if __name__ == "__main__":
    unittest.main()
