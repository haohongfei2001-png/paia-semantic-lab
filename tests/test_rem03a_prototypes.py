from __future__ import annotations

import unittest

import numpy as np

from semantic_lab.rem03a import (
    config_matrix,
    fold_indices,
    held_out_family_leakage_events,
    load_rem03a_config,
    prototype_ranking,
    weighted_rrf_fuse,
)


class Rem03APrototypeTests(unittest.TestCase):
    def test_frozen_matrix_is_bounded_and_unique(self) -> None:
        cfg = load_rem03a_config()
        rows = config_matrix(cfg)
        self.assertEqual(len(rows), 12)
        self.assertEqual(len({row["config_id"] for row in rows}), 12)
        self.assertEqual(
            {row["prototype_strategy"] for row in rows},
            {"exemplar_max", "centroid", "hybrid"},
        )
        self.assertEqual(
            {row["query_variant"] for row in rows},
            {"current_only", "allowed_context"},
        )

    def test_family_folds_never_split_a_family(self) -> None:
        cases = [
            {"family_ref": "a"},
            {"family_ref": "a"},
            {"family_ref": "b"},
            {"family_ref": "c"},
            {"family_ref": "c"},
        ]
        folds = fold_indices(cases, 3)
        locations = {}
        for fold, indices in enumerate(folds):
            for index in indices:
                family = cases[index]["family_ref"]
                locations.setdefault(family, set()).add(fold)
        self.assertTrue(all(len(value) == 1 for value in locations.values()))

    def test_leakage_guard_detects_overlap(self) -> None:
        train = [{"family_ref": "a"}, {"family_ref": "b"}]
        test = [{"family_ref": "c"}]
        self.assertEqual(held_out_family_leakage_events(train, test), 0)
        self.assertEqual(
            held_out_family_leakage_events(train, [{"family_ref": "b"}]),
            1,
        )

    def test_prototype_strategies_rank_supported_topics(self) -> None:
        train_vectors = np.asarray(
            [[1.0, 0.0], [0.9, 0.1], [0.0, 1.0]],
            dtype="float32",
        )
        train_cases = [
            {"truth_state": "ASSIGNED", "truth_topics": ["t.a"]},
            {"truth_state": "ASSIGNED", "truth_topics": ["t.a"]},
            {"truth_state": "ASSIGNED", "truth_topics": ["t.b"]},
        ]
        query = np.asarray([1.0, 0.0], dtype="float32")
        for strategy in ("exemplar_max", "centroid", "hybrid"):
            ranking = prototype_ranking(
                query,
                train_vectors,
                train_cases,
                strategy=strategy,
            )
            self.assertEqual(ranking[0], "t.a")
            self.assertEqual(set(ranking), {"t.a", "t.b"})

    def test_weighted_rrf_keeps_catalog_fallback(self) -> None:
        ranking = weighted_rrf_fuse(
            ["t.a", "t.b", "t.c", "t.d"],
            ["t.c", "t.b"],
            ["t.a", "t.b", "t.c", "t.d", "t.e"],
            constant=20,
            base_weight=1.0,
            prototype_weight=4.0,
            limit=5,
        )
        self.assertEqual(ranking[0], "t.c")
        self.assertEqual(set(ranking), {"t.a", "t.b", "t.c", "t.d", "t.e"})

    def test_private_and_training_guards_remain_denied(self) -> None:
        cfg = load_rem03a_config()
        auth = cfg["authorization"]
        self.assertEqual(auth["consumed_sem07_lockbox_tuning_or_promotion"], "DENY")
        self.assertEqual(auth["real_input_api_egress"], "DENY")
        self.assertEqual(auth["model_training"], "DENY")
        self.assertEqual(auth["production_paia_write"], "DENY")


if __name__ == "__main__":
    unittest.main()
