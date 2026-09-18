from __future__ import annotations

from copy import deepcopy
import unittest

from semantic_lab.catalog import load_catalog
from semantic_lab.sem03 import (
    HashTopicCandidateIndex,
    assemble_candidates,
    build_scale_topics,
    eligible_topics,
    lexical_ranking,
    load_sem03_config,
    run_sem03,
)


class Sem03CandidateRetrievalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result = run_sem03("3" * 40)
        cls.catalog = load_catalog()

    def test_engineering_gate_passes_without_personal_claim(self) -> None:
        self.assertTrue(self.result["pass"])
        self.assertEqual("PASS", self.result["gates"]["G0_isolation"])
        self.assertEqual("PASS", self.result["gates"]["G4_full_catalog_candidates"])
        self.assertEqual(
            "INCONCLUSIVE",
            self.result["gates"]["personalized_candidate_recall"],
        )
        self.assertEqual(
            "PENDING_RUNTIME_WORKFLOW",
            self.result["gates"]["qualified_embedding_stability"],
        )
        self.assertFalse(self.result["benchmark"]["contains_real_paia_input"])
        self.assertEqual(0, self.result["metrics"]["real_input_api_egress_events"])
        self.assertEqual(0, self.result["metrics"]["model_training_runs"])
        self.assertEqual(0, self.result["metrics"]["owner_attention_policy_violations"])

    def test_candidate_metrics_meet_frozen_g4(self) -> None:
        acceptance = load_sem03_config()["acceptance"]
        metrics = self.result["metrics"]
        self.assertGreaterEqual(
            metrics["recall_at_10"], acceptance["candidate_recall_at_10_min"]
        )
        self.assertGreaterEqual(
            metrics["recall_at_20"], acceptance["candidate_recall_at_20_min"]
        )
        self.assertGreaterEqual(
            metrics["inactive_candidate_recall_at_20"],
            acceptance["inactive_candidate_recall_at_20_min"],
        )
        self.assertLessEqual(
            metrics["active_inactive_recall_gap"],
            acceptance["active_inactive_recall_gap_max"],
        )
        self.assertEqual(1.0, metrics["global_slot_preservation_rate"])

    def test_activity_prior_never_displaces_reserved_global_prefix(self) -> None:
        topics = eligible_topics(self.catalog)
        index = HashTopicCandidateIndex(topics)
        profile = {
            str(topic["topic_id"]): {
                "activity_state": "ACTIVE" if index_ % 2 == 0 else "INACTIVE",
                "pinned": index_ % 11 == 0,
            }
            for index_, topic in enumerate(topics)
        }
        query = str(topics[-1]["name"]["zh"])
        on = index.query(query, profile=profile)
        off = index.query(query, profile=None)
        reserved = load_sem03_config()["policy"]["reserved_global_slots"]
        self.assertEqual(
            [item["topic_id"] for item in off[:reserved]],
            [item["topic_id"] for item in on[:reserved]],
        )
        self.assertIn(str(topics[-1]["topic_id"]), [item["topic_id"] for item in on[:20]])

    def test_declared_confusing_neighbor_is_expanded(self) -> None:
        base = eligible_topics(self.catalog)[:2]
        left, right = deepcopy(base[0]), deepcopy(base[1])
        left["confusing_neighbor_topic_ids"] = [right["topic_id"]]
        right["confusing_neighbor_topic_ids"] = []
        topics = [left, right]
        dense = [str(left["topic_id"]), str(right["topic_id"])]
        lexical = lexical_ranking(str(left["name"]["zh"]), topics)
        candidates = assemble_candidates(
            query=str(left["name"]["zh"]),
            topics=topics,
            dense_ranking=dense,
            lexical_ids=lexical,
            profile=None,
        )
        by_id = {item["topic_id"]: item for item in candidates}
        self.assertIn(str(right["topic_id"]), by_id)
        self.assertIn("confusing_neighbor", by_id[str(right["topic_id"])]["sources"])

    def test_custom_topic_safety_lane_does_not_gate_system_topics(self) -> None:
        custom = deepcopy(eligible_topics(self.catalog)[0])
        custom["topic_id"] = "usr.fixture.custom"
        custom["name"] = {"zh": "自定义语义主题", "en": "Custom Semantic Topic"}
        custom["aliases"] = {"zh": ["自定义语义主题"], "en": ["Custom Semantic Topic"]}
        custom["lifecycle"] = "ACTIVE"
        topics = eligible_topics(self.catalog, [custom])
        index = HashTopicCandidateIndex(topics)
        custom_ids = [item["topic_id"] for item in index.query("自定义语义主题")]
        self.assertIn("usr.fixture.custom", custom_ids[:20])
        system_query = str(topics[1]["name"]["zh"])
        system_ids = [item["topic_id"] for item in index.query(system_query)]
        self.assertIn(str(topics[1]["topic_id"]), system_ids[:20])

    def test_scale_contract_reaches_1024_topics(self) -> None:
        topics = build_scale_topics(self.catalog, 1024)
        self.assertEqual(1024, len(topics))
        self.assertEqual(1024, len({topic["topic_id"] for topic in topics}))
        index = HashTopicCandidateIndex(topics, dimensions=64)
        target = topics[777]
        ids = [item["topic_id"] for item in index.query(target["aliases"]["en"][0])]
        self.assertIn(target["topic_id"], ids[:20])


if __name__ == "__main__":
    unittest.main()
