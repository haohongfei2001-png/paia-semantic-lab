# REM-03A — Calibration-Prototype Candidate Remediation — Final Closure Candidate

## Verdict

REM-03A is **COMPLETE / FAIL** on its frozen family-grouped calibration gate.

The bounded non-trained exemplar/prototype lane materially improved candidate recall relative to REM-03, but no pre-frozen configuration reached Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99. The 13-case legacy evaluation set therefore remained unopened, and REM-04 remains BLOCKED.

## Frozen development surface

- 80 legacy calibration judgments, read-only
- 5-fold family-grouped out-of-fold evaluation
- 12 configurations frozen before private metrics
- query representation: current-only or allowed-context
- prototype strategy: exemplar-max, centroid, or deterministic hybrid
- prototype RRF weight: 2.0 or 4.0
- model revision: pinned BAAI/bge-m3 baseline
- no training, no threshold fitting after evidence, no post-hoc matrix expansion

## Calibration result

Best observed tied configurations:
- rem03a-6e40b76ac6cae32b — allowed_context / centroid / prototype weight 4.0
- rem03a-c551eca296f32f4f — current_only / centroid / prototype weight 4.0

Best aggregate Candidate Recall@10: **0.743542** vs required **0.96**.
Best aggregate Candidate Recall@20: **0.856875** vs required **0.99**.

Critical slices for the best observed configuration:
- context-dependent Recall@10 / @20: **0.805556 / 0.916667**
- context-free Recall@10 / @20: **0.732598 / 0.846324**
- configurations passing all gates: **0 / 12**
- held-out-family leakage events: **0**

Calibration result digest: 361b7f101d9f4552d539bd218b2bb454034d09209e2f17d22fda1f5191fe37b8.

## Evaluation preservation

Because calibration failed, evaluation opened = no, legacy evaluation records read = 0 / 13, and no evaluation consumption marker was created.

## Guard audit

- consumed SEM-07 lockbox tuning/promotion events: **0**
- live PAIA archive reads: **0**
- real Input API egress events: **0**
- new owner labels: **0**
- model training runs: **0**
- production PAIA writes: **0**

## Freeze checkpoint CI

Exact freeze head 694f33f7c23961a825dbba50efa72aab85664a2f passed Semantic Lab CI run 35500865402, job 106052270898, evidence artifact 10601932880.

## Consequence

REM-03A does not unlock Router remediation. Candidate generation remains the blocking capability. Any further work must be a separately authorized candidate-remediation design and must preserve the existing final gates and the untouched 13-case legacy evaluation evidence.