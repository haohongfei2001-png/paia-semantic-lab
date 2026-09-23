# Development Plan

## LSR-00 — Product Constraint and Asset Freeze

Status: COMPLETE/PASS in the registration change.

Purpose:
- freeze the zero-model production direction;
- preserve useful Semantic Lab assets;
- record production size/resource budgets;
- explicitly demote large embedding systems to research-oracle status.

Private/evaluation/lockbox reads: 0.

## LSR-01 — Zero-Model Full-Catalog Baseline

Implement the first deterministic reference router.

Scope:
- current input, optional title and bounded recent-user-context lanes;
- exact aliases/phrases, character n-grams and sparse/BM25-style retrieval;
- all 144 Topics scored directly;
- score decomposition, multi-label output and DEFER;
- PUBLIC/SYNTHETIC-only comparisons and context ablations;
- size/latency/memory measurement.

No private data. No neural model. No production PAIA modification.

Exit: one or more bounded zero-model candidates with reproducible public
metrics and measured resource cost, or an explicit FAIL if the approach is not
credible.

## LSR-02 — Context, Boundary and Topic-Switch Robustness

Stress the lightweight router on ambiguous short inputs, informative vs
misleading titles, recent-context carryover, explicit topic switches,
multilingual/mixed-language inputs, inclusion/exclusion boundaries, confusing
neighbors and multi-label cases.

Choose and freeze exactly one public candidate and its context/threshold policy
before private evidence.

## LSR-03 — Browser-Ready Runtime Parity

Produce a dependency-light browser/Node implementation and generated Topic
index.

Required:
- deterministic parity with the frozen reference algorithm;
- no Python/ML runtime;
- no network;
- package/index size gates;
- cold/warm latency and incremental memory gates;
- browser-safe provenance/evidence output.

This round still does not modify the PAIA production repository.

## LSR-04 — Frozen Private Calibration Validation

Only after a new explicit owner authorization.

Read exactly the existing 80 calibration records once under a pre-evidence
freeze. Do not read the 13 legacy evaluation records or the consumed 35-case
lockbox.

If calibration fails, stop. Do not tune and rerun against the same 80 records
without a separately authorized new experiment.

## LSR-05 — Legacy Evaluation

Only if LSR-04 passes and the owner separately authorizes evaluation.

Read the 13 still-unopened legacy evaluation records once. No reselection or
threshold changes after reading them.

## LSR-06 — PAIA Handoff Contract

Only after successful evaluation.

Freeze the minimal production module/index interface, privacy contract and
migration plan. Actual PAIA integration is a separate production authorization
and must not be implied by Semantic Lab completion.

## Failure policy

A v1 zero-model failure is a valid research result. It must not silently
reactivate BGE-M3 as production. A tiny-model or remote-model product direction
requires an explicit new package and product decision.
