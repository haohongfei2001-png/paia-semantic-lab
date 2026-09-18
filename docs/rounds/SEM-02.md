# SEM-02 — Retrieval Engine Foundation + Lab Evidence Browser

## Implementation scope

Build semantic Input retrieval infrastructure and a Lab Evidence Browser capable of inspecting ranked evidence, spans, model disagreement and challenge cases using public/synthetic corpora. Prepare the evidence-review surfaces that SEM-06 will later use on authorized real Inputs.

## Non-scope

No authorized personal snapshot yet; no owner retrieval-relevance labels; no Input→Topic labels; no repeated model trial; no claim of personalized retrieval quality.

## Evidence allowed

Public benchmark corpora, synthetic PAIA-shaped corpora, machine-generated hard negatives, long/short/mixed-language fixtures, existing reusable gold if it exists in a future replay.

## Required tests

Dense/lexical/hybrid retrieval; whole-input vs chunk aggregation; evidence-span tracking; no-answer handling; exact-term regression; model disagreement visualization; long-input beginning/middle/end fixtures.

## Metrics

Public/synthetic nDCG/Recall/MRR; exact-term regression; hard-negative rate; evidence-span integrity; disagreement yield; Evidence Browser correctness/usability tests that do not require semantic owner judgment.

## Acceptance gate

Retrieval engine/evidence tooling may PASS engineering gates. Personalized retrieval verdict remains PROVISIONAL/INCONCLUSIVE until SEM-06/07 personal gold.

## Artifacts

Retrieval engine report; Evidence Browser contract; challenge/disagreement queues; frozen evidence schema.

## Commit protocol

Execute this round only → tests → artifacts/status → commit/push → re-read remote → stop. No owner gold request.
