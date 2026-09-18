# SEM-07 — Independent Lockbox + Future Integration Contract

## Implementation scope
Run frozen B2 lockbox once; reproduce from clean environment; finalize capability matrix, future integration boundary and small-model eligibility assessment.

## Non-scope
No PAIA production integration; no feature flag; no classifier training.

## Tests
All critical lockbox slices; catalog/revision mismatch; stale decisions; provider failure; rebuild; withdrawal; clean reproduction.

## Metrics
Applicable G0–G8 gates; confidence intervals; reproducibility; cost/resources; contract safety.

## Acceptance gate
G8. Each capability is separately PASS / FAIL / INCONCLUSIVE. Only PASS capabilities may become `candidate_for_separate_integration_review`.

## Artifacts
Semantic Lab v0 report; capability matrix; finalized integration contract; reproducibility report; small-model eligibility verdict.

## Commit protocol
Read remote HEAD/status → execute this round only → lockbox/tests → artifacts/status → commit/push → re-read remote → stop. No production integration.
