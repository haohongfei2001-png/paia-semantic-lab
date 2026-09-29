# ZMR-05 A5-R1 explicit no-request repair — development only

The first bounded A5 mechanism repair adds a finite-state **explicit no-request guard** ahead of the unchanged A5 composition policy. It recognizes broad cancellation, acknowledgment and completed-update cues in the current input. A correction cue or a later explicit request keeps the original A5 route available. This is a speech-act veto to DEFER, not a Topic-specific exception, new semantic model or new assignment source. The pinned Catalog and full144 A3 char index from public provisional TRAIN v0.2 remain the fallback; title/recent do not supply evidence. The consumed A5 challenge v0.1 was **not** replayed, inspected per row or used to choose terms.

The new source is `a5_composition_r1.mjs`; three synthetic engineering checks cover a false lexical assignment veto, a later real request and correction/two-action preservation, bad input and Catalog closure. The complete package suite has 89 tests. The source of A1+A3+A5 scope+A5 composition+A5-R1 is 24,190 bytes; with the 114,123-byte A3 index, the static combined count is 138,313 bytes, inside the unchanged 1 MiB index and 2 MiB combined caps. These are not browser bundle, memory or latency measurements. Resource verdict remains `NOT_QUALIFIED`.

The separate public repair DEV v0.1 was used for **light inner-loop development**, not an independent or held-out gate. Its byte SHA-256 is `333c8cf659af3288885102e837f63bbc552307c424d76bc3fa30087073db23bf`; the fixed R1 module byte SHA-256 is `a816be8bed0e6e08a06247f177b7be8ca3346db2d9eeb168065dbb3b0fce1fda`. Aggregate counts from fixed A3 .02/.02 and A5 .02/.02 with .08/.05 segment thresholds:

| Public repair DEV layer | Rows | A3 assigned / exact | A5 assigned / exact | A5-R1 assigned / exact |
| --- | ---: | ---: | ---: | ---: |
| No-request controls | 12 | 9 / unscored | 8 / unscored | 1 / unscored |
| Two-goal provisional labels | 8 | 6 / 0 | 8 / 0 | 8 / 0 |
| Corrections | 4 | 3 / 1 | 4 / 2 | 4 / 2 |
| Quoted-background singles | 4 | 2 / 0 | 0 / 0 | 0 / 0 |
| Ambiguous, no gold | 4 | 4 / unscored | 3 / unscored | 3 / unscored |

R1 reduced this same-writer DEV control false-assignment count from 8 to 1 without changing the other aggregate counts. One false assignment in 12 controls still cannot satisfy the unchanged 2% safety gate, and zero exact multi sets in eight is a mechanism failure. This is **repair 1 of at most 2** for the A5 candidate; it is not a capability, safety or resource PASS. A small, authored public DEV may overstate gains, and the guard may suppress valid requests outside these examples. Freeze R1 now and author a distinct fresh public challenge with no-request and positive-request contrasts, multi, corrections, quotes and unresolved ambiguity. Register one paired A3/A5/A5-R1 comparison after that challenge is frozen, aggregate only. If the new challenge shows no isolated safety-preserving benefit, retire R1; a second repair, if justified, needs another fresh public DEV and challenge.

All data remains `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`, with zero independent ZMR-01B quota; capability `UNTESTED`, resources `NOT_QUALIFIED`. No sealed AS, final TEST, consumed CIG-v1 TEST or production/private data was accessed.
