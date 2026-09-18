# SEM-02 — Authorized Input Retrieval + Reusable Personal Gold

## Implementation scope / non-scope / tests / metrics / gate / artifacts
Implementation scope: import explicitly authorized read-only snapshot; semantic Input retrieval; first concentrated reusable B1 gold only where needed; automatic qualified-model/hybrid/rerank comparison.
Non-scope: no Thought Library writes; no repeated per-model labeling; no activation logic.
Tests: representative/challenge retrieval; qrel pooling; short/long Inputs; Chinese/mixed; exact-term regression; blind reusable annotation batch.
Metrics: G3 metrics; label count/coverage; owner annotation time; Judged@k; paired model deltas.
Acceptance gate: G0 + G3 with sufficient evidence, otherwise INCONCLUSIVE. Gold must remain independent of whichever model wins.
Artifacts: B1 gold v1; retrieval policy; real-Input scorecard; frozen retrieval configuration(s).

## Commit protocol
Read remote HEAD/status → execute this round only → run required tests → write artifacts/status → commit/push → re-read remote HEAD/status/critical files → stop. Do not start the next round.
