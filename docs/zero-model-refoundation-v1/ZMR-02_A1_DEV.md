# ZMR-02 A0/A1 non-independent development checkpoint

Batch `ZMR-02-A1-P0-20260929`; expected main `06f2ffdb3514ee38c63bd0ddef66fbddf1477780`; single candidate writer. This implements a browser-compatible, non-neural sparse prototype and exposes an intentionally small writer-authored development probe. It is **not a stable candidate gate**, DATA_READY, AS, resource qualification or capability PASS.

## Fixed hypothesis and closure

A0 all-DEFER and formal-name-only are anti-cheat anchors. A1 uses full144 flat sparse scoring with NFC lowercase code-point char 2–4 or word 1–2 features. One deterministic compiler aggregates the pinned Catalog names/aliases and only `provisional_train_v0.1.json`; it never reads DEV, challenge, AS or old evidence. TF-IDF cosine and BM25 share the feature/index family and count as one A1 architecture with four diagnostic configurations, not four distinct families. Global development thresholds are fixed for this checkpoint (`tfidf` score .15, `bm25` score 1, margin .02), not fitted confidence or calibrated promotion thresholds. Context and multi-intent are not implemented; their capability gates therefore cannot pass.

The public writer-created seed has 18 TRAIN rows and 18 separately written challenge rows, one Topic per domain. All rows explicitly carry `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`, source/writer/scenario/mechanism metadata. Both sets have the same writer and only 18 of 144 Topics. No row is credited to independent 01B quotas, and the challenge became exposed at first evaluation. The Catalog remains the full 144 output universe; `singlePointMetrics` reports 126 missing-gold Topics and keeps the macro denominator 144. Original texts are preserved in the data files. No consumed TEST text, gold, generator or per-case result was accessed.

## Engineering and diagnostic observations

Node 26.8.2 explicit engineering units: 36/36 PASS after a test fixture with overlapping fabricated A0 names correctly produced DEFER and was fixed to test unique names. Compiler rebuilt the char index twice with identical bytes; index 659,810 bytes and runtime+index 666,702 bytes. Word index 78,387 bytes and runtime+index 85,279 bytes. These are **static source/asset counts**, not browser bundle, memory, warm p95 or cold-init qualification. No neural assets or semantic network calls were added.

TRAIN resubstitution gave 18/18 for each A1 configuration and is not generalization evidence. On the separate but same-writer 18-row challenge, using one predeclared diagnostic run:

| Control/config | Assigned | Correct | Assigned precision | Single coverage | Full144 macro recall |
|---|---:|---:|---:|---:|---:|
| A0 all-DEFER | 0/18 | 0/18 | null | 0 | 0 |
| A0 name-only | 0/18 | 0/18 | null | 0 | 0 |
| A1 char TF-IDF | 2/18 | 1/18 | 0.50 | 0.1111 | 0.00694 |
| A1 char BM25 | 17/18 | 4/18 | 0.2353 | 0.9444 | 0.02778 |
| A1 word TF-IDF | 0/18 | 0/18 | null | 0 | 0 |
| A1 word BM25 | 0/18 | 0/18 | null | 0 | 0 |

Every row above has 126 missing-gold Topics, point gate false, `certification_allowed:false`. The BM25 configuration exposes the safety/precision tradeoff; the high assigned count is not useful coverage. The result diagnoses sparse vocabulary and shared lexical evidence with only 18 authored prototypes, not an algorithm-family ceiling. No semantic repair is charged yet: this is an incomplete data/prototype iteration, not a stable A1 candidate. Reusing this exposed challenge after repair is regression only; new writer-authored DEV/challenge and ultimately isolated AS are needed for new claims.

## Next development action

Expand provisional TRAIN across all 144 Topics with varied non-name, Chinese/English/mixed and boundary/context/multi mechanisms, and register separate writer-visible DEV/CAL/challenge lineages. Keep compiler input TRAIN-only. Diagnose A1 on a new provisional challenge, allow at most two recorded mechanism-level semantic repairs for a stable candidate, then retain or eliminate and proceed to A2/A3 automatically. Qualification remains frozen until real independent 01B evidence exists; no final TEST is armed.
