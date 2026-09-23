# BAA-01 — Public Verification Contract

All BAA-01 gates are PUBLIC/SYNTHETIC-only.

## Candidate assembly

Both policy variants must pass every bounded fixture:

- `direct_reserve6_sibling_cap2`
- `direct_reserve6_sibling_cap4`

Required invariants:

- direct ranks 1-6 are all in candidate top-10;
- direct ranks 1-10 are all in candidate top-20;
- sibling cap counts additional siblings only;
- every per-Domain injected sibling count is <= the configured cap;
- candidate output is exactly 144 unique eligible Topic IDs;
- Domain IDs never appear as candidates.

## Missing-evidence-neutral fusion

Required:

- prototype evidence ranking contains only Topics with observed prototypes;
- zero-prototype Topics receive no prototype rank or RRF term;
- all-no-prototype evidence produces an empty prototype stream;
- all-no-prototype fused ranking exactly equals profile ranking;
- prototype weight 0 exactly equals profile ranking;
- among zero-prototype Topics, relative fused order equals profile relative order;
- renaming zero-prototype Topic IDs while preserving profile positions cannot
  change their logical relative fused positions;
- observed-prototype Topics may receive positive displacement.

## Package invariants

- private artifact reads = 0;
- evaluation reads = 0;
- consumed lockbox reads = 0;
- live archive reads = 0;
- real Input API egress = 0;
- model training = 0;
- production PAIA writes = 0;
- formal catalog mutations = 0;
- closed SCA-03 mutations = 0;
- SCA-04 remains not started.

## Historical/public regression

The existing SCA-01/SCA-02 validations and the historical SEM/REM regression
chain must remain PASS.

## Future private gate

BAA-01 PASS is insufficient for private execution. A future private round
requires a separate owner authorization and a newly frozen pre-evidence config.
The original thresholds remain Candidate Recall@10 >= 0.96 and Recall@20 >=
0.99, with identical critical-slice thresholds and family leakage = 0.
