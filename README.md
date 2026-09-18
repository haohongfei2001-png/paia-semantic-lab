# PAIA Semantic Lab

Independent R&D repository for **PAIA Semantic Engine v0**.

Canonical execution state is recorded in `status/SEMANTIC_LAB_STATUS.yaml`. SEM-00 is executing under explicit product-owner authorization; no later round is authorized.

Semantic Lab is isolated from PAIA production. It must not modify production runtime, schema, Reader, Thought Library, Capture, ANS status, or real archive data.

Start with:
- `docs/PRE_IMPLEMENTATION_FREEZE_v0.2.md`
- `status/SEMANTIC_LAB_STATUS.yaml`
- `docs/EXECUTION_PROTOCOL.md`

v0.2 freezes a finite, versioned Topic Catalog, separates Topic existence, Input assignment and user activation, and makes reusable human calibration data a first-class semantic asset.
