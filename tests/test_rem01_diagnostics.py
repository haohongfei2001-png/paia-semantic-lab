from __future__ import annotations

import unittest

from semantic_lab.catalog import load_catalog
from semantic_lab.rem01 import (
    build_rem01_fixture_pack,
    load_rem01_config,
    run_rem01,
    topic_descriptor_variant,
)


class Rem01DiagnosticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_rem01_config()
        cls.catalog = load_catalog()
        cls.result = run_rem01("1" * 40)

    def test_public_engineering_contract_passes_without_private_evidence(self) -> None:
        self.assertTrue(self.result["pass"])
        self.assertEqual("PASS", self.result["gates"]["REM01_engineering_contract"])
        self.assertEqual(
            "INCONCLUSIVE_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            self.result["gates"]["legacy_family_grouped_calibration"],
        )
        self.assertEqual("WITHHELD", self.result["gates"]["personalized_semantic_quality"])
        self.assertEqual("FORBIDDEN_IN_REM01", self.result["gates"]["model_selection"])

    def test_private_and_production_guards_remain_zero(self) -> None:
        authorization = self.result["authorization"]
        self.assertFalse(authorization["private_sem06_sem07_artifacts"])
        self.assertEqual(0, authorization["private_artifact_reads"])
        self.assertEqual(0, authorization["live_archive_reads"])
        self.assertEqual(0, authorization["real_input_api_egress_events"])
        self.assertEqual(0, authorization["owner_semantic_labels"])
        self.assertEqual(0, authorization["model_training_runs"])
        self.assertEqual(0, authorization["production_paia_writes"])
        self.assertEqual(0, authorization["consumed_sem07_lockbox_tuning_events"])

    def test_fixture_pack_has_required_public_slices(self) -> None:
        pack = build_rem01_fixture_pack(self.catalog, self.config)
        slices = {case["slice"] for case in pack["cases"]}
        for required in {
            "zh_short",
            "mixed",
            "boundary_no_alias",
            "context_dependent",
            "long_beginning",
            "long_middle",
            "long_end",
        }:
            self.assertIn(required, slices)
        self.assertTrue(
            all(
                case["provenance"]["contains_real_paia_input"] is False
                for case in pack["cases"]
            )
        )

    def test_descriptor_variants_are_total_and_nonempty(self) -> None:
        active = [
            topic
            for topic in self.catalog["topics"]
            if topic.get("lifecycle") == "ACTIVE"
        ]
        for variant in self.config["descriptor_variants"]:
            rendered = [
                topic_descriptor_variant(topic, variant) for topic in active
            ]
            self.assertEqual(len(active), len(rendered))
            self.assertTrue(all(value.strip() for value in rendered))
            self.assertTrue(
                self.result["technical_viability"]["descriptor_variants"][variant]
            )

    def test_context_pipeline_changes_context_dependent_recall(self) -> None:
        probe = self.result["context_probe"]
        current = probe["current_only"]["metrics"]["recall_at_20"]
        allowed = probe["allowed_context"]["metrics"]["recall_at_20"]
        compact = probe["compact_context"]["metrics"]["recall_at_20"]
        self.assertLess(current, allowed)
        self.assertGreaterEqual(
            allowed,
            self.config["engineering_gates"][
                "context_probe_target_recall_at_20_min"
            ],
        )
        self.assertGreaterEqual(compact, allowed)
        self.assertGreater(probe["allowed_context_recall_at_20_gain_vs_current_only"], 0)

    def test_source_attribution_is_nontrivial_after_alias_removal(self) -> None:
        oracle = self.result["oracle_candidate_attribution"]
        boundary = oracle["counts_by_slice"]["boundary_no_alias"]
        self.assertGreater(len(boundary), 1)
        self.assertGreater(boundary.get("MISS_ALL", 0), 0)
        self.assertGreater(
            boundary.get("DENSE_ONLY", 0) + boundary.get("LEXICAL_ONLY", 0),
            0,
        )

    def test_chunk_and_multivector_are_measured_not_promoted(self) -> None:
        chunk = self.result["chunk_probe"]
        self.assertTrue(chunk["whole"]["reproducibility"]["repeat_stable"])
        self.assertTrue(chunk["chunk_max"]["reproducibility"]["repeat_stable"])
        self.assertTrue(
            self.result["multivector_probe"]["reproducibility"]["repeat_stable"]
        )
        self.assertEqual("FORBIDDEN_IN_REM01", self.result["gates"]["model_selection"])

    def test_family_proxy_is_disjoint_but_personal_gold_is_not_claimed(self) -> None:
        grouped = self.result["family_grouped_evaluation"]
        self.assertEqual("SYNTHETIC_FAMILY_GROUPED_PROXY_ONLY", grouped["kind"])
        self.assertTrue(grouped["family_disjoint"])
        self.assertTrue(grouped["all_families_covered"])
        self.assertGreaterEqual(
            grouped["fold_count"],
            self.config["engineering_gates"]["synthetic_family_fold_count_min"],
        )
        self.assertEqual(
            "NOT_RUN_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            grouped["legacy_personal_calibration"],
        )

    def test_determinism_and_truncation_guards_pass(self) -> None:
        self.assertEqual(
            "PASS", self.result["gates"]["deterministic_repeated_rankings"]
        )
        self.assertEqual("PASS", self.result["gates"]["silent_truncation"])
        self.assertTrue(self.result["truncation"]["explicit_overflow_rejected"])
        self.assertTrue(self.result["truncation"]["long_chunk_full_coverage"])
        self.assertEqual(0, self.result["truncation"]["silent_truncation_violations"])
        self.assertEqual(64, len(self.result["deterministic_result_digest"]))


if __name__ == "__main__":
    unittest.main()
