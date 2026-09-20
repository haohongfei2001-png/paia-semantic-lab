# Bounded Architecture Amendment Design v0.1

**Status: DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION OR PRIVATE EVALUATION.**

This design reacts only to the two mechanisms confirmed by the reviewed PUBLIC/SYNTHETIC diagnostics. It does not modify the closed SCA-03 run, SCA-01 profiles, SCA-02 graph, formal Topic semantics, context pipeline, embedding model, promotion gates, or SCA-04.

## A. Direct-evidence preservation

Future implementation candidates are bounded to two public-only policy variants before selection:

- reserve direct evidence + at most 2 **additional** siblings per seeded Domain;
- reserve direct evidence + at most 4 **additional** siblings per seeded Domain.

Required invariants:

1. Direct ranks 1-6 must all remain within candidate top-10.
2. Direct ranks 1-10 must all remain within candidate top-20.
3. The sibling cap excludes the seed itself.
4. Candidate output remains exactly 144 unique eligible Topic IDs.
5. Domain IDs may never appear as assignment candidates.

These invariants are intentionally incompatible with the closed SCA-03 rule requiring all eight members of the first seed Domain inside top-10 when direct evidence spans many Domains. A future authorized amendment must explicitly supersede that **assembly invariant only**; the historical SCA-03 run remains immutable.

## B. Missing-evidence-neutral prototype fusion

A Topic with no fold-local prototype must represent **absence of calibration evidence**, not an ordinal tail position.

Required invariants:

1. Zero-prototype Topics are absent from the prototype evidence ranking/stream.
2. They receive no prototype RRF score and no prototype-derived best-rank/tie-break value.
3. If every Topic lacks a prototype, fused ranking must exactly equal profile ranking.
4. Holding profile order fixed, renaming/reordering Topic IDs of zero-prototype Topics must not change their relative fused order.
5. Topics with observed prototypes may still gain positive calibration evidence; neutrality does not forbid positive displacement by observed evidence.

## Applicability boundary

This amendment is limited to derived candidate construction and fold-local calibration fusion. It does not authorize:

- changes to formal Topic semantics;
- regenerated SCA-01 profiles;
- edits to the SCA-02 graph itself;
- changes to `allowed_context` handling;
- a different embedding model;
- multi-vector retrieval;
- a new private calibration run;
- SCA-04.

## Future public gate

Before any owner is asked to authorize new private evidence, a future implementation package must pass:

- cross-Domain fixtures with direct top6 preserved in top10 and direct top10 preserved in top20;
- exact sibling-cap semantics and 144/144 full-catalog eligibility;
- all-no-prototype identity: fused == profile ranking;
- zero-prototype Topic-ID-renaming invariance;
- partial-prototype controls proving missing evidence is not given an ordinal penalty;
- existing SCA-01/SCA-02 public validation and the full historical SEM/REM regression chain.

## Future private gate

This design grants **no private authorization**. If a later implementation passes the public gate, a separate owner authorization and a newly frozen configuration are required before private calibration. Promotion thresholds remain unchanged: Candidate Recall@10 >= 0.96, Recall@20 >= 0.99, same critical-slice thresholds, and family leakage = 0. Evaluation remains closed until that future calibration passes.
