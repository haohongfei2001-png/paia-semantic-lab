# REM-02 — Representation and Retrieval Bake-off (Blocked Closure)

## Status

REM-02 public/synthetic runtime evidence is **PASS**, but the round is **BLOCKED / INCONCLUSIVE** because this execution did not authorize read-only reuse of the private SEM-06/07 legacy calibration/evaluation artifacts required by the frozen REM-02 contract.

This is not a semantic capability failure. It is an evidence-authorization blocker.

## Public runtime scope

The bounded public runtime matrix used:
- all 144 ACTIVE System Topics as the candidate universe;
- 18 synthetic/catalog families, one per internal domain;
- 54 context-free candidate cases;
- 18 context-dependent cases;
- 6 long-position cases;
- the separate SEM-02 public Input-retrieval fixture;
- frozen `full_boundaries` Topic descriptor;
- current-input and allowed-context query views;
- dense, lexical and RRF candidate paths.

The initial broader public Cartesian matrix was stopped before it produced any quality result because its CPU cost was disproportionate while private promotion evidence was unavailable. The bounded matrix was frozen before the successful Qwen/BGE results were observed.

## Local model runtime

### Qwen/Qwen3-Embedding-0.6B

Pinned revision: `e692b5a16e45607c7e85d81c53e944ac90e6260a`.

- candidate RRF Recall@20: **0.7037**
- boundary-no-alias Recall@20: **0.1111**
- allowed-context Recall@20: **1.0000**
- current-input-only context Recall@20: **0.1667**
- long-input Recall@20: **0.5000**
- Input retrieval nDCG@10: **0.5239**
- Input retrieval Recall@20: **1.0000**
- hard-negative top-10 FPR: **1.0000**
- encoding replay exact: **PASS**
- peak RSS: **7,908,835,328 bytes**
- max observed token count: **2,688**, below effective 32,768-token limit.

### BAAI/bge-m3

Pinned revision: `cb1779f90b988b8deb01f9155c790ef9417d7648`.

- candidate RRF Recall@20: **0.7037**
- boundary-no-alias Recall@20: **0.1111**
- allowed-context Recall@20: **1.0000**
- current-input-only context Recall@20: **0.1667**
- long-input Recall@20: **0.8333**
- Input retrieval nDCG@10: **0.8132**
- Input retrieval Recall@20: **1.0000**
- hard-negative top-10 FPR: **1.0000**
- encoding replay exact: **PASS**
- peak RSS: **4,308,697,088 bytes**
- max observed token count: **3,510**, below effective 8,192-token limit.

## What the public evidence says

The two executed embedding models produce the same overall candidate Recall@20 and the same extremely low boundary-no-alias Recall@20. This supports the REM-00/01 diagnosis that the main Topic-candidate bottleneck is not resolved by simply switching between these two embedding models.

Allowed same-conversation context changes both models from 0.1667 to 1.0000 Recall@20 on the deliberately context-dependent synthetic slice. Context representation therefore remains a required bake-off axis.

BGE-M3 is on the **public/synthetic engineering frontier** because it matches Qwen on the measured candidate/context dimensions while showing better public Input-retrieval ranking, better long-input results, and lower peak RSS.

That is **not** a promotion shortlist or model winner. The frozen REM-02 plan requires private family-grouped calibration plus one bounded legacy-evaluation pass before any promotion decision.

The public Input-retrieval result also has a warning: both executed models put every judged hard negative inside top 10 on the small public fixture (FPR 1.0). Recall@20 alone therefore cannot be treated as success.

## Candidates not executed

- `nomic-ai/nomic-embed-text-v2-moe@c8bdf8c...`: `NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE`
- `intfloat/multilingual-e5-large-instruct@9d7f719b...`: `NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE`

No quality penalty is assigned to unexecuted candidates.

## Mechanisms carried from REM-01

REM-01 already established engineering viability for:
- four Topic descriptor constructions;
- field-max Topic multi-vector representation;
- whole and chunk-max long-input handling;
- dense / lexical / RRF source paths.

REM-02 did not repeat the most expensive public Cartesian combinations because private promotion evidence was unavailable. No quality conclusion is drawn from non-execution.

## Authorization and privacy audit

- private SEM-06/07 artifact reads: **0**
- live PAIA archive reads: **0**
- real Input API egress: **0**
- owner semantic labels: **0**
- model training runs: **0**
- production PAIA writes: **0**
- consumed SEM-07 lockbox tuning events: **0**

The consumed 35-case SEM-07 lockbox remains diagnostic-only and was not used.

## Local validation

- REM-02 targeted + package-state tests: **9/9 PASS**.
- Full repository regression: **90/90 PASS** in **239.757 s**.
- REM-02 public runtime evidence validator: **PASS**.
- `git diff --check`: PASS.

## Current blocker

Required to resume REM-02:
1. fresh explicit authorization for **read-only** use of the existing private SEM-06/07 artifacts in REM-02;
2. use only the legacy **80 calibration judgments** for family-grouped development comparison;
3. permit exactly one bounded read of the legacy **13 evaluation judgments** for promotion validation;
4. continue to forbid the consumed 35-case SEM-07 lockbox for tuning/promotion;
5. continue to forbid live archive reads, real Input API egress, new labels, training and production writes.

Until that authorization exists, formal promotion shortlist remains:

`WITHHELD_PRIVATE_EVIDENCE_NOT_AUTHORIZED`

REM-03 must not start.
