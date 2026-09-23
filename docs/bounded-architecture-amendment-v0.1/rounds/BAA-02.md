# BAA-02 — Frozen Private Calibration Validation

Execution authorization: **GRANTED** by the current user message.

BAA-02 is a bounded falsification of the two mechanisms already implemented and
PUBLIC/SYNTHETIC-verified by BAA-01. It is not a new architecture search.

## Pre-evidence freeze

Before any private calibration record is read, freeze exactly:

- model: BAAI/bge-m3 at the inherited pinned revision;
- 5 family-grouped folds;
- query variants: current_only, allowed_context;
- profile modes: core, core_anchors, full_derived;
- observed-prototype weights: 1.5, 3.0;
- candidate sibling caps: 2, 4;
- exactly 24 configurations;
- neutral missing-prototype semantics from BAA-01;
- direct top-6 in top-10 and direct top-10 in top-20 invariants;
- Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99;
- identical context-dependent/context-free critical-slice thresholds;
- family leakage = 0.

The selection rule is frozen before evidence. A configuration is eligible only
if every gate passes. Among passing configurations only, order by Recall@10,
Recall@20, then lower sibling cap, lower prototype weight, lexical query/profile
mode and config ID. No post-evidence parameter edits are permitted.

## Private boundary

Authorized:

- read-only reuse of exactly the existing 80 calibration records;
- existing private context required to reconstruct those same calibration cases.

Forbidden:

- the 13 legacy evaluation records;
- the 35 consumed SEM-07 lockbox cases for tuning or promotion;
- new owner labels;
- live archive reads;
- real Input API egress;
- model training;
- formal catalog mutation;
- PAIA production writes;
- mutation of closed SCA-03 evidence.

## Stop rule

If no frozen configuration passes, close BAA-02 **COMPLETE/FAIL** and STOP.

If one or more frozen configurations pass, record the pre-registered selected
configuration, close calibration **PASS**, keep evaluation closed, and STOP for
a separate owner authorization. BAA-02 never opens evaluation automatically and
never starts SCA-04.
