# SEM-00 — Lab Foundation + Catalog Validation Harness

## Implementation scope / non-scope / tests / metrics / gate / artifacts
Implementation scope: isolated Lab scaffold; schema validators; Topic Catalog loader/auditor; synthetic fixtures; benchmark runner skeleton; run manifests; canonical status machinery.
Non-scope: no real PAIA archive; no model training; no real-data API calls; no production writes; no semantic-quality claim.
Tests: repository isolation; contract validation; 144-topic load; duplicate/alias/lineage audit; permission/prompt-injection fixtures; status-transition tests.
Metrics: schema validity; catalog count/integrity; audit findings; provenance completeness; isolation violations.
Acceptance gate: G0 + G1. All hard isolation tests pass. Catalog draft is machine-valid; overlap warnings may remain only as an explicit audit queue.
Artifacts: SEM-00 report; validators/audits; safe fixture pack; benchmark skeleton; status update.

## Commit protocol
Read remote HEAD/status → execute this round only → run required tests → write artifacts/status → commit/push → re-read remote HEAD/status/critical files → stop. Do not start the next round.
