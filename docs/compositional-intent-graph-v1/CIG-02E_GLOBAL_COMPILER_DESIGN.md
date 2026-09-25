# CIG-02E global compiler design (public-source proposal)

## Evidence boundary

The 144 provenance-bound frames are source authoring, not a runtime candidate. CIG-02B/C/D public DEV verdicts remain `DEV_UNQUALIFIED`; their scored utterances are consumed and must not drive aliases, per-Topic patches, thresholds, or a pass claim. The next compiler may read only the formal Catalog, six public semantic-profile shards, and the 18 source-frame files. It must not read any DEV or TEST rows while building its index.

This document describes an in-protocol engineering candidate. It does not freeze CIG-02, authorize CIG-03, or alter the registered floors.

## Build contract

1. Revalidate that frame Topic IDs exactly equal the 144 formal Catalog IDs and that every frame's public source path, bilingual semantic-core basis, and allowed source classes match the pinned public profile. Reject duplicates and missing roles.
2. Normalize the six role lists per Topic under one global Unicode policy. Retain `ACTION`, `OBJECT`, and `OUTCOME` as separate typed evidence; keep formal names as a separate exact-name channel. Deduplicate phrases without silently merging their roles or provenance.
3. Generate one deterministic, sorted index. Include source hashes, compiler rule version, frame hashes, and the formal Catalog hash in its provenance. The index must remain <= 1 MiB. Router plus index must remain <= 2 MiB; no model asset or network dependency may enter the runtime.
4. Reject a phrase that collapses to an empty normalized form or crosses the published atom bounds. Do not invent runtime synonyms from a scored corpus. Global normalization and matching rules may be revised only on new public DEV with an explicit candidate version and unchanged scoring.

## Runtime composition

The existing current-input GOAL parser remains the eligibility gate. A quoted, incidental, historical, or background-only mention cannot assign a Topic. The current GOAL span is the only ordinary evidence span; context may support parsing but cannot create a new Topic. Multiple current goals, ambiguous grounding, or insufficient evidence DEFER.

Within an eligible span, collect **distinct** Topic evidence from exact formal-name matches and from typed frame phrase matches. English phrase matches require word boundaries after the shared normalization; Chinese phrases require contiguous normalized characters. Count a phrase at most once per role and Topic. A bare shared object is insufficient: ordinary assignment requires a supported goal action or requested outcome paired with an object, or an exact formal name inside the eligible GOAL span. For each Topic, record the matched role, phrase, source frame, and source hash.

Rank all 144 Topics under one global rule; do not use domain priors or Topic-specific exceptions. If no Topic clears the fixed evidence rule, or two Topics have unresolved evidence, DEFER. Exact formal names are not allowed to override competing current goals. Emit a stable explanation trace for assignment or DEFER, with no per-case state and no dependence on network or wall-clock time.

## Verification before CIG-02 freeze

First add compiler invariants and deterministic build checks in CI. Then register a **new**, source-separated public DEV with stable gold before opening its score: all 144 Topics, natural-expression variants, ambiguous and insufficient-evidence controls, and context pairs. The corpus author must not copy the source phrases as test templates. Freeze the candidate hash, DEV hash, selection and scoring code before the first score. Report precision, auto-assignment coverage, Topic macro recall, insufficient-evidence false assignment, context harm, determinism, and footprint against the original floors (0.95 / 0.70 / 0.70 / 0.02 / zero harm). A DEV result is still development evidence. CIG-03 independent capability TEST remains blocked until a qualified CIG-02 candidate is formally frozen and owner authorization opens that TEST.
