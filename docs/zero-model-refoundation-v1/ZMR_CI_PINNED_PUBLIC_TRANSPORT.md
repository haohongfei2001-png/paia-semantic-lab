# ZMR pinned public transport repair

## Incident and evidence

Main `226dca7eedae33c098b49b4abaf5d6905e83a019` preserves the PR216 tested file tree `61d3a042243c3a79adf825dbfc7e7c0df0d7d91e`. Both required PR216 head checks passed attempt1. Main Semantic Lab CI36790458615 passed; ZMR run36790458554/job110141878965 failed in the allowlisted file-fetch step at2026-09-30T23:20:00Z. The installation core API returned403 with5000/5000 requests consumed; engineering unit tests were skipped. This is a transport failure, never a test PASS. No unchanged-head rerun or limit-reset polling was requested.

First repair head `7a47b65822bdabda51c4e928b61a605654f3d0ae` failed run36791490794/job110145172455 at its first authenticated tree request under the same exhausted installation limit. No engineering test ran or unchanged-head retry was made. This necessary follow-up removes installation authentication from both exact-SHA public metadata requests. Public403 still fails once; no fallback token, alternate account or reset polling.

## Repair and preserved boundaries

The repository is public. Fetch only existing explicit allowed paths at the exact40-character head SHA from raw.githubusercontent.com, without credentials or redirects. Keep recursive Git tree metadata verification for base/head (two public unauthenticated REST requests at exact SHAs,16MiB bounded/nontruncated/unique paths), regular-file/type checks, size bounds, and Git blob SHA1 over canonical header plus original bytes. Stream at most the tree-declared size, cache only verified immutable blobs within one job, return defensive copies, and reject HTTP403/404, wrong lengths/digests, symlinks and traversal. No getBlob REST requests or token fallback; transient HTTP500/502/503/504 alone receive at most three attempts. The existing five-minute job gate remains.

Only the exact workflow file and transport test are added to the read/materialization allowlist. Existing canonical/input sets, source/code hashes, evidence assertions and all engineering tests remain intact. No checkout/archive, legacy fixture generator, consumed blind inputs/gold/case outputs, Router evaluation or production access. The job logs transport and unique-blob request counts.

## Focused verification and next action

Four tests exercise the exact embedded workflow reader with synthetic in-memory HTTP responses: immutable URL/credential omission/cache isolation; allowlist/traversal/symlink/metadata rejection before network; digest/size mismatch and bounded HTTP failure handling; exact-SHA public tree identity, complete/unique metadata and single-attempt403 rejection. The same four tests pass from an isolated two-file delivery (workflow plus test). The full script is parsed without execution. A connector read confirmed the exact-main public raw path is available; direct local Node TLS returned ECONNRESET and is not claimed as a runner network PASS. Remote head/main CI remains separately recorded in PR receipts.

**ENGINEERING_ONLY_NOT_CAPABILITY**; all source writer evidence remains **NON_INDEPENDENT_DEVELOPMENT_EVIDENCE**. Frozen fresh270 drafts/90Topics/270writerreviews/19holds and every old pin remain unchanged. Accepted/independentquota0, dataNOT_QUALIFIED, capabilityUNTESTED, resourceNOT_QUALIFIED, allowance null, no ceiling. All144Topic/95%precision/70%floors/safety/1MiB/2MiB/32MiBincremental/20ms/100ms/local-first/zero-model constraints are unchanged. Resume original sixth-Topic TRAIN batch under the registered matrix plan once delivery CI clears; qualification alone remains held for real independent curation.
