# ZMR-05 A6-R1 public repair DEV diagnostic v0.1

A6-R1 replaced the A3 fallback with A2-primary class-complement arbitration. A3 can veto a conflicting Topic but cannot supply a fallback assignment. Explicit current no-request scope takes precedence; a later positive request can be isolated from cancelled background. Context routing requires last-recent and combined A2-primary evidence to agree. An explicit two-goal input is split into separate current spans, with a Topic assignment required for each. The indexes remain fixed TRAIN-only full144 char artifacts; no neural model, embedding, LLM or semantic API was added.

The frozen 36-row same-writer repair DEV was scored once with fixed A3, A2, original A6 and A6-R1 configurations. The result contains aggregates and paired counts only. All rows are unreviewed `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`; four ambiguous inputs have no gold.

| Public DEV variant | Exact / assigned / 20 labeled | Provisional exact-set precision | False no-request / 12 | Context exact / 4 | Multi exact / 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| A3 | 2 / 12 | 2/12 | 7 | 0 | 0 |
| A2 | 4 / 8 | 4/8 | 4 | 0 | 0 |
| Original A6 | 2 / 11 | 2/11 | 2 | 0 | 0 |
| A6-R1 | 5 / 6 | 5/6 | 1 | 2 | 0 |

Relative to A2, A6-R1 gained two exact labels, lost one, avoided three wrong assignments by deferring, added no wrong assignments and avoided three false no-request assignments. Relative to original A6, it gained three exact labels, lost zero, avoided nine wrong assignments by deferring, added one wrong assignment and avoided one false no-request assignment. Context removal changed all four context outputs; two context labels were exact. Deterministic repeat differences were zero. These are **public development diagnostics**, not independent capability, safety or resource results.

R1 is not stable for a fresh challenge yet: one of 12 no-request controls was still assigned and no two-goal input received an exact pair. The next bounded mechanism repair (R2, final allowed repair for this component) should cover explicit record-only/no-task scope and two independently supported A2 goal spans without broad A3 fallback. Then freeze a separate new public challenge and register the fixed comparison before any scoring. If R2 lacks isolated safety-preserving gain, retire this component and move to the next candidate; do not claim a family or zero-model ceiling.

The 144 Topic, 95% assigned precision, 70% coverage/macro, fixed safety and resource budgets, local-first, and zero neural/embedding/LLM/semantic API requirements remain unchanged. Data qualification, capability and resources remain `NOT_QUALIFIED`/`UNTESTED`/`NOT_QUALIFIED`; independent AS/final TEST remain unconsumed. No CIG-v1 TEST or consumed public challenge was replayed.
