from __future__ import annotations

import unittest

from semantic_lab.contracts import repo_root
from semantic_lab.fixtures import load_safe_fixtures
from semantic_lab.isolation import (
    IsolationViolation,
    assert_capability_allowed,
    static_runtime_isolation_audit,
    treat_as_inert_data,
    validate_fixture_pack,
)


class IsolationTests(unittest.TestCase):
    def test_denied_capabilities(self) -> None:
        for capability in (
            "production_write",
            "real_archive_read",
            "real_input_api_egress",
            "model_training",
            "owner_label_task",
            "automatic_topic_creation",
        ):
            with self.assertRaises(IsolationViolation):
                assert_capability_allowed(capability)

    def test_runtime_import_isolation(self) -> None:
        self.assertEqual([], static_runtime_isolation_audit(repo_root()))

    def test_fixture_provenance(self) -> None:
        self.assertEqual(1.0, validate_fixture_pack(load_safe_fixtures()))

    def test_instruction_injection_is_inert(self) -> None:
        for case in load_safe_fixtures()["cases"]:
            if case["kind"] == "prompt_injection":
                value = treat_as_inert_data(case["text"])
                self.assertEqual(case["text"], value["text"])
                self.assertEqual("INERT_FIXTURE_DATA", value["interpretation"])


if __name__ == "__main__":
    unittest.main()
