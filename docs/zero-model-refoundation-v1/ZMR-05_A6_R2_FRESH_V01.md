# ZMR-05 A6-R2 fresh public comparison v0.1

The fixed A3/A2/original A6/A6-R1/A6-R2 configurations were registered under evaluation key `31cc709d149f3a44d6122e9470ba2eae3285c62bfb1ef3fca55a73754f7c11a5` before scoring the separate public challenge. The key was consumed once. All variants used the same unchanged 144-Topic Catalog and TRAIN v0.2. The evaluator retained aggregates and paired counts only; row predictions were ephemeral.

| Fixed variant | Labeled exact / assigned / 20 | Provisional exact-set precision | False no-request / 12 | Context exact / 4 | Multi exact / 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| A3 char | 3 / 16 | 3/16 | 9 | 0 | 0 |
| A2 char | 3 / 7 | 3/7 | 6 | 1 | 0 |
| Original A6 | 2 / 12 | 2/12 | 7 | 0 | 0 |
| A6-R1 | 2 / 4 | 2/4 | 4 | 0 | 0 |
| A6-R2 | 2 / 4 | 2/4 | 3 | 0 | 0 |

Against R1, R2 added **zero** correct labeled sets, lost zero, avoided one false no-request assignment, and left context and multi exact at zero. Against the simpler A2 anchor, R2 lost one exact label, avoided three wrong assignments by deferring, added one wrong assignment, and avoided three false controls. One of four context outputs changed when `recent` was removed, but neither R1 nor R2 got any context-required label exact; that change is not context capability. All variants had zero deterministic repeat differences. Four ambiguous rows remain unscored; R2 assigned one.

The R2 gain on reused repair DEV did not transfer to this separate same-writer public challenge. Three false no-request assignments among 12 controls and 0/4 context and 0/4 multi exact fail the relevant development targets by a wide margin. Both allowed mechanism repairs are spent. **Eliminate this A6 complement/scope component** and do not add a third repair or promote it. This focused public result cannot establish a family or zero-model ceiling. The next development hypothesis follows the canonical hierarchy attachment: test a bounded domain-to-Topic candidate with recoverable multi-domain or flat144 fallback against the same budget, using new public data and an explicit domain recall ablation. A hard top-1 domain filter is forbidden by `ARCHITECTURE_CANDIDATES.md`.

All 36 rows are unreviewed candidate-writer `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE` with zero independent ZMR-01B credit. Static index bytes are engineering counts, not browser resource qualification. Capability remains `UNTESTED`, data and resources `NOT_QUALIFIED`; AS/final TEST remain unconsumed. Older consumed public keys and CIG-v1 TEST were not replayed. The 144 Topic, 95% precision, 70% coverage/macro, safety, resource, local-first and zero neural/embedding/LLM/semantic API constraints remain unchanged.
