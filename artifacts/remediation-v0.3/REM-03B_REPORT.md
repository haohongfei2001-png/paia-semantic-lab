# REM-03B — Structured Domain-Backoff Candidate Remediation — Final Closure Candidate

## Verdict

REM-03B is COMPLETE / FAIL on the frozen family-grouped calibration gate.

The structured Domain-backoff candidate generator did not meet the original Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 thresholds. Zero of 12 pre-frozen configurations passed. The 13-case legacy evaluation set therefore remained unopened.

## Best observed calibration configuration

- config: rem03b-8ebf70f64667f598
- query representation: allowed_context
- Domain evidence: centroid
- anchor mode: names_aliases_plus_domain_path
- Candidate Recall@10: 0.592708
- Candidate Recall@20: 0.816875
- Domain Recall@1: 0.373958
- Domain Recall@2: 0.625000

Domain recovery itself remained weak, so the intended Domain-to-Topic full-coverage backoff could not reliably put the correct Topic family into the top-10/top-20 budget.

## Guard audit

- held-out-family leakage events: 0
- structural failure events: 0
- consumed SEM-07 lockbox tuning/promotion events: 0
- live archive reads: 0
- real Input API egress events: 0
- new owner labels: 0
- model training runs: 0
- production PAIA writes: 0
- generated semantic expansion events: 0
- catalog edit events: 0

Calibration result digest: dceba486fdf5a7568c8acfd5d5c4924b07a3a5dae32693002236137e0e366523.

## Evaluation preservation

Because calibration failed:
- evaluation opened: no
- legacy evaluation records read: 0 / 13
- evaluation consumption marker: absent

## Escalation

The frozen REM-03B contract requires failure after Domain recovery to be treated as CATALOG_SEMANTIC_INFORMATION_DEFICIENCY_REVIEW, not as a reason to continue retrieval-weight search.

The public catalog audit already showed that formal definition/inclusion/example text is almost entirely shared boilerplate, aliases are one-per-language, and confusing-neighbor edges are absent. REM-03B now adds private calibration evidence that even Domain-level recovery from the available discriminative anchors plus 80 calibration judgments is insufficient.

REM-04 remains BLOCKED. Further work requires a separate catalog/architecture package; the existing candidate gates must not be lowered.