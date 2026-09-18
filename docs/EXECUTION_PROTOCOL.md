# Canonical STATUS / Execution Protocol

## Source of truth
Remote `main` in `haohongfei2001-png/paia-semantic-lab`.

## States
`execution_status = NOT_STARTED | READY | IN_PROGRESS | COMPLETE | BLOCKED`  
`capability_verdict = UNTESTED | PASS | FAIL | INCONCLUSIVE`

COMPLETE does not imply PASS.

## Authorization
- Only the round marked READY may be executed.
- READY is not execution authorization; an explicit user message is still required.
- One execution message authorizes only that current round unless explicitly stated otherwise.
- On completion: update artifacts/status, commit/push, re-read remote, then stop.
- Never auto-start the next round.
- Never update PAIA ANS state here.

## Per-round commit protocol
1. Read remote HEAD and canonical status.
2. Verify requested round is READY.
3. Work only inside Semantic Lab.
4. Run required tests.
5. Write report/manifest and update status.
6. Commit with `SEM-XX: <title>`.
7. Push/update remote main under the authorized workflow.
8. Re-read remote HEAD, status and critical artifacts.
9. Report SHA and stop.

The v0.2 planning commit makes SEM-00 READY but does not start it.
