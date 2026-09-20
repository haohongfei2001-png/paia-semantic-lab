# Semantic Catalog Architecture v0.1 — Development Plan

## SCA-00 — Catalog information audit and architecture freeze

Audit the public formal catalog and freeze the two-layer Formal Topic Contract / Derived Semantic Profile architecture.

Outputs:
- structural information audit;
- derived-profile schema;
- data/provenance policy;
- owner-attention boundary;
- sequencing and verification contract.

No formal catalog edits. No private data reads.

## SCA-01 — Full derived semantic-profile generation

Generate one Derived Semantic Profile for every current system Topic using only public/formal catalog identity, domain structure and general semantic reasoning.

Required properties:
- 144/144 profile coverage;
- exactly one existing Topic ID per profile;
- no new Topic IDs;
- all generated fields marked derived with provenance;
- no formal catalog mutation;
- semantic core and anchors are topic-specific rather than shared boilerplate.

This round may use AI-generated lexical anchors, synthetic utterance patterns and candidate contrastive neighbors because they remain derived artifacts.

## SCA-02 — Contrastive boundary graph and synthetic validation

Build a derived confusing-neighbor graph and contrastive boundary rules across profiles.

Generate synthetic positive/hard-negative utterance suites to test whether profiles distinguish nearby Topics without relying on user-private Inputs.

Resolve public/synthetic inconsistencies in the derived layer. If a contradiction requires changing formal Topic meaning, stop with FORMAL_CATALOG_REVIEW_REQUIRED.

## SCA-03 — Family-grouped personal calibration grounding

Requires fresh explicit authorization for read-only use of the existing 80 calibration judgments.

Before private metrics are opened:
- freeze profile bundle;
- freeze retrieval representation/fusion matrix;
- freeze family-grouped split policy.

Use calibration for family-grouped development/promotion only. Private text, IDs and vectors remain outside Git.

SCA-03 passes only if Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 with critical slices passing and leakage = 0.

If SCA-03 fails, the 13-case evaluation remains unopened.

## SCA-04 — One-time legacy evaluation promotion

Runs only after SCA-03 PASS.

Open the 13-case legacy evaluation set once with the exact frozen SCA-03 profile/retrieval bundle. No post-result profile edits, config changes or threshold changes.

The same 0.96 / 0.99 candidate gates apply.

## SCA-05 — Immutable handoff to v0.3 remediation

Runs only after SCA-04 PASS.

Freeze the promoted Derived Semantic Profile bundle, graph, compiler/config hashes and provenance. Produce a handoff manifest for a separate v0.3 amendment that may make REM-04 READY.

This round does not itself start REM-04 or modify production PAIA.
