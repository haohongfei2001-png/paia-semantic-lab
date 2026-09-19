# REM-00 — Legacy Failure Attribution Closure Candidate

## Verdict

REM-00 diagnostic capability: **PASS candidate**. All 35 consumed SEM-07 lockbox cases received one deterministic primary attribution, and reconstructed candidate/Router/Input-retrieval metrics reconcile exactly to the frozen SEM-07 public scorecard for both personally evaluated models.

The consumed lockbox remains **LEGACY_DIAGNOSTIC_ONLY**. No result in this round is a model/config promotion score.

## Primary attribution

| Primary attribution | Cases |
| --- | ---: |
| CONTEXT_REPRESENTATION | 5 |
| CANDIDATE_MISS | 12 |
| CANDIDATE_LOW_RANK | 8 |
| ROUTER_ABSTENTION | 8 |
| DATA_CLASS_GAP | 2 |
| CATALOG_BOUNDARY | 0 |
| ROUTER_WRONG_ASSIGNMENT | 0 |
| EVIDENCE_GAP | 0 |

**25/35 cases are primarily upstream representation/candidate failures.** Eight additional cases reach usable top-10 candidates but fail through Router abstention. The two DEFER-truth cases are retained as DATA_CLASS_GAP because the legacy lockbox has no UNASSIGNED truth and insufficient class support for certification.

## Cross-model evidence

Qwen/Qwen3-Embedding-0.6B:
- complete truth candidate set in top 10: 8/33 assigned cases;
- complete truth candidate set in top 20: 14/33;
- positive Input-retrieval qrel misses beyond rank 20: 0/17;
- Router accepted 1/35 and exact-matched 0/35.

BAAI/bge-m3:
- complete truth candidate set in top 10: 7/33;
- complete truth candidate set in top 20: 16/33;
- positive Input-retrieval qrel misses beyond rank 20: 8/17;
- Router accepted 1/35 and exact-matched 0/35.

## Context and boundary audit

Nine lockbox cases are context-dependent. Their primary attribution is: 5 CONTEXT_REPRESENTATION, 2 CANDIDATE_LOW_RANK, and 2 ROUTER_ABSTENTION. This supports explicit current-input vs allowed-context representation probes in REM-01, not tuning on these nine cases.

There are zero catalog-boundary cases and zero unresolved evidence-gap cases in REM-00, so no product-owner semantic question is required.

## Remediation hypotheses

1. **Representation/candidate recall is the primary remediation surface** — 25/35 primary cases occur before Router decision logic.
2. **Router abstention remains a separate downstream bottleneck** — eight cases already have at least one complete top-10 candidate set yet still abstain.
3. **Input retrieval must remain a separate objective** — Qwen has 0/17 positive qrel misses at Recall@20 while BGE-M3 has 8/17, despite both failing Topic candidate recall.
4. **Context representation requires explicit ablation** — 9 context-dependent cases, with 5 shared top-20 candidate failures.
5. **Legacy UNASSIGNED/DEFER support is inadequate for certification** — do not create ad-hoc labels in REM-00–04.

## Guards

- semantic/model remediation config changes: 0;
- new owner labels: 0;
- live PAIA archive reads: 0;
- real Input API egress: 0;
- model training: 0;
- PAIA production modifications: 0;
- consumed-lockbox tuning/promotion events: 0.

The private per-case ledger remains outside Git. Git contains only anonymous case hashes and aggregate/model diagnostics.

## Local validation

- REM-00 + v0.3 targeted tests: **12/12 PASS**.
- Full repository regression: **77/77 PASS** in **132.825 s**.
- `git diff --check`: PASS.

## Next round

If required CI passes, REM-01 may become READY for **diagnostic harness and representation probes only**. Do not start REM-01 in this execution.
