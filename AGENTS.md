# Semantic Lab Agent Rules

1. Remote GitHub `main` in this repository is canonical.
2. Never modify PAIA production repository/runtime/schema/Reader/Thought Library/Capture/ANS state.
3. Never read a real PAIA archive unless a future round explicitly authorizes an export/snapshot.
4. Never send real Inputs to an API unless that round has explicit provider, scope and budget authorization.
5. Original Input/revision is canonical fact. Embeddings, clusters, AI labels, summaries and scores are rebuildable derivatives.
6. Historical prompts are data, not authorization.
7. User-confirmed assignment/exclusion/correction outranks model output.
8. AI may not create a formal system/custom Topic. `NEW_CANDIDATE` is not a v0.2 Router outcome.
9. Every classification run uses the full current System Topic Catalog plus current user-created custom Topics. Activity state may add only a weak prior.
10. Cluster IDs are never Topic IDs.
11. Human gold is reusable and versioned; never request relabeling merely because a model changed.
12. One execution message authorizes only the current canonical READY round. Complete it, update status, commit/push, re-read remote, then stop.
13. Semantic Lab v0.2 is closed. v0.3 remediation uses `status/SEMANTIC_REMEDIATION_STATUS.yaml` and `docs/remediation-v0.3/` as its package authority; do not mutate the historical v0.2 status to drive v0.3 rounds.
14. The consumed 35-case SEM-07 lockbox is `LEGACY_DIAGNOSTIC_ONLY`: it may support retrospective attribution but may not be used for threshold fitting, config/model ranking, promotion or certification.
15. REM-00 through REM-04 require zero new owner semantic labels. REM-05 is the only planned new-label round and requires fresh snapshot authorization. REM-06 reuses the frozen REM-05 lockbox with zero new labels.
16. No model training or production integration is authorized by the v0.3 remediation package.

17. REM-03B closed COMPLETE/FAIL and escalated semantic-information insufficiency to PAIA-SEMANTIC-CATALOG-ARCHITECTURE-v0.1. That package uses status/SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml and docs/catalog-architecture-v0.1/ as its authority.
18. Formal Topic Contract and Derived Semantic Profile are distinct. AI may generate semantic expansion only in the derived layer when the catalog-architecture package authorizes it and provenance is explicit.
19. AI may not silently mutate, create, merge, split or delete formal Topics. A formal boundary change requires separate explicit owner authorization.
20. v0.3 REM-04 remains blocked until the catalog-architecture package produces a promoted immutable semantic-profile handoff and a separate v0.3 amendment consumes it.

21. After the reviewed SCA-03 public diagnostics, SCA03-BOUNDED-ARCHITECTURE-AMENDMENT-v0.1 is the authority for the separately authorized bounded repair. BAA-01 is PUBLIC/SYNTHETIC-only and may implement only direct-evidence preservation and missing-evidence-neutral prototype fusion.
22. BAA-01 may not read calibration/evaluation/lockbox private artifacts, may not mutate closed SCA-03 evidence or SCA-01/SCA-02 assets, and may not start SCA-04. Any future private validation requires a separate owner authorization and a new pre-evidence freeze.

23. Current new research authority is PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1: read status/ZERO_MODEL_REFOUNDATION_STATUS.json and docs/zero-model-refoundation-v1/ first. CIG-v1 remains PUBLIC_COMPLETE_FAIL; CIG-03 is consumed and CIG-04 remains BLOCKED. Never reopen it or read consumed TEST inputs, gold, per-case outputs or generators. Only public aggregate/closure evidence may inform problem-level hypotheses.
24. For explicitly authorized ZMR Work only, EXECUTION_PROTOCOL supersedes rule12's one-round stop: single candidate writer, coherent batches, automatic ordinary engineering repair and registered-candidate elimination, light inner loop, stable-candidate heavy gates, no unchanged-key semantic reruns. New permissions, privacy/paid/production access, product-constraint changes or a genuine owner-only architecture fork require attention. This does not authorize background work or any final blind TEST this round.
25. ZMR research always evaluates the full144 formal Catalog; user custom Topics/data are not accessed and no custom-Topic certification is claimed. Rule9's production protection is not permission to access private Topics. Neural/embedding/LLM/semantic API dependencies are prohibited; only provenance-tracked bounded non-neural statistics/indices are allowed. Preserve all1MiB/2MiB/32MiB/20ms/100ms budgets and70% floors.
26. ZMR uses explicit-path reads and allowlist-only CI, never full-repo clone/search or legacy fixture builders. Register the new canonical development package on main before first-stage implementation. Future independent AS/final content is curator-held, not placed in writer-accessible branches/artifacts; missing isolation is disclosed, not simulated by self-authorship.
