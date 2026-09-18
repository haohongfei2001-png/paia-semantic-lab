# SEM-04 Decision Policy Implementation Contract

This is the frozen implementation record for SEM-04. The executable sources of truth are `configs/sem04_router_v0.1.yaml` and `semantic_lab/sem04.py`.

## Output contract

- A normal Router decision is exactly one of `ASSIGNED`, `UNASSIGNED`, or `DEFER`.
- `ASSIGNED` may contain multiple existing Topic IDs and may carry a residual state of `NONE`, `UNASSIGNED`, or `DEFER`.
- Every assignment is evidence-bearing. Provenance records the router version, context fingerprint, candidate evidence, calibration evidence, and diagnostic-only flag.
- Every RouterDecision keeps `requires_user_confirmation=true` and `can_mutate_canonical=false`.

## Existing-Topic boundary

The Router operates only over Topic candidates supplied by the existing catalog/candidate layer. It cannot create a formal System Topic or Custom Topic, and unknown/non-current Topic IDs are rejected from calibration overrides.

## Staleness and ambiguity

A stale input revision or stale catalog version yields `DEFER`. Ambiguous confusing-neighbor fixtures yield `DEFER` rather than forced assignment. Short or insufficient-context Inputs also yield `DEFER`.

## Calibration precedence

Calibration reuse is exact on input reference, input revision, catalog version, and context fingerprint. Reusable `USER_CONFIRMED` or `GOLD` records outrank a fresh model decision. Supersession is append-only: prior records are retained and effective `SUPERSEDED` state is derived from lineage.

## Oracle and disagreement paths

Oracle-candidate evaluation is diagnostic-only and cannot mutate the normal candidate list or canonical routing result. Same-policy repeated-run disagreement is measured separately from deliberate policy-sensitivity disagreement. Both are evidence for later high-information sampling, not permission to auto-label.

## Validation boundary

Main CI run 35379812113, job 105713054345, artifact 10561198530 passed G0 and G5 for implementation commit `af4c69f95bbd8e86f63d6352740d0cd4ce1beebf`. Personalized Router quality remains INCONCLUSIVE because SEM-04 used no product-owner personal gold.
