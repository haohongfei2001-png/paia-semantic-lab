# LSR-01 — Zero-Model Full-Catalog Baseline

Status: READY / NOT_STARTED.

LSR-01 requires a separate explicit execution authorization.

## Scope

Implement a deterministic reference classifier over the canonical 144 Topics
using PUBLIC/SYNTHETIC/catalog evidence only.

Required lanes:
- current user input;
- optional conversation title;
- bounded recent user inputs.

Required candidate families:
- exact alias/phrase evidence;
- character n-gram similarity;
- sparse lexical/BM25-style score;
- explicit inclusion/exclusion/boundary evidence;
- deterministic lane fusion;
- full-catalog ranking;
- multi-label + DEFER output.

## Required evidence

- public/synthetic quality metrics;
- current/title/context ablations;
- topic-switch fixtures;
- deterministic repeat;
- generated index size estimate;
- warm/cold latency;
- memory measurement.

## Forbidden

- BGE/other neural model in the production candidate;
- private calibration/evaluation/lockbox reads;
- new owner labels;
- PAIA production writes;
- automatic transition to LSR-02.
