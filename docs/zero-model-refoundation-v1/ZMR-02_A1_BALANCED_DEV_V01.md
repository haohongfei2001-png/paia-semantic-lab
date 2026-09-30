# Fixed bilingual A1 selection — diagnosis, audit correction and retirement

Batch `ZMR-A1-BALANCED-DIAGNOSIS-20260930`, expected remote main `fccd427bb17d1ed8556a841fe7455eebe0b1e0fd` after PR168. Single writer; owned paths: new bounded compiler/runtime/test/diagnostic modules and aggregate results, V2 TRAIN-only audit, this report, STATUS and explicit CI allowlist. Evidence is `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`, independent rows0, AS0. No consumed CIG-v1 TEST or sealed AS/final access. Catalog and TRAIN v0.2 alone compile statistics; DEV gold never reaches the Router. Full144 prototypes/output space remain;126 Topic single-gold gaps are DATA_INSUFFICIENT, not removed from macro denominator.

## Engineering correction to the earlier allocation audit

V1 audit assembled deduplicated document prototypes but constructed alias queues from non-deduplicated alias strings. Cross-alias n-grams absent from all documents could enter the reserved set, leading to undefined document frequency and non-finite IDF serialized as null. V1's890,757-byte estimate and100% Chinese feature-retention claim are invalid engineering observations. Original code/receipt remain immutable for traceability; V2 filters all queues to observed TRAIN/Catalog features and asserts finite IDF. No semantic packet was involved in that audit, and no capability PASS existed to revoke.

V2 reconstructs932,855 bytes for the frequency anchor and936,001 for the corrected reserved index before101 bytes of selector identity: actual936,102 bytes. Chinese Catalog retention median is66.67%, English97.30%, not proof of natural-expression recall. The actual compiler included observed-feature filtering from its first output, so its semantic diagnosis did not use the invalid V1 artifact. Synthetic regression rejects absent features/non-finite postings and validates the fixed frequency backbone.

## One-shot exposed public DEV comparison

All variants use fixed current-only TF-IDF .15 score/.02 margin,144 output labels and no per-Topic tuning. Initial reserves up to20 rare-first observed alias features per Topic/language then frequency-fills to6,000. R1 first preserves4,000 frequency features, then makes bounded bilingual reservations and fills to6,000. One public DEV inner loop per implementation; R1 is explicitly reused exposed DEV, not a fresh gate. Deterministic repeated output and two build hashes are verified within each execution. No threshold sweep or heavy gate.

| Variant | Single correct / assigned (18 gold) | Assigned precision | False controls / 6 | Context exact / 4 | Multi exact / 4 | Ambiguous assignments / 4 |
| --- | --- | --- | --- | --- | --- | --- |
| Frequency anchor | 5 / 10 | 50% | 2 | 1 | 0 | 0 |
| Initial balanced | 2 / 7 | 28.57% | 4 | 0 | 0 | 2 |
| R1 frequency backbone | 3 / 8 | 37.5% | 3 | 0 | 0 | 2 |

Initial vs anchor gains0 correct, loses3, adds2 false controls. R1 vs anchor gains0 correct, loses2, adds1 false control. R1 recovers one lost correct item but provides no isolated safety-preserving improvement over the unchanged anchor. Global label micro precision including supported labels in single/context/multi and all control outputs is7/16 (anchor),3/15 (initial),4/15 (R1); ambiguous rows are unscored/excluded. Missing126 single-gold Topics contribute zero to the full144 macro diagnostic, which cannot qualify capability. Current-only top1 cannot qualify context/multi irrespective of synthetic tests.

## Retirement and next track

`RETIRED_NO_SAFETY_PRESERVING_GAIN_AFTER_ONE_REPAIR_NO_FAMILY_CEILING`, repair spent1/2. A second repair is not justified by a new mechanism; no fresh challenge or AS is spent to keep a losing component alive. This does not exhaust A1-family/zero-model research. Frequency remains an unqualified diagnostic anchor, never a capability winner.

Initial index936,102/runtime+index943,975 bytes; R1 index935,556/runtime+index943,476. Both individually meet static caps; comparison assets are not deployed together. Static counts,4 synthetic engineering tests and deterministic builds do not qualify browser latency/memory: resources NOT_QUALIFIED, capability UNTESTED. Historical A4/other candidate repair allowances remain intact and are not reset.

Continue Catalog-driven TRAIN expression and factor coverage: register bounded provisional v0.4 expansion cards for144 formal Topics and an initial coherent bilingual scenario slice. Author from Catalog mechanism needs, not recycled exposed DEV failures; do not fill quotas with template substitutions. Candidate-writer data remain non-independent/zero01B quota. Freeze the new source version before A2/A3 compiler reentry, preserve retired implementations, and require distinct fresh provisional DEV for comparisons. Independent qualification remains frozen separately; no new independent generation, ceiling, product constraint or production claim.
