# ZMR-05 fixed C1/A3 public comparison

The frozen public same-writer challenge v0.5 and safety v0.3 cohorts were evaluated once under registered key `fc7a4e4a88453b7841bdc0dcef5f38595366938bfae8b0d8528b91bb0f772cdf`. The registration pins the 144-row single-intent cohort, 48-row safety cohort, Catalog, provisional TRAIN, candidate/compiler/scorer closure, local Node environment and five fixed configurations. The comparator refuses an unchanged-key rerun after its result file exists. Aggregate counts and static build observations are in `ZMR-05_C1_CHALLENGE_V05_RESULT.json`; no per-row predictions were retained.

| Fixed public development configuration | Assigned / 144 | Correct / assigned | Provisional precision | Full144 macro | Control false / 12 | Context required exact / 12 | Multi exact / 12 |
|---|---:|---:|---:|---:|---:|---:|---:|
| A0 all DEFER | 0 | 0 / 0 | null | 0 | 0 | 0 | 0 |
| A3 character | 103 | 25 / 103 | 0.243 | 0.174 | 7 | 0 | 0 |
| C1 character | 103 | 25 / 103 | 0.243 | 0.174 | 7 | 0 | 2 |
| A3 word | 39 | 3 / 39 | 0.077 | 0.021 | 3 | 0 | 0 |
| C1 word | 39 | 3 / 39 | 0.077 | 0.021 | 3 | 0 | 0 |

C1 character adds two exact multi-intent sets on twelve provisional cases, but it adds no correct single assignment, no context-required exact case and no control safety improvement over A3. Complete-output context-invariance harm is zero on twelve pairs; this isolated count cannot offset 0/12 context-required exact. The character configuration assigns seven of twelve controls. The word configuration makes no correct Chinese single assignments. None approaches the unchanged 95% assigned precision, 70% coverage/full144 macro, control, context or multi gates. No current fixed configuration is promoted.

## Mechanism diagnosis and disposition

- The current-only A3 base is highly prone to unsupported assignment on short or missing-evidence controls (`RUNTIME_FAIL_UNSAFE`), and its sparse TRAIN does not cover fresh natural expressions. C1's context path cannot fix a current-only wrong assignment if the continuation detector does not activate; on this cohort it has no context-required exact benefit (`CONTEXT_IGNORED`).
- The two-span C1 mechanism provides limited nonzero evidence for explicitly separated goals but leaves ten of twelve multi cases without an exact set (`MULTI_OMISSION`). Its apparent two-case gain is same-writer public development evidence, not an independent mechanism promotion.
- Both fixed C1 character and word configurations are rejected. No threshold, separator or lexical patch may be tuned against this consumed key. A bounded mechanism repair needs a changed closure and fresh public development data, with at most two explained attempts. If no isolated gain survives new evidence, retire C1 and advance to a distinct zero-model mechanism automatically. This failure does not establish a family or zero-model ceiling.

Both v0.5 cohorts are now `CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC`; neither is AS or blind TEST. They have one row per Topic, incomplete language and safety populations, one candidate writer, unreviewed labels and no independent source/reviewer cohorts. Static index bytes are engineering observations, not browser memory/latency resource PASS. ZMR-01B remains `NOT_QUALIFIED`, capability `UNTESTED`, resources `NOT_QUALIFIED`; all hard product constraints remain unchanged.
