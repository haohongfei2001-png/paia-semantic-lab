# PAIA Semantic Lab v0.3 Remediation

Package ID: `PAIA-SEMANTIC-LAB-v0.3-REMEDIATION`

Status: **FROZEN / REM-00 READY / NOT AUTHORIZED**

Baseline: Semantic Lab v0.2 closed at remote main commit `28c82a95fd1ee6d642fc6a033ce1bf734cc8df53` with SEM-07 execution COMPLETE and semantic capability verdict FAIL.

## Purpose

v0.3 is a remediation package, not SEM-08 and not a production-integration package.

Its goal is to determine and repair the measured failures in:
- Input semantic retrieval;
- full-catalog Topic candidate retrieval;
- Personal Semantic Router behavior;
- context representation and evidence flow.

The package preserves the v0.2 product semantics and certification thresholds. It may change experimental representation, retrieval, reranking and Router implementation inside Semantic Lab only.

## Non-goals

v0.3 does not:
- modify PAIA production runtime, schema, Reader, Thought Library, Capture or ANS state;
- create, merge, split or silently rewrite formal Topics;
- lower any v0.2 final certification threshold;
- train a classifier/distilled small model;
- use API models on real Inputs by default;
- treat the consumed SEM-07 lockbox as a fresh holdout;
- perform production integration even if a capability later passes.

Any production integration or model-training package requires separate authorization after v0.3 closes.

## Canonical package files

- `PRE_IMPLEMENTATION_FREEZE.md`
- `DEVELOPMENT_PLAN.md`
- `EXECUTION_PROTOCOL.md`
- `VERIFICATION.md`
- `rounds/REM-00.md` through `rounds/REM-06.md`
- `../../status/SEMANTIC_REMEDIATION_STATUS.yaml`
- `../../configs/semantic_remediation_v0.3.yaml`
