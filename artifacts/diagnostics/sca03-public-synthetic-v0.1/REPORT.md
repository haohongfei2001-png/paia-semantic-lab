# SCA-03 Public Synthetic Failure Diagnostics v0.1 — Results

## Validation provenance

- Evidence class: **PUBLIC_SYNTHETIC_ONLY**.
- Base main: `98afb38b89bf2f62b38d122a033b1e6dc4e1387e`.
- Diagnostic implementation commit validated by CI: `13be234ac7c5bf3d3cf21eb9d5b5cda0fc457572`.
- Pull request: #8.
- Semantic Lab CI run: `35527335910`.
- Job: `106121681383`.
- Evidence artifact: `10609889026`.
- Full required workflow: **SUCCESS**.
- Targeted diagnostics: **7/7 PASS**.
- Private calibration reads: **0**; legacy evaluation reads: **0**; consumed lockbox reads: **0**.
- Frozen SCA-03 algorithm/config/profile/graph/evidence modified: **no**.

All three bounded public/synthetic probes are confirmed on their stated fixtures. These are structural counterexamples/controls, not estimates of private-data prevalence or promotion performance.

## 1. Candidate-budget pressure — CONFIRMED on constructed cross-Domain fixture

Fixture: the direct top-10 contains one real public Topic from each of Domains D01 through D10.

- The direct rank-4 Topic `sys.education_learning.academic_admin` moves to rank **18** after the current K8 expansion.
- Current K8 places **8/10** top-10 slots in the first seed Domain.
- Original direct top-10 retained in expanded top-10: direct-only **10/10**, current K8 **3/10**, sibling-cap4 **7/10**, sibling-cap2 **9/10**.
- Original direct top-10 retained by expanded top-20: current K8 **6/10**, sibling-cap4 **10/10**, sibling-cap2 **10/10**.

Confirmed conclusion: full K8 expansion can mechanically displace high-ranked cross-Domain direct evidence even when the direct ranking is deliberately strong and diverse.

Boundary: this fixture does **not** establish how frequently the same pattern occurs in the consumed 80 calibration cases, nor that cap2/cap4 would pass the private gate.

Minimal repair candidate for a future separately frozen package: preserve a direct-evidence slot budget before sibling expansion, or cap sibling injection (for example 2–4) instead of unconditional K8. Validate with public cross-Domain fixtures before any future private promotion run.

## 2. Sparse prototype / zero-prototype displacement — CONFIRMED

Fixture: one real eight-Topic public Domain; **4** Topics receive synthetic prototypes and **4** do not. The probe is source-bound to the production rule that missing prototypes receive `-inf` (**true**).

- Zero-prototype target: `sys.personal_direction.values_principles`.
- Profile-only rank: **1**.
- Centroid rank: **8**.
- Fused rank at calibration weight 1.5: **6**.
- Fused rank at calibration weight 3.0: **8**.
- Zero-prototype items with equal `-inf` score follow Topic-ID lexical order.
- All-no-prototype control exactly equals Topic-ID lexical ordering.

Confirmed conclusion: in the current centroid ranking semantics, absence of a prototype is not neutral evidence; it places a Topic behind every finite-scored prototype Topic, and stronger centroid weight can amplify displacement through RRF.

Boundary: this fixture does **not** reveal how many Topics lacked fold-local prototypes in SCA-03 private folds. No private coverage inference is made.

Minimal repair candidate for a future separately frozen package: treat missing prototype evidence as missing/neutral during fusion rather than as an ordinal tail ranking. For example, fuse centroid evidence only for Topics with an observed prototype and preserve profile ranking for zero-prototype Topics.

## 3. Nonempty allowed-context path — PATH CONFIRMED; PRIVATE CAUSE NOT CONFIRMED

Fixture: ambiguous synthetic current text plus nonempty synthetic interview context, ranked against all 144 public core profile documents with the repository deterministic HashNgram control. This control is **not BGE** and is not a candidate-model result.

- Query text changed: **true**.
- Current-vs-context query embedding cosine: **0.2965855070008698**.
- Full ranking changed: **true**.
- Public Interviews Topic rank: **71 → 9**.
- Private causality inference permitted by this probe: **false**.

Confirmed conclusion: the public code path is capable of propagating nonempty allowed context into different text, embedding and ranking. Therefore the identical current_only/allowed_context ranking digests observed in closed SCA-03 do **not**, by themselves, prove that the context pipeline is broken.

Boundary: this does not test the pinned BGE runtime and does not explain the private digest equality. Possible private-run explanations (empty/non-discriminative context, BGE invariance at relevant ordering margins, or downstream fusion masking) remain hypotheses and would require separately authorized aggregate-only instrumentation if pursued.

Minimal repair recommendation now: **none** for the context path. Do not change context code based on the private digest equality alone. Keep this as a diagnostic question, not a confirmed defect.

## Decision

Public evidence supports prioritizing two small architectural experiments in a new frozen package: (1) direct-slot-preserving / capped sibling expansion, and (2) neutral handling of zero-prototype Topics during calibration fusion. The context path should remain unchanged until a stronger public/BGE or separately authorized aggregate-only diagnostic identifies a defect.

Multi-vector representation changes are explicitly out of scope for this diagnostic branch.
