import pathlib
import unittest

from scripts.sca02_validate_contrastive import validate_sca02

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SCA02ContrastiveValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.summary = validate_sca02(ROOT)

    def test_graph_has_full_sibling_contrast_coverage(self):
        self.assertEqual(144, self.summary["node_count"])
        self.assertEqual(504, self.summary["edge_count"])
        self.assertEqual(7, self.summary["min_node_degree"])
        self.assertEqual(7, self.summary["max_node_degree"])
        self.assertEqual(18, len(self.summary["domain_edge_counts"]))
        self.assertTrue(all(value == 28 for value in self.summary["domain_edge_counts"].values()))

    def test_synthetic_suite_has_expected_coverage(self):
        self.assertEqual(288, self.summary["positive_case_count"])
        self.assertEqual(1008, self.summary["hard_negative_case_count"])
        self.assertEqual(1296, self.summary["total_case_count"])

    def test_synthetic_boundary_oracle_is_consistent(self):
        self.assertEqual(1.0, self.summary["synthetic_boundary_oracle_accuracy"])

    def test_no_formal_semantic_mutation_or_private_reads(self):
        self.assertEqual(0, self.summary["formal_semantic_mutation_events"])
        self.assertEqual(0, self.summary["formal_review_required_count"])
        self.assertEqual(0, self.summary["private_artifact_reads"])

    def test_graph_and_suite_digests_are_sha256(self):
        for key in ("graph_sha256", "synthetic_suite_sha256"):
            digest = self.summary[key]
            self.assertEqual(64, len(digest))
            int(digest, 16)

    def test_suite_is_bilingual(self):
        self.assertGreater(self.summary["language_counts"]["zh"], 0)
        self.assertGreater(self.summary["language_counts"]["en"], 0)


if __name__ == "__main__":
    unittest.main()
