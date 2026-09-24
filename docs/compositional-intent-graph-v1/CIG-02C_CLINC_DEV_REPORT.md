# CIG-02C source-separated public train DEV

## Source and pre-open freeze

This DEV uses the public [CLINC out-of-scope intent dataset](https://github.com/clinc/oos-eval) at commit `828f8093932c8fe6ca7936c3d2e52903b1c523de`, licensed CC BY 3.0. The dataset was created with crowd workers for [Larson et al., EMNLP-IJCNLP 2019](https://aclanthology.org/D19-1131/). Only the `train` split is scored. Eleven unambiguous CLINC intent labels were mapped to eleven formal PAIA Topics before opening the utterances. For each label, ten train utterances were selected by a fixed SHA-256 sort. The mapping, candidate, selection, scorer blob and metric definitions were registered in `CIG-02C_CLINC_DEV_PREOPEN_FREEZE.json`.

The first workflow invocation failed in scorer bookkeeping before it emitted a result. The missing per-label accumulator assignment was corrected; no mapping, selection or metric definition changed. The technical failure and corrected scorer blob are recorded in the freeze artifact.

## Observed result

The successful [GitHub Actions run 36030717414](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36030717414) scored 110 independently crowd-authored English train utterances. The frozen CIG-02B balanced grounder and CIG-02C formal-name gate had **identical** results:

| Candidate | Correct / assigned | Correct / positive | Auto-assignment coverage | Represented-Topic macro recall |
| --- | ---: | ---: | ---: | ---: |
| CIG-02B balanced | 3/3 | 3/110 | 2.73% | 2.73% |
| CIG-02C balanced | 3/3 | 3/110 | 2.73% | 2.73% |

Nine of the eleven mapped intents received no assignment. Assigned precision is 100% only because both routers abstained on 107 of 110 requests. The formal-name gate repaired exact-name reachability but did not improve natural phrasing in this DEV.

A post-score **aggregate diagnostic** on the same selected train rows, without emitting case text, found a current global action cue in 17/110, any indexed object anchor in 59/110, both in only 12/110, and neither in 46/110. This separates two observed bottlenecks: the request grammar is too narrow for crowd-authored phrasing, and the public profile object lexicon misses many expressions. The remaining gap between 12 co-evidence rows and three assignments can also involve the fixed margin and competing Topics; no case-specific attribution is claimed. These are observations on a narrow eleven-Topic English DEV subset, not a universal zero-model impossibility proof.

## Decision

**CIG-02C is unqualified. CIG-02 remains open and unfrozen; CIG-03 is blocked.** The original 0.95 assigned precision, 0.70 coverage and 0.70 Topic macro recall capability floors are unchanged. The 110 CLINC train rows are now consumed development evidence. They may inform aggregate failure analysis, but cannot be recycled as a fresh blind capability TEST or support a post-hoc success claim. A later CIG-02 candidate would need a global, provenance-bound treatment of request grammar and object paraphrase coverage, followed by a newly authored public DEV. No production model, semantic network, private/legacy/lockbox evidence, real PAIA archive or PAIA production data was used.

Stored results: `CIG-02C_CLINC_TRAIN_DEV_RESULT.json` and `CIG-02C_CLINC_AGGREGATE_DIAGNOSTIC.json` under `artifacts/compositional-intent-graph-v1/`.
