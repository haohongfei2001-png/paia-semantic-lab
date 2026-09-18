# SEM-03 — Full-Catalog Topic Candidate Retrieval

## Implementation scope

Represent every System/custom Topic contract, implement complete-catalog candidate retrieval, reserved global candidate slots, aliases, confusing-neighbor expansion, scale tests and active-prior ablation.

## Non-scope

No final personalized semantic judgment; no owner Input→Topic labels; no activation mutation; no Topic creation.

## Evidence allowed

Catalog definitions/boundaries, synthetic boundary fixtures, machine-generated paraphrases/hard negatives, public multilingual retrieval evidence, model disagreement, existing reusable gold only if already available.

## Required tests

Active/inactive candidate symmetry; aliases; confusing neighbors; global-slot preservation; active-prior on/off; multilingual Topic queries; synthetic scale to 1,024 Topics; candidate stability across qualified embeddings.

## Metrics

Candidate Recall@5/10/20 on machine/public fixtures; inactive-topic candidate recall; active-vs-inactive gap; confusing-neighbor error rate; candidate set size/latency; inter-model disagreement.

## Acceptance gate

Full-catalog eligibility and engineering candidate-retrieval guarantees must pass. Personalized candidate recall remains PROVISIONAL/INCONCLUSIVE without personal gold.

## Artifacts

Candidate retrieval policy; Topic descriptor representation spec; automated candidate challenge set; disagreement queue for SEM-06 sampling.

## Commit protocol

Execute this round only → tests → artifacts/status → commit/push → re-read remote → stop. Do not request owner labels.
