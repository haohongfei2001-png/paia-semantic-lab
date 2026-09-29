# ZMR-03 fixed A0/A1/A2/A3 public comparison

The frozen public same-writer challenge v0.3 was used once for registration key `c2ce56b3bf74740f9fa79920d6d39c0a980f73ded74d2a7809c1dc591b1007cd`. The registration pins the 144-row cohort, pinned Catalog, provisional TRAIN, runtime/compiler/scorer closure, local Node environment, six configurations and `UNFITTED_NO_CALIBRATION`. The comparator refuses an unchanged-key rerun after its result file exists. Aggregate counts and static build observations are in `ZMR-03_A123_CHALLENGE_V03_RESULT.json`; no per-row predictions are retained in the report.

| Fixed development configuration | Assigned / 144 | Correct / assigned | Provisional assigned precision | Provisional full144 macro recall |
|---|---:|---:|---:|---:|
| A0 all DEFER | 0 | 0 / 0 | null | 0 |
| A1 character TF-IDF | 63 | 31 / 63 | 0.492 | 0.215 |
| A1 character BM25 | 143 | 42 / 143 | 0.294 | 0.292 |
| A2 character likelihood | 63 | 36 / 63 | 0.571 | 0.250 |
| A3 character hinge | 97 | 43 / 97 | 0.443 | 0.299 |
| A3 word hinge | 52 | 13 / 52 | 0.250 | 0.090 |

Each provisional Topic occurs once, so full144 macro recall equals correct / 144 **for this public set only**. Precision includes all assigned rows; all-DEFER precision is null. There is no valid per-language full144 macro estimate because each Topic appears in only one language. The fixed 95% assigned precision and 70% coverage/macro floors were not lowered. None of these configurations reaches those point thresholds on the provisional labels, and the cohort has no independent gold, controls, context, multi-intent or resource measurement needed for capability promotion.

## Mechanism diagnosis and disposition

- A3 character makes seven more correct single assignments than A2 character (43 versus 36) but also 34 more assignments (97 versus 63), reducing provisional assigned precision from 0.571 to 0.443. Its extra coverage is not a safe promotion signal. A1 BM25 nearly always assigns and is similarly unsafe.
- A2 character makes no English assignments in this fixed configuration. A3 word defers 84 inputs as OOV; Chinese word support is nearly absent. These aggregate patterns motivate feature/threshold study on new public development evidence, not a language-capability verdict.
- Relative to A2 character, A3 character has 15 provisional A3-only correct cases and eight A2-only correct cases; the nonzero complementarity is a **development hypothesis** for a bounded hybrid, not evidence that combining them will pass safety, full144 or resource gates.
- The current A1/A2/A3 configurations are not promoted. A3 character and word configurations are rejected as current candidates; this does not establish a ceiling for the discriminative family. No mechanism repair was spent against this exposed cohort. Future repair needs a changed closure and fresh public development data; ZMR-04 A4/A5 engineering may proceed in parallel with further data work.

The v0.3 cohort is now `CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC`, permanently exposed. It is neither AS nor blind TEST. Same-writer labels may be wrong; no independent author/source/reviewer qualification exists. Static index bytes are engineering observations, not browser memory/latency resource PASS. ZMR-01B remains `NOT_QUALIFIED`, capability remains `UNTESTED`, resources remain `NOT_QUALIFIED`, and saturation cannot be inferred.
