# CIG-02D fresh public DEV result

The CIG-02D candidate was frozen before this score in `CIG-02D_DEV_PREOPEN_FREEZE.json`. It extends the same 144-Topic public Catalog/Profile index with global request-form detection and distinctiveness-weighted typed token overlap. No external DEV utterance was compiled into the index. The candidate remains zero-model, local, deterministic and within the same byte limits.

The new source-separated positive stratum uses SHA-256 ranks 10-19, disjoint from the previously scored ranks 0-9, for eleven conservatively mapped CLINC `train` intents: 110 crowd-authored English requests. The additional 22 should-DEFER controls are newly authored public synthetic DEV, so their provenance is weaker. The pinned [CLINC source](https://github.com/clinc/oos-eval) is CC BY 3.0; see [Larson et al. (2019)](https://aclanthology.org/D19-1131/). GitHub Actions [run 36031966375](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36031966375) produced the stored result.

| Measure | Frozen CIG-02C balanced | CIG-02D balanced |
| --- | ---: | ---: |
| Correct / assigned | 1/1 | 16/17 |
| Assigned precision | 100% | **94.12%** |
| Auto-assignment coverage | 1/110 = 0.91% | **17/110 = 15.45%** |
| Represented-Topic macro recall | 0.91% | **14.55%** |
| False assignment on DEFER controls | 0/22 | **1/22** |
| Context harm | 0 | 0 |

The global mechanism recovered 15 more correct requests than the frozen control, but one assigned Topic was wrong and one same-writer DEFER control was assigned. More permissive matching alone therefore trades abstention for error. The result remains far below the unchanged capability floors of 0.95 assigned precision, 0.70 coverage, 0.70 Topic macro recall, at most 0.02 insufficient-evidence false assignment and zero context harm. This eleven-Topic English DEV cannot certify the full 144-Topic Catalog regardless of its numeric result.

**CIG-02D is unqualified; CIG-02 is not frozen and CIG-03 is blocked.** The selected train rows and DEFER controls are consumed DEV. No post-result threshold adjustment, per-case phrase patch, metric change or CIG-03 invocation is permitted on this evidence. The result suggests that surface forms and public profile atoms still do not express enough of the target relation for reliable automatic assignment; that inference is bounded to this DEV. Any subsequent CIG-02 candidate must use a new, unconsumed public DEV and remain within the current product and protocol constraints. If a credible next design requires relaxing zero-model, local-first, tiny size or frozen evaluation rules, owner approval is required before proceeding.
