# BAA-02 Frozen Private Calibration Closure

BAA-02 is **COMPLETE/FAIL**. The frozen evaluator ran once against the 80 existing calibration cases and evaluated all 24 preregistered configurations. No configuration passed every promotion gate. No winner was selected. Evaluation remains closed.

## Frozen execution evidence

- Baseline remote main and exact-head CI: `0d4776f75f2c4a5f0687d5291e9713aaf5df351e`, Semantic Lab CI run `35837150767` SUCCESS.
- The config, evaluator, BAA-01 and BAA-02 libraries, SCA-03 helper, public manifests, and 24-config matrix matched `BAA-02_PRE_EVIDENCE_FREEZE.json` before the private run.
- The 80 calibration IDs and input refs had zero overlap with the 35 consumed SEM-07 lockbox entries in the gold split index. No evaluation or lockbox label records were parsed.
- The existing pinned BAAI/bge-m3 revision and 5 family-grouped folds were used. Calibration cases read: **80**. Configurations evaluated: **24**. Passing configurations: **0**.
- Public sanitized aggregate: `BAA-02_CALIBRATION_RESULT.json`, SHA-256 `70ce74f822f3a12e6b7bb54837a3a3ccfbd68f5857c060618be64db560b06327`.
- Private result and gate receipt remain under `semantic-lab-private/baa02/` and are not included in Git.

## Registered gates and observed aggregate

The required overall and both critical-slice Candidate Recall gates were Recall@10 ≥ 0.96 and Recall@20 ≥ 0.99. All 24 configurations failed both overall Recall gates and both critical-slice gates. Family leakage and candidate structural failure events were zero for every configuration.

| Aggregate | Recall@10 | Recall@20 |
| --- | ---: | ---: |
| Highest observed value across all 24 configurations | 0.7735416667 | 0.8854166667 |
| Top configuration by frozen selection ordering, `baa02-8945ffecf3c2d42d` | 0.7735416667 | 0.8839583333 |
| Its context-dependent slice, 12 cases | 0.7638888889 | 0.8750000000 |
| Its context-free slice, 68 cases | 0.7752450980 | 0.8855392157 |

The full 24-configuration aggregate metrics and gate failures are in the public result. The top configuration is reported for inspection only; it is **not selected**, because it failed the gates.

## Boundary and stop

- Calibration records read: **80**, once under this BAA-02 authorization.
- Legacy evaluation records read: **0**; evaluation opened: **false**.
- Consumed SEM-07 lockbox records read or used for tuning: **0**.
- New owner labels, live archive reads, real Input API calls, model training, formal catalog writes, PAIA production writes, and SCA-04 starts: **0**.

**STOP after this closure.** The frozen experiment is not modified or rerun, and BAA-02 FAIL does not authorize evaluation or SCA-04.
