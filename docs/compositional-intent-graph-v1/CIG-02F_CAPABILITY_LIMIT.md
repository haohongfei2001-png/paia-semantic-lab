# CIG-02F current Router capability limit

## Completed engineering boundary

PR #79 merged at e493b62509db748e5814513c2c7a71404b38b09d. All five applicable exact-head checks and all five applicable exact-main checks passed. The [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02F_CURRENT_SCOPE_MERGED_MAIN_RECEIPT.json) preserves the original five unsupported synthetic assignments as a development FAIL and records the repaired engineering result.

Actions at that exact main produced 70 direct-name assignments and 350 scope-control DEFERs, zero context/repeat mismatches, index plus readiness mask 107,911 bytes and router plus index/mask 117,829 bytes. These are same-writer public/synthetic engineering controls, with zero independent gold and no memory/latency certification.

## Structural full-Catalog ceiling

The [frozen source mask](../../artifacts/compositional-intent-graph-v1/CIG-02_SOURCE_READINESS_FREEZE.json) forces DEFER for 109 of 144 formal Topic IDs. Only 35 SPARSE Topics can ever receive a valid assignment. For an evaluation with positive support for every formal Topic, each DEFER Topic therefore has recall 0. Even if every SPARSE Topic has perfect recall:

**144-Topic macro recall <= 35 / 144 = 24.31%, below the unchanged 70% floor.**

The [machine-readable bound](../../artifacts/compositional-intent-graph-v1/CIG-02F_FROZEN_MASK_CAPABILITY_BOUND.json) states the assumptions and limits. At perfect per-Topic recall, at least 101 eligible Topics would be needed for a 70% macro floor, 66 more than the present mask. This is a mathematical upper bound on the current policy, not a measured capability FAIL or a consumed TEST result. No distribution-free auto-assignment coverage claim follows.

A better scope parser or more synthetic controls cannot remove this ceiling while the mask remains fixed. Domain/sibling substitution would not produce the missing exact formal Topic assignments. Ordinary CI PASS cannot support CIG-02 capability freeze or opening CIG-03.

## Owner decision boundary

The minimal Router's current engineering repair is complete. Source search remains stopped at READY 0 / SPARSE 35 / DEFER 109; the original product constraints, formal Catalog and full-Catalog capability protocol remain in force. CIG-02 is unfrozen and CIG-03 remains blocked.

Further capability advancement requires owner direction: retain the full-Catalog protocol and stop this candidate's capability progression, or explicitly authorize a separately scoped limited-Topic research protocol while preserving all existing CIG evidence and full-Catalog gates. This document authorizes neither a narrower success criterion nor a new independent capability TEST. Semantic Lab itself is not terminated.
