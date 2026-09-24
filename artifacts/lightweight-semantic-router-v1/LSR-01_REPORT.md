# LSR-01 Public Baseline Report

LSR-01 closes **COMPLETE/FAIL**.

This is a genuine public capability failure, not a CI or packaging failure.
The source-separated PUBLIC TEST was opened once only after the frozen
implementation and fixture receipt. Candidate B was the pre-registered primary
hypothesis and is the only candidate allowed to determine PASS/FAIL.

## Result

PUBLIC DEV selected the global threshold **1.0** for A, B and C in order to
satisfy the error-first threshold policy.

Primary candidate B:

| Metric | DEV | TEST | Frozen floor |
| --- | ---: | ---: | ---: |
| assigned precision | 1.0000 | **0.5000** | >= 0.95 |
| coverage | 0.0741 | **0.0556** | >= 0.60 |
| Topic macro-recall | 0.0379 | **0.0588** | >= 0.60 |
| insufficient-evidence false assignment | 0.0000 | **0.5000** | <= 0.02 |
| context harm events | 0 | **0** | 0 |

On the 20-case TEST, B automatically assigned only two cases. One was a
partial/correct-label assignment on the multi-task career case; the other was
a false continuation assignment on an intentionally ambiguous continuation.
Seventeen human-clear ASSIGNED cases were deferred, and the empty-input case
was correctly UNASSIGNED.

A and C produced the same aggregate DEV/TEST result under the frozen threshold
policy. They remain diagnostic controls and do not replace B after TEST.

## Why the old synthetic result is not product evidence

The historical 1,296-case contrastive suite still produced Hit@10 = **1.0**
and Hit@20 = **1.0** for the lightweight ranking diagnostic.

At the same time, the independently authored source-separated TEST collapsed
to 5.6% coverage and 5.9% Topic macro-recall. This directly validates the
earlier concern that the old suite is valuable for regression/integrity but is
not an independent generalization benchmark.

No benchmark/gold definition is changed after seeing this result.

## Consumer deployment measurements

The small-runtime premise itself is supported:

- generated Topic index: **106,675 bytes**
- JS router core: **16,411 bytes**
- router + index: **123,086 bytes**
- cold initialization: **29.81 ms**
- incremental Node heap: **2,066,976 bytes**
- warm p95: **20.50 ms**

Index, total size, cold-init and memory budgets pass by large margins. Warm p95
misses the 20 ms target by about 0.50 ms on this CI measurement.

Therefore LSR-01 does **not** fail because a zero-model router is too large. It
fails because this frozen evidence-constrained sparse baseline does not
generalize enough to unseen expressions, plus a small latency miss.

## Evidence

- pre-public-test freeze:
  `artifacts/lightweight-semantic-router-v1/LSR-01_PRE_PUBLIC_TEST_FREEZE.json`
- first real capability run: `35967311368`
- job: `107528713534`
- exact head: `66d6fe309cac96e90afadec05c05b1795c148543`
- evidence artifact: `10794424772`
- artifact digest:
  `sha256:98d677fe61d95773bdba0fd75d713791a6c8824a0d4b9947e29fa4e28e1225e3`
- raw public benchmark SHA-256:
  `50da32e12fb1cc2a0825d70bba22f82996d17f7e28d01c416979c07ba37e726a`

## Guards

- neural model assets: 0 bytes
- semantic network calls: 0
- private calibration reads: 0
- legacy evaluation reads: 0
- consumed SEM-07 lockbox reads: 0
- PAIA production writes: 0
- domain prior: off
- sibling expansion: off

## Stop boundary

The consumed PUBLIC TEST is not a tuning set. Under the current authorization
there is no feature/weight/context/margin/threshold change, no candidate
reselection, and no LSR-02.

A future attempt needs a separately authorized experiment with a newly frozen
architecture hypothesis and fresh independent public evidence. The historical
BGE route is not automatically restored as production.
