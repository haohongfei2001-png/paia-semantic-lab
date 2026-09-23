# PAIA Semantic Lab

Independent R&D repository for **PAIA Semantic Engine**.

Semantic Lab is isolated from PAIA production. It must not modify production runtime, schema, Reader, Thought Library, Capture, ANS status, or real archive data unless an authority document explicitly changes that boundary.

## Current state

Semantic Lab v0.2 is closed at SEM-07 with execution COMPLETE and semantic capability verdict FAIL. Its historical state remains in `status/SEMANTIC_LAB_STATUS.yaml`.

PAIA-SEMANTIC-LAB-v0.3-REMEDIATION is blocked at REM-03B COMPLETE/FAIL. PAIA-SEMANTIC-CATALOG-ARCHITECTURE-v0.1 reached SCA-03 COMPLETE/FAIL and keeps SCA-04 blocked. The currently authorized bounded repair package is **SCA03-BOUNDED-ARCHITECTURE-AMENDMENT-v0.1**; BAA-01 is PUBLIC/SYNTHETIC-only and implements direct-evidence preservation plus missing-evidence-neutral prototype fusion without reopening SCA-03. Its canonical state is `status/SCA03_BOUNDED_ARCHITECTURE_AMENDMENT_STATUS.yaml`.

Start the current bounded repair work with:
- `docs/bounded-architecture-amendment-v0.1/README.md`
- `docs/bounded-architecture-amendment-v0.1/EXECUTION_PROTOCOL.md`
- `docs/bounded-architecture-amendment-v0.1/VERIFICATION.md`
- `docs/bounded-architecture-amendment-v0.1/rounds/BAA-01.md`
- `status/SCA03_BOUNDED_ARCHITECTURE_AMENDMENT_STATUS.yaml`

The closed catalog-architecture authority remains in `docs/catalog-architecture-v0.1/` and `status/SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml`.

The v0.3 remediation authority remains in `docs/remediation-v0.3/` and `status/SEMANTIC_REMEDIATION_STATUS.yaml`.

The v0.2 freeze remains the inherited product-semantic baseline. v0.3 remediates representation, retrieval/candidate generation and Router implementation without lowering final certification thresholds.