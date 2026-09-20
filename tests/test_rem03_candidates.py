from __future__ import annotations

from copy import deepcopy
import unittest

from semantic_lab.catalog import load_catalog
from semantic_lab.rem03 import (
    RemediatedHashCandidateIndex,
    assemble_remediated_candidates,
    load_rem03_config,
)
from semantic_lab.sem03 import eligible_topics


class Rem03CandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()
        cls.topics = eligible_topics(cls.catalog)
        cls.config = load_rem03_config()

    def test_frozen_candidate_gates_are_not_lowered(self):
        gate = self.config["promotion_gate"]
        self.assertGreaterEqual(gate["candidate_recall_at_10_min"], 0.96)
        self.assertGreaterEqual(gate["candidate_recall_at_20_min"], 0.99)
        self.assertTrue(gate["full_catalog_eligibility_required"])
        self.assertTrue(gate["activity_invariance_required"])

    def test_primary_domain_all_eight_members_fit_top10(self):
        topics = self.topics[:16]
        primary = [str(topic["topic_id"]) for topic in topics[:8]]
        secondary = [str(topic["topic_id"]) for topic in topics[8:16]]
        direct = primary + secondary
        result = assemble_remediated_candidates(
            query="synthetic primary-domain probe",
            topics=topics,
            source_rankings={
                "dense_full": direct,
                "dense_names": direct,
                "lexical_alias": direct,
            },
            config=self.config,
        )
        top10 = {row["topic_id"] for row in result[:10]}
        self.assertTrue(set(primary) <= top10)

    def test_secondary_domain_all_eight_members_fit_top20(self):
        topics = self.topics[:16]
        primary = [str(topic["topic_id"]) for topic in topics[:8]]
        secondary = [str(topic["topic_id"]) for topic in topics[8:16]]
        direct = primary + secondary
        result = assemble_remediated_candidates(
            query="synthetic secondary-domain probe",
            topics=topics,
            source_rankings={
                "dense_full": direct,
                "dense_names": direct,
                "lexical_alias": direct,
            },
            config=self.config,
        )
        top20 = {row["topic_id"] for row in result[:20]}
        self.assertTrue(set(secondary) <= top20)

    def test_declared_neighbor_can_enter_top20(self):
        left = deepcopy(self.topics[0])
        right = deepcopy(self.topics[8])
        left["confusing_neighbor_topic_ids"] = [right["topic_id"]]
        right["confusing_neighbor_topic_ids"] = []
        fixture = [left, right] + [
            deepcopy(topic)
            for topic in self.topics
            if topic["topic_id"] not in {left["topic_id"], right["topic_id"]}
        ]
        ids = [str(topic["topic_id"]) for topic in fixture]
        direct = [str(left["topic_id"])] + [
            topic_id for topic_id in ids if topic_id != str(left["topic_id"])
        ]
        result = assemble_remediated_candidates(
            query=str(left["name"]["zh"]),
            topics=fixture,
            source_rankings={
                "dense_full": direct,
                "dense_names": direct,
                "lexical_alias": direct,
            },
            config=self.config,
        )
        top20 = {row["topic_id"]: row for row in result[:20]}
        self.assertIn(str(right["topic_id"]), top20)
        self.assertIn(
            "declared_confusing_neighbor",
            top20[str(right["topic_id"])]["sources"],
        )

    def test_activity_profile_cannot_reorder_top20(self):
        index = RemediatedHashCandidateIndex(self.topics, dimensions=96)
        profile = {
            str(topic["topic_id"]): {
                "activity_state": "ACTIVE" if i % 2 == 0 else "INACTIVE",
                "pinned": i % 9 == 0,
            }
            for i, topic in enumerate(self.topics)
        }
        text = str(self.topics[-1]["name"]["zh"])
        off = [row["topic_id"] for row in index.query(text)[:20]]
        on = [row["topic_id"] for row in index.query(text, profile=profile)[:20]]
        self.assertEqual(off, on)

    def test_contained_alias_is_hard_candidate_evidence(self):
        target = self.topics[37]
        query = (
            "此前讨论的主要对象是 "
            + str(target["name"]["zh"])
            + " / "
            + str(target["name"]["en"])
            + "。现在继续。"
        )
        ids = [str(topic["topic_id"]) for topic in self.topics]
        adverse = [topic_id for topic_id in ids if topic_id != str(target["topic_id"])] + [
            str(target["topic_id"])
        ]
        result = assemble_remediated_candidates(
            query=query,
            topics=self.topics,
            source_rankings={
                "dense_full": adverse,
                "dense_names": adverse,
                "lexical_alias": adverse,
            },
            config=self.config,
        )
        top10 = {row["topic_id"]: row for row in result[:10]}
        self.assertIn(str(target["topic_id"]), top10)
        self.assertIn("contained_alias", top10[str(target["topic_id"])]["sources"])


if __name__ == "__main__":
    unittest.main()

