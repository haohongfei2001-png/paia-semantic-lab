# REM-01 — Diagnostic Harness and Representation Probes

## Verdict

REM-01 public/synthetic engineering contract: **PASS candidate**.

This round validates the diagnostic harness, not personalized semantic quality. The current execution did **not** authorize reuse of private SEM-06/07 artifacts, so legacy family-grouped personal calibration remains:

`INCONCLUSIVE_PRIVATE_EVIDENCE_NOT_AUTHORIZED`.

No model or representation is selected in REM-01.

## Evidence scope

- 144 ACTIVE System Topics in the full catalog.
- 156 public/synthetic diagnostic cases.
- 36 synthetic Topic families across all 18 internal domains.
- 108 context-free cases.
- 36 context-dependent cases.
- 12 long-position cases.
- provenance coverage: **1.0**.
- real PAIA Inputs: **0**.
- private artifact reads: **0**.
- real Input API egress: **0**.
- owner semantic labels: **0**.
- model training runs: **0**.
- production PAIA writes: **0**.
- consumed SEM-07 lockbox tuning events: **0**.

## Representation harness

All four descriptor constructions are technically reproducible:

- `names_aliases`
- `semantic_core`
- `full_boundaries`
- `fielded_full`

Their synthetic Recall@20 values are descriptive diagnostics only, not a ranking for promotion:

| Descriptor | Recall@20 |
| --- | ---: |
| names_aliases | 0.7222 |
| semantic_core | 0.6852 |
| full_boundaries | 0.7037 |
| fielded_full | 0.7315 |

The reduced scores are driven by the new `boundary_no_alias` challenge. This is intentional: easy name-bearing fixtures are insufficient to diagnose semantic representation quality.

## Context representation

On 36 deliberately context-dependent synthetic cases:

| Query view | Recall@20 |
| --- | ---: |
| current input only | 0.1667 |
| canonical `classification_text` allowed-context view | 0.9722 |
| compact current+context diagnostic view | 1.0000 |

The canonical allowed-context representation gains **+0.8056 Recall@20** over current-input-only on this synthetic slice.

This demonstrates that the harness can measure context dependence and that allowed same-conversation context materially changes candidate evidence. It does not establish the preferred production prompt/representation; that comparison belongs to REM-02 with authorized legacy calibration.

## Dense / lexical / fusion attribution

On the 108 context-free cases, source attribution at top 20 is:

- dense + lexical: 72
- dense only: 4
- lexical only: 6
- miss by both/fusion: 26

All 26 shared misses occur in the `boundary_no_alias` slice. For that 36-case slice:

- dense only: 4
- lexical only: 6
- miss all: 26

This is a concrete diagnostic warning: once explicit Topic names/aliases are removed, the current provisional Catalog's remaining definition/boundary/example text is often too templated to provide strong discriminative signal to these deterministic controls.

REM-01 does not modify the Catalog; it carries this risk forward to REM-02.

## Chunk and multi-vector probes

Long-input synthetic Recall@20:

- whole-query dense: **1.0000**
- naive chunk-max dense: **0.9167**

The naive chunk-max path is technically reproducible and covers the complete input without silent truncation, but in this diagnostic it is both worse and substantially slower. It is therefore a **measured viable mechanism, not a promoted strategy**.

Field-max Topic multi-vector Recall@20 on the context-free challenge set is **0.7130**. It is technically reproducible, but REM-01 makes no quality-selection claim.

## Reproducibility, truncation and resources

- repeated ranking stability: **PASS**
- silent truncation violations: **0**
- explicit over-limit rejection: **PASS**
- long chunk full-input coverage: **PASS**
- deterministic result digest: `631e6cc62f0e213d768848926bf62b7fd68619143e6ac0b07bb99e178c222942`
- public diagnostic suite runtime in the artifact run: **95.588 s**
- peak Python memory: **24,232,645 bytes**

The four whole-vector Topic indices each use 221,184 estimated vector bytes at the deterministic 192-dimension control. Field-vector diagnostic storage is 1,105,920 bytes per variant.

## Family-grouped evaluation boundary

A six-fold, family-disjoint **synthetic proxy** passes and covers all 36 synthetic Topic families.

This is only a test of the fold/evaluation machinery. It is **not** a substitute for the legacy 80-judgment personal calibration set, which was not authorized for this execution and was not read.

## Technical viability carried into REM-02

The following mechanism families are technically executable and reproducible enough to be compared in the next bake-off:

- all four frozen descriptor variants;
- whole-topic and field-max multi-vector Topic representation;
- current-only, canonical allowed-context, and compact-context query views;
- whole-query and chunk-max long-input handling;
- dense, lexical, and RRF fusion source paths.

This is a candidate set, not an ordering or winner.

## Local validation

- REM-01 targeted tests: **9/9 PASS**.
- Full repository regression: **86/86 PASS** in **282.883 s**.
- Public REM-01 benchmark: **PASS**.

## Next round

If required CI passes, REM-02 may become READY for representation/retrieval bake-off. REM-02 should not consume legacy calibration or evaluation evidence unless a new user execution message explicitly authorizes private artifact reuse.

Do not start REM-02 in this execution.
