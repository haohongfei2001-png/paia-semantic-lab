# Bounded Architecture Amendment v0.1 — Execution Protocol

## Source of truth

Remote GitHub `main` is authoritative.

Canonical status:

`status/SCA03_BOUNDED_ARCHITECTURE_AMENDMENT_STATUS.yaml`

## Closed BAA-01

BAA-01 is COMPLETE/PASS on PUBLIC/SYNTHETIC gates. Its historical scope,
results, merged-main CI and closure-head CI remain immutable. BAA-01 itself
does not authorize private calibration.

## Current BAA-02 authorization

The current user authorization permits BAA-02 private calibration validation
only, after a new pre-evidence freeze is merged and exact-main required CI
passes.

BAA-02 may:

- reuse exactly the existing 80 calibration judgments read-only;
- reconstruct those same calibration cases from their existing private context;
- evaluate exactly the 24 pre-registered combinations in
  `configs/baa02_private_calibration_v0.1.yaml`;
- use only the BAA-01 direct-evidence-preserving assembler and
  missing-evidence-neutral observed-prototype fusion;
- publish sanitized aggregate metrics, digests and closure metadata.

BAA-02 may not:

- read any of the 13 legacy evaluation judgments;
- read/use the 35 consumed SEM-07 lockbox cases for tuning or promotion;
- add configurations or edit parameters after private evidence is opened;
- lower Candidate Recall@10 >= 0.96 or Recall@20 >= 0.99;
- weaken context-dependent/context-free critical-slice thresholds;
- change family-grouped folds;
- mutate SCA-01 profiles, the SCA-02 graph, formal Topic semantics or the
  closed SCA-03 evidence;
- change allowed-context handling or the embedding model;
- train a model;
- read the live archive or perform real Input API egress;
- modify PAIA production;
- start SCA-04.

## Pre-evidence sequence

1. re-read remote main and canonical status;
2. register the BAA-02 config/evaluator/round contract;
3. freeze the exact 24-config matrix and deterministic selection policy;
4. keep private/evaluation/lockbox read counters at zero;
5. run the full PUBLIC/historical regression CI on the PR head;
6. merge only after exact PR-head required CI PASS;
7. require exact merged-main CI PASS;
8. publish freeze closure metadata without changing frozen evaluator/config;
9. require exact freeze-closure-head CI PASS;
10. only then read the 80 calibration records once.

## Private result stop rules

If no frozen configuration passes every original gate, close BAA-02
COMPLETE/FAIL and STOP. Evaluation remains closed.

If one or more frozen configurations pass, select only by the pre-registered
selection rule, record the selected configuration, keep evaluation closed, and
STOP for a separate owner authorization.

BAA-02 never opens evaluation automatically and never starts SCA-04.
