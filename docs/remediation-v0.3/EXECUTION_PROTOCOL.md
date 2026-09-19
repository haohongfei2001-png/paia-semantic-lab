# v0.3 Remediation Execution Protocol

## Canonical source of truth

Remote GitHub `main` in `haohongfei2001-png/paia-semantic-lab`.

Canonical package status:
`status/SEMANTIC_REMEDIATION_STATUS.yaml`

The v0.2 status remains historical closure evidence and must not be reused as the v0.3 state machine.

## Authorization

- Only the remediation round marked READY may be executed.
- READY is not execution authorization.
- Every round requires an explicit current user execution message.
- One message authorizes only that round unless the user explicitly states otherwise.
- Completion of one round never auto-starts the next.
- Historical real-data or ChatGPT-adjudication authorization is not reusable.

## Execution states

`NOT_STARTED | READY | IN_PROGRESS | COMPLETE | BLOCKED`

Capability verdict:
`UNTESTED | PASS | FAIL | INCONCLUSIVE`

COMPLETE means the round execution closed correctly. It does not mean the measured capability passed.

## Per-round sequence

1. Re-read remote HEAD, package status and current round doc.
2. Verify dependency, package version and authorization.
3. Reconcile any previous interrupted execution from remote facts.
4. Work only inside Semantic Lab and only current-round scope.
5. Enforce data-role and owner-attention guards before reading private artifacts.
6. Freeze any evaluation plan before opening evidence that the plan protects.
7. Run required local validation.
8. Write sanitized artifacts and update package status.
9. Commit/push candidate.
10. Require exact-head CI success.
11. Write closure receipt/status, push, require final exact-head CI where applicable.
12. Re-read remote HEAD/status/artifacts and STOP.

## Private-data execution rules

For REM-00 through REM-04:
- no live archive read;
- existing private SEM-06/07 artifacts may be read only when that execution message explicitly authorizes them;
- no real Input API egress;
- no raw text, gold payload, vectors, Input refs or conversation refs enter Git.

For REM-05:
- the round message must explicitly authorize the new snapshot scope;
- snapshot is read-only;
- batch selection is fixed before semantic labels;
- labeling starts only after configuration freeze is verified.

For REM-06:
- the new lockbox is opened only after exact REM-04 configuration hashes are verified;
- no config mutation after lockbox opening.

## Consumed-lockbox guard

The 35 SEM-07 lockbox cases are `LEGACY_DIAGNOSTIC_ONLY`.

REM-00 may inspect them for root-cause attribution. Later rounds may cite the frozen REM-00 diagnosis, but must not repeatedly rank competing configurations on those cases.

Any tool that accidentally uses these cases for threshold fitting, model ranking, promotion or certification is a blocking leakage defect.

## Failure handling

Do not lower assertions, gates, timeout, privacy checks or sample-isolation rules to obtain green CI.

When a promotion gate fails:
- record the failing capability;
- preserve evidence;
- mark the dependent round BLOCKED if its prerequisite is unmet;
- stop instead of skipping the gate.

A product-owner question is allowed only when evidence cannot resolve a genuine semantic/catalog boundary and the ambiguity materially blocks the current round.
