# ZMR-05 A7 partial public DEV v0.1 diagnostic

This is one registered, same-writer public development diagnostic, evaluation key `a18d99a65f244420536ab93546c2b1bbdf47f911959c808ae8d5b1b978d82624`. The frozen input is 48 single-intent requests covering one of every three fixed Topics plus 12 no-request controls. Seven fixed configurations were compared once: all-DEFER, A1/A3/A7 char and A1/A3/A7 word. The candidate and scorer closure, Catalog, both TRAIN files, cohort, environment and fixed settings are in the registration. No per-row prediction is retained in the result. The public DEV key is consumed for this diagnostic and must not be rerun or used for threshold tuning.

| Fixed config | Single assigned / 48 | Correct / 48 | Assigned precision | Control false / 12 |
| --- | ---: | ---: | ---: | ---: |
| A0 defer | 0 | 0 | undefined | 0 |
| A1 char | 19 | 3 | 15.8% | 3 |
| A3 char | 35 | 2 | 5.7% | 6 |
| A7 char default | 0 | 0 | undefined | 0 |
| A1 word | 11 | 2 | 18.2% | 4 |
| A3 word | 16 | 2 | 12.5% | 5 |
| A7 word default | 1 | 1 | 100% on one assignment | 1 |

All configurations had zero deterministic repeat differences. Paired A7 versus A1/A3 char had zero A7-only correct cases; A7 word likewise had zero A7-only correct cases. The default per-scenario maximum plus fixed support/margin is too sparse to produce useful coverage on this partial cohort. The apparent A7 word precision is one correct assignment among 48 and cannot establish 95% precision; one control false assignment among 12 also cannot establish the 2% global safety gate. All 96 unrepresented Topic strata remain in the full 144 denominator. These data also lack context-required and multi-intent layers.

The whole cohort and provisional gold were authored by the candidate writer. It is `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`, with zero independent quota, AS or final TEST credit. Static index bytes are separate from browser memory and latency; resource verdict stays `NOT_QUALIFIED`. Capability stays `UNTESTED`. No CIG-v1 consumed TEST, independent sealed AS or future TEST was read or rerun.

**Disposition:** A7's default mechanism is rejected as a stable candidate on this public partial diagnostic. It has no isolated correct gain over either anchor. One bounded repair may be justified only by a distinct TRAIN-only grouped-fold mechanism analysis, not by selecting thresholds against this consumed DEV. If that repair is defined, evaluate it on a fresh public DEV cohort and then eliminate A7 if it does not show a safety-preserving gain. A fresh full144 challenge is reserved for a stable changed closure, not this rejected default. This result is not a zero-model family ceiling or saturation finding.
