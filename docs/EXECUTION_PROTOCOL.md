# Canonical STATUS / Execution Protocol

## Source of truth

Remote `main` in `haohongfei2001-png/paia-semantic-lab`.

## Architecture vs sequencing versions

- Frozen architecture: `v0.2`
- Execution sequencing amendment: `v0.2.1`

The sequencing amendment does not authorize architectural redesign.

## States

`execution_status = NOT_STARTED | READY | IN_PROGRESS | COMPLETE | BLOCKED`  
`capability_verdict = UNTESTED | PASS | FAIL | INCONCLUSIVE`

COMPLETE does not imply PASS.

## Owner Attention Budget

Product-owner semantic attention is scarce.

SEM-00 through SEM-05 MUST NOT request owner Input→Topic labels, retrieval-relevance labels, per-model trials, or repeated semantic judgments. These rounds use public/synthetic evidence, Catalog boundary fixtures, automated consistency checks, model disagreement, machine-generated challenges, performance/resource tests, and any reusable gold that already exists.

Lack of personal gold in SEM-00–05 produces a provisional/inconclusive personalized verdict; it is not a reason to ask the owner for ad-hoc labels.

The first planned owner-semantic batch is SEM-06. SEM-07 reuses the same gold automatically.

## Authorization

- Only the round marked READY may be executed.
- READY is not execution authorization; an explicit user message is still required.
- One execution message authorizes only that current round unless explicitly stated otherwise.
- On completion: update artifacts/status, commit/push, re-read remote, then stop.
- Never auto-start the next round.
- Never update PAIA ANS state here.

## Per-round commit protocol

1. Read remote HEAD and canonical status.
2. Verify requested round is READY and sequencing version is current.
3. Work only inside Semantic Lab.
4. Enforce the round's owner-attention allowance before any human request.
5. Run required tests.
6. Write report/manifest and update status.
7. Commit with `SEM-XX: <title>`.
8. Push/update remote main under the authorized workflow.
9. Re-read remote HEAD, status and critical artifacts.
10. Report SHA and stop.

The v0.2.1 planning amendment leaves SEM-00 READY but does not start it.
