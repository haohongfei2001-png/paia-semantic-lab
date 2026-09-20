import pathlib
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Rem03BPlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = yaml.safe_load(
            (ROOT / "configs" / "rem03b_structured_candidate_v0.1.yaml").read_text()
        )
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_REMEDIATION_STATUS.yaml").read_text()
        )
        cls.catalog = yaml.safe_load(
            (ROOT / "catalog" / "system_topic_catalog_v0.2.yaml").read_text()
        )

    def test_rem03b_is_plan_only_and_not_authorized(self):
        self.assertEqual("FROZEN_PLAN_ONLY", self.config["status"])
        self.assertFalse(self.config["authorization"]["execution_authorized"])
        self.assertEqual(
            "REQUIRES_FRESH_EXPLICIT_AUTHORIZATION",
            self.config["authorization"]["private_artifact_access"],
        )
    def test_catalog_structure_supports_domain_backoff(self):
        topics = self.catalog["topics"]
        self.assertEqual(144, len(topics))
        by_domain = {}
        for topic in topics:
            by_domain.setdefault(topic["internal_domain"], []).append(topic["topic_id"])
        self.assertEqual(18, len(by_domain))
        self.assertTrue(all(len(values) == 8 for values in by_domain.values()))
        self.assertEqual(
            0,
            sum(len(topic.get("confusing_neighbor_topic_ids") or []) for topic in topics),
        )

    def test_catalog_audit_records_template_collapse(self):
        audit = self.config["catalog_audit"]
        self.assertEqual(1, audit["definition_templates_after_topic_mask"])
        self.assertEqual(1, audit["inclusion_templates_after_topic_mask"])
        self.assertEqual(1, audit["representative_example_templates_after_topic_mask"])
        self.assertEqual(2, audit["exclusion_templates_after_topic_mask"])
        self.assertEqual(0, audit["confusing_neighbor_edges"])

    def test_matrix_is_bounded(self):
        dev = self.config["development"]
        size = (
            len(dev["query_variants"])
            * len(dev["domain_evidence"])
            * len(dev["anchor_modes"])
        )
        self.assertEqual(12, size)
        self.assertLessEqual(size, dev["maximum_matrix_size"])
    def test_original_candidate_gates_and_safety_are_preserved(self):
        gate = self.config["promotion_gate"]
        self.assertGreaterEqual(gate["candidate_recall_at_10_min"], 0.96)
        self.assertGreaterEqual(gate["candidate_recall_at_20_min"], 0.99)
        policy = self.config["candidate_policy"]
        self.assertFalse(policy["domain_ids_assignable"])
        self.assertTrue(policy["zero_prototype_topics_remain_eligible"])
        self.assertEqual("DENY", policy["generated_synonyms"])
        self.assertEqual("DENY", policy["generated_examples"])
        self.assertEqual("DENY", policy["catalog_edits"])
        self.assertFalse(policy["automatic_topic_creation"])

    def test_private_guards_remain_denied(self):
        auth = self.config["authorization"]
        self.assertEqual("DENY", auth["consumed_sem07_lockbox_tuning_or_promotion"])
        self.assertEqual("DENY", auth["real_input_api_egress"])
        self.assertEqual("DENY", auth["model_training"])
        self.assertEqual("DENY", auth["production_paia_write"])
        self.assertEqual("DENY", auth["new_owner_labels"])

    def test_status_preserves_failed_history_and_blocks_router(self):
        self.assertEqual("COMPLETE", self.status["rounds"]["REM-03A"]["execution_status"])
        self.assertEqual("FAIL", self.status["rounds"]["REM-03A"]["capability_verdict"])
        rem03b = self.status["rounds"]["REM-03B"]
        self.assertIn(rem03b["capability_verdict"], {"UNTESTED", "PASS", "FAIL"})
        if rem03b["execution_status"] == "READY":
            self.assertFalse(rem03b["explicit_execution_authorized"])
            self.assertEqual("REM_03B_READY", self.status["phase"])
        elif rem03b["execution_status"] in {"IN_PROGRESS", "COMPLETE"}:
            self.assertTrue(rem03b["explicit_execution_authorized"])
            self.assertNotEqual(
                "requires_fresh_explicit_round_authorization",
                rem03b["existing_private_artifacts_read"],
            )
        else:
            self.assertEqual("BLOCKED", rem03b["execution_status"])
            self.assertEqual("REM_03B_AMENDMENT_CI_PENDING", self.status["phase"])
            self.assertEqual("REM_03B_AMENDMENT_CI_PENDING", rem03b["blocked_by"])
        rem04 = self.status["rounds"]["REM-04"]
        self.assertEqual("BLOCKED", rem04["execution_status"])
        self.assertEqual("REM-03B", rem04["depends_on"])
        self.assertEqual("REM_03B_CANDIDATE_PROMOTION_PASS", rem04["prerequisite"])


if __name__ == "__main__":
    unittest.main()