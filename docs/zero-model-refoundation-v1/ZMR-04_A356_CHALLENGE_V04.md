# ZMR-04 fixed A3/A5/A6 public comparison

The frozen public same-writer challenge v0.4, safety v0.2 and role v0.1 slices were used once under registration key `d7f287127e46433190202b0237416f8f367b8a2afc313fa44fb7de77e06bcc3f`. The registration pins the 144-row single-intent cohort, 48-row safety cohort, 18-row role slice, Catalog, provisional TRAIN, candidate/compiler/scorer closure, local Node environment and five fixed configurations. The comparator refuses an unchanged-key rerun after its result file exists. Aggregate counts are in `ZMR-04_A356_CHALLENGE_V04_RESULT.json`; per-row predictions were not retained.

| Fixed public development configuration | Assigned / 144 | Correct / assigned | Provisional precision | Full144 macro | Control false / 12 | Role exact / 18 |
|---|---:|---:|---:|---:|---:|---:|
| A0 all DEFER | 0 | 0 / 0 | null | 0 | 0 | 6 |
| A3 character | 96 | 21 / 96 | 0.219 | 0.146 | 7 | 5 |
| A6 character structural hybrid | 96 | 21 / 96 | 0.219 | 0.146 | 7 | 5 |
| A3 word | 47 | 2 / 47 | 0.043 | 0.014 | 4 | 4 |
| A6 word structural hybrid | 47 | 2 / 47 | 0.043 | 0.014 | 4 | 4 |

The A6 focused-goal stage produced **zero aggregate gain** over its A3 anchor on single correct, role exact, controls or context harm in both modes. The character configuration assigned seven of twelve controls. The word configuration made no correct Chinese assignments. No fixed configuration reached the unchanged 95% assigned precision or 70% coverage/macro floors on this provisional set. All configurations had zero multi-intent exact sets out of twelve. The context-required base and context-removal correct counts were 1/12 and 2/12 for A3/A6 character, respectively. Complete-output context-invariance harm was zero on twelve pairs; that isolated count cannot rescue the failing context-required mechanism.

These are **same-writer public development point counts**, with one Topic row each and incomplete language/Topic, control and context populations. The labels are unreviewed, the 18-row role slice has only six scenario families, and there is no independent author/source/reviewer or AS. There is no browser memory/latency measurement. No capability, resource or saturation verdict can be inferred. ZMR-01B remains `NOT_QUALIFIED`, capability `UNTESTED` and resources `NOT_QUALIFIED`. Static index byte observations are engineering data only.

## Disposition and next candidate

The current A3 character/word and A6 character/word fixed configurations are rejected. A6's hypothesized focused-goal supplementation did not activate productively on the registered public cohort (`HYBRID_NO_GAIN`); the control false-assignment and low correct counts indicate a stronger evidence/calibration problem than a scope-only patch. Do not adjust thresholds or parser cues against this consumed key. Use a changed mechanism closure, fresh public development evidence and at most two explained repairs per candidate. Diagnose A5 parser coverage separately on non-consumed development material; if bounded repair still provides no isolated gain, remove A6 and advance to a distinct zero-model family or ZMR-05 context/multi mechanism. Do not activate A4 lexical resolvers without positive/negative/ambiguous triad evidence.

The v0.4 comparison cohorts are now `CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC`; they are neither AS nor blind TEST. No v0.2/v0.3 or current unchanged evaluation key may be rerun. Product and resource limits remain unchanged.
