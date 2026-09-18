# SEM-05 — Incremental Lifecycle + Activation Infrastructure + Local/API Performance/Privacy Trade-off

## Implementation scope

Implement incremental embedding/cache invalidation, revision/catalog lifecycle, deletion/withdrawal, deterministic UserTopicProfile activation replay, inactive/reactivation/manual-state logic, clustering diagnostics, and local/API performance/privacy measurement on public/synthetic evidence.

## Non-scope

No owner semantic labels; no authorized personal snapshot; no real-Input API egress; no cluster→Topic conversion; no production synchronization; no training.

## Evidence allowed

Synthetic lifecycle/event streams; Topic Catalog fixtures; public benchmark text; machine-generated load/challenge sets; provider metadata; existing reusable gold if already available.

## Required tests

No-op/append/edit/delete; metadata-only changes; catalog patch/minor/major lineage; crash/recovery; incremental-vs-full parity; one-off activation; sustained activation; 60-day decay; reactivation; 48 AUTO-active budget; pin/hide/locks; hidden-but-classifiable; local/API cold/warm/batch/resource tests using non-private text; egress-deny tests.

## Metrics

Recomputation correctness; stale-revision leaks; activation-policy deterministic metrics on fixtures; inactive classification violations; p50/p95/throughput/memory/index size; API cost estimates and privacy/retention matrix; clustering diagnostic stability.

## Acceptance gate

Lifecycle, activation infrastructure, resource measurement and privacy controls may PASS engineering gates. Personalized activation/routing quality remains PROVISIONAL/INCONCLUSIVE without SEM-06 gold.

## Artifacts

Lifecycle/invalidation report; activation infrastructure report; local/API trade-off report; privacy matrix; machine-selected evidence queues for SEM-06.

## Commit protocol

Execute this round only → tests → artifacts/status → commit/push → re-read remote → stop. No owner labels and no real-data API egress.
