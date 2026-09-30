# A4 requested-output contrast — public DEV diagnosis and retirement

Evidence class: `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`. Batch `ZMR-A4-ROLE-DEV-DIAGNOSIS-20260930`, expected remote main `1c8e11de0a02cf288bf5372865a106ae090aa03b`. Single candidate writer; owned paths are the new A4 role modules/tests/diagnostics/results, this report, ZMR STATUS and explicit CI allowlist. PR165 froze the original 24-row DEV before new role scorer output. Compiler inputs remain pinned Catalog and fixed public TRAIN v0.2 only; no DEV labels enter indices, no independent quota or AS consumption.

## Fixed mechanisms and one-shot exposed DEV results

Initial A4 projects source and requested output, routes both against full144 A3 and retains a full144 flat fallback. It projected all16 labeled rows. First repair uses full144 A1 TF-IDF retrieval for the goal at fixed .15 score/.02 margin, requiring agreement with confident A3 goal evidence (.08/.05). A3 flat fallback is .02/.02. Second and last repair recognizes a terminal negative imperative to reopen/resume/restart a closed task. No thresholds were swept; each aggregate result was written once. Repairs use the already exposed public DEV as a light inner loop, not a fresh gate. Result receipts bind cohort/module/index hashes and their prior aggregate receipt.

| Variant | Labeled correct / assigned (16 rows) | Provisional assigned precision | False controls / 4 | Ambiguous assignments / 4 | Complete two-sided pairs / 8 |
| --- | --- | --- | --- | --- | --- |
| A3 flat | 4 / 12 | 33.33% | 2 | 4 | 0 |
| A3 + shared scope guard | 4 / 12 | 33.33% | 1 | 0 | 0 |
| A4 initial | 4 / 12 | 33.33% | 1 | 0 | 0 |
| A4 R1 | 5 / 11 | 45.45% | 1 | 0 | 0 |
| A4 R2 | 5 / 11 | 45.45% | 1 | 0 | 0 |

Initial vs scope: zero correct gain/loss, one wrong assignment avoided by DEFER, one wrong assignment added. R1 vs initial: one correct gain, zero correct loss, one wrong assignment avoided by DEFER, zero wrong added, two Topic switches. R2 vs R1: no output changes. The last guard passed synthetic negative-imperative tests but did not address the remaining DEV control error; its engineering PASS is not semantic improvement. No complete reversal pair was solved. Four ambiguous rows remain unscored, never treated as gold DEFER.

## Disposition and costs

`RETIRED_TWO_REPAIRS_SPENT_ABSOLUTE_PRECISION_CONTROL_AND_CONTRAST_PAIR_FAILURE_NO_FAMILY_CEILING`. The modest R1 exposed-DEV gain does not make this a stable challenger: precision45.45%, labeled exact recall31.25% and controls25% miss the unchanged95%/70%/2% targets even on this small same-writer slice. Repair allowance2/2 is exhausted. No fresh challenge, heavy gate, AS or final TEST is spent on this implementation. This is not a full144 capability measurement and establishes no A4-family or zero-model ceiling.

A3 index114,123 bytes, A1 index932,855, combined1,046,978 (1,598 bytes below1MiB). R2 runtime+indices1,079,489 bytes below2MiB. These static counts do not measure browser memory, cold init or p95 latency: `resource_verdict=NOT_QUALIFIED`. Four new synthetic engineering tests passed, covering full144 fallback, source separation, later-request handling, dual-index closure, corruption and input bounds. `capability_verdict=UNTESTED`; independent rows0, AS0, prohibited TEST reads/replays0.

## Automatic next development action

The retrieval complement's small gain plus near-full byte budget motivates a TRAIN-only feature-survival audit, not another patch to retired A4. Inspect high-document-frequency pruning against rare action/object features across all144 Topic prototypes; compare a bounded Topic-balanced sparse selector under the same byte caps. Do not read any consumed public evaluation packet for that audit. If supported, register a materially distinct selector hypothesis and fresh provenance-tracked public DEV before semantic scoring. Keep independent qualification frozen while its curator is unavailable. Same-writer data remain zero independent quota. Neither new seeds nor thresholds reset candidate/generation budgets.
