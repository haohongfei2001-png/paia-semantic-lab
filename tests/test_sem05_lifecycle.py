import unittest
from datetime import datetime, timedelta, timezone

from semantic_lab.sem05 import (
    ActivationEngine,
    IncrementalSemanticStore,
    api_tradeoff_rows,
    diagnostic_clusters,
    external_call_allowed,
    load_sem05_config,
    measure_local_pipeline,
    run_sem05,
)


class Sem05LifecycleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_sem05_config()
        cls.result = run_sem05("5" * 40)

    def test_round_gate_passes_without_personal_quality_claim(self) -> None:
        self.assertTrue(self.result["pass"])
        self.assertEqual("PASS", self.result["gates"]["G0_isolation"])
        self.assertEqual(
            "PASS",
            self.result["gates"]["G6_lifecycle_activation_privacy_infrastructure"],
        )
        self.assertEqual(
            "INCONCLUSIVE",
            self.result["gates"]["personalized_activation_routing_quality"],
        )
        self.assertEqual(0, self.result["metrics"]["real_input_api_egress_events"])
        self.assertEqual(0, self.result["metrics"]["live_api_calls"])
        self.assertEqual(0, self.result["metrics"]["owner_attention_policy_violations"])
        self.assertEqual(0, self.result["metrics"]["model_training_runs"])
        self.assertEqual(0, self.result["metrics"]["automatic_topic_creation_events"])

    def test_incremental_noop_metadata_edit_delete_and_purge(self) -> None:
        store = IncrementalSemanticStore(self.config)
        append = store.apply_event({
            "event_id": "a1", "kind": "upsert", "input_ref": "i1", "revision": "r1",
            "text": "alpha", "metadata_fingerprint": "m1", "source_payload_fingerprint": "s1",
        })
        self.assertEqual(1, append["embedding_calls"])
        noop = store.apply_event({
            "event_id": "a2", "kind": "upsert", "input_ref": "i1", "revision": "r1",
            "text": "alpha", "metadata_fingerprint": "m1", "source_payload_fingerprint": "s1",
        })
        self.assertEqual("noop", noop["kind"])
        self.assertEqual(0, noop["embedding_calls"])
        metadata = store.apply_event({
            "event_id": "a3", "kind": "upsert", "input_ref": "i1", "revision": "r2",
            "text": "alpha", "metadata_fingerprint": "m2", "source_payload_fingerprint": "s2",
        })
        self.assertEqual("metadata_only", metadata["kind"])
        self.assertEqual(0, metadata["embedding_calls"])
        edit = store.apply_event({
            "event_id": "a4", "kind": "upsert", "input_ref": "i1", "revision": "r3",
            "text": "alpha edited", "metadata_fingerprint": "m2", "source_payload_fingerprint": "s3",
        })
        self.assertEqual("edit", edit["kind"])
        self.assertEqual(1, edit["embedding_calls"])
        self.assertEqual(["r3"], [row["revision"] for row in store.default_records()])
        deleted = store.apply_event({"event_id": "a5", "kind": "delete", "input_ref": "i1"})
        self.assertTrue(deleted["purge_required"])
        self.assertEqual([], store.default_records())
        purged = store.apply_event({"event_id": "a6", "kind": "purge", "input_ref": "i1"})
        self.assertGreaterEqual(purged["purged_derivatives"], 1)
        self.assertEqual([], store.default_records())

    def test_crash_recovery_idempotence_and_model_namespace(self) -> None:
        store = IncrementalSemanticStore(self.config)
        event = {
            "event_id": "restore-1", "kind": "upsert", "input_ref": "restore",
            "revision": "r1", "text": "stable payload", "metadata_fingerprint": "m",
            "source_payload_fingerprint": "s",
        }
        store.apply_event(event)
        restored = IncrementalSemanticStore.restore(store.snapshot(), self.config)
        self.assertTrue(restored.apply_event(event)["duplicate"])
        before = restored.default_records()[0]["embedding_key"]
        changed = restored.upgrade_model("hash-embedding-v2")
        after = restored.default_records()[0]["embedding_key"]
        self.assertTrue(changed["changed"])
        self.assertEqual(1, changed["recomputed"])
        self.assertNotEqual(before, after)

    def test_catalog_patch_minor_major_do_not_reembed_inputs(self) -> None:
        store = IncrementalSemanticStore(self.config)
        changes = [
            {"from_version": "0.2.0", "to_version": "0.2.1", "change_type": "PATCH",
             "affected_topic_ids": ["sys.a"]},
            {"from_version": "0.2.1", "to_version": "0.3.0", "change_type": "MINOR",
             "added_topic_ids": ["sys.b"]},
            {"from_version": "0.3.0", "to_version": "1.0.0", "change_type": "MAJOR",
             "affected_topic_ids": ["sys.a"], "successor_topic_ids": ["sys.a1", "sys.a2"]},
        ]
        results = [store.apply_catalog_change(change) for change in changes]
        self.assertTrue(all(row["input_embedding_recomputations"] == 0 for row in results))
        self.assertFalse(results[0]["historical_assignments_rewritten"])
        self.assertTrue(results[2]["targeted_gold_migration_required"])


    def test_activation_threshold_decay_reactivation_and_manual_state(self) -> None:
        engine = ActivationEngine(self.config)
        base = datetime(2026, 9, 1, tzinfo=timezone.utc)
        engine.accept_assignment(
            "sustained", input_ref="i1", conversation_id="c1", at=base.isoformat()
        )
        self.assertEqual("INACTIVE", engine.profile("sustained")["activity_state"])
        engine.accept_assignment(
            "sustained", input_ref="i2", conversation_id="c2",
            at=(base + timedelta(days=1)).isoformat(),
        )
        engine.accept_assignment(
            "sustained", input_ref="i3", conversation_id="c1",
            at=(base + timedelta(days=2)).isoformat(),
        )
        self.assertEqual("ACTIVE", engine.profile("sustained")["activity_state"])
        engine.advance_time((base + timedelta(days=63)).isoformat())
        self.assertEqual("INACTIVE", engine.profile("sustained")["activity_state"])
        engine.accept_assignment(
            "sustained", input_ref="i4", conversation_id="c3",
            at=(base + timedelta(days=64)).isoformat(),
        )
        self.assertEqual("INACTIVE", engine.profile("sustained")["activity_state"])
        engine.accept_assignment(
            "sustained", input_ref="i5", conversation_id="c4",
            at=(base + timedelta(days=65)).isoformat(),
        )
        self.assertEqual("ACTIVE", engine.profile("sustained")["activity_state"])

        engine.manual("hidden", at=base.isoformat(), visibility="HIDDEN")
        self.assertEqual("INACTIVE", engine.profile("hidden")["activity_state"])
        self.assertTrue(engine.classification_eligible("hidden"))
        engine.manual("pinned", at=base.isoformat(), pinned=True)
        self.assertEqual("ACTIVE", engine.profile("pinned")["activity_state"])
        engine.manual(
            "forced-off", at=base.isoformat(), activation_lock="FORCE_INACTIVE"
        )
        for index in range(5):
            engine.accept_assignment(
                "forced-off",
                input_ref=f"forced-{index}",
                conversation_id=f"f{index}",
                at=(base + timedelta(hours=index)).isoformat(),
            )
        self.assertEqual("INACTIVE", engine.profile("forced-off")["activity_state"])

    def test_rejected_defer_and_stale_do_not_activate(self) -> None:
        engine = ActivationEngine(self.config)
        base = datetime(2026, 9, 1, tzinfo=timezone.utc)
        for index, kwargs in enumerate([
            {"accepted": False, "route_state": "ASSIGNED", "stale": False},
            {"accepted": True, "route_state": "DEFER", "stale": False},
            {"accepted": True, "route_state": "ASSIGNED", "stale": True},
        ]):
            engine.accept_assignment(
                "ignored",
                input_ref=f"x{index}",
                conversation_id=f"c{index}",
                at=(base + timedelta(hours=index)).isoformat(),
                **kwargs,
            )
        self.assertEqual("INACTIVE", engine.profile("ignored")["activity_state"])
        self.assertEqual([], engine.accepted.get("ignored", []))

    def test_auto_active_budget_is_48_and_excludes_pinned(self) -> None:
        engine = ActivationEngine(self.config)
        base = datetime(2026, 9, 1, tzinfo=timezone.utc)
        engine.manual("pinned", at=base.isoformat(), pinned=True)
        for topic_index in range(55):
            topic_id = f"budget-{topic_index:02d}"
            for event_index in range(3):
                engine.accept_assignment(
                    topic_id,
                    input_ref=f"{topic_id}-i{event_index}",
                    conversation_id=f"{topic_id}-c{event_index % 2}",
                    at=(base + timedelta(days=event_index, minutes=topic_index)).isoformat(),
                )
        self.assertEqual(48, engine.auto_active_count())
        self.assertEqual("ACTIVE", engine.profile("pinned")["activity_state"])

    def test_local_resource_measurement_and_api_metadata_only(self) -> None:
        texts = [f"synthetic fixture {index}" for index in range(64)]
        metrics = measure_local_pipeline(texts)
        self.assertEqual(64, metrics["input_count"])
        self.assertGreater(metrics["throughput_inputs_per_second"], 0)
        self.assertGreater(metrics["peak_memory_bytes"], 0)
        self.assertGreater(metrics["index_size_bytes_estimate"], 0)
        rows = api_tradeoff_rows(self.config, input_count=64, total_tokens=4096)
        self.assertEqual(3, len(rows))
        self.assertTrue(all(row["network_calls"] == 0 for row in rows))
        cohere = next(row for row in rows if row["provider"] == "cohere")
        self.assertIsNone(cohere["price_usd_per_million_tokens"])
        self.assertIn("NOT_QUALIFIED", cohere["qualification"])

    def test_external_call_policy_is_default_deny(self) -> None:
        self.assertFalse(
            external_call_allowed(evidence_class="synthetic", contains_real_input=False)
        )
        self.assertFalse(
            external_call_allowed(evidence_class="private", contains_real_input=True)
        )

    def test_clustering_is_stable_diagnostic_only(self) -> None:
        items = [
            {"id": "a", "text": "semantic lifecycle cache invalidation"},
            {"id": "b", "text": "semantic lifecycle cache revision"},
            {"id": "c", "text": "activation accepted assignment profile"},
        ]
        first = diagnostic_clusters(items)
        second = diagnostic_clusters(list(items))
        self.assertEqual(first["stability_digest"], second["stability_digest"])
        self.assertTrue(first["diagnostic_only"])
        self.assertEqual(0, first["formal_topic_mutations"])


if __name__ == "__main__":
    unittest.main()
