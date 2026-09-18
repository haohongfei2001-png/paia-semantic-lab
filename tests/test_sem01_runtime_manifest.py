from __future__ import annotations

import unittest

from semantic_lab.embedding_adapters import CandidateSpec, validate_candidate_spec
from semantic_lab.sem01 import load_sem01_config


class Sem01RuntimeManifestTests(unittest.TestCase):
    def test_all_local_runtime_candidates_are_immutably_pinned(self) -> None:
        config = load_sem01_config()
        local = [CandidateSpec.from_dict(item) for item in config["candidates"] if item["kind"] == "local"]
        self.assertEqual(4, len(local))
        for spec in local:
            validate_candidate_spec(spec)
            self.assertIsNotNone(spec.revision)
            self.assertGreaterEqual(len(spec.revision or ""), 40)

    def test_remote_code_is_restricted_to_nomic(self) -> None:
        config = load_sem01_config()
        local = [CandidateSpec.from_dict(item) for item in config["candidates"] if item["kind"] == "local"]
        remote = [spec.candidate_id for spec in local if spec.trust_remote_code]
        self.assertEqual(["nomic-ai/nomic-embed-text-v2-moe"], remote)


if __name__ == "__main__":
    unittest.main()
