# SEM-04 — Personal Semantic Router + Calibration Layer

## Implementation scope / non-scope / tests / metrics / gate / artifacts
Implementation scope: embedding candidates + strong semantic decision model; ASSIGNED/UNASSIGNED/DEFER; multi-label routing; evidence; user overrides; append-only CalibrationRecord.
Non-scope: no small classifier/distillation; no AI Topic creation; no production integration.
Tests: nearest-only vs candidates+semantic decision; oracle candidates; confusing neighbors; UNASSIGNED; DEFER; user corrections; repeated-run stability; prompt-injection fixtures.
Metrics: G5 Router metrics; evidence validity; calibration reuse; cost/decision; error-source decomposition.
Acceptance gate: G0 + G5. User override violations and unauthorized mutation must be zero.
Artifacts: Router report; decision policy; calibration format; frozen decision configuration or INCONCLUSIVE verdict.

## Commit protocol
Read remote HEAD/status → execute this round only → run required tests → write artifacts/status → commit/push → re-read remote HEAD/status/critical files → stop. Do not start the next round.
