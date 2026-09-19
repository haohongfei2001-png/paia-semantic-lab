import pathlib
import unittest

from scripts.rem00_failure_attribution import load_config, primary_attribution

ROOT = pathlib.Path(__file__).resolve().parents[1]


def fact(*, c10=False, c20=False, state="DEFER", exact=False):
    return {
        "candidate_complete_top10": c10,
        "candidate_complete_top20": c20,
        "router_state": state,
        "router_exact": exact,
    }


class Rem00FailureAttributionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_config(ROOT / "configs" / "rem00_attribution_v0.1.yaml")

    def case(self, **kwargs):
        value = {
            "truth_state": "ASSIGNED",
            "context_dependent": False,
            "boundary_ambiguity": False,
        }
        value.update(kwargs)
        return value

    def test_data_class_gap_precedes_other_failures(self):
        models = {"a": fact(), "b": fact()}
        self.assertEqual(
            "DATA_CLASS_GAP",
            primary_attribution(self.case(truth_state="DEFER"), models),
        )

    def test_catalog_boundary_precedes_candidate_failure(self):
        models = {"a": fact(), "b": fact()}
        self.assertEqual(
            "CATALOG_BOUNDARY",
            primary_attribution(self.case(boundary_ambiguity=True), models),
        )

    def test_context_representation_requires_shared_top20_failure(self):
        models = {"a": fact(), "b": fact()}
        self.assertEqual(
            "CONTEXT_REPRESENTATION",
            primary_attribution(self.case(context_dependent=True), models),
        )
        one_complete = {"a": fact(c20=True), "b": fact()}
        self.assertNotEqual(
            "CONTEXT_REPRESENTATION",
            primary_attribution(self.case(context_dependent=True), one_complete),
        )

    def test_candidate_miss_and_low_rank_are_separate(self):
        self.assertEqual(
            "CANDIDATE_MISS",
            primary_attribution(self.case(), {"a": fact(), "b": fact()}),
        )
        low = {
            "a": fact(c20=True),
            "b": fact(c20=True),
        }
        self.assertEqual(
            "CANDIDATE_LOW_RANK",
            primary_attribution(self.case(), low),
        )

    def test_router_abstention_only_after_top10_candidate_exists(self):
        models = {
            "a": fact(c10=True, c20=True, state="DEFER"),
            "b": fact(c10=True, c20=True, state="UNASSIGNED"),
        }
        self.assertEqual("ROUTER_ABSTENTION", primary_attribution(self.case(), models))

    def test_router_wrong_assignment(self):
        models = {
            "a": fact(c10=True, c20=True, state="ASSIGNED", exact=False),
            "b": fact(c10=True, c20=True, state="DEFER"),
        }
        self.assertEqual(
            "ROUTER_WRONG_ASSIGNMENT",
            primary_attribution(self.case(), models),
        )

    def test_consumed_lockbox_is_diagnostic_only(self):
        self.assertEqual(
            "LEGACY_DIAGNOSTIC_ONLY",
            self.config["scope"]["consumed_lockbox_role"],
        )
        self.assertFalse(self.config["scope"]["tuning_allowed"])
        self.assertEqual(35, self.config["scope"]["expected_cases"])
        self.assertEqual(
            [
                "DATA_CLASS_GAP",
                "CATALOG_BOUNDARY",
                "CONTEXT_REPRESENTATION",
                "CANDIDATE_MISS",
                "CANDIDATE_LOW_RANK",
                "ROUTER_ABSTENTION",
                "ROUTER_WRONG_ASSIGNMENT",
                "EVIDENCE_GAP",
            ],
            self.config["primary_precedence"],
        )


if __name__ == "__main__":
    unittest.main()
