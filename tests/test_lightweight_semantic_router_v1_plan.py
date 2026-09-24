from __future__ import annotations

import json
import pathlib
import unittest

import yaml


ROOT = pathlib.Path(__file__).resolve().parents[1]


class LightweightSemanticRouterV1PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.status = yaml.safe_load(
            (ROOT / "status" / "LIGHTWEIGHT_SEMANTIC_ROUTER_STATUS.yaml").read_text(
                encoding="utf-8"
            )
        )
        cls.audit = json.loads(
            (
                ROOT
                / "artifacts"
                / "lightweight-semantic-router-v1"
                / "LSR-00_BASELINE_AUDIT.json"
            ).read_text(encoding="utf-8")
        )

    def test_zero_model_production_direction_is_hard_bound(self):
        self.assertEqual(
            "PAIA-LIGHTWEIGHT-SEMANTIC-ROUTER-v1",
            self.status["package_id"],
        )
        self.assertEqual("ZERO_MODEL_LOCAL_FIRST", self.status["production_direction"])
        self.assertEqual(0, self.status["production_neural_model_assets_bytes_max"])
        self.assertFalse(self.status["production_semantic_network_dependency"])
        self.assertFalse(self.status["production_heavy_ml_runtime"])
        self.assertEqual("RESEARCH_ORACLE_ONLY", self.status["legacy_embedding_role"])

    def test_consumer_size_and_runtime_budgets_are_frozen(self):
        self.assertLessEqual(
            self.status["production_generated_index_bytes_max"], 1024 * 1024
        )
        self.assertLessEqual(
            self.status["production_router_plus_index_bytes_max"], 2 * 1024 * 1024
        )
        self.assertLessEqual(
            self.status["production_incremental_memory_bytes_max"], 32 * 1024 * 1024
        )
        self.assertLessEqual(self.status["production_warm_p95_ms_target"], 20)
        self.assertLessEqual(self.status["production_cold_init_ms_target"], 100)

    def test_existing_assets_are_small_and_reused(self):
        assets = self.audit["reusable_assets"]
        self.assertEqual(144, self.audit["catalog_topic_count"])
        self.assertLess(assets["formal_catalog"]["bytes"], 1024 * 1024)
        self.assertLess(assets["semantic_profiles"]["bytes"], 1024 * 1024)
        self.assertLess(assets["production_source_material_total_bytes"], 1024 * 1024)
        self.assertFalse(assets["synthetic_contrastive"]["production_payload"])

    def test_private_and_production_guards_remain_closed(self):
        self.assertEqual(0, self.status["private_artifact_reads"])
        self.assertEqual(0, self.status["evaluation_records_read"])
        self.assertEqual(0, self.status["consumed_lockbox_reads"])
        self.assertFalse(self.status["live_archive_read"])
        self.assertFalse(self.status["real_input_api_egress"])
        self.assertFalse(self.status["model_training_started"])
        self.assertFalse(self.status["production_paia_modified"])

    def test_round_sequence_starts_at_public_lsr01(self):
        self.assertEqual("COMPLETE", self.status["rounds"]["LSR-00"]["execution_status"])
        self.assertEqual("PASS", self.status["rounds"]["LSR-00"]["capability_verdict"])

        lsr01 = self.status["rounds"]["LSR-01"]
        self.assertIn(
            lsr01["execution_status"],
            {"READY", "IN_PROGRESS", "COMPLETE"},
        )
        if lsr01["execution_status"] == "READY":
            self.assertFalse(lsr01["explicit_execution_authorized"])
        else:
            self.assertTrue(lsr01["explicit_execution_authorized"])

        for round_id in ("LSR-02", "LSR-03", "LSR-04", "LSR-05", "LSR-06"):
            self.assertEqual(
                "BLOCKED", self.status["rounds"][round_id]["execution_status"]
            )


if __name__ == "__main__":
    unittest.main()
