# CIG-02F minimal Topic Router

The router wraps the existing full 144-Topic public frame grounder and the immutable [source readiness snapshot](../../artifacts/compositional-intent-graph-v1/CIG-02_SOURCE_READINESS_FREEZE.json). It uses no model, network, external corpus or PAIA production data. It preserves every formal Topic ID.

- READY: ordinary conservative typed grounding, though current freeze has **zero** READY Topics.
- SPARSE (35): assign only when the current GOAL explicitly supports one exact formal Topic name. Existing request/goal, competing-name and incidental-mention safeguards apply. Typed phrase composition alone DEFERs.
- DEFER (109): always DEFER, including an exact formal name. A sibling or domain is not substituted.
- Ambiguity and insufficient evidence: DEFER. Context never supplies assignment evidence. No Topic is deleted, merged or renamed.

The implementation rejects a missing/drifted 144-Topic index or mask, duplicate IDs, inconsistent readiness counts and unsupported READY/SPARSE/DEFER evidence. The mask is source-only; a prospective nomination is not gold.

## Fresh engineering diagnostic

Actions compile the existing index and run a newly authored, generated **public/synthetic** diagnostic over formal English Topic names, typed role strings, masked Topic names and unrelated context. The result reports genuine counts rather than assuming formal-name assignment always succeeds. It checks that every DEFER Topic stays deferred, every assignment is from the intended SPARSE Topic with exact formal-name evidence, context never changes output, repeated output is deterministic, index <=1 MiB and router plus index <=2 MiB. Synthetic unit tests also cover competing names, no-current-goal, malformed masks and fail-closed behavior.

The probes are derived from the same public Catalog/frame source as the router and authored by the same writer. Their results are mechanism and safety diagnostics only: **zero independent gold**, no qualifying public natural DEV, no full-Catalog precision/coverage/recall claim, no memory/latency certification and no independent capability TEST. Earlier CIG-02B/C/D DEV_UNQUALIFIED, LSR/CSL FAIL and NI source FAIL remain unchanged. Frozen metrics and scoring rules are untouched. CIG-02 remains unfrozen and CIG-03 blocked/owner-gated.

## Bounded formal-name echo attribution

The first exact-head synthetic diagnostic for PR #75 reported two `ASSIGNED` results among 35 probes assembled from typed role strings. A source-only reconstruction at the merged main identified the two inputs: `Please exercise fitness` for `sys.health_wellbeing.fitness` and `Please explore music album` for `sys.media_culture.music`. Each input includes its Topic's exact formal English name, and the router recorded `EXACT_FORMAL_NAME` evidence. They therefore measure the formal-name path, not role-only discrimination.

The diagnostic now separates role probes with a formal-name echo from name-free role probes, records the hit Topic IDs, and fails if any name-free role probe assigns or an echoed probe assigns an unrelated Topic. This changes only the diagnostic accounting. It neither edits the router nor creates independent gold; no natural-expression capability conclusion follows.
