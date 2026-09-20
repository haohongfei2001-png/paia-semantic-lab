# PAIA Semantic Lab

Independent R&D repository for **PAIA Semantic Engine**.

Semantic Lab is isolated from PAIA production. It must not modify production runtime, schema, Reader, Thought Library, Capture, ANS status, or real archive data unless an authority document explicitly changes that boundary.

## Current state

Semantic Lab v0.2 is closed at SEM-07 with execution COMPLETE and semantic capability verdict FAIL. Its historical state remains in `status/SEMANTIC_LAB_STATUS.yaml`.

PAIA-SEMANTIC-LAB-v0.3-REMEDIATION is blocked at REM-03B COMPLETE/FAIL. The active escalation package is **PAIA-SEMANTIC-CATALOG-ARCHITECTURE-v0.1**, which separates the owner-controlled Formal Topic Contract from a rebuildable Derived Semantic Profile layer. Its canonical state is `status/SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml`.

Start current catalog-architecture work with:
- `docs/catalog-architecture-v0.1/PRE_IMPLEMENTATION_FREEZE.md`
- `docs/catalog-architecture-v0.1/DEVELOPMENT_PLAN.md`
- `docs/catalog-architecture-v0.1/EXECUTION_PROTOCOL.md`
- `docs/catalog-architecture-v0.1/VERIFICATION.md`
- `status/SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml`

The v0.3 remediation authority remains in `docs/remediation-v0.3/` and `status/SEMANTIC_REMEDIATION_STATUS.yaml`.

The v0.2 freeze remains the inherited product-semantic baseline. v0.3 remediates representation, retrieval/candidate generation and Router implementation without lowering final certification thresholds.