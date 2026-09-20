# SCA-03 Public Synthetic Failure Diagnostics v0.1

## Scope

This branch is a bounded, public/synthetic-only diagnostic follow-up to the closed SCA-03 calibration failure.

It does **not** modify:
- the frozen SCA-03 configuration matrix;
- SCA-01 profiles;
- SCA-02 graph;
- SCA-03 freeze or calibration evidence;
- promotion gates;
- production PAIA;
- SCA-04 state.

Private calibration, legacy evaluation and the consumed SEM-07 lockbox are forbidden inputs.

## Diagnostic 1 — Candidate-budget counterexample

Fixture: place one real public Topic from each of ten distinct Domains in direct ranks 1-10, then apply the frozen K8 candidate assembler.

Measure:
- how many original direct top-10 Topics remain in expanded top-10/top-20;
- whether a direct rank-4 cross-Domain Topic is displaced beyond top-10;
- bounded sibling-cap 4 and sibling-cap 2 ablations.

Interpretation boundary: this can confirm a structural counterexample and budget pressure. It does not estimate private-data recall.

## Diagnostic 2 — Sparse-prototype displacement

Fixture: use eight real public Topic IDs from one Domain. Give four Topics synthetic calibration prototypes and leave four with no prototype.

Controls:
- zero-prototype Topics all receive the same negative-infinity centroid score;
- an all-no-prototype run checks deterministic Topic-ID tie ordering;
- a zero-prototype target starts at profile rank 1 and is fused with centroid ranking at the frozen 1.5 and 3.0 calibration weights.

Interpretation boundary: this can confirm systematic rank displacement induced by missing prototypes and tie ordering. It does not show how often private Topics lack prototypes.

## Diagnostic 3 — Nonempty allowed-context path

Fixture: an ambiguous synthetic current input plus nonempty synthetic interview context, ranked against all 144 public core profile documents.

Control embedding: repository HashNgramEmbeddingAdapter, explicitly a deterministic synthetic control and **not** a BGE result.

Measure:
- rendered query text difference;
- query embedding cosine;
- full-profile ranking change;
- public Interviews Topic rank before/after context.

Interpretation boundary: if this path changes ranking, private identical ranking digests cannot by themselves prove the context pipeline is broken. Their private cause remains unresolved without a separately authorized aggregate-only diagnostic.

## Output

The executable diagnostic emits one JSON object with confirmed flags per hypothesis. Tests require zero private/evaluation/lockbox reads and no production algorithm mutation.
