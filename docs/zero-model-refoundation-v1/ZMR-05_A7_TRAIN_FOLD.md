# ZMR-05 A7 TRAIN-only bounded mechanism probe and disposition

After the single public DEV diagnostic rejected default A7, a separate TRAIN-only check held out each of the two authoring batches in turn. Each fold builds 144 one-case prototypes from the other batch, fits document frequency only on that build side, and queries the held-out batch's 144 cases. Both batches were written by the **same candidate writer**; this is internal mechanism analysis, not independent generalization evidence. No DEV, AS or TEST row enters the script. The generated JSON contains aggregate counts only.

The baseline uses every query feature in cosine normalization, including terms absent from the retained prototype vectors. A bounded possible repair restricts that normalization to retained TRAIN features; it leaves the 48-feature case budget, two-feature support, 0.25 score and 0.05 margin fixed. This is a mechanism probe on TRAIN folds, not a threshold search on the consumed DEV cohort.

| Mode / authoring-batch holdout | Baseline correct strict / 144 | Restricted-norm correct strict / 144 | Restricted-norm positive top-1 / 144 | Restricted-norm mean true / best rival score |
| --- | ---: | ---: | ---: | ---: |
| char v0.2→v0.3 | 0 | 10 | 29 | 0.052 / 0.098 |
| char v0.3→v0.2 | 0 | 11 | 24 | 0.050 / 0.101 |
| word v0.2→v0.3 | 0 | 4 | 8 | 0.018 / 0.058 |
| word v0.3→v0.2 | 0 | 5 | 7 | 0.018 / 0.051 |

Here “correct strict” means correct top Topic with the unchanged support/score/margin; “positive top-1” is the correct highest-scoring Topic when its score is above zero. The bounded repair raises a few TRAIN-fold assignments, but it does not change the low correct top-1 rate, and the mean best rival score exceeds the mean correct-Topic score in all four folds. Together with public DEV v0.1 showing no isolated A7-only correct case, there is no evidence to spend a fresh public DEV cohort on this specific repair. A7's current case-memory implementation is **eliminated** from the stable candidate path; no repair is promoted, no full144 challenge is run, and no broader lexical-retrieval or zero-model ceiling is claimed. The unused maximum repair slots are not proof that no other implementation could work.

Next use the existing Catalog-derived A4 provisional boundary graph to prepare a new public, candidate-writer positive/negative/ambiguous triad per selected neighboring pair. The graph remains provisional and no resolver is activated without evidence. This continues the already registered A4 contrastive-boundary family; it does not reopen CIG-v1 or loosen 144 Topic, capability, safety or resource gates. All new data will remain `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE` until genuinely independent intake exists.
