# SEM-06 — Authorized Real Snapshot + Concentrated Reusable Personal Gold + Personal Calibration

## Implementation scope

This is the **first planned product-owner semantic round**.

With explicit authorization, ingest a read-only real PAIA Input snapshot. Run qualified local/system configurations to produce candidate retrieval, Router predictions, uncertainty and disagreement signals. Automatically select one concentrated batch of approximately **100–200 highest-information canonical semantic judgments**. Capture the owner's answers once as reusable CalibrationRecord / benchmark gold.

## Owner Attention Budget

The system MUST NOT ask the owner to evaluate models A/B/C separately.

Every question must ask for canonical semantic truth, such as:
- which existing Topic(s) this Input belongs to;
- whether it is UNASSIGNED or genuinely DEFER;
- whether a retrieved historical Input is relevant to a canonical retrieval question;
- whether a confusing Topic boundary needs clarification.

The same final judgment is reusable by all models/configurations.

## Machine selection priority

Sampling priority, in order:
1. model disagreement;
2. confusing-neighbor Topics;
3. inactive Topics;
4. high-impact retrieval disagreement;
5. Router high uncertainty;
6. UNASSIGNED vs existing Topic;
7. representative coverage gaps.

Random bulk labeling is forbidden. Duplicate/near-duplicate semantic questions are deduplicated before owner review.

## Non-scope

No per-model owner testing; no small classifier/distillation; no production integration; no AI Topic creation; no automatic assumption that one owner batch proves every long-tail slice.

## Required tests

Authorized snapshot/provenance validation; local pre-annotation runs; information-gain sampler; blind annotation surface; revision/catalog identity checks; CalibrationRecord promotion/supersession; family-level split into calibration/evaluation/lockbox subsets; annotation deduplication; owner model-identity blinding.

## Metrics

Owner judgments requested/completed; estimated owner attention time; disagreement resolution rate; Topic/UNASSIGNED/DEFER coverage; inactive/confusing-neighbor coverage; retrieval-qrel coverage; duplicate-question rate; reusable-gold validity rate.

## Acceptance gate

- batch size targets approximately 100–200 high-information judgments, adjusted downward if information gain saturates;
- every accepted judgment is model-independent and reusable;
- per-model duplicate labeling = 0;
- provenance/revision/catalog identity coverage = 100%;
- any unresolved true Topic-boundary ambiguity is explicitly recorded rather than forced.

Personalized capability scores produced during this round are calibration/development evidence, not the final frozen lockbox verdict.

## Artifacts

Authorized snapshot manifest; information-gain sampling report; reusable personal gold v1; CalibrationRecord dataset; personal calibration report; frozen SEM-07 lockbox manifest.

## Commit protocol

Execute this round only → machine-select batch → owner semantic review only within this round → persist reusable gold → artifacts/status → commit/push → re-read remote → stop. Do not start SEM-07.
