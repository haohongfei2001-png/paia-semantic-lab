from __future__ import annotations

import pathlib
import unittest

import yaml


ROOT = pathlib.Path(__file__).resolve().parents[1]


class CompiledSemanticLexiconV1PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.status = yaml.safe_load(
            (ROOT / "status" / "COMPILED_SEMANTIC_LEXICON_STATUS.yaml").read_text(
                encoding="utf-8"
            )
        )

    def test_zero_model_product_boundary_is_preserved(self):
        self.assertEqual(
            "ZERO_MODEL_COMPILED_STATIC_SEMANTICS",
            self.status["production_direction"],
        )
        self.assertEqual(0, self.status["production_neural_model_assets_bytes_max"])
        self.assertFalse(self.status["production_semantic_network_dependency"])

    def test_consumer_budgets_are_not_relaxed(self):
        self.assertEqual(1048576, self.status["production_generated_index_bytes_max"])
        self.assertEqual(2097152, self.status["production_router_plus_index_bytes_max"])
        self.assertEqual(33554432, self.status["production_incremental_memory_bytes_max"])
        self.assertEqual(20, self.status["production_warm_p95_ms_max"])
        self.assertEqual(100, self.status["production_cold_init_ms_max"])

    def test_public_rounds_can_be_continuous_only_after_package_authorization(self):
        self.assertTrue(self.status["public_package_preauthorized"])
        self.assertTrue(
            self.status["public_rounds"]["continuous_after_package_authorization"]
        )
        self.assertEqual("IN_PROGRESS", self.status["rounds"]["CSL-00"]["execution_status"])
        self.assertEqual(1, self.status["max_post_blind_test_repair_rounds"])

    def test_private_and_production_rounds_remain_hard_blocked(self):
        self.assertEqual(0, self.status["private_artifact_reads"])
        self.assertEqual(0, self.status["evaluation_records_read"])
        self.assertEqual(0, self.status["consumed_lockbox_reads"])
        self.assertFalse(self.status["production_paia_modified"])
        for round_id in ("CSL-07", "CSL-08", "CSL-09"):
            row = self.status["rounds"][round_id]
            self.assertEqual("BLOCKED", row["execution_status"])
            self.assertFalse(row["explicit_execution_authorized"])


if __name__ == "__main__":
    unittest.main()
