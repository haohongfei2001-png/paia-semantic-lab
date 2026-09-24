from __future__ import annotations

import json
import unittest

from scripts.csl01_compile import OUTPUT, ROOT, compile_sources, family_key, render


class CSL01CompileTests(unittest.TestCase):
    def test_deterministic_full_catalog_compilation(self):
        source, index, report = compile_sources()
        for filename, value in zip(("CSL-01_SOURCE.json", "CSL-01_INDEX.json", "CSL-01_COLLISIONS.json"),
                                   (source, index, report)):
            self.assertEqual(render(value), (ROOT / OUTPUT / filename).read_text(encoding="utf-8"))
        self.assertEqual(144, len(index["topic_ids"]))
        self.assertEqual(144, len(set(index["topic_ids"])))
        self.assertLessEqual(len(render(index).encode()), 1048576)
        self.assertGreater(report["source_class_counts"]["contrastive"], 0)
        authored = [row for row in source["rows"] if row["generator_mode"] == "model_authored_catalog_only_v1"]
        self.assertEqual(288, len(authored))
        self.assertEqual(set(index["topic_ids"]), {row["topic_id"] for row in authored})

    def test_collision_terms_cannot_assign(self):
        _, index, report = compile_sources()
        collision_text = {row["family_key"] for row in report["collisions"]}
        self.assertTrue(collision_text)
        self.assertFalse(collision_text.intersection(family_key(row[0]) for row in index["terms"]))
        self.assertTrue(all(row["weight"] == 0 for row in json.loads(
            (ROOT / OUTPUT / "CSL-01_SOURCE.json").read_text(encoding="utf-8"))["rows"]
            if row["source_class"] == "contrastive"))


if __name__ == "__main__":
    unittest.main()
