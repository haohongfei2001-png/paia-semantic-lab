from __future__ import annotations

import unittest
from pathlib import Path

from semantic_lab.sca03 import (
    assemble_graph_candidates,
    config_matrix,
    graph_structural_failures,
    load_profiles,
    load_sca03_config,
    profile_text,
)

ROOT = Path(__file__).resolve().parents[1]


class SCA03PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_sca03_config()
        cls.profiles = load_profiles(ROOT)

    def test_matrix_is_frozen_and_bounded(self):
        rows = config_matrix(self.config)
        self.assertEqual(12, len(rows))
        self.assertEqual(12, len({row["config_id"] for row in rows}))
        self.assertEqual(
            {"current_only", "allowed_context"},
            {row["query_variant"] for row in rows},
        )
        self.assertEqual(
            {"core", "core_anchors", "full_derived"},
            {row["profile_mode"] for row in rows},
        )

    def test_frozen_asset_hashes_match_closed_rounds(self):
        frozen = self.config["frozen_inputs"]
        self.assertEqual(
            "018738035c10e23faea18719a26a395dc6fb22297d0c6df3a8f93100d331d37b",
            frozen["profile_bundle_sha256"],
        )
        self.assertEqual(
            "630ca65335265e5e3b4a55118ea68fcfc6e3e7077bd467b3d47d21c1dd5cd711",
            frozen["graph_sha256"],
        )

    def test_profile_modes_are_topic_specific_and_nonempty(self):
        first = self.profiles[0]
        for mode in ("core", "core_anchors", "full_derived"):
            text = profile_text(first, mode)
            self.assertIn(first["canonical_names"]["zh"], text)
            self.assertIn(first["canonical_names"]["en"], text)
            self.assertGreater(len(text), 20)

    def test_graph_lane_preserves_full_catalog_and_seed_domains(self):
        direct = [profile["topic_id"] for profile in self.profiles]
        ranking, meta = assemble_graph_candidates(direct, self.profiles, limit=144)
        self.assertEqual(144, len(ranking))
        self.assertEqual(144, len(set(ranking)))
        self.assertEqual([], graph_structural_failures(ranking, meta, self.profiles))

    def test_private_and_production_guards_remain_denied(self):
        auth = self.config["authorization"]
        self.assertEqual("DENY", auth["consumed_sem07_lockbox_tuning_or_promotion"])
        self.assertEqual("DENY", auth["real_input_api_egress"])
        self.assertEqual("DENY", auth["model_training"])
        self.assertEqual("DENY", auth["formal_catalog_write"])
        self.assertEqual("DENY", auth["production_paia_write"])

    def test_evaluation_is_conditional_on_sca03_pass(self):
        ev = self.config["evaluation"]
        self.assertEqual("SCA03_CALIBRATION_PASS", ev["read_condition"])
        self.assertEqual(13, ev["legacy_evaluation_count"])
        self.assertEqual(1, ev["max_reads"])


if __name__ == "__main__":
    unittest.main()
