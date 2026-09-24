# CSL-00 protocol freeze

The public package was authorized by the owner on 2026-09-24. CSL-00 through
CSL-06 share one continuous authorization; CSL-04 is conditional on CSL-03 FAIL.
The package stops after CSL-06 PASS, CSL-04 terminal FAIL, or another hard stop
in `EXECUTION_PROTOCOL.md`.

## Source boundary

`scripts/csl00_freeze.py` builds the evaluator manifest solely from the
versioned formal Topic Catalog. The manifest contains exactly the 144 active
Topic IDs, Chinese/English canonical names, formal definition and formal
inclusion/exclusion boundaries. It contains no aliases, examples, profiles,
generated phrases, index, previous tests or private evidence. Its catalog hash
and exact deterministic rebuild are checked in CI.

The build-time generator may use the public catalog and derived public profiles.
It must record source class (`natural_expression`, `cross_lingual_form`,
`contrastive`), generator mode and source digest for every expression. Public
DEV may tune global policies only, with at most three variants in CSL-02.

The blind evaluator may receive only the checked-in restricted manifest and
the frozen evaluation protocol. TEST v1 and v2 are independently authored from
that manifest. The evaluator must not inspect lexicon candidates, compiled
index, old fixtures, consumed LSR-01 TEST, private calibration, legacy
evaluation or the consumed lockbox. A test fixture must be frozen and hashed
before the corresponding frozen runtime/index is run once. TEST v1 failure is
used only for failure-class analysis; a distinct fresh TEST v2 is required after
the one bounded CSL-04 repair. Exact failed phrases cannot be copied into the
production lexicon, and gold cannot be edited after opening a TEST.

## Frozen gates

| Gate | Limit |
| --- | ---: |
| Active Topic count | 144 |
| Generated semantic index, uncompressed | <= 1,048,576 bytes |
| Router core + index, uncompressed | <= 2,097,152 bytes |
| Incremental memory | <= 33,554,432 bytes |
| Warm full-catalog p95 | <= 20 ms |
| Cold initialization | <= 100 ms |
| Production neural model assets | 0 bytes |
| Production semantic network/API | none |
| Assigned precision | >= 0.95 |
| Auto-assignment coverage | >= 0.70 |
| Topic macro-recall | >= 0.70 |
| Insufficient-evidence false assignment | <= 0.02 |
| Context harm events | 0 |
| Deterministic repeat | PASS |

Blind TEST v1 must have >=288 single-label cases with >=2 per Topic, >=72
context/counterfactual cases, and >=36 multi-label, ambiguous or DEFER cases.
Multi-label metrics are reported separately. CSL-03 PASS proceeds to CSL-05;
FAIL proceeds to CSL-04. CSL-04 TEST v2 PASS proceeds to CSL-05; FAIL ends
the public package. CSL-06 PASS ends at the private boundary.
