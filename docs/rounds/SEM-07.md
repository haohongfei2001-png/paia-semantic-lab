# SEM-07 — Frozen Personal Evaluation / Lockbox + Automatic Final Comparison + Future Integration Contract + Small-model Eligibility

## Implementation scope

Freeze all qualified embedding/retrieval/Router configurations and automatically re-run them against the same SEM-06 reusable personal gold and held-out lockbox. Produce final per-capability PASS/FAIL/INCONCLUSIVE verdicts, Pareto comparison, future PAIA integration contract, reproducibility report and small-model eligibility assessment.

## Owner Attention Budget

Normal SEM-07 evaluation requires **zero new owner labels**.

All qualified models/configurations MUST use the same existing gold. No model-specific human evaluation is permitted.

A new owner question is allowed only for a genuinely new Topic-boundary ambiguity that:
1. was not representable under the frozen catalog boundary;
2. cannot be resolved from existing reusable gold;
3. materially blocks interpretation of the lockbox.

Such an exception is recorded as a catalog/product-boundary issue, not silently folded into model evaluation.

## Non-scope

No PAIA production integration; no feature flag; no classifier/distillation training; no repeated owner model trial.

## Required tests

Frozen personal retrieval; full-catalog candidate recall including inactive Topics; Router ASSIGNED/UNASSIGNED/DEFER; activation replay against confirmed semantic events; critical language/short/long slices; clean-environment reproduction; revision/catalog mismatch; stale decisions; provider failure; rebuild/withdrawal; automatic cross-model comparison.

## Metrics

Input retrieval nDCG/Recall/MRR; full-catalog Candidate Recall@k; inactive recall/gap; Router macro/micro F1; accepted precision/coverage; UNASSIGNED/DEFER metrics; activation metrics; confidence intervals; latency/memory/cost/privacy; reproducibility; owner-attention count (target 0).

## Acceptance gate

Each capability is separately PASS / FAIL / INCONCLUSIVE. No composite score may hide a failed safety/critical slice. Only PASS capabilities may become `candidate_for_separate_integration_review`.

Small-model eligibility is assessed only from measured personal Router bottlenecks and available reusable gold; no model is trained in SEM-07.

## Artifacts

Final Semantic Lab v0 report; frozen personal scorecard; capability matrix; model/Router Pareto frontier; integration contract; reproducibility report; small-model eligibility verdict; owner-attention audit.

## Commit protocol

Execute this round only → frozen automatic evaluation → artifacts/status → commit/push → re-read remote → stop. No production integration or training.
