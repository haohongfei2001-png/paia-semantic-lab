import pathlib
import unittest

from scripts.sca01_compile_profiles import compile_profiles

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SCA01ProfileBundleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.summary = compile_profiles(ROOT)

    def test_full_profile_coverage_and_exact_ids(self):
        self.assertEqual(144, self.summary["profile_count"])
        self.assertEqual(144, self.summary["expected_system_topic_count"])
        self.assertTrue(self.summary["topic_id_set_exact_match"])

    def test_profiles_are_topic_specific(self):
        self.assertEqual(144, self.summary["semantic_core_unique_count"])

    def test_formal_catalog_and_private_data_are_untouched(self):
        self.assertFalse(self.summary["formal_catalog_modified"])
        self.assertEqual(0, self.summary["formal_semantic_mutation_events"])
        self.assertEqual(0, self.summary["private_artifact_reads"])

    def test_provenance_is_complete(self):
        self.assertEqual(1.0, self.summary["provenance_coverage"])

    def test_bundle_digest_is_sha256(self):
        digest = self.summary["canonical_profiles_sha256"]
        self.assertEqual(64, len(digest))
        int(digest, 16)

    def test_all_six_shards_are_bound_by_git_blob_sha(self):
        self.assertEqual(6, len(self.summary["shards"]))
        self.assertTrue(all(row["profile_count"] == 24 for row in self.summary["shards"]))


if __name__ == "__main__":
    unittest.main()
