# SEM-04 — Personal Router Infrastructure + Calibration Machinery

## Implementation scope

Implement the Personal Semantic Router pipeline over existing Topic candidates, ASSIGNED/UNASSIGNED/DEFER output contracts, evidence tracing, user-override guards, CalibrationRecord persistence/reuse, oracle-candidate diagnostics and uncertainty/disagreement instrumentation.

## Non-scope

No owner personal gold; no small classifier/distillation; no AI Topic creation; no production integration; no claim that personal routing quality is proven.

## Evidence allowed

Synthetic/catalog boundary fixtures, generated ambiguous cases, machine disagreement, public semantic tasks, deterministic user-override fixtures, existing reusable gold if available in a future replay.

## Required tests

ASSIGNED/UNASSIGNED/DEFER contract; multi-label fixtures; oracle candidate path; confusing-neighbor cases; synthetic manual overrides; stale revision/catalog guards; prompt-injection fixtures; CalibrationRecord append/supersede/reuse; repeated-run disagreement capture.

## Metrics

Synthetic/public routing correctness; evidence validity; override violations; calibration persistence/reuse; disagreement/uncertainty yield; cost/decision on non-private evidence.

## Acceptance gate

Infrastructure/safety may PASS. Personalized Router quality must remain PROVISIONAL/INCONCLUSIVE until SEM-06/07 gold.

## Artifacts

Router infrastructure report; decision policy implementation contract; calibration machinery report; high-information sampling signals for SEM-06.

## Commit protocol

Execute this round only → tests → artifacts/status → commit/push → re-read remote → stop. No owner semantic judgment.
