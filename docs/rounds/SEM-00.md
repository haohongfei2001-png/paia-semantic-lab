# SEM-00 — Lab Foundation + Catalog Validation Harness

## Implementation scope

Build the isolated Lab scaffold, schema validators, Catalog loader/auditor, synthetic fixture system, benchmark runner skeleton, run manifests, status machinery and Owner Attention Budget enforcement.

## Non-scope

No real PAIA archive; no model training; no real-data API calls; no production writes; **no product-owner semantic labeling**.

## Evidence allowed

Public/synthetic fixtures, Topic Catalog definitions/boundaries, machine-generated Catalog challenge cases, static/consistency checks.

## Required tests

Repository isolation; contract validation; 144-Topic load; duplicate/alias/lineage audit; permission/prompt-injection fixtures; status transitions; explicit test that SEM-00–05 cannot open an owner-label task.

## Metrics

Schema validity; catalog integrity; audit findings; provenance completeness; isolation violations; owner-attention-policy violations.

## Acceptance gate

Engineering G0/G1 must pass. Personalized semantic quality remains UNTESTED/INCONCLUSIVE by design.

## Artifacts

SEM-00 report; validators/audits; safe fixture pack; benchmark skeleton; owner-attention enforcement evidence; status update.

## Commit protocol

Execute this round only → tests → artifacts/status → commit/push → re-read remote → stop. Do not start SEM-01.
