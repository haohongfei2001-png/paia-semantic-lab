# BAA-01 Public Implementation Closure

BAA-01 is **COMPLETE/PASS on PUBLIC/SYNTHETIC gates only**.

## Integration evidence

- Package: `SCA03-BOUNDED-ARCHITECTURE-AMENDMENT-v0.1`
- PR: #9
- Final PR head: `4bce539057064330a93ff7cf648bda04bd5fec9e`
- PR-head Semantic Lab CI: `35816370084`
- PR-head job: `107038649794`
- PR-head evidence artifact: `10731387311`
- PR-head required CI: **PASS**
- Merged main: `70d67dd7ae14f6576675dc1e0b2cdd2efce986b6`
- Merged-main Semantic Lab CI: `35827543280`
- Merged-main job: `107072495709`
- Merged-main evidence artifact: `10735836767`
- Merged-main required CI: **PASS**

## Public capability result

Both bounded candidate policies pass all registered fixtures and invariants:

- `direct_reserve6_sibling_cap2`
- `direct_reserve6_sibling_cap4`

For both policies across all three fixtures:

- direct ranks 1-6 remain in candidate top-10;
- direct ranks 1-10 remain in candidate top-20;
- sibling caps count additional siblings only;
- per-Domain injected siblings do not exceed the configured cap;
- candidate output remains exactly 144 unique eligible Topic IDs;
- Domain IDs are absent from candidates.

Missing-evidence-neutral fusion also passes:

- only observed-prototype Topics enter the prototype evidence stream;
- zero-prototype Topics receive no prototype rank or RRF term;
- all-no-prototype fusion exactly equals profile ranking;
- prototype-weight-zero fusion exactly equals profile ranking;
- zero-prototype relative order follows profile order;
- renaming zero-prototype Topic IDs does not change their logical fused positions.

## Guards

- private calibration reads: **0**
- legacy evaluation reads: **0**
- consumed SEM-07 lockbox reads: **0**
- live archive reads: **0**
- real Input API egress: **0**
- model training: **0**
- production PAIA writes: **0**
- formal catalog mutations: **0**
- closed SCA-03 mutations: **0**
- SCA-04 started: **false**

The historical SCA-03 failure remains immutable and SCA-04 remains BLOCKED.

## Stop boundary

BAA-01 PASS does **not** authorize a private run and does not select cap2 versus cap4 for private promotion.

BAA-02 remains NOT_STARTED / NOT_AUTHORIZED. Any future private calibration requires:

1. a separate explicit owner authorization;
2. a newly frozen pre-evidence configuration;
3. the unchanged promotion gates: Candidate Recall@10 >= 0.96, Recall@20 >= 0.99, identical critical-slice thresholds, family leakage = 0.

Evaluation remains closed until a future newly authorized calibration passes.

**STOP after this closure.**
