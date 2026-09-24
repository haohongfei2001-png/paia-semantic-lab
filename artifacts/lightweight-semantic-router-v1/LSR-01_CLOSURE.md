# LSR-01 Closure

LSR-01 is **COMPLETE/FAIL**.

This is a genuine public capability failure of the frozen zero-model sparse
baseline, not an infrastructure or packaging failure.

## Capability evidence

- first real capability run: `35967311368`
- exact capability head: `66d6fe309cac96e90afadec05c05b1795c148543`
- capability job: `107528713534`
- evidence artifact: `10794424772`
- artifact digest:
  `sha256:98d677fe61d95773bdba0fd75d713791a6c8824a0d4b9947e29fa4e28e1225e3`

Pre-registered primary candidate B on source-separated PUBLIC TEST:

- assigned precision: 0.5000
- coverage: 0.0556
- Topic macro-recall: 0.0588
- insufficient-evidence false assignment: 0.5000
- context harm events: 0

Frozen credibility floors were 0.95 precision, 0.60 coverage, 0.60 macro-recall,
<=0.02 insufficient-evidence false assignment, and zero context harm.

The old same-source 1,296-case synthetic suite still scored Hit@10/20 = 1.0 /
1.0. This contrast confirms that suite remains useful for regression/integrity
but is not independent evidence of product generalization.

## Deployment evidence

- generated Topic index: 106,675 bytes
- JS router core: 16,411 bytes
- router + index: 123,086 bytes
- cold init: 29.81 ms
- incremental Node heap: 2,066,976 bytes
- warm p95: 20.50 ms

Size, cold-init and memory gates pass. Warm p95 narrowly misses the 20 ms target.

The dominant failure is semantic coverage/generalization, not package size.

## Closure validation

The failure was then validated without reopening the consumed public TEST:

- closure head: `da111ac465e0b18f873adc2b84ab96f2e703e01a`
- closure CI: `35968313774` — PASS
- closure job: `107531877173`
- closure artifact: `10794943858`
- closure artifact digest:
  `sha256:25c81a04b29bf191c3b61334561c78908c7f2c22310e40c99a6346cb6cb3862a`

## Guards

- neural model assets: 0 bytes
- semantic network calls: 0
- private calibration reads: 0
- legacy evaluation reads: 0
- consumed lockbox reads: 0
- PAIA production writes: 0

## Stop

STOP after LSR-01. Do not tune against the consumed public TEST and do not
start LSR-02. Any new lightweight architecture experiment requires explicit
owner authorization and fresh independent public evidence.
