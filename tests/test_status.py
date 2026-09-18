import unittest
from semantic_lab.status import StatusTransitionError, transition_round, unlock_immediate_dependency

class StatusTests(unittest.TestCase):
    def base(self):
        return {"rounds": {
            "SEM-00": {"execution_status": "READY", "capability_verdict": "UNTESTED"},
            "SEM-01": {"execution_status": "NOT_STARTED", "capability_verdict": "UNTESTED", "depends_on": "SEM-00"},
            "SEM-02": {"execution_status": "NOT_STARTED", "capability_verdict": "UNTESTED", "depends_on": "SEM-01"},
        }}

    def test_ready_requires_execution_flag(self):
        with self.assertRaises(StatusTransitionError):
            transition_round(self.base(), "SEM-00", "IN_PROGRESS")

    def test_complete_unlocks_only_dependency(self):
        running = transition_round(self.base(), "SEM-00", "IN_PROGRESS", explicit_authorization=True)
        done = transition_round(running, "SEM-00", "COMPLETE", capability_verdict="PASS")
        value = unlock_immediate_dependency(done, "SEM-00")
        self.assertEqual("COMPLETE", value["rounds"]["SEM-00"]["execution_status"])
        self.assertEqual("READY", value["rounds"]["SEM-01"]["execution_status"])
        self.assertEqual("NOT_STARTED", value["rounds"]["SEM-02"]["execution_status"])
        self.assertFalse(value["rounds"]["SEM-01"]["explicit_execution_authorized"])

if __name__ == "__main__":
    unittest.main()
