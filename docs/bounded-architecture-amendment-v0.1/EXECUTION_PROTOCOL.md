# Bounded Architecture Amendment v0.1 — Execution Protocol

## Source of truth

Remote GitHub `main` is authoritative.

Canonical status:

`status/SCA03_BOUNDED_ARCHITECTURE_AMENDMENT_STATUS.yaml`

## BAA-01 authorization

The current user authorization permits registration and execution of BAA-01
only.

BAA-01 may:

- add a new bounded candidate assembler;
- add a missing-evidence-neutral prototype evidence stream/fusion;
- add PUBLIC/SYNTHETIC fixtures, tests and reports;
- run the existing public/historical regression chain.

BAA-01 may not:

- read any of the 80 calibration judgments;
- read the 13 legacy evaluation judgments;
- read/use the 35 consumed SEM-07 lockbox cases;
- mutate SCA-01 profiles or the SCA-02 graph;
- mutate closed SCA-03 config/freeze/results;
- change allowed-context handling;
- change the embedding model;
- change formal Topic semantics;
- lower promotion gates;
- start SCA-04;
- modify PAIA production.

## Closure

1. re-read remote main and this package status;
2. implement only BAA-01;
3. validate both bounded candidate variants and neutral prototype fusion on
   PUBLIC/SYNTHETIC fixtures;
4. run required regression CI;
5. merge only after PR-head checks pass;
6. require exact merged-main CI PASS;
7. publish sanitized public closure metadata;
8. require exact closure-head CI PASS;
9. re-read remote state and STOP.

A passing BAA-01 public gate does not authorize a private calibration run.
