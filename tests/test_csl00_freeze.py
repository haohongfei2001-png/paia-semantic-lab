from __future__ import annotations

import json
import unittest

from scripts.csl00_freeze import MANIFEST, ROOT, render, restricted_manifest


class CSL00FreezeTests(unittest.TestCase):
    def test_restricted_manifest_rebuilds_exactly(self):
        self.assertEqual(render(restricted_manifest()), (ROOT / MANIFEST).read_text(encoding="utf-8"))

    def test_only_formal_fields_cross_evaluator_boundary(self):
        payload = json.loads((ROOT / MANIFEST).read_text(encoding="utf-8"))
        self.assertEqual(144, payload["topic_count"])
        self.assertEqual({"format", "catalog_version", "catalog_sha256", "topic_count", "topics"}, set(payload))
        allowed = {"topic_id", "name", "definition", "inclusion_boundary", "exclusion_boundary"}
        self.assertTrue(all(set(topic) == allowed for topic in payload["topics"]))


if __name__ == "__main__":
    unittest.main()
