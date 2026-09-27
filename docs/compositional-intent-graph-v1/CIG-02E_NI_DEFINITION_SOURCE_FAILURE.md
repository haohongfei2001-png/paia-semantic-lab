# CIG-02E fixed TRAIN acquisition failure: bounded analysis

## Evidence

Run 36346751629 / job 108697284412, attempt 1, exact head `2c8d3a0e91beb2707dd39a2677c37822ea073cd7`, genuinely failed with `SELECTIVE_JSON_REJECT: value syntax`. Checkout and setup passed; the failure artifact upload passed. Artifact 10940309414 has digest `sha256:995c4cc15e3374071a398bc3bc45bde28fdc7e5cf0cffdcae4c84160094eb4b4` and two files. The entrypoint verifies/writes LICENSE before intake; the other output is the failure JSON. No definition result was published.

The parser was entered for at least one selected task. The failure handler did not preserve task path, completed records or consumed byte counters. Exact attempted paths and partial consumption are unknown. Zero published records does not mean zero downloaded source. Do not recover this uncertainty by re-fetching tasks or rerunning acquisition.

## Bounded root-cause work

Reviewed exact-head selective parser and verified stream intake. The thrown message identifies JSON value parsing, rather than explicit CI/origin/blob mismatch rejection. It does not establish whether the source had unsupported/invalid JSON, a chunk/parser defect, or another upstream byte issue; no precise root cause is certified.

In isolated JavaScript authoring checks, synthetic null/booleans/integers/decimals/exponents/empty strings/arrays/objects/nesting/large discarded strings were scanned at widths 1,2,7,127,65536. Pretty-printed synthetic documents with nested instance-like structural fields, quotes, backslashes, controls and Unicode were scanned at widths 1,2,3,7,127,1024,65536 and four formatting modes. These checks did not reproduce value syntax rejection. They are engineering inputs authored independently of upstream instance text, not capability evidence. The expanded Node regression suite will run in Actions.

There is insufficient evidence to patch the parser based on a guessed source condition. Keep strict malformed JSON rejection and all original limits. Preserve the consumed attempt and do not claim successful acquisition.

## Closure and continuation

Disable the source job's automatic execution on this writer. This engineering PR now closes the source attempt as FAIL and documents unresolved root cause; it does not request or trigger a replacement acquisition. Original failed run/check is preserved, not retried or overwritten. Existing engineering CI is rerun once for the coherent failure-evidence/regression batch; no heavy capability certification.

Next work can inspect metadata/schema documentation and improve offline synthetic diagnostic observability, without reading/re-fetching selected task payloads, changing fixed selection, or opening fresh capability TEST. Further source acquisition requires a separately justified registered continuation with preserved consumption evidence, never an invisible retry.

Ledger remains 41 nominations / 35 Topics / 109 missing / 28 unresolved / zero gold. CIG-02 remains unfrozen, CIG-03 blocked/owner-gated. Product constraints, frozen protocol and previous LSR/CSL/CIG results unchanged.
