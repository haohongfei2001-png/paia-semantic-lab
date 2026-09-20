# Semantic Catalog Architecture v0.1 — Pre-Implementation Freeze

## Trigger

REM-03B closed COMPLETE/FAIL with best Candidate Recall@10 = 0.592708 and Recall@20 = 0.816875. Domain Recall@1 = 0.373958 and Domain Recall@2 = 0.625000. The 13-case legacy evaluation set remained unopened.

The public catalog audit found:
- 144 system Topics;
- 18 internal Domains, exactly 8 Topics each;
- after masking Topic names, 144 definitions collapse to 1 template;
- 144 inclusion boundaries collapse to 1 template;
- 144 representative examples collapse to 1 template;
- 288 exclusion boundaries collapse to 2 templates;
- one zh alias and one en alias per Topic;
- zero confusing-neighbor edges;
- all 144 boundary_status values are PROVISIONAL.

## Architectural decision

Retrieval semantics and formal Topic semantics are separated.

### Formal Topic Contract

The existing catalog remains the canonical identity layer. Topic IDs, lifecycle, domain membership and formal boundaries are not automatically mutated by this package.

A formal catalog boundary change requires a separate explicit owner authorization. AI may draft a proposed formal change, but cannot promote it by itself.

### Derived Semantic Profile

Each existing formal Topic may have one versioned Derived Semantic Profile used for retrieval/candidate generation. A profile may include:
- semantic core;
- lexical anchors;
- positive intent patterns;
- exclusion cues;
- representative synthetic utterance patterns;
- contrastive-neighbor relations and boundary rules;
- domain-path anchors;
- provenance and review state.

These fields are rebuildable derivatives. They are not formal Topic facts.

AI-generated semantic expansion is permitted only inside the derived layer and must carry provenance. It may not create a new Topic ID, merge/split Topics, or override explicit formal boundaries.

## Data and privacy freeze

SCA-00 through SCA-02 use no private Input data.
SCA-03 requires fresh explicit authorization before any read-only reuse of the 80 legacy calibration judgments.
The 13-case legacy evaluation set remains bounded promotion evidence and may be opened only after SCA-03 calibration PASS.
The consumed 35-case SEM-07 lockbox remains forbidden for tuning/promotion.
Real Input API egress remains DENY.
Model training remains DENY.
Production PAIA writes remain DENY.

## Quality gates

This package does not lower the v0.3 candidate gates:
- Candidate Recall@10 >= 0.96;
- Candidate Recall@20 >= 0.99;
- measurable critical slices must meet the same thresholds;
- leakage events = 0.

A missing capability or unresolved boundary produces FAIL/INCONCLUSIVE or FORMAL_CATALOG_REVIEW_REQUIRED, never an invented PASS.
