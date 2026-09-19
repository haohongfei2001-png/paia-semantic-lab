from __future__ import annotations

import copy
import unittest

from semantic_lab.catalog import load_catalog
from semantic_lab.sem06 import (
    Sem06GuardError,
    _synthetic_snapshot,
    build_machine_context,
    finalize_personal_gold,
    run_sem06,
    select_annotation_batch,
    validate_authorized_snapshot,
)


class Sem06PersonalGoldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = load_catalog()
        cls.snapshot = _synthetic_snapshot(cls.catalog, count=48)

    def test_snapshot_identity_guards(self) -> None:
        duplicate = copy.deepcopy(self.snapshot)
        duplicate["records"].append(copy.deepcopy(duplicate["records"][0]))
        with self.assertRaises(Sem06GuardError):
            validate_authorized_snapshot(
                duplicate,
                expected_catalog_version=str(self.catalog["catalog_version"]),
                allow_synthetic=True,
            )
        mismatch = copy.deepcopy(self.snapshot)
        mismatch["catalog_version"] = "old"
        with self.assertRaises(Sem06GuardError):
            validate_authorized_snapshot(
                mismatch,
                expected_catalog_version=str(self.catalog["catalog_version"]),
                allow_synthetic=True,
            )

    def test_batch_blinding_and_deduplication(self) -> None:
        snapshot = copy.deepcopy(self.snapshot)
        duplicate = copy.deepcopy(snapshot["records"][0])
        duplicate["input_ref"] = "synthetic:duplicate"
        duplicate["source_payload_fingerprint"] = "duplicate"
        snapshot["records"].append(duplicate)
        machine = build_machine_context(snapshot, catalog=self.catalog, allow_synthetic=True)
        batch = select_annotation_batch(machine)
        report = batch["sampling_report"]
        self.assertTrue(report["model_identity_blinded"])
        self.assertEqual(0, report["per_model_duplicate_labeling"])
        self.assertGreaterEqual(report["deduplicated_count"], 1)
        ids = [row["item_id"] for row in batch["owner_items"]]
        self.assertEqual(len(ids), len(set(ids)))
        rendered = str(batch["owner_items"]).casefold()
        self.assertNotIn("variant_decision", rendered)
        self.assertNotIn("model_id", rendered)

    def test_finalize_creates_reusable_gold_and_family_splits(self) -> None:
        machine = build_machine_context(self.snapshot, catalog=self.catalog, allow_synthetic=True)
        batch = select_annotation_batch(machine)
        answers = []
        context_item_id = batch["owner_items"][0]["item_id"]
        context_private = batch["private_context"][context_item_id]
        context_source_ref = next(
            ref for ref in context_private["authorized_context_by_ref"]
            if ref != context_private["input_ref"]
        )
        context_source = context_private["authorized_context_by_ref"][context_source_ref]
        for row in batch["owner_items"]:
            truth = batch["private_context"][row["item_id"]]["synthetic_truth"]
            answer = {
                "item_id": row["item_id"],
                "route_state": truth["route_state"],
                "topic_ids": truth["topic_ids"],
            }
            if row["item_id"] == context_item_id:
                answer["allowed_context"] = {
                    "policy": "same_conversation_necessary_context_v1",
                    "family_ref": context_private["family_ref"],
                    "inputs": [{
                        "input_ref": context_source_ref,
                        "input_revision": context_source["input_revision"],
                        "text": context_source["text"],
                        "direction": "before",
                        "offset": -1,
                    }],
                }
                answer["judgment_source"] = "CHATGPT_OWNER_DELEGATED"
            answers.append(answer)
        result = finalize_personal_gold(
            batch,
            answers,
            catalog=self.catalog,
            created_at="2026-09-19T00:00:00+00:00",
        )
        self.assertEqual(len(batch["owner_items"]), result["metrics"]["owner_judgments_completed"])
        self.assertEqual(1.0, result["metrics"]["reusable_gold_validity_rate"])
        self.assertEqual({"GOLD"}, {row["state"] for row in result["calibration_records"]})
        by_family = {}
        for row in result["gold_index"]:
            by_family.setdefault(row["family_ref"], set()).add(row["split"])
        self.assertTrue(all(len(values) == 1 for values in by_family.values()))
        contextual = next(row for row in result["gold_index"] if row["context_dependent"])
        self.assertEqual("same_conversation_necessary_context_v1", contextual["allowed_context_policy"])
        self.assertEqual([context_source_ref], contextual["allowed_context_input_refs"])
        self.assertEqual(1, result["metrics"]["context_dependent_judgments"])
        self.assertEqual(1, result["metrics"]["delegated_chatgpt_judgments"])
        self.assertTrue(result["lockbox_manifest"]["frozen"])

    def test_infrastructure_benchmark_passes_without_personal_claim(self) -> None:
        result = run_sem06("6" * 40)
        self.assertTrue(result["pass"])
        self.assertEqual("PASS", result["gates"]["G7_personal_gold_infrastructure"])
        self.assertEqual("BLOCKED_ON_OWNER_SEMANTIC_BATCH", result["gates"]["round_closure"])
        self.assertFalse(result["benchmark"]["contains_real_paia_input"])
        self.assertEqual(0, result["metrics"]["real_input_api_egress_events"])
        self.assertEqual(0, result["metrics"]["model_training_runs"])


if __name__ == "__main__":
    unittest.main()
