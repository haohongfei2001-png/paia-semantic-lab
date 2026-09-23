# PAIA Lightweight Semantic Router v1

## Product purpose

This package returns PAIA Semantic Lab to the production problem it was meant
to solve:

> Given one user input, plus bounded local context such as the conversation
> title and recent user inputs, classify the input into a finite versioned
> catalog of roughly one hundred PAIA Topics with useful multi-label confidence
> and a safe DEFER path.

The production target is a **small, deterministic, fully local classifier**.
A large embedding model is not a production dependency of this package.

## Inherited assets

The package preserves and reuses the work that remains valuable independent of
the old embedding architecture:

- finite versioned Topic Catalog and active/inactive semantics;
- 144 current System Topics and their aliases/boundaries;
- derived semantic profiles as research/index-generation source material;
- synthetic contrastive fixtures and confusing-neighbor cases;
- current-input vs allowed-context separation;
- ASSIGNED / UNASSIGNED / DEFER and multi-label semantics;
- CalibrationRecord, provenance, family-grouped split and leakage guards;
- the existing 80 calibration records;
- the 13 still-unopened legacy evaluation records;
- the 35 consumed SEM-07 lockbox records, which remain forbidden for tuning or
  promotion.

Historical BGE-M3, Qwen, E5, Nomic and related embedding experiments are kept as
**research baselines/oracles only**. They may be cited or compared on public
evidence, but they are not permitted as PAIA production dependencies in v1.

## Production direction

The v1 production candidate must use zero neural-model inference and zero
remote semantic API calls. Candidate algorithm families include exact aliases,
Unicode normalization, phrase matching, character n-grams, BM25/TF-IDF-style
scoring, deterministic context weighting, exclusion/boundary penalties and
full-catalog scoring across all eligible Topics.

The Router consumes only bounded host-provided local context. Conversation
title and recent user inputs are explicit scoring lanes and must be separately
ablatable. Context may support an ambiguous current input but must not silently
override a strong contradictory current-input signal.

## Status

LSR-00 registers and freezes this direction and audits reusable assets. LSR-01
is the first implementation round and is READY but not started.

Canonical status:
`status/LIGHTWEIGHT_SEMANTIC_ROUTER_STATUS.yaml`.
