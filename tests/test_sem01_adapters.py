from __future__ import annotations

import unittest

from semantic_lab.embedding_adapters import (
    ApiEmbeddingAdapter,
    CandidateSpec,
    HashNgramEmbeddingAdapter,
    InputTooLongError,
    LocalEmbeddingAdapter,
    UnsafeEgressError,
    apply_prompt,
    deterministic_fake_encoder,
    whitespace_token_counter,
)
from semantic_lab.sem01 import TASK_INSTRUCTION, load_sem01_config, run_sem01


class Sem01AdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_sem01_config()
        cls.specs = {
            item["id"]: CandidateSpec.from_dict(item)
            for item in cls.config["candidates"]
        }

    def test_frozen_candidate_manifest_count(self) -> None:
        self.assertEqual(7, len(self.specs))

    def test_instruction_and_prefix_contracts(self) -> None:
        qwen = apply_prompt(
            self.specs["Qwen/Qwen3-Embedding-0.6B"],
            "query",
            "测试",
            TASK_INSTRUCTION,
        )
        self.assertIn("Instruct:", qwen)
        self.assertIn("\nQuery: 测试", qwen)
        nomic = apply_prompt(
            self.specs["nomic-ai/nomic-embed-text-v2-moe"],
            "document",
            "document",
            TASK_INSTRUCTION,
        )
        self.assertEqual("search_document: document", nomic)

    def test_local_adapter_rejects_over_context(self) -> None:
        spec = CandidateSpec(
            candidate_id="synthetic-local",
            kind="local",
            provider=None,
            license="test-only",
            context_tokens=2,
            dimensions=(8,),
            prompt_policy="none",
            runtime_policy="TEST",
            source_urls=("synthetic://test",),
        )
        adapter = LocalEmbeddingAdapter(
            spec,
            token_counter=whitespace_token_counter,
            encoder=lambda texts: deterministic_fake_encoder(texts, dimensions=8),
            task_instruction=TASK_INSTRUCTION,
        )
        with self.assertRaises(InputTooLongError):
            adapter.embed(["one two three"], role="query")

    def test_api_payload_disables_truncation_and_real_input_egress(self) -> None:
        spec = self.specs["voyage-4"]
        captured = []
        adapter = ApiEmbeddingAdapter(
            spec,
            transport=lambda payload: captured.append(payload) or {"data": []},
            token_counter=whitespace_token_counter,
        )
        adapter.embed(
            ["synthetic"],
            role="query",
            evidence_class="synthetic",
            contains_real_paia_input=False,
        )
        self.assertIs(False, captured[0]["truncation"])
        with self.assertRaises(UnsafeEgressError):
            adapter.embed(
                ["real"],
                role="query",
                evidence_class="synthetic",
                contains_real_paia_input=True,
            )

    def test_hash_control_is_deterministic(self) -> None:
        adapter = HashNgramEmbeddingAdapter(dimensions=32)
        self.assertEqual(adapter.embed(["同一输入"]), adapter.embed(["同一输入"]))

    def test_sem01_engineering_gate(self) -> None:
        result = run_sem01("1" * 40)
        self.assertTrue(result["pass"])
        self.assertEqual("PASS", result["gates"]["G0_isolation"])
        self.assertEqual("PASS", result["gates"]["G2_bakeoff_engineering"])
        self.assertEqual("INCONCLUSIVE", result["gates"]["personalized_semantic_quality"])
        self.assertFalse(result["benchmark"]["contains_real_paia_input"])
        self.assertEqual(1.0, result["metrics"]["candidate_manifest_coverage"])
        self.assertEqual(7, result["metrics"]["candidate_count"])
        self.assertEqual(7, result["metrics"]["adapter_contract_pass_count"])
        self.assertEqual(0, result["metrics"]["owner_attention_policy_violations"])
        self.assertEqual(0, result["metrics"]["truncation_policy_failures"])
        self.assertEqual(0, result["metrics"]["real_input_api_egress_events"])
        self.assertEqual(0, result["metrics"]["live_api_calls"])
        self.assertEqual(0, result["metrics"]["runtime_model_quality_runs"])
        self.assertEqual([], result["qualified_shortlist"]["runtime_qualified"])
        self.assertIsNone(result["qualified_shortlist"]["winner"])
        self.assertLessEqual(result["machine_disagreement"]["stored_count"], 200)
        for candidate in result["candidate_scorecard"]:
            self.assertFalse(candidate["runtime_model_evaluated"])
            self.assertIsNone(candidate["quality_metrics"])


if __name__ == "__main__":
    unittest.main()
