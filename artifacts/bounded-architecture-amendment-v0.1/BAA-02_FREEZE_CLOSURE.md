# BAA-02 Pre-Evidence Freeze Closure

BAA-02 has completed its **pre-evidence freeze integration**. No private
calibration record has been opened by BAA-02 at this point.

## Frozen execution

The private run is fixed to:

- exactly 80 existing calibration records, read-only;
- 5 family-grouped folds;
- 2 query variants;
- 3 profile modes;
- 2 observed-prototype weights;
- 2 BAA-01 sibling caps;
- exactly 24 configurations;
- BAA-01 missing-evidence-neutral prototype fusion;
- BAA-01 direct-evidence-preserving candidate assembly;
- unchanged Recall@10 >= 0.96 and Recall@20 >= 0.99 gates;
- unchanged context-dependent/context-free critical-slice thresholds;
- family leakage = 0;
- deterministic pre-registered selection among passing configs only.

The frozen config and evaluator are unchanged by this closure.

## Integration evidence

- PR: #10
- exact PR head: `debf71f567e47fb9f7a7b065ca294919c70d5c71`
- PR-head Semantic Lab CI: `35832019570`
- PR-head job: `107086604524`
- PR-head evidence artifact: `10738081772`
- PR-head required CI: **PASS**
- merged main: `a1ee83d22e34dfbebe20d2a60c859c6458f8b306`
- merged-main Semantic Lab CI: `35832519683`
- merged-main job: `107088193693`
- merged-main evidence artifact: `10738470035`
- merged-main required CI: **PASS**

## Evidence boundary at closure publication

- BAA-02 calibration records read: **0**
- legacy evaluation records read: **0**
- consumed SEM-07 lockbox reads: **0**
- live archive reads: **0**
- real Input API egress: **0**
- model training: **0**
- formal catalog writes: **0**
- PAIA production writes: **0**
- SCA-04 started: **false**

## Final pre-private gate

This closure commit itself must receive exact-head Semantic Lab CI **PASS**.
Only after that success may the frozen evaluator read the 80 calibration
records once.

If calibration fails, BAA-02 closes COMPLETE/FAIL and evaluation remains
closed. If calibration passes, evaluation still remains closed pending a
separate owner authorization. SCA-04 is not authorized.
