# REM-02 — Representation and Retrieval Bake-off Closure

## Verdict

REM-02 execution is **COMPLETE** with bake-off capability verdict **PASS**.

This means the representation/retrieval comparison protocol completed correctly, not that the current candidate stack already satisfies the future REM-03 promotion gate. It does not.

## Evidence consumed

Authorized private evidence was used exactly within the frozen scope:

- legacy calibration: **80 judgments**
- legacy evaluation: **13 judgments**
- legacy evaluation read budget: **1**
- legacy evaluation reads consumed: **1**
- consumed SEM-07 lockbox labels used for tuning/promotion: **0**
- live PAIA archive reads: **0**
- real Input API egress: **0**
- new owner labels: **0**
- model training: **0**
- production PAIA writes: **0**

The private-promotion evaluator and plan were hash-frozen before calibration evidence was opened. Evaluation refused plan/code drift and ran only against the calibration-frozen shortlist.

## Public runtime evidence

| Model | Candidate RRF Recall@20 | Boundary-no-alias Recall@20 | Allowed-context Recall@20 | Input retrieval nDCG@10 | Peak RSS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Qwen3-Embedding-0.6B | 0.7037 | 0.1111 | 1.0000 | 0.5239 | 7.91 GB |
| BGE-M3 | 0.7037 | 0.1111 | 1.0000 | 0.8132 | 4.31 GB |

Nomic and multilingual-E5 were not present in the local model cache and remain NOT_RUN_LOCAL_RUNTIME_UNAVAILABLE; no quality penalty is assigned.

## Calibration stage

The frozen private matrix evaluated **16 configurations**: 2 models × 2 Topic descriptors × 2 query views × 2 ranking modes. Calibration used six deterministic family-disjoint folds and a Pareto-first selection protocol.

Two configurations remained on the Pareto frontier and were frozen before legacy evaluation:

1. rem02cfg-30ed3156c71fd270 — BGE-M3 / full_boundaries / allowed_context / RRF
2. rem02cfg-d2af02a6913bddf3 — BGE-M3 / full_boundaries / current_only / RRF

Both produced the same calibration family-macro metrics:

- complete-case Recall@20: **0.3413**
- topic Recall@20: **0.5349**
- complete-case Recall@10: **0.0518**
- context-dependent complete-case Recall@20: **0.4333**
- minimum fold complete-case Recall@20: **0.2000**

Frozen shortlist hash: c1f19a33ef0ea55f2a272b8d4596cb0db9fc5cd6feaa3fca71700b66b8ade23e

## One bounded legacy-evaluation pass

The evaluation stage consumed the 13-judgment legacy evaluation set exactly once and evaluated only the two frozen shortlist configurations.

Both configurations again produced identical rankings and identical metrics:

- topic Recall@20: **0.5795**
- complete-case Recall@20: **0.2308**
- complete-case Recall@10: **0.0000**
- context-dependent complete-case Recall@20: **0.0000**
- evaluation ranking digest: 64db54037fdd848929d4bca91c58ec03703a76e4b0bc3adfcb7654d1e95d9615

Only one evaluation case is context-dependent, so the context-specific evaluation metric has very low support and must not be overgeneralized.

The fact that allowed_context and current_only remain identical in this frozen BGE+RRF stack means REM-01's strong synthetic context gain did not translate into a legacy-personal candidate gain under the current candidate construction. That is a remediation target, not permission to tune on the evaluation set.

## Relation to REM-03 gate

The shortlisted baseline family is **not** close to the frozen REM-03 candidate gate.

- legacy evaluation topic Recall@20: **0.5795**
- future REM-03 required Candidate Recall@20: **0.99**

Therefore REM-03 must perform actual candidate-generation remediation. The current shortlist is a baseline/remediation starting point, not an already-promotable candidate configuration.

REM-03 may explore the bounded remediation surfaces already frozen by the package: context-aware query composition, descriptor composition, fusion/reranking, candidate-width changes, confusing-neighbor handling, and multi-vector/chunk aggregation. It may not lower the .96/.99 candidate gates.

## Input retrieval remains separate

On the public Input-retrieval fixture, BGE-M3 reached nDCG@10 **0.8132** and Recall@20 **1.0000**, but hard-negative top-10 FPR remained **1.0000**. This does not cancel the Topic-candidate failure.

## Reproducibility and privacy

- public runtime digest: 37927e5ab3da2286d7384bd50ce2d338b676351bae86a695d95ae51b2aef36b7
- calibration result digest: 728e407fb6f0131e1991ad62718f4a36481e74ff0083446e49102007074eb848
- evaluation result digest: 5bf25955f278fd1fc125e09348d040eda1e75f07322f83250c860c5fe45a0849
- private-promotion plan SHA-256: 0f99504f278573730c698b95f92303cd0a048cef43cc351900b076242e3a5b1a
- private evaluator SHA-256: 0f11c84a53ea3c207498e6b17f14fb94b2cd025a69bd6473f6ac3631a6033456
- evaluation read-consumption marker state: **CONSUMED**
- consumed lockbox tuning/promotion events: **0**

The detailed calibration private payload did not persist because a residual process was interrupted after the shortlist/public aggregate had already been written. The frozen shortlist, public calibration aggregate, hashes, and one-time evaluation evidence are complete and sufficient for REM-02 closure; calibration was not rerun.

## Local validation

- REM-02 private-promotion targeted tests: **13/13 PASS**.
- Full repository regression: **94/94 PASS** in **848.958 s**.
- Public-artifact privacy scan: **PASS**.
- git diff check: **PASS**.

## Next round

REM-03 may become READY for full-catalog candidate remediation and freeze. It must remain NOT_AUTHORIZED until a new explicit user message starts that round.

REM-03 is not started by this REM-02 execution.
