# PAD-01 Public/Synthetic Architecture Decomposition Report

PAD-01 is **diagnostically PASS**. This means the frozen public/synthetic decomposition executed completely, deterministically, and without crossing any private boundary. It does **not** mean that a new production architecture has been selected or that private promotion gates have been met.

## Evidence and reproducibility

- package: `SCA03-POST-FAILURE-ARCHITECTURE-DIAGNOSTICS-v0.1`
- PR: #12
- exact PR head: `0f64d0e4af742693b1078a77ddd94215f4fb94f9`
- PR-head Semantic Lab CI: `35851418804` — PASS
- PR-head evidence artifact: `10745876522`
- merged main: `3175db1e8e950a4c3b4731769b40061443030273`
- merged-main Semantic Lab CI: `35852183687` — PASS
- merged-main evidence artifact: `10746013756`
- PAD-01 result digest: `99b3c64107bc0668f20227a6fcb15e76c5a2a66a1e1713eed1becd0e608a3e1b`
- two PAD-01 executions produced byte-identical JSON.

Private calibration/evaluation/lockbox reads in PAD-01 were all zero.

## 1. Representation decomposition

The same frozen 1,296-case SCA-02 contrastive suite was scored against all 144 Topic profiles using a deterministic HashNgram architecture control.

| Representation | Hit@5 | Hit@10 | Hit@20 |
| --- | ---: | ---: | ---: |
| current `full_derived` concatenation | 0.967593 | 0.986883 | 0.996914 |
| positive fields concatenated, exclusion cues removed | 0.969907 | 0.990741 | 0.996914 |
| same positive content as five vectors, max late fusion | 1.000000 | 1.000000 | 1.000000 |

Removing exclusion cues from the positive retrieval document gives only a small control improvement: +0.23 percentage points at Hit@5 and +0.39 points at Hit@10, with no Hit@20 change.

Field separation is the larger public-control signal: using the **same positive semantic content** as five independent vectors with max late fusion improves Hit@5 by 3.01 points, Hit@10 by 0.93 points and Hit@20 by 0.31 points relative to positive-field concatenation.

This is a structural signal, not a private capability claim. The synthetic suite and semantic-profile fields share derived source semantics, so 100% on this control is not independent evidence that BGE or real personal inputs will reach the private gates.

## 2. Full-catalog direct scoring versus sibling expansion

For the existing `full_derived` direct ranking:

- full-catalog direct Hit@10 / Hit@20: **0.986883 / 0.996914**
- cap2: **0.983025 / 0.987654**
- cap4: **0.974537 / 0.987654**

Cap2 lost 5 existing direct top-10 truth hits and 12 top-20 hits, gaining none. Cap4 lost 17 top-10 and 12 top-20 hits while gaining only one top-10 hit.

For positive-field concatenation, cap2 lost 8 top-10 / 7 top-20 hits with no gains; cap4 lost 16 / 8 with no gains.

When the multivector control already ranked every expected Topic first, neither cap harmed recall. The diagnostic interpretation is therefore bounded: **sibling expansion is most harmful precisely when the upstream direct ranking is imperfect, and it is not producing compensating gains in these public controls.** With only 144 formal Topics, full-catalog direct scoring is the cleaner architecture control for a future amendment.

## 3. Allowed-context path

PAD-01 generated 288 deterministic nonempty-context probes: every formal Topic in both zh and en.

- rendered query changed: 288 / 288
- control embedding changed: 288 / 288
- identical current-vs-context full rankings: 0 / 288
- expected Topic rank improved: 286 / 288
- worsened: 0 / 288
- median expected-rank improvement: 71.5 positions
- ambiguous current-only control Hit@10 / Hit@20: 0.069444 / 0.138889
- allowed-context Hit@10 / Hit@20: 1.000000 / 1.000000

Thus the simple hypothesis that nonempty context is being dropped or erased by rendering, embedding, ranking or candidate assembly is **not supported by the public control**. The closed private run's current-only/allowed-context equality still has no established cause.

## What PAD-01 supports next

The public evidence narrows the next architecture hypothesis to:

1. represent a Topic with **multiple positive semantic vectors** rather than one concatenated document;
2. use **full-catalog direct scoring/reranking** as the primary 144-Topic path, avoiding sibling injection unless independent evidence shows it adds value;
3. keep exclusion/boundary semantics as a separate negative/contrastive signal rather than mixing them into the positive embedding document;
4. treat context as an independent unresolved private-effect question, not as a known broken pipeline.

PAD-01 does **not** authorize implementing that architecture, rerunning the 80 calibration cases, reading the 13 evaluation cases, or starting SCA-04.

## Stop boundary

After exact closure-head CI passes, PAD-01 stops. Any architecture amendment or future private validation requires a new owner authorization.
