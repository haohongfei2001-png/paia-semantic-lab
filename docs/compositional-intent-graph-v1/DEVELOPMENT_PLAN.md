# PAIA Compositional Intent Graph v1

Package ID: `PAIA-COMPOSITIONAL-INTENT-GRAPH-v1` (CIG), protocol version 1.1.0. This is a new independent architecture experiment after LSR-01 and CSL-04 genuine FAIL. Their consumed TESTs and closed statuses remain immutable.

## Product contract

The target remains a tiny deterministic, local-first, zero-model router for the full 144-Topic Catalog. Shipped neural assets: 0 bytes. Semantic network calls: 0. Index <= 1 MiB; router plus index <= 2 MiB; incremental memory <= 32 MiB; warm full-catalog p95 <= 20 ms; cold init <= 100 ms. No PAIA production write is in scope.

The architecture separates two questions that LSR/CSL mixed: (1) which span describes the user's actual goal rather than a means/background mention, and (2) whether that span can be grounded to a formal Topic without a model. A typed graph holds `GOAL`, `MEANS`, `BACKGROUND`, and `CONTINUATION` edges. Only a current-input GOAL edge may establish ordinary assignment eligibility. Unresolved grounding or competing goals DEFER. The graph never creates or mutates formal Topics.

## Evidence and execution boundary

- Read only published aggregate LSR/CSL failures for attribution; do not read their consumed fixture text, gold rows, or per-case outputs.
- CIG probes use newly authored public/synthetic data. Freeze candidate, fixture, scoring rules and hashes before a one-shot diagnostic.
- A controlled synthetic role probe is a mechanism test, not product capability evidence. Same-writer authorship and shared template structure must be disclosed.
- CIG-02 may use isolated authored/synthetic TRAIN and DEV from public formal Catalog/Profile scope, including Topics without public natural-source gold. Same-writer DEV and shared vocabulary are disclosed. DEV is iterative engineering evidence; neither TRAIN nor DEV is independent capability TEST evidence.
- Final full-catalog capability TEST must be fresh, independently authored/adjudicated, blind to the candidate writer before the committed pre-open freeze, and disjoint from all development rows/templates. Frozen scores and all 144 Topics remain unchanged. Consumed TEST is never used for subsequent tuning.
- No private 80-record calibration, 13-record legacy evaluation, consumed 35-case lockbox, real PAIA archive, external semantic API, or PAIA production modification.

## Rounds

- **CIG-00 — Failure attribution and package freeze.** Bound claims to LSR/CSL aggregates; register the architecture and protocol.
- **CIG-01 — Fresh synthetic identifiability probe.** Use balanced minimal pairs with identical bag signatures but different GOAL Topics, plus held-out wording. Report role-span accuracy, oracle role-to-Topic accuracy, local grounding coverage/precision, DEFER safety, determinism and package size. One frozen score only.
- **CIG-02 — Capability engineering with public and isolated authored/synthetic DEV.** Conditional on CIG-01. Build the compact local grounder from formal Catalog/Profile and separately versioned AUTHORED_SYNTHETIC_TRAIN sources. TRAIN is the compiler's only new development input; DEV is stored/evaluated separately and may guide disclosed development iterations. Do not reuse CIG-01 or consumed LSR/CSL TEST for tuning. The READY/SPARSE/DEFER source freeze remains immutable provenance, but does not veto Topic eligibility in the new candidate. Stop public source exploration; keep all 144 Topics and the 70% floor. See [owner amendment](CIG-02G_AUTHORED_DEV_AMENDMENT.md) for admission and freeze gates.
- **CIG-03 — Fresh independent public capability TEST.** Conditional on CIG-02 pre-open freeze. Minimum 288 single-label cases covering all 144 Topics, 72 context cases, and 36 multi-label/ambiguous/DEFER cases. Assigned precision >= 0.95, auto-assignment coverage >= 0.70, Topic macro recall >= 0.70, insufficient-evidence false assignment <= 0.02, context harm 0, deterministic repeat PASS. One-shot result; no repair on its consumed TEST inside this package.
- **CIG-04 — Consumer resource and browser certification.** Conditional on CIG-03 PASS; enforce the product contract and browser/Node parity. A capability or resource FAIL is reported as FAIL.

CIG-00/01 and public engineering were previously authorized. The owner's current direction explicitly authorizes this v1.1.0 protocol amendment, isolated authored/synthetic CIG-02 development, and the subsequent new independent blind CIG-03 TEST only after CIG-02 completion and committed pre-open freeze. The TEST has not started. No repeated owner approval is required for this already authorized sequence. Any change to zero-model, local-first, tiny footprint, private evidence access, or PAIA production requires new owner authorization.

## CIG-01 interpretation gate

On the balanced minimal pairs, any deterministic bag-only classifier has at most 50% exact single-label accuracy. The role parser hypothesis is supported only if exact GOAL-span extraction is >= 90% with zero unsupported assignment on ambiguous controls. This is a diagnostic gate, not full-catalog promotion. If it fails, record the failure class and do not claim that lexical grounding alone is the bottleneck. If it passes while local grounding remains weak, CIG-02 targets grounding using fresh public DEV, not CIG-01 tuning.
