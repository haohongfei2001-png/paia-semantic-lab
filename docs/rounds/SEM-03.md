# SEM-03 — Full-Catalog Candidate Retrieval

## Implementation scope / non-scope / tests / metrics / gate / artifacts
Implementation scope: represent every system/custom Topic; complete-catalog retrieval; reserved global slots; alias retrieval; confusing-neighbor expansion; weak active-prior ablation.
Non-scope: no final LLM semantic decision; no activation mutation; no Topic creation.
Tests: active/inactive/custom Topic recall; aliases; confusing neighbors; full-catalog scale to 1,024 synthetic Topics; prior on/off ablation.
Metrics: Candidate Recall@5/10/20; inactive Recall@20; active-inactive gap; custom-topic recall; candidate latency/set size.
Acceptance gate: G0 + G4. Inactive Topics must retain full classification eligibility.
Artifacts: candidate retrieval policy; descriptor representation spec; candidate-gold additions; error attribution.

## Commit protocol
Read remote HEAD/status → execute this round only → run required tests → write artifacts/status → commit/push → re-read remote HEAD/status/critical files → stop. Do not start the next round.
