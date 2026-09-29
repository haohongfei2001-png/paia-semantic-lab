# ZMR-05 first C1 repair: fixed public comparison and rejection

The frozen public same-writer challenge v0.6 (144 single-intent rows) and safety v0.4 (48 base rows) were compared exactly once under registered key `eb4c0b157c9a70104f8290df53981120a26294a00172c5c39bed7bda2a50e394`. Seven fixed configurations comprise A0, A3 character/word, original C1 character/word and first-repair C1-R1 character/word. Registration pins Catalog, TRAIN, both cohorts, code/compiler/scorer closure, thresholds, Node environment and resource profile. The comparator refuses a second run once its result file exists. The JSON receipt contains aggregate counts only; no per-row predictions were retained.

| Fixed public configuration | Assigned single / 144 | Correct / assigned | Assigned precision | Full144 macro | Control false / 12 | Context required exact / 12 | Multi exact / 12 |
|---|---:|---:|---:|---:|---:|---:|---:|
| A0 all DEFER | 0 | 0 / 0 | null | 0 | 0 | 0 | 0 |
| A3 character | 123 | 55 / 123 | 0.447 | 0.382 | 9 | 0 | 0 |
| Original C1 character | 122 | 54 / 122 | 0.443 | 0.375 | 9 | 0 | 0 |
| C1-R1 character | 116 | 51 / 116 | 0.436 | 0.354 | 8 | 0 | 0 |
| A3 word | 59 | 11 / 59 | 0.186 | 0.076 | 5 | 0 | 0 |
| Original C1 word | 58 | 11 / 58 | 0.190 | 0.076 | 5 | 0 | 0 |
| C1-R1 word | 55 | 10 / 55 | 0.182 | 0.069 | 4 | 0 | 0 |

For character mode, C1-R1 loses three correct single assignments versus original C1 and four versus A3. It changes control false assignments from 9 to 8 versus C1, still far above the unchanged 2% safety gate. Context-required exact and multi exact stay at zero for all three character configurations. Word mode similarly loses a correct single and reduces one false control versus C1, with no context or multi exact gain. All deterministic repeat differences are zero, and complete-output context-invariance harm is zero on twelve pairs; these isolated counts do not compensate for the failed gates. Character global label precision for C1-R1 is 55/142 (0.387), far below 95%. No fixed configuration reaches the unchanged 95% assigned precision, 70% coverage/full144 macro or safety/context/multi gates.

## Disposition and limits

The first repair's broader continuation grammar and separate recent-message scorer did not recover a context-required exact case. Broader coordination parsing also failed to produce an exact multi-intent set. These aggregate results show no isolated safety-preserving gain from the component and do not justify a second grammar/threshold repair against this consumed public key. Original C1 and C1-R1 components are retired from the active candidate path. The rejection is of this bounded implementation, **not** a zero-model family ceiling. The next development hypothesis must use a genuinely different evidence/scoring mechanism and new public development cohorts; no v0.6 row, AS or TEST content may be used for targeted repair or rerun.

Both new cohorts are now `CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC`. They have one candidate writer, unreviewed provisional gold, one single-intent row per Topic and incomplete independent language/source/safety quotas. Static index bytes are engineering observations only, without browser memory/latency qualification. Therefore ZMR-01B remains `NOT_QUALIFIED`, capability `UNTESTED`, resources `NOT_QUALIFIED` and saturation is unassessed. All product hard constraints remain unchanged.
