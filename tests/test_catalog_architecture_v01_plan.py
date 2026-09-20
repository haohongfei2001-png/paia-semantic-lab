import json
import pathlib
import re
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]


class CatalogArchitectureV01PlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = yaml.safe_load(
            (ROOT / "configs" / "semantic_catalog_architecture_v0.1.yaml").read_text()
        )
        cls.status = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml").read_text()
        )
        cls.catalog = yaml.safe_load(
            (ROOT / "catalog" / "system_topic_catalog_v0.2.yaml").read_text()
        )
        cls.audit = json.loads(
            (ROOT / "artifacts" / "catalog-architecture-v0.1" / "SCA-00_AUDIT.json").read_text()
        )
        cls.schema = json.loads(
            (ROOT / "schemas" / "topic_semantic_profile_v0.1.schema.json").read_text()
        )
        cls.remediation = yaml.safe_load(
            (ROOT / "status" / "SEMANTIC_REMEDIATION_STATUS.yaml").read_text()
        )

    def test_catalog_audit_is_reproducible(self):
        topics = self.catalog["topics"]
        self.assertEqual(144, len(topics))
        by_domain = {}
        for topic in topics:
            by_domain.setdefault(topic["internal_domain"], []).append(topic["topic_id"])
        self.assertEqual(18, len(by_domain))
        self.assertTrue(all(len(values) == 8 for values in by_domain.values()))

        def masked_templates(field):
            values = []
            for topic in topics:
                value = topic[field]
                rows = value if isinstance(value, list) else [value]
                values.extend(re.sub(r"“[^”]+”", "<TOPIC>", str(row)) for row in rows)
            return len(set(values))

        self.assertEqual(1, masked_templates("definition"))
        self.assertEqual(1, masked_templates("inclusion_boundary"))
        self.assertEqual(1, masked_templates("representative_examples"))
        self.assertEqual(2, masked_templates("exclusion_boundary"))
        self.assertEqual(0, sum(len(t.get("confusing_neighbor_topic_ids") or []) for t in topics))
        self.assertTrue(all(t.get("boundary_status") == "PROVISIONAL" for t in topics))

    def test_two_layer_architecture_forbids_silent_formal_mutation(self):
        formal = self.config["architecture"]["formal_topic_contract"]
        derived = self.config["architecture"]["derived_semantic_profile"]
        self.assertEqual("DENY", formal["ai_formal_topic_creation"])
        self.assertEqual("DENY", formal["ai_silent_formal_mutation"])
        self.assertTrue(formal["formal_boundary_change_requires_explicit_owner_authorization"])
        self.assertEqual("ALLOW_DERIVED_ONLY", derived["generated_lexical_anchors"])
        self.assertEqual("ALLOW_DERIVED_ONLY", derived["generated_synthetic_examples"])
        self.assertFalse(derived["may_override_formal_boundary"])

    def test_profile_schema_binds_existing_topic_without_formal_override(self):
        required = set(self.schema["required"])
        self.assertIn("topic_id", required)
        self.assertIn("formal_semantics_unchanged", required)
        self.assertIn("provenance", required)
        self.assertTrue(self.schema["properties"]["formal_semantics_unchanged"]["const"])
        self.assertFalse(
            self.schema["properties"]["provenance"]["properties"]["formal_fields_overridden"]["const"]
        )

    def test_quality_and_privacy_guards_are_preserved(self):
        gates = self.config["candidate_gates"]
        self.assertEqual(0.96, gates["recall_at_10_min"])
        self.assertEqual(0.99, gates["recall_at_20_min"])
        guards = self.config["guards"]
        self.assertEqual("DENY", guards["real_input_api_egress"])
        self.assertEqual("DENY", guards["model_training"])
        self.assertEqual("DENY", guards["production_paia_write"])
        self.assertEqual(
            "DENY",
            self.config["data_roles"]["consumed_sem07_lockbox_tuning_or_promotion"],
        )

    def test_sca00_is_complete_and_sca01_waits_for_package_ci(self):
        self.assertEqual("COMPLETE", self.status["rounds"]["SCA-00"]["execution_status"])
        self.assertEqual("PASS", self.status["rounds"]["SCA-00"]["capability_verdict"])
        self.assertEqual(0, self.status["rounds"]["SCA-00"]["private_artifact_reads"])
        sca01 = self.status["rounds"]["SCA-01"]
        if self.status["package_freeze_required_ci"] == "PASS":
            self.assertEqual("READY", sca01["execution_status"])
            self.assertEqual("SCA_01_READY", self.status["phase"])
            self.assertFalse(sca01["explicit_execution_authorized"])
        else:
            self.assertEqual("BLOCKED", sca01["execution_status"])
            self.assertEqual("SCA_00_COMPLETE_PENDING_CI", self.status["phase"])

    def test_v03_router_remains_blocked_by_external_catalog_package(self):
        self.assertEqual("REM_03B_COMPLETE_FAIL", self.remediation["phase"])
        rem04 = self.remediation["rounds"]["REM-04"]
        self.assertEqual("BLOCKED", rem04["execution_status"])
        self.assertEqual("REM_03B_CANDIDATE_PROMOTION_FAIL", rem04["blocked_by"])
        external = self.remediation["external_blocker_package"]
        self.assertEqual(
            "PAIA-SEMANTIC-CATALOG-ARCHITECTURE-v0.1",
            external["package_id"],
        )
        self.assertTrue(external["required_before_rem04"])


if __name__ == "__main__":
    unittest.main()
