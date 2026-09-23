# BAA-01 — Public Implementation & Verification Report

Capability verdict: **PASS on PUBLIC/SYNTHETIC gate only**.

This report records the first required CI validation of the separately
authorized `SCA03-BOUNDED-ARCHITECTURE-AMENDMENT-v0.1` implementation.

## Evidence

- implementation checkpoint: `bd00ab29ca6773c0d31a0e08c3972812ccf804d6`
- Semantic Lab CI run: `35815451386`
- job: `107035898215`
- evidence artifact: `10730544877`
- conclusion: **SUCCESS**
- private calibration reads: **0**
- legacy evaluation reads: **0**
- consumed lockbox reads: **0**
- SCA-04 started: **false**

## A. Direct-evidence preservation

Both authorized PUBLIC policy variants pass all three fixtures:

- `direct_reserve6_sibling_cap2`
- `direct_reserve6_sibling_cap4`

Fixtures:

1. ten distinct Domains in direct top-10;
2. dense first Domain;
3. alternating two Domains.

For every fixture and both policies:

- direct ranks 1-6 remain inside candidate top-10;
- direct ranks 1-10 remain inside candidate top-20;
- sibling cap counts additional siblings only;
- injected siblings never exceed the configured per-Domain cap;
- candidate set is exactly 144 unique eligible Topic IDs;
- Domain IDs never appear as candidates.

The deliberately adversarial ten-distinct-Domain fixture shows the bounded
tradeoff without violating the new invariants:

- cap2 direct top-10 positions: 1,2,3,4,5,6,9,10,11,12;
- cap4 direct top-10 positions: 1,2,3,4,5,6,11,12,13,14.

No private performance claim is made and no private winner is selected.

## B. Missing-evidence-neutral fusion

The PUBLIC 144-Topic synthetic control uses four observed prototypes and 140
zero-prototype Topics.

Verified:

- prototype stream count = **4**, exactly the observed Topic set;
- zero-prototype target is absent from the prototype stream;
- relative order of all zero-prototype Topics remains the profile relative order;
- all-no-prototype stream is empty;
- all-no-prototype fusion equals profile ranking exactly for weights 1.5 and 3.0;
- prototype weight 0 equals profile ranking exactly;
- renaming zero-prototype Topic IDs while holding profile positions fixed does
  not change their logical fused positions.

The reversed-profile target positions are:

- profile: **1**
- profile-only: **1**
- all-no-prototype weight 1.5: **1**
- all-no-prototype weight 3.0: **1**
- partial-prototype weight 1.5: **5**
- partial-prototype weight 3.0: **5**

The move to rank 5 in the partial case is caused only by the four Topics with
actual positive prototype evidence. Missing evidence itself contributes no
prototype rank, score or Topic-ID tie-break.

## Boundaries

BAA-01 does not:

- select cap2 versus cap4 for a future private run;
- claim private Recall@10/Recall@20 improvement;
- modify allowed-context handling;
- modify BGE;
- regenerate profiles or graph content;
- modify formal Topic semantics;
- alter the closed SCA-03 experiment;
- authorize private calibration;
- start SCA-04.

The original future private thresholds remain unchanged at Recall@10 >= 0.96,
Recall@20 >= 0.99, identical critical-slice thresholds and family leakage = 0.

BAA-01 may close only after the committed result is revalidated on the final PR
head, the PR is merged, exact merged-main CI passes, and closure metadata is
validated on its own exact main HEAD.
