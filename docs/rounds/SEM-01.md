# SEM-01 — Automated Embedding Bake-off / B0

## Implementation scope

Implement local/API embedding adapters for public/synthetic evidence, lexical controls, exact-vector baseline, automatic compatibility/latency/memory scorecard and B0 multilingual diagnostics.

## Non-scope

No owner model trial; no owner semantic labels; no real Input API egress; no personalized winner claim; no Router training.

## Evidence allowed

Public multilingual retrieval/STS benchmarks, synthetic Catalog fixtures, machine-generated Chinese/mixed/short/long challenge sets, reproducibility/performance tests.

## Required tests

Every shortlisted candidate on the same reusable B0; instruction/prefix correctness; truncation=error; repeated-run stability; resource profiling; license/runtime manifest checks.

## Metrics

Public/synthetic retrieval/STS metrics; Chinese/mixed challenge metrics; cold/warm latency; throughput; peak memory; index size; errors; reproducibility/maintenance risk.

## Acceptance gate

Broken/incompatible candidates may be eliminated automatically. B0 may rank engineering candidates but cannot prove personalized semantic quality.

## Artifacts

Automatic model scorecard; candidate manifests; qualified shortlist; machine disagreement dataset for later rounds.

## Commit protocol

Execute this round only → tests → artifacts/status → commit/push → re-read remote → stop. Do not request owner labels.
