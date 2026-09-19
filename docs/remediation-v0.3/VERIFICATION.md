# v0.3 Remediation Verification Contract

## Package invariants

Every round must prove:
- production PAIA modifications = 0;
- real-input API egress = 0;
- automatic Topic creation = 0;
- model training runs = 0;
- raw private text/gold/vectors committed to Git = 0;
- provenance coverage for private evidence = 1.0;
- consumed SEM-07 lockbox tuning events = 0.

## REM-00

Required:
- all 35 consumed lockbox cases reconcile into the attribution ledger when private access is authorized;
- every case has one primary attribution or explicit EVIDENCE_GAP;
- cross-model counts reconcile to the frozen SEM-07 aggregate metrics;
- zero remediation config changes;
- zero new owner labels.

The attribution taxonomy must include at least:
`INPUT_RETRIEVAL_MISS`, `CANDIDATE_MISS`, `CANDIDATE_LOW_RANK`,
`CONTEXT_REPRESENTATION`, `ROUTER_ABSTENTION`, `ROUTER_WRONG_ASSIGNMENT`,
`CATALOG_BOUNDARY`, `DATA_CLASS_GAP`, `EVIDENCE_GAP`.

## REM-01/02

Required engineering evidence:
- deterministic repeated rankings;
- no silent truncation;
- family-grouped calibration evaluation;
- explicit separation of Input retrieval vs Topic candidate retrieval;
- context-dependent and context-free slices;
- Chinese, mixed-language, short and long synthetic/public slices;
- latency, memory and index-size measurements;
- pinned model revision and offline private execution.

Legacy evaluation may be read only by the bounded promotion step and may not feed threshold fitting.

## REM-03 candidate promotion gate

A candidate configuration may unlock REM-04 only if:
- Candidate Recall@10 >= 0.96;
- Candidate Recall@20 >= 0.99;
- no measured critical slice has a hidden safety failure;
- full-catalog eligibility remains invariant under activity-state perturbation;
- custom-topic safety lane tests pass when fixtures exist;
- no consumed-lockbox metric was used to select the configuration.

If real inactive-profile evidence is unavailable, inactive Recall/gap remains INCONCLUSIVE for personal quality, but synthetic structural tests must still prove that inactive Topics are never excluded.

## REM-04 Router promotion gate

With the REM-03 candidate configuration frozen:
- macro-F1 >= 0.80 where estimable;
- accepted precision >= 0.95;
- accepted coverage >= 0.60;
- wrong-certain rate <= 0.05;
- evidence validity = 1.0;
- user-override violations = 0;
- stale catalog/revision guards = PASS.

UNASSIGNED precision and DEFER recall are reported but may remain INCONCLUSIVE on legacy personal evidence when class support is inadequate.

REM-04 must freeze code/config hashes before REM-05 becomes READY.

## REM-05 lockbox construction

Required:
- fresh explicit snapshot authorization;
- family-disjoint selection from all v0.2 gold families;
- exactly 96 cases unless a predefined stratum is impossible;
- representative/challenge allocation fixed before labels;
- model identity blinded;
- no label-adaptive top-up;
- no config changes after labeling starts;
- private gold validity/provenance coverage = 1.0;
- Git artifact contains hashes/counts only.

If the resulting lockbox has insufficient UNASSIGNED or DEFER truth support, those class-specific metrics remain INCONCLUSIVE. Do not request a second label batch merely to force class counts.

## REM-06 final certification

Run the exact frozen REM-04 candidate/Router configuration against the REM-05 lockbox.

Final gates are exactly those in `configs/semantic_remediation_v0.3.yaml`.

Each capability receives PASS/FAIL/INCONCLUSIVE independently. No composite score may hide a failed critical capability or slice.

Only capabilities with final PASS may enter `candidate_for_separate_integration_review`.

Required reproducibility:
- deterministic prediction/ranking digest stable across two runs where deterministic runtime is expected;
- exact code/config/model revision hashes recorded;
- clean-environment CI PASS on candidate commit;
- closure commit re-read from remote;
- owner-attention count and privacy ledger audited.

No production integration is performed in REM-06.
