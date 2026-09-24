# CIG-02B typed grounder public DEV report

## Implementation and source boundary

The CIG-02B compiler builds a deterministic 144-Topic index from the public formal Catalog and all six public profile shards. It reads no private calibration, legacy evaluation, consumed lockbox, real PAIA archive, LSR/CSL TEST text, or CIG-01 scored cases. The runtime uses the existing goal-span parser, then matches typed evidence inside the current goal span. A single global action lexicon identifies request language; per-Topic object atoms come from public canonical names and lexical anchors; outcome/concept cues come from public profile semantic cores. Global exclusion rules defer incidental mentions and competing Topic evidence. No per-Topic threshold or case-specific patch is present.

The types have a material limitation: the current `ACTION` atoms are shared across Topics, and `OUTCOME` atoms are profile-described concepts, not independently authored causal outcomes. `EXCLUSION` is a runtime rule, not a learned negative lexicon. These distinctions are explicit in the index provenance and prevent overstating semantic coverage.

The build produced 144 Topic records, 1,638 object atoms, 1,304 outcome/concept atoms, 28 shared action atoms and two exclusion rules. The index is **319,147 bytes** and the router, parser and index total **323,926 bytes**. Two independent cloud builds had the same SHA-256 `13b89be38f1a6ee8f324df7711d6e597b6cf4a6ad93bec67c3aac166d52276d7`. GitHub Actions run [36026633525](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36026633525) passed.

## New public DEV only

The new same-writer fixture has 18 goal/means, 18 natural request, and 18 should-DEFER examples across all 18 domains. It represents 36 of 144 Topics, so its macro recall is **represented-Topic** recall and cannot establish full-Catalog capability. The fixture is public development evidence; neither a blind test nor a promotion gate. Only the two predeclared global policies were compared.

| Policy | Correct/assigned | Correct positive cases | Coverage | Represented-Topic macro recall | DEFER false assigns | Means false assigns |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| strict | 16/16 | 16/36 | 44.44% | 44.44% | 0/18 | 0/18 |
| balanced | 24/24 | 24/36 | 66.67% | 66.67% | 0/18 | 0/18 |

Both policies repeated deterministically and were unchanged by unrelated prior context on this fixture. In this one GitHub runner, balanced cold initialization was about 1.0 ms and warm p95 was about 0.85 ms. These timings and heap observations are development measurements, not CIG-04 consumer certification.

## Decision

**CIG-02B public DEV is unqualified.** Balanced coverage and represented-Topic macro recall are below the unchanged 0.70 capability floors, even on a same-writer development fixture. Assigned precision is 1.0 on the examples it chose to assign, but abstention is substantial. The observed pattern suggests a source-information gap in the typed object and outcome cues; this is an inference from the DEV result, not a universal zero-model limit. No metric, scorer, fixture or threshold was lowered after viewing results.

CIG-02 remains open and **is not frozen**. CIG-03 stays blocked. Any later CIG-02 work must use newly authored, source-separated public development evidence and a newly frozen candidate; this DEV is already consumed for candidate selection and cannot support a capability claim. The stored result is `artifacts/compositional-intent-graph-v1/CIG-02B_DEV_RESULT.json`.
