# PAD-01 — Public/Synthetic Architecture Decomposition

Execution authorization: **GRANTED** by the current user message.

Baseline remote main at registration:
`115d3c66b98c0eef46c857fbb03548eac16c0d06`.

## Execute

Run exactly the frozen controls in
`configs/sca03_post_failure_architecture_diagnostics_v0.1.yaml` against the
public semantic profiles and the frozen SCA-02 synthetic contrastive suite.

Required comparisons:

- current `full_derived` single-vector concatenation;
- same positive semantic content concatenated without exclusion cues;
- the same positive content split into five vectors with max late fusion;
- full-catalog direct ranking vs BAA-01 sibling-cap2 and sibling-cap4 assembly;
- 288 deterministic nonempty allowed-context probes spanning all 144 Topics and
  both zh/en current-query controls.

## Do not

- reopen or rerun the 80 private calibration cases;
- read evaluation or lockbox data;
- sweep extra representation weights, vector counts or candidate caps;
- use the public suite to lower private gates;
- modify BAA-01/BAA-02 historical evidence;
- begin SCA-04.

## Closure

1. require exact PR-head full regression CI PASS;
2. inspect the public diagnostic output;
3. merge only after the diagnostic is complete;
4. require exact merged-main CI PASS;
5. publish sanitized public RESULT/REPORT and canonical PAD status;
6. require exact closure-head CI PASS;
7. STOP.

Any future architecture amendment or private validation requires a new explicit
owner authorization.
