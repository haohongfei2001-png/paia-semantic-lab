# REM-03 — Full-Catalog Candidate Remediation Checkpoint

## Status

REM-03 public/synthetic candidate-remediation implementation is **PASS**, but the round is **BLOCKED / INCONCLUSIVE** because this execution did not authorize reuse of the private SEM-06/07 promotion artifacts required to measure the frozen Recall@10 >= 0.96 and Recall@20 >= 0.99 gates.

REM-04 remains locked.

## Candidate policy implemented

The v0.3 candidate layer is independent from historical SEM-03 and preserves full-catalog eligibility. It combines:

- full-catalog direct dense/fusion channels;
- exact and contained Topic-name/alias hard evidence;
- primary-domain sibling scaffold: up to all 8 Topics in the strongest internal domain;
- secondary-domain scaffold inside top 20;
- declared confusing-neighbor expansion when relations exist;
- custom Topic safety lane;
- long-input chunk channel;
- activity/pin/calibration priors only after the top-20 invariant prefix.

Internal domains are retrieval scaffolds only. They are never assignment targets.

## Why domain scaffolding was added

The current catalog has 144 ACTIVE Topics arranged as exactly 18 domains × 8 Topics. However, all 144 Topics currently have zero declared confusing-neighbor edges. More importantly, after Topic names/aliases are removed, the definition + inclusion + representative-example text collapses to **one identical template across all 144 Topics**.

Therefore the current catalog cannot supply enough discriminative semantic descriptor text by itself. REM-03 uses domain membership as a recall scaffold while preserving direct full-catalog retrieval.

## Public structural validation

- all 18 domains contain exactly 8 active Topics;
- every primary-domain member fits inside the top-10 scaffold: **PASS**;
- secondary-domain scaffold fits inside top 20: **PASS**;
- full-catalog top-20 reachability: **144/144**;
- declared-neighbor expansion can enter top 20: **PASS**;
- custom Topic top-20 safety path: **PASS**;
- top-20 activity-state invariance: **PASS**;
- 1024-Topic scale probe: **PASS**;
- automatic formal Topic creation: **0**;
- production PAIA modifications: **0**.

Final deterministic public metrics after the contained-alias safeguard:

- standard Recall@10: **1.0000**
- standard Recall@20: **1.0000**
- boundary-no-alias Recall@10: **0.0833**
- boundary-no-alias Recall@20: **0.1389**
- current-only context Recall@20: **0.1667**
- allowed-context Recall@20: **1.0000**
- long-input Recall@20: **1.0000**

The low boundary-no-alias result is expected from the catalog audit: after alias removal, all Topic semantic boundary text is the same template. It is not hidden by the aggregate result.

## Real BGE development evidence

A pinned/offline BGE-M3 public development run was executed before the final contained-alias safeguard. It showed that domain injection alone did **not** improve context-free or boundary-no-alias recall and reduced allowed-context Recall@20 from the REM-02 public baseline 1.0 to 0.6667.

That public regression directly motivated the contained-alias hard-evidence safeguard. The final safeguard is structurally deterministic: whenever an allowed context explicitly contains an existing Topic name/alias, that Topic is inserted before domain scaffolding. The final deterministic public suite confirms allowed-context Recall@20 = 1.0 and long Recall@20 = 1.0.

The pre-safeguard exploratory BGE run is development evidence only and is not presented as the final REM-03 runtime score.

## Frozen quality gates

The package gates remain unchanged:

- Candidate Recall@10 >= **0.96**
- Candidate Recall@20 >= **0.99**
- no hidden critical-slice failure;
- full-catalog eligibility preserved under activity-state perturbation;
- consumed SEM-07 lockbox not used for selection.

These private promotion gates were **not run** in this execution because existing private artifact reuse requires fresh round-specific authorization.

## Guards

- private SEM-06/07 artifact reads: **0**
- live PAIA archive reads: **0**
- real Input API egress: **0**
- new owner labels: **0**
- model training: **0**
- production PAIA writes: **0**
- consumed SEM-07 lockbox tuning/promotion events: **0**

## Reproducibility

- REM-03 config SHA-256: `81132e9267e4956e396fd38f324112d3f68b2a68553cd7818bf3c85837ec557d`
- REM-03 policy SHA-256: `65f96d552cb0c499f1440b0e88e71b25d40e6e1d2812177cbf87e599ba8654d4`
- REM-03 runtime harness SHA-256: `b3973f218b920874a0821e8e5a7a2fc65148061194af5ea76a72d14fb199684e`
- final public validation SHA-256: `82bf17e072179941605c27bccfbe54971dddf8908306754f7b5e9a0ee6f1b2cb`
- deterministic result digest: `02f7d15d71af908bf82e0aee0a19003766b7b6329e701f679590880ec915a25e`

## Blocker

To resume REM-03 and decide PASS vs FAIL, a new explicit authorization is required for read-only reuse of existing private legacy promotion evidence in this round. Development/config selection must use the legacy calibration set; any legacy-evaluation use must be bounded and frozen before read. The consumed 35-case SEM-07 lockbox remains forbidden for tuning/promotion.

Do not start REM-04.
