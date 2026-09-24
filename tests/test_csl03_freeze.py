from __future__ import annotations

import hashlib
import json
import unittest
from collections import Counter

from scripts.csl03_build_fixture import AUTHORED, MANIFEST, OUTPUT, ROOT, build


class CSL03PreOpenTests(unittest.TestCase):
    def test_evaluator_inputs_and_frozen_case_counts(self):
        payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
        self.assertEqual(payload, build())
        self.assertEqual(Counter(case["kind"] for case in payload["cases"]),
                         {"single_label": 288, "context": 72, "multi_label": 18, "should_defer": 18})
        self.assertEqual(144, len({case["gold_topics"][0] for case in payload["cases"]
                                   if case["kind"] == "single_label"}))

    def test_pre_open_hashes_and_zero_reads(self):
        freeze = json.loads((ROOT / "artifacts/compiled-semantic-lexicon-v1/CSL-03_PRE_OPEN_FREEZE.json").read_text())
        sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
        self.assertEqual(freeze["evaluator_manifest_sha256"], sha(MANIFEST))
        self.assertEqual(freeze["test_v1_authored_source_sha256"], sha(AUTHORED))
        self.assertEqual(freeze["test_v1_fixture_sha256"], sha(OUTPUT))
        self.assertEqual(0, freeze["test_v1_evaluation_invocations"])
        self.assertEqual(0, freeze["private_artifact_reads"])


if __name__ == "__main__":
    unittest.main()
