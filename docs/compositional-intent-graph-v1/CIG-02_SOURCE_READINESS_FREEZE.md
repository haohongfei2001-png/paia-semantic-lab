# CIG-02 source readiness freeze and exploration stop rule

The owner has ended unbounded source exploration to cover every formal Topic. This is a **source-only snapshot freeze**, not a CIG-02 candidate/capability freeze. It derives entirely from the existing [reconciliation](../../artifacts/compositional-intent-graph-v1/CIG-02E_SOURCE_COVERAGE_RECONCILIATION.json). No new source payload or consumed TEST was read.

| Readiness | Topics | Evidence |
| --- | ---: | --- |
| READY | 0 | Accepted independent public gold and unambiguous source evidence. None exists. |
| SPARSE | 35 | One or more prospective source leads, but zero accepted independent gold. |
| DEFER | 109 | No current prospective source lead. |

The [machine-readable snapshot](../../artifacts/compositional-intent-graph-v1/CIG-02_SOURCE_READINESS_FREEZE.json) enumerates all 144 formal Topic IDs, domain IDs, prospective row IDs and unresolved counts. Prospect counts are not gold, confirmed distinguishability or a runtime precision claim. Existing 41 nominations, 28 unresolved nominations, zero gold and unregistered natural DEFER/context controls are preserved. CIG-02B/C/D remain DEV_UNQUALIFIED, and fixed NI run 36346751629 remains FAIL/no replay.

## Minimal Router boundary

Use the existing deterministic 144-Topic typed frame index and this source mask. For SPARSE Topics, only a current GOAL containing exactly one formal Topic name may assign after existing goal and ambiguity safeguards. Typed phrase composition alone DEFERs. DEFER Topics always DEFER, even with a plausible sibling domain. READY Topics, if admitted in a later independently reviewed source snapshot, can use conservative typed composition. Competing names, uncertain boundaries and insufficient evidence DEFER. Formal Catalog IDs/names are preserved; no Topic is deleted or renamed. Domain-level consolidation must not be represented as a formal Topic assignment.

Evaluate this engineering candidate on **fresh public/synthetic diagnostic inputs** for assignment/DEFER, context harm, determinism and footprint. Same-source authored inputs cannot establish the original full-Catalog DEV or capability floors; no scores from CIG-01, CIG-02B/C/D or consumed TEST are used for tuning. Keep all original thresholds/scoring rules. CIG-02 remains unfrozen and CIG-03 blocked/owner-gated.

The stop rule bars further unbounded dataset searches purely to fill Topic coverage. A later narrowly justified provenance/adjudication check is separate from this freeze. Product constraints remain zero-model, local-first and tiny; forbidden evidence and PAIA production remain untouched.

## CIG-02G amendment

The owner subsequently authorized strictly isolated authored/synthetic TRAIN/DEV for all 144 Topics. This natural-source inventory and its READY/SPARSE/DEFER counts remain immutable provenance. The new [CIG-02G protocol](CIG-02G_AUTHORED_DEV_AMENDMENT.md) does not use natural-source readiness as a runtime veto or redefine these counts as capability readiness. No public source expansion is reopened.
