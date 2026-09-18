# SEM-05 — Activation Policy + Catalog Diagnostics

## Implementation scope
Implement deterministic UserTopicProfile replay, inactive→active, decay/reactivation, manual pin/hide/locks, 48 AUTO-active soft budget, and clustering/overlap/outlier diagnostics for catalog maintenance.

## Non-scope
No cluster→Topic conversion; no Router dependency on clustering; no production UI mutation.

## Tests
One-off mention; sustained new domain; long silence; later return; budget pressure; manual locks; hidden-but-classifiable; overlap/outlier fixtures.

## Metrics
One-off false activation; sustained activation recall; time-to-activation; auto-inactivation precision; reactivation recall; manual-state violations; inactive classification eligibility violations; diagnostic overlap/stability.

## Acceptance gate
G0 + G6. Presentation/activity state must never change semantic classification eligibility.

## Artifacts
Activation report; state-machine fixtures; catalog diagnostic queue; data-quality proposals only.

## Commit protocol
Read remote HEAD/status → execute this round only → tests → artifacts/status → commit/push → re-read remote → stop.
