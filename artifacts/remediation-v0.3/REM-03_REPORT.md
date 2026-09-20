# REM-03 — Full-Catalog Candidate Remediation and Freeze — Final Closure

## Final verdict

REM-03 execution is **COMPLETE** with capability verdict **FAIL**.

The public/synthetic remediation implementation is structurally valid, but the frozen candidate policy does not meet the required private Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 promotion gate.

REM-04 is therefore **BLOCKED** and must not start.

## Frozen candidate policy

The evaluated candidate policy remained exactly the REM-03 public checkpoint policy:

- model: BAAI/bge-m3 @ cb1779f90b988b8deb01f9155c790ef9417d7648
- candidate policy version: rem03-domain-scaffold-candidates-0.1
- full-catalog multi-channel retrieval
- exact/contained alias hard evidence
- primary and secondary domain scaffolds
- declared-neighbor expansion
- custom Topic safety lane
- long-input chunk lane
- activity/pin/calibration priors excluded from reordering the top-20 invariant prefix

No config search or threshold fitting was performed after private evidence was opened.

## Private promotion protocol

Before private evidence was opened, the following were frozen:

- private promotion plan SHA-256: a73f657e378e4d817e825d93ad2711262e9288a78e741e07a8c1d026fdcb31bb
- private evaluator SHA-256: db98038637a50715fcbf0305caa04a5843fc4e2cd5b556d1b968cb9745cc4467
- candidate policy SHA-256: 81132e9267e4956e396fd38f324112d3f68b2a68553cd7818bf3c85837ec557d
- candidate code SHA-256: 65f96d552cb0c499f1440b0e88e71b25d40e6e1d2812177cbf87e599ba8654d4

The protocol required calibration to pass both candidate gates before the 13-case legacy evaluation set could be opened.

## Calibration promotion result

All **80 calibration judgments** were evaluated. All 80 are ASSIGNED cases for candidate-gate purposes.

Overall candidate metrics:

- topic Recall@10: **0.391875**
- required Recall@10: **0.96**
- topic Recall@20: **0.566875**
- required Recall@20: **0.99**
- complete-case Recall@10: **0.1750**
- complete-case Recall@20: **0.3375**

Both frozen candidate gates fail by a large margin.

### Critical slices

Context-dependent slice (12 assigned cases):

- topic Recall@10: **0.3333**
- topic Recall@20: **0.6389**
- complete-case Recall@20: **0.5000**

Context-free slice (68 assigned cases):

- topic Recall@10: **0.4022**
- topic Recall@20: **0.5542**
- complete-case Recall@20: **0.3088**

Both measurable critical slices fail the same `.96/.99` candidate thresholds. No aggregate result hides those failures.

## Evaluation was not opened

Because the calibration gate failed, the frozen protocol forbade opening the 13-case legacy evaluation set.

- legacy evaluation reads consumed: **0**
- evaluation public artifact created: **no**
- evaluation consumption marker created: **no**

This preserves the bounded promotion evidence instead of spending it on a candidate that already failed development calibration.

## Lockbox and safety guards

- consumed SEM-07 lockbox label records used: **0**
- consumed SEM-07 lockbox tuning/promotion events: **0**
- live PAIA archive reads: **0**
- real Input API egress: **0**
- new owner labels: **0**
- model training: **0**
- production PAIA writes: **0**
- config-search events after private evidence: **0**
- threshold-fit events after private evidence: **0**

## Public structural evidence remains valid

The earlier REM-03 public checkpoint remains PASS for engineering structure:

- standard synthetic Recall@10/20: 1.0 / 1.0
- allowed-context synthetic Recall@20: 1.0
- long-input synthetic Recall@20: 1.0
- full-catalog top-20 reachability: 144/144
- top-20 activity-state invariance: PASS
- custom Topic safety path: PASS
- declared-neighbor structural lane: PASS
- 1024-Topic scale probe: PASS

However, the private calibration result demonstrates that those structural/public results do not translate into adequate personalized full-catalog candidate recall.

## Reproducibility

- public structural digest: 02f7d15d71af908bf82e0aee0a19003766b7b6329e701f679590880ec915a25e
- private calibration result digest: 9b7b2b8bf20add2b1ce191ec117940234264ab3bccbb26fc39b7312cc09f2bba
- public calibration summary SHA-256: 701b1cbf00fc64432f85ed39db512ec47a812d0f110ecf31d3330c7c9005c1db
- private calibration payload SHA-256: 64654693e6ef6f4329ebbf069b176b30896d6b66492b13cccf25b1ccdc14f41d
- private gate receipt SHA-256: 22cb1788ff026831c24d762705601d8d4fb3bc317890e3403d1334c2da18643d

Local validation:

- REM-03 targeted/package closure tests: **17/17 PASS**
- full repository regression: **106/106 PASS** in **447.981 s**
- privacy scan: **PASS**
- git diff check: **PASS**

## Package consequence

REM-03 failed its required candidate capability. Under the frozen remediation plan, REM-04 cannot compensate for an unresolved candidate bottleneck and remains BLOCKED.

Further work requires a new or amended candidate-remediation design/execution authorization. It must not proceed by lowering the Recall@10/20 gates or by starting Router remediation.
