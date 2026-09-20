import pathlib
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SCA02StatusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml").read_text()
        )

    def test_sca02_is_complete_pass(self):
        sca02 = self.status["rounds"]["SCA-02"]
        self.assertEqual("COMPLETE", sca02["execution_status"])
        self.assertEqual("PASS", sca02["capability_verdict"])
        self.assertTrue(sca02["explicit_execution_authorized"])
        self.assertEqual(0, sca02["private_artifact_reads"])
        self.assertEqual(0, sca02["formal_catalog_edits"])
        self.assertEqual(0, sca02["formal_semantic_mutation_events"])
        self.assertEqual(0, sca02["formal_review_required_count"])
        self.assertEqual(144, sca02["graph_node_count"])
        self.assertEqual(504, sca02["graph_edge_count"])
        self.assertEqual(1296, sca02["total_case_count"])

    def test_sca03_waits_for_sca02_exact_head_ci(self):
        sca02 = self.status["rounds"]["SCA-02"]
        sca03 = self.status["rounds"]["SCA-03"]
        if sca02["closure_required_ci"] == "PASS":
            self.assertIn(
                self.status["phase"],
                {"SCA_03_READY", "SCA_03_IN_PROGRESS", "SCA_03_COMPLETE_PENDING_CI", "SCA_04_READY"},
            )
            self.assertIn(sca03["execution_status"], {"READY", "IN_PROGRESS", "COMPLETE"})
            if sca03["execution_status"] == "READY":
                self.assertFalse(sca03["explicit_execution_authorized"])
            else:
                self.assertTrue(sca03["explicit_execution_authorized"])
        else:
            self.assertEqual("SCA_02_COMPLETE_PENDING_CI", self.status["phase"])
            self.assertEqual("BLOCKED", sca03["execution_status"])
            self.assertEqual("SCA_02_CLOSURE_CI_PENDING", sca03["blocked_by"])


if __name__ == "__main__":
    unittest.main()
