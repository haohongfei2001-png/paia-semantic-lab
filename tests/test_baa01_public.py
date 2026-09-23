from __future__ import annotations

import os
import unittest

from scripts.baa01_public_verification import run_public_verification


@unittest.skipUnless(
    os.environ.get("BAA01_PUBLIC_NUMPY") == "1",
    "Runs only in the isolated BAA-01 public verification step with pinned NumPy.",
)
class BAA01PublicVerificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = run_public_verification()

    def test_public_gate_passes(self):
        self.assertTrue(self.result["public_gate_pass"])
        self.assertEqual("PUBLIC_GATE_PASS", self.result["stage"])

    def test_both_candidate_variants_pass_all_fixtures(self):
        candidate = self.result["candidate_assembly"]
        self.assertEqual(3, candidate["fixture_count"])
        self.assertTrue(candidate["pass"])
        self.assertEqual(
            {
                "direct_reserve6_sibling_cap2",
                "direct_reserve6_sibling_cap4",
            },
            set(candidate["policies"]),
        )
        for row in candidate["policies"].values():
            self.assertTrue(row["pass"])
            cap = row["sibling_cap"]
            for fixture in row["fixtures"].values():
                self.assertTrue(fixture["pass"])
                self.assertTrue(all(fixture["invariants"].values()))
                self.assertFalse(fixture["sibling_cap_counts_seed"])
                self.assertTrue(fixture["injected_counts_within_cap"])
                self.assertTrue(
                    all(count <= cap for count in fixture["injected_sibling_counts"].values())
                )
                self.assertEqual(144, fixture["candidate_count"])
                self.assertEqual(144, fixture["unique_candidate_count"])
                self.assertTrue(all(position <= 10 for position in fixture["direct_top6_positions"]))
                self.assertTrue(all(position <= 20 for position in fixture["direct_top10_positions"]))

    def test_missing_evidence_neutral_fusion_passes(self):
        fusion = self.result["missing_evidence_neutral_fusion"]
        self.assertTrue(fusion["pass"])
        self.assertEqual("2.5.3", fusion["numpy_version"])
        self.assertEqual(144, fusion["topic_count"])
        self.assertEqual(4, fusion["partial_stream_count"])
        self.assertTrue(fusion["partial_stream_exact_observed_set"])
        self.assertTrue(fusion["target_absent_from_prototype_stream"])
        self.assertTrue(fusion["zero_prototype_relative_order_preserved"])
        self.assertTrue(fusion["all_no_prototype_stream_empty"])
        self.assertTrue(fusion["all_no_prototype_fused_equals_profile"])
        self.assertTrue(fusion["profile_weight_only_equals_profile"])
        self.assertTrue(fusion["zero_prototype_id_rename_position_invariant"])

    def test_no_private_or_sca04_activity(self):
        guards = self.result["guards"]
        self.assertTrue(all(value == 0 or value is False for value in guards.values()))
        self.assertFalse(self.result["private_run_authorized"])
        self.assertFalse(self.result["sca04_authorized"])
        self.assertFalse(self.result["winner_selected_for_private_run"])


if __name__ == "__main__":
    unittest.main()
