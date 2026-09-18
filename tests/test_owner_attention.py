from __future__ import annotations

import unittest

from semantic_lab.owner_attention import (
    OwnerAttentionViolation,
    SEMANTIC_OWNER_TASKS,
    open_owner_task,
)


class OwnerAttentionTests(unittest.TestCase):
    def test_sem00_through_sem05_block_owner_semantic_tasks(self) -> None:
        for number in range(6):
            for task_type in SEMANTIC_OWNER_TASKS:
                with self.assertRaises(OwnerAttentionViolation):
                    open_owner_task(f"SEM-{number:02d}", task_type)

    def test_ai_formal_topic_creation_task_is_blocked(self) -> None:
        for round_id in ("SEM-00", "SEM-06", "SEM-07"):
            with self.assertRaises(OwnerAttentionViolation):
                open_owner_task(round_id, "create_formal_topic")

    def test_sem06_allows_canonical_truth_but_not_model_trials(self) -> None:
        self.assertEqual("OPEN", open_owner_task("SEM-06", "input_to_topic_label")["status"])
        with self.assertRaises(OwnerAttentionViolation):
            open_owner_task("SEM-06", "per_model_trial")


if __name__ == "__main__":
    unittest.main()