# CIG-02E selective task metadata parser

Engineering only. The fixed 24-task definition feasibility plan merged in PR #67 at `213021d2c7dd158508c55c83937f0dd436bcd3a6` after six applicable exact-head CI checks PASS. This batch implements the ingestion boundary with synthetic inputs; it does not acquire any corpus or score the router.

## Boundary

`scripts/cig02e_selective_task_metadata.mjs` consumes an async iterable of text chunks. It returns only the ten metadata/Definition fields already registered in the plan. It scans excluded/unknown values structurally, without JSON decoding or retaining their string values. Escapes, nested containers, literals and numbers are checked even in skipped content; malformed or truncated input fails closed.

Top-level and retained-object duplicate keys are rejected, including alternate escaped spellings of the same key. Skipped-object keys/values are scanned without decoding; their duplicate spelling has no retained semantic effect. Structural top-level field names remain necessary for selecting fields.

The parser bounds input characters, retained characters, retained nodes, nesting and combined definition length. It closes the input iterator on both completion and early rejection. This is an offline source helper, with no runtime dependency or network function. Production model/network/size constraints are untouched.

The future acquisition harness must separately enforce the pinned Git blob, official TRAIN membership, response byte limits and fatal incremental UTF-8 decoding. UTF-8 transport decoding precedes this parser; its non-decoding guarantee refers to JSON string values in excluded fields. No whole task JSON parse is allowed. No acquisition can be certified from these synthetic checks alone.

Returned flags are always `fullInstructionCertified:false` and `acceptedGold:false`. A task definition alone omits instance input, and source author/independent Catalog-label holds remain.

## Verification

Five synthetic test groups cover:

- Every-character chunk boundaries and multiple larger chunk sizes; multilingual definitions.
- Escaped quotes/backslashes/Unicode, nested skipped containers and primitive values.
- Malformed/truncated data, invalid escapes/numbers, duplicate retained keys, trailing input and Definition shape.
- Input, retained text, retained allocation, depth and definition limits, including invalid limit configuration.
- A 100,000-character skipped output and iterator closure on early failure.

The first group temporarily instruments the JSON string decoder and asserts that synthetic instance/output/example markers never reach it. This tests a concrete ingestion boundary, not source labels or router capability.

All five groups passed before push in the isolated JavaScript tool with its assertion adapter. The Node `node:test` suite is the authoritative engineering CI run and remains pending until Actions completes. The dedicated two-minute workflow checks out the literal PR head, has read-only permissions and invokes tests only. It downloads no corpus and triggers no full resource certification.

## Remote receipt and next step

The preserved single PR #67 exact-main snapshot reports five applicable checks PASS and one running semantic-lab-validation job; the skipped CSL check is separate. No repeat poll or completion claim.

After parser CI is complete, finish the pinned acquisition harness as a coherent batch with synthetic integration tests: source identity, TRAIN membership, fatal UTF-8, byte accounting, failure cancellation and one-request/no-retry policy. Only a stable passing candidate may acquire the 24 fixed TRAIN definitions once. Do not expose Instances, examples, assistant outputs or TEST tasks; no hint/selection tuning, gold promotion or score.

Current ledger remains 41 nominations / 35 Topics / 109 missing / 28 unresolved, zero gold. Earlier genuine FAIL/unqualified evidence stays immutable. CIG-02 remains unfrozen; CIG-03 blocked and owner-gated.
