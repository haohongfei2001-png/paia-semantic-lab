# Semantic Catalog Architecture v0.1 — Verification

## Package invariants

Every round must prove:
- formal Topic creation by AI = 0;
- silent formal Topic mutation = 0;
- production PAIA writes = 0;
- unauthorized private-data reads = 0;
- real Input API egress = 0;
- model training runs = 0;
- consumed SEM-07 lockbox tuning/promotion events = 0.

## SCA-00

Required:
- catalog baseline = 144 system Topics / 18 Domains;
- all 18 Domains contain exactly 8 system Topics;
- template-collapse audit is reproducible;
- confusing-neighbor edge count is recorded;
- two-layer architecture is frozen;
- Derived Semantic Profile schema is valid JSON Schema;
- v0.3 REM-04 remains blocked;
- private artifact reads = 0.

## SCA-01

Required:
- 144/144 system Topic profiles;
- profile topic IDs exactly equal the current system Topic ID set;
- no generated formal Topic IDs;
- every profile records formal catalog version and provenance;
- every profile marks formal_semantics_unchanged = true;
- generated anchors/examples are derived, not formal;
- profile compiler is deterministic for frozen inputs/config where deterministic generation is claimed.

## SCA-02

Required:
- every graph edge references existing Topic IDs;
- every contrastive rule records provenance;
- synthetic positive/hard-negative suite is versioned;
- no public/synthetic test rewrites formal semantics;
- unresolved formal contradictions produce FORMAL_CATALOG_REVIEW_REQUIRED.

## SCA-03

Required before legacy evaluation can open:
- family-grouped Candidate Recall@10 >= 0.96;
- family-grouped Candidate Recall@20 >= 0.99;
- critical slices meet the same thresholds;
- family leakage = 0;
- full-catalog eligibility = PASS;
- profile bundle/config frozen before private metrics.

## SCA-04

One bounded read of the 13-case legacy evaluation set.
Same 0.96 / 0.99 gates.
No post-evaluation profile/config changes.

## SCA-05

Required:
- exact immutable profile bundle hash;
- graph/compiler/config hashes;
- provenance coverage = 1.0;
- handoff manifest only after SCA-04 PASS;
- REM-04 remains not auto-authorized.
