from __future__ import annotations

import hashlib
import importlib.util
import pathlib
import unittest

from semantic_lab.rem03b import (
    anchor_ranking,
    assemble_structured_candidates,
    config_matrix,
    domain_anchor_texts,
    domain_centroid_ranking,
    domain_evidence_ranking,
    domain_exemplar_vote_ranking,
    held_out_family_leakage_events,
    load_rem03b_config,
    topic_anchor_texts,
    topic_centroid_ranking,
    topic_to_domain,
    weighted_rrf,
)

ROOT = pathlib.Path(__file__).resolve().parents[1]


def _domains():
    return [
        {"id": "D01", "slug": "alpha", "name_zh": "甲域", "name_en": "Alpha Domain"},
        {"id": "D02", "slug": "beta", "name_zh": "乙域", "name_en": "Beta Domain"},
        {"id": "D03", "slug": "gamma", "name_zh": "丙域", "name_en": "Gamma Domain"},
    ]


def _topics():
    rows = []
    for d in range(1, 4):
        domain = f"D{d:02d}"
        for i in range(8):
            rows.append(
                {
                    "topic_id": f"sys.{domain.lower()}.t{i}",
                    "name": {"zh": f"主题{d}-{i}", "en": f"Topic {d}-{i}"},
                    "aliases": {"zh": [f"主题{d}-{i}"], "en": [f"Topic {d}-{i}"]},
                    "internal_domain": domain,
                    "lifecycle": "ACTIVE",
                }
            )
    return rows


class Rem03BCandidateTests(unittest.TestCase):
    def test_execution_matrix_is_exactly_frozen_twelve(self):
        cfg = load_rem03b_config()
        rows = config_matrix(cfg)
        self.assertEqual(12, len(rows))
        self.assertEqual(12, len({row["config_id"] for row in rows}))
        self.assertEqual(
            {"current_only", "allowed_context"},
            {row["query_variant"] for row in rows},
        )
        self.assertEqual(
            {"exemplar_vote", "centroid", "hybrid"},
            {row["domain_evidence"] for row in rows},
        )
        self.assertEqual(
            {"names_aliases", "names_aliases_plus_domain_path"},
            {row["anchor_mode"] for row in rows},
        )

    def test_execution_config_is_bound_to_frozen_plan_hash(self):
        cfg = load_rem03b_config()
        actual = hashlib.sha256(
            (ROOT / cfg["plan"]["plan_config"]).read_bytes()
        ).hexdigest()
        self.assertEqual(cfg["plan"]["plan_config_sha256"], actual)

    def test_topic_anchors_suppress_common_template_fields(self):
        topic = _topics()[0]
        topic["definition"] = "SHARED TEMPLATE SHOULD NOT ENTER ANCHORS"
        domains = {row["id"]: row for row in _domains()}
        names = topic_anchor_texts(topic, domains, mode="names_aliases")
        path = topic_anchor_texts(topic, domains, mode="names_aliases_plus_domain_path")
        self.assertNotIn(topic["definition"], names)
        self.assertNotIn(topic["definition"], path)
        self.assertTrue(any("Alpha Domain" in value for value in path))
        self.assertFalse(any("Alpha Domain" in value for value in names))

    def test_domain_anchor_uses_only_existing_catalog_names(self):
        values = domain_anchor_texts(_domains()[0])
        self.assertIn("甲域", values)
        self.assertIn("Alpha Domain", values)
        self.assertIn("alpha", values)

    @unittest.skipUnless(importlib.util.find_spec("numpy"), "numpy is private-runtime only")
    def test_domain_evidence_strategies_rank_supported_domain(self):
        import numpy as np

        topics = _topics()
        mapping = topic_to_domain(topics)
        domain_ids = [row["id"] for row in _domains()]
        train_vectors = np.asarray(
            [[1.0, 0.0], [0.95, 0.05], [0.0, 1.0], [0.05, 0.95]],
            dtype="float32",
        )
        train_cases = [
            {"truth_state": "ASSIGNED", "truth_topics": ["sys.d01.t0"], "family_ref": "a"},
            {"truth_state": "ASSIGNED", "truth_topics": ["sys.d01.t1"], "family_ref": "b"},
            {"truth_state": "ASSIGNED", "truth_topics": ["sys.d02.t0"], "family_ref": "c"},
            {"truth_state": "ASSIGNED", "truth_topics": ["sys.d02.t1"], "family_ref": "d"},
        ]
        q = np.asarray([1.0, 0.0], dtype="float32")
        exemplar = domain_exemplar_vote_ranking(
            q,
            train_vectors,
            train_cases,
            topic_domain_map=mapping,
            domain_ids=domain_ids,
            neighbor_count=4,
        )
        centroid = domain_centroid_ranking(
            q,
            train_vectors,
            train_cases,
            topic_domain_map=mapping,
            domain_ids=domain_ids,
        )
        self.assertEqual("D01", exemplar[0])
        self.assertEqual("D01", centroid[0])
        for strategy in ("exemplar_vote", "centroid", "hybrid"):
            ranking = domain_evidence_ranking(
                q,
                train_vectors,
                train_cases,
                topic_domain_map=mapping,
                domain_ids=domain_ids,
                strategy=strategy,
                neighbor_count=4,
                hybrid_rrf_constant=20,
            )
            self.assertEqual("D01", ranking[0])

    @unittest.skipUnless(importlib.util.find_spec("numpy"), "numpy is private-runtime only")
    def test_topic_centroid_keeps_unsupported_topics_in_ranking(self):
        import numpy as np

        topic_ids = [topic["topic_id"] for topic in _topics()[:4]]
        train_vectors = np.asarray([[1.0, 0.0]], dtype="float32")
        train_cases = [
            {"truth_state": "ASSIGNED", "truth_topics": [topic_ids[0]], "family_ref": "a"}
        ]
        ranking = topic_centroid_ranking(
            np.asarray([1.0, 0.0], dtype="float32"),
            train_vectors,
            train_cases,
            topic_ids=topic_ids,
        )
        self.assertEqual(topic_ids[0], ranking[0])
        self.assertEqual(set(topic_ids), set(ranking))

    def test_structured_backoff_guarantees_domain_coverage_budgets(self):
        topics = _topics()
        direct = [topic["topic_id"] for topic in reversed(topics)]
        ranking = assemble_structured_candidates(
            query_text="not an exact alias",
            topics=topics,
            topic_ranking=direct,
            domain_ranking=["D01", "D02", "D03"],
        )
        d1 = {f"sys.d01.t{i}" for i in range(8)}
        d2 = {f"sys.d02.t{i}" for i in range(8)}
        self.assertTrue(d1 <= set(ranking[:10]))
        self.assertTrue(d2 <= set(ranking[:20]))
        self.assertFalse(any(value.startswith("D0") for value in ranking))

    def test_exact_alias_uses_at_most_two_reserved_slots(self):
        topics = _topics()
        direct = [topic["topic_id"] for topic in topics]
        ranking = assemble_structured_candidates(
            query_text="主题3-0",
            topics=topics,
            topic_ranking=direct,
            domain_ranking=["D01", "D02", "D03"],
        )
        self.assertEqual("sys.d03.t0", ranking[0])
        self.assertTrue({f"sys.d01.t{i}" for i in range(8)} <= set(ranking[:10]))

    def test_custom_topic_exact_alias_is_not_gated_by_domain_lane(self):
        topics = _topics() + [
            {
                "topic_id": "usr.fixture.custom",
                "name": {"zh": "自定义测试", "en": "Custom Fixture"},
                "aliases": {"zh": ["自定义测试"], "en": ["Custom Fixture"]},
                "internal_domain": "CUSTOM",
                "lifecycle": "ACTIVE",
            }
        ]
        direct = [topic["topic_id"] for topic in topics]
        ranking = assemble_structured_candidates(
            query_text="自定义测试",
            topics=topics,
            topic_ranking=direct,
            domain_ranking=["D01", "D02", "D03"],
        )
        self.assertEqual("usr.fixture.custom", ranking[0])

    def test_weighted_rrf_is_deterministic_and_total(self):
        ids = ["a", "b", "c", "d"]
        left = weighted_rrf(
            [(2.0, ["b", "a"]), (1.0, ["c", "b"])],
            all_ids=ids,
            constant=20,
        )
        right = weighted_rrf(
            [(2.0, ["b", "a"]), (1.0, ["c", "b"])],
            all_ids=ids,
            constant=20,
        )
        self.assertEqual(left, right)
        self.assertEqual(set(ids), set(left))

    def test_family_leakage_guard(self):
        train = [{"family_ref": "a"}, {"family_ref": "b"}]
        self.assertEqual(0, held_out_family_leakage_events(train, [{"family_ref": "c"}]))
        self.assertEqual(1, held_out_family_leakage_events(train, [{"family_ref": "b"}]))

    def test_execution_guards_remain_denied(self):
        cfg = load_rem03b_config()
        auth = cfg["authorization"]
        policy = cfg["candidate_policy"]
        self.assertEqual("DENY", auth["consumed_sem07_lockbox_tuning_or_promotion"])
        self.assertEqual("DENY", auth["real_input_api_egress"])
        self.assertEqual("DENY", auth["model_training"])
        self.assertEqual("DENY", auth["production_paia_write"])
        self.assertEqual("DENY", policy["generated_synonyms"])
        self.assertEqual("DENY", policy["generated_examples"])
        self.assertEqual("DENY", policy["catalog_edits"])


if __name__ == "__main__":
    unittest.main()