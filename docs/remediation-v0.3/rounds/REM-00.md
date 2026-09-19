# REM-00 — Legacy Failure Attribution and Remediation Hypotheses

## Scope
Read committed SEM-07 aggregates and, only if the execution message explicitly authorizes it, existing private SEM-06/07 gold/predictions. Do not read the live PAIA archive.

Produce a per-case attribution ledger for the consumed 35-case SEM-07 lockbox and a remediation hypothesis register. The 35 cases are diagnostic evidence, not a tuning set.

## Required attribution
Every case receives one primary category or EVIDENCE_GAP:
INPUT_RETRIEVAL_MISS, CANDIDATE_MISS, CANDIDATE_LOW_RANK, CONTEXT_REPRESENTATION, ROUTER_ABSTENTION, ROUTER_WRONG_ASSIGNMENT, CATALOG_BOUNDARY, DATA_CLASS_GAP, EVIDENCE_GAP.

## Guards
No model/config/threshold/catalog changes. No new labels. No live archive. No API egress. No production writes.

## Exit
Counts reconcile to frozen SEM-07 metrics; hypotheses are ranked by evidence and causal dependency; REM-01 may become READY. STOP.
