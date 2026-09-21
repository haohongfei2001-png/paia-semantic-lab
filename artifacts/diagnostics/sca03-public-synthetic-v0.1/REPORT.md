# SCA-03 Public Synthetic Failure Diagnostics v0.1 — Reviewed Results

## Provenance and limits

- Evidence class: **PUBLIC_SYNTHETIC_ONLY**.
- Reviewed implementation commit: `0a92adce5bec4cb698920b3fdba449ab76ac9a7e`.
- Semantic Lab CI run `35529146339`, job `106126530619`: **SUCCESS**.
- Evidence artifact: `10610951772`.
- The isolated diagnostic step installs pinned `numpy==2.5.3`, matching the published SCA-03 runtime metadata.
- Private calibration reads: **0**; legacy evaluation reads: **0**; consumed lockbox reads: **0**.
- No frozen SCA-03 config/profile/graph/freeze/result, gate, production algorithm, or SCA-04 state is changed.

## 1. Candidate-budget pressure — CONFIRMED on bounded cross-Domain fixture

The direct ranking contains one real public Topic from each of D01-D10 in ranks 1-10.

- Current K8 expansion uses **8/10** top-10 slots for the first seed Domain.
- The original direct rank-4 Topic `sys.education_learning.academic_admin` moves to **rank 18**.
- Direct top-10 retained at candidate top-10:
  - direct-only: **10/10**
  - current K8: **3/10**
  - seed + at most 4 additional siblings: **6/10**
  - seed + at most 2 additional siblings: **8/10**
- Direct top-10 retained by candidate top-20:
  - current K8: **6/10**
  - sibling-cap4: **10/10**
  - sibling-cap2: **10/10**

Review correction: the cap now counts **additional siblings only**; the seed is added separately.

Confirmed boundary: K8 can mechanically evict strong cross-Domain direct evidence. This fixture does not estimate how often that happened in private SCA-03 and does not promote cap2/cap4.

## 2. Sparse-prototype displacement — CONFIRMED with real production functions

This revised probe directly calls the real `topic_centroid_ranking()` and feeds its returned ranking into the real `weighted_rrf()`.

### Partial-prototype control

- Real public Topic count: **144**.
- Synthetic seen prototypes: **4**.
- Zero-prototype Topics: **140**.
- Reversed profile ranking target starts at profile rank **1**.
- Real centroid ranking places that zero-prototype target at **144**.
- Real RRF moves it to:
  - calibration weight 1.5 → **rank 10**
  - calibration weight 3.0 → **rank 32**
- The zero-prototype tail is Topic-ID sorted.

### All-no-prototype control

- Real call uses `np.empty((0, 2), dtype=float32)` and empty train cases.
- Returned centroid ranking equals Topic-ID order.
- The same reversed-profile target is centroid rank **144**.
- Real RRF again gives:
  - weight 1.5 → **rank 10**
  - weight 3.0 → **rank 32**

### Profile-only control

- Real `weighted_rrf()` with calibration weight 0 preserves the full profile ranking.
- Target remains **rank 1**.

Confirmed conclusion: under the current production functions, missing prototype evidence becomes an ordinal tail ranking and materially displaces a zero-prototype Topic during RRF. The stronger calibration weight amplifies the displacement.

Boundary: this does **not** infer the private fold-local zero-prototype prevalence. It proves the mechanism on public synthetic inputs only.

## 3. Nonempty allowed-context path — PATH CONFIRMED; private cause NOT CONFIRMED

The revised probe enters through `semantic_lab.rem01.query_representation` for both `current_only` and `allowed_context`.

- Nonempty synthetic context changes rendered query text.
- Deterministic HashNgram control cosine: **0.2965855070008698**.
- Full public-profile ranking changes.
- Public `Interviews` Topic moves **71 → 9**.

The HashNgram adapter remains explicitly a synthetic control, not BGE evidence. Therefore the closed SCA-03 identical private ranking digests still cannot be assigned a cause from this probe. The public path is capable of propagating context; private BGE/fusion behavior remains unresolved.

## Evidence decision

- Candidate-budget mechanism: **CONFIRMED**.
- Missing-prototype ordinal displacement: **CONFIRMED with actual production functions**.
- Public nonempty-context path: **CONFIRMED**.
- Private context-digest cause: **NOT CONFIRMED / remains a hypothesis**.

The next artifact is design-only. It does not authorize implementation or any new private run.
