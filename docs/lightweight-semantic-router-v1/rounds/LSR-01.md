# LSR-01 — Evidence-Constrained Zero-Model Full-Catalog Baseline

Status: IN_PROGRESS.

Execution authorization: granted by the owner after independent Pro capability
architecture review.

Canonical execution design:
- `configs/lsr01_execution_design_v0.1.yaml`
- `docs/lightweight-semantic-router-v1/LSR-01_EXECUTION_DESIGN_AMENDMENT_v0.1.md`

## Product implementation

LSR-01 implements the actual dependency-free JavaScript/ESM scoring core now,
rather than maintaining a Python reference algorithm that would later need to
be translated.

Python is build/test tooling only for deterministic Topic-index compilation.

## Architecture

Evidence extraction, sparse ranking and assignment decision are separate.

No Topic may become ASSIGNED merely because it ranks first. Ordinary context
may support a Topic only if current-input evidence already makes that Topic
eligible. Content-poor continuations use a separate recent-anchor/title
fallback branch. Ambiguity is DEFER, not multi-label.

Domain prior and sibling expansion are disabled.

## Frozen candidates

- A: conservative typed exact alias/phrase + evidence/continuation gates;
- B: A + field-separated binary TF-IDF + fixed zh 2/3-grams and Latin word
  features; **pre-registered primary hypothesis**;
- C: A + fixed BM25(k1=1.2,b=0.75) control.

A/C are diagnostic controls. LSR-01 does not select a new winner after viewing
public TEST. Primary candidate B determines PASS/FAIL.

## Evaluation sequence

1. compile production index from allowed Catalog/Profile fields;
2. run structural/invariant tests;
3. use source-separated PUBLIC DEV to choose exactly one global threshold per
   candidate under the frozen error-first/coverage-second procedure;
4. freeze those thresholds in the result;
5. evaluate PUBLIC TEST once;
6. run old 1,296-case contrastive suite only as regression/integrity evidence;
7. measure deterministic repeat, size, cold/warm latency and incremental memory;
8. PASS only if candidate B satisfies every LSR-01 credibility/resource gate.

If B fails public TEST capability, close LSR-01 COMPLETE/FAIL and stop. Do not
change features, weights, margin, context policy or thresholds after seeing the
held-out result under this authorization.

## Forbidden

- private 80 calibration reads;
- 13 legacy evaluation reads;
- consumed 35-case lockbox reads;
- new owner labels;
- neural embeddings/models;
- semantic network/API calls;
- PAIA production writes;
- automatic LSR-02 start.
