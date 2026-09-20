# PAIA Semantic Lab

Independent R&D repository for **PAIA Semantic Engine**.

Semantic Lab is isolated from PAIA production. It must not modify production runtime, schema, Reader, Thought Library, Capture, ANS status, or real archive data unless an authority document explicitly changes that boundary.

## Current state

Semantic Lab v0.2 is closed at SEM-07 with execution COMPLETE and semantic capability verdict FAIL. Its historical state remains in `status/SEMANTIC_LAB_STATUS.yaml`.

The current research package is **PAIA-SEMANTIC-LAB-v0.3-REMEDIATION**. REM-03A closed COMPLETE/FAIL after materially improving but not passing candidate recall. A plan-only REM-03B structured Domain-backoff amendment is now being frozen as the next candidate-remediation prerequisite before Router work. Its canonical state is `status/SEMANTIC_REMEDIATION_STATUS.yaml`.

Start v0.3 work with:
- `docs/remediation-v0.3/PRE_IMPLEMENTATION_FREEZE.md`
- `docs/remediation-v0.3/DEVELOPMENT_PLAN.md`
- `docs/remediation-v0.3/EXECUTION_PROTOCOL.md`
- `docs/remediation-v0.3/VERIFICATION.md`
- `status/SEMANTIC_REMEDIATION_STATUS.yaml`

The v0.2 freeze remains the inherited product-semantic baseline. v0.3 remediates representation, retrieval/candidate generation and Router implementation without lowering final certification thresholds.