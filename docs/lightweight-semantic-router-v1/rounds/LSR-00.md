# LSR-00 — Product Constraint and Asset Freeze

Authorization source: user's instruction to open the recommended lightweight
direction.

## Completed audit

Baseline remote main:
`5099347a763c8c71e07a88a703f8200c91a43278`.

Reusable static assets already present:

- formal Topic Catalog:
  `catalog/system_topic_catalog_v0.2.yaml` — 139,570 bytes;
- semantic profile bundle:
  `semantic_profiles/v0.1/` — 348,284 bytes;
- combined catalog + profile source material — 487,854 bytes;
- synthetic contrastive suite:
  `synthetic_contrastive/v0.1/` — 971,551 bytes, TEST-ONLY and not a
  production payload.

The existing 144-Topic catalog, profiles, context separation, evaluation
infrastructure and privacy/provenance guards remain useful independent of any
embedding model.

Historical BGE-M3 and other neural embedding work is retained as
research-oracle evidence only. It is not a v1 production dependency.

## Frozen v1 production constraints

- neural model assets: 0 bytes;
- semantic network/API dependency: none;
- heavyweight ML runtime: none;
- generated production semantic index <= 1 MiB uncompressed;
- total semantic router runtime + index <= 2 MiB uncompressed;
- incremental steady-state memory <= 32 MiB;
- warm full-catalog p95 target <= 20 ms;
- cold initialization target <= 100 ms;
- deterministic offline operation;
- title and bounded recent user context supported as explicit evidence lanes;
- full-catalog scoring across all eligible Topics;
- DEFER instead of forced low-confidence assignment.

## LSR-00 verdict

COMPLETE/PASS.

No classifier implementation is included in LSR-00. LSR-01 is READY but not
started.
