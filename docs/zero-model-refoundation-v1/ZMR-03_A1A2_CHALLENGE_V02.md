# ZMR-03 fixed A1/A2 public challenge comparison

One registered development diagnostic used `provisional_train_v0.2.json` to compile A1/A2, the public `provisional_challenge_v0.2.json` for scoring, and the pinned 144-Topic Catalog. Registration key: `34401a17e57c2ce84c45aebf5561d82785e1d446b52eebc9f3e3af88fa0246ed`. The registration fixes the source and code closure digests, local Node environment, eight configurations, scorer and explicit `UNFITTED_NO_CALIBRATION` marker. The comparator refused to run if its result file already existed. The detailed machine-readable record is `ZMR-03_A1A2_CHALLENGE_V02_RESULT.json`.

| Fixed configuration | Assigned / 144 | Correct / assigned | Provisional assigned precision | Provisional full144 macro recall |
|---|---:|---:|---:|---:|
| A0 all DEFER | 0 | 0 / 0 | null | 0 |
| A0 formal name only | 5 | 3 / 5 | 0.600 | 0.021 |
| A1 character TF-IDF | 56 | 26 / 56 | 0.464 | 0.181 |
| A1 character BM25 | 144 | 41 / 144 | 0.285 | 0.285 |
| A1 word TF-IDF | 36 | 8 / 36 | 0.222 | 0.056 |
| A1 word BM25 | 53 | 8 / 53 | 0.151 | 0.056 |
| A2 character complement likelihood | 51 | 20 / 51 | 0.392 | 0.139 |
| A2 word complement likelihood | 15 | 5 / 15 | 0.333 | 0.035 |

Each provisional Topic occurs once, so full144 macro recall equals correct / 144 for this particular public set. Counts are against the candidate writer's **unreviewed** labels and do not establish accuracy against independent gold. Assigned precision uses every nonempty output in its denominator; no empty-prediction precision is imputed. Coverage is assigned / 144 in the record. No configuration comes close to the fixed 95% precision and 70% coverage/macro floors even on this development data.

## Mechanism diagnosis and disposition

- Character BM25's fixed threshold assigned all 144 while 103 disagreed with provisional labels. Its apparent coverage is unsafe as a promotion signal. Character TF-IDF deferred 88 and disagreed on 30 of 56 assignments. A1's current configurations remain development baselines, not stable candidates.
- The word feature path produced zero Chinese assignments, with 91 OOV deferrals in both A1/A2 word modes. This points to tokenization/feature support for Chinese, not a valid language-capability verdict. A2 character mode made zero English assignments with its predeclared threshold. The existing A2 configurations are not promoted.
- These are mechanism-level observations on exposed, single-author data. No calibration was fitted, no per-row outputs were retained, and the same challenge/key will not be rerun unchanged. A bounded repair needs a changed closure and fresh public development evidence; the next independent architecture family may proceed without waiting for that repair.

The challenge is now `CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC`. It is still **not** a blind TEST or AS packet. The comparator built ephemeral indexes; its byte counts are engineering observations only. There are no independent curator rows, no controls, context-required or multi-intent layers, no resource qualification, and no capability verdict. ZMR-01B therefore stays `NOT_QUALIFIED`, capability stays `UNTESTED`, and resource stays `NOT_QUALIFIED`. Next development work: implement the A3 family and create separate public provisional control/context/multi layers, then use a newly registered changed closure and fresh challenge for subsequent comparisons. Independent qualification remains frozen until genuinely isolated cohorts and review exist.
