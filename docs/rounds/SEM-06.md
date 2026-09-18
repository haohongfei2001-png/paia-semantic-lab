# SEM-06 — Incremental Lifecycle + Local/API Trade-off

## Implementation scope
Incremental embedding/cache invalidation; Input revision and catalog-lineage handling; deletion/withdrawal; model upgrades; measured local/API quality-speed-memory-cost-privacy comparison.

## Non-scope
No production synchronization; no training; no unapproved egress.

## Tests
No-op; append/edit/delete; metadata-only change; catalog patch/minor/major fixtures; crash/recovery; incremental vs full parity; paired local/API only where explicitly authorized.

## Metrics
No-op embedding calls; stale revision leaks; recomputation precision/recall; p50/p95; throughput; memory; index size; cost; egress surface; quality delta.

## Acceptance gate
G0 + G7. API comparisons without authorization are NOT_RUN, never fabricated.

## Artifacts
Lifecycle spec; invalidation matrix; trade-off report; privacy/cost ledger.

## Commit protocol
Read remote HEAD/status → execute this round only → tests → artifacts/status → commit/push → re-read remote → stop.
