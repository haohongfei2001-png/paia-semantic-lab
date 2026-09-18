# SEM-01 — Automated Embedding Bake-off + B0

## Implementation scope / non-scope / tests / metrics / gate / artifacts
Implementation scope: local/API adapters on public/synthetic data; lexical control; exact-vector baseline; automatic compatibility/latency/memory scorecard; B0 multilingual diagnostics.
Non-scope: no owner model trial; no real-data API egress; no personalized winner claim; no Router training.
Tests: every shortlisted candidate on identical B0; task instruction/prefix correctness; truncation=error; repeatability; Chinese/mixed/short/long public or synthetic slices.
Metrics: public/synthetic retrieval and STS diagnostics; latency; peak memory; dimensions/index size; errors; maintenance/reproducibility risk.
Acceptance gate: G0 + G2. Broken candidates may be eliminated, but B0 alone cannot establish the personalized winner.
Artifacts: automatic scorecard; model manifests; qualified candidate set; B1 sampling plan.

## Commit protocol
Read remote HEAD/status → execute this round only → run required tests → write artifacts/status → commit/push → re-read remote HEAD/status/critical files → stop. Do not start the next round.
