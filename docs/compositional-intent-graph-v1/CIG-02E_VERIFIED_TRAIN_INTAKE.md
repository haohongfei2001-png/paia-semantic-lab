# CIG-02E verified TRAIN stream intake

Engineering only. PR #68 merged at `8534b31548a2caf132e7e740095385256a57cd91` after six applicable exact-head checks PASS, including the real Node selective-parser tests. The fixed source plan remains unchanged. This batch adds the source-byte/selection boundary and synthetic integration tests; **no actual task corpus was acquired**.

## Implemented boundary

`scripts/cig02e_verified_train_intake.mjs` validates the pinned NI source, registered multilingual TRAIN selection, retry/size policy, allowlisted fields and zero-gold/unfrozen flags. It checks all descriptor shapes and the total planned byte budget before task requests.

The verified response consumer requires an exact GitHub raw URL, HTTP 200 and no redirect. It incrementally counts received bytes, computes the Git SHA-1 blob identity including its declared-size header, and uses fatal streaming UTF-8 decoding. Declared-size mismatch, excess bytes, invalid/truncated UTF-8 or hash mismatch rejects. Response bodies/readers are cancelled and locks released on rejection or completion.

Selective parsing may tentatively construct metadata while hashing the same stream, but no parsed metadata leaves this boundary until the full blob has verified. The caller must obtain task descriptors from the pinned Git tree. The verified TRAIN list must have all 1,270 names and the identical first 24 names in published order before any task request is attempted. Requests are sequential, one callback invocation per task path; there is no retry loop.

Results expose registered metadata/Definition fields only. Definitions stay excerpts, with `fullInstructionCertified:false`, `acceptedGold:false` and zero scores/gold. No whole-task JSON parse, model/runtime dependency, formal profile change or Topic selection heuristic is added.

## Synthetic integration verification

Five new Node test groups cover verified source bytes with one-byte UTF-8 splitting plus selective parsing; corrupted Git hashes, byte totals, truncation and malformed UTF-8 with stream cancellation; wrong origins, redirects, failed HTTP status and incomplete consumers; fixed multilingual TRAIN order and drift/TEST-path rejection; and failed TRAIN identity making zero task requests/retries.

Before push, module compilation and plan/order/ASCII integration passed in the isolated JS tool using explicit hash/decoder adapters. That authoring check **does not certify real SHA-1 or UTF-8 behavior**. Actual Node crypto, fatal decoder and the full new suite are pending Actions. The existing two-minute read-only workflow runs both parser and integration suites at the exact PR head, with no corpus download.

## Remaining acquisition wiring

This module accepts responses/descriptors and an injected transport. The GitHub Actions acquisition entrypoint is not yet wired: it must obtain pinned tree descriptors, make GitHub-only requests with finite timeouts and redirects disabled, preserve source license/attribution, and invoke this module once on a stable passing candidate. It must not fetch TEST task contents or lists, decode Instances/examples, retry the source or score any candidate.

Keep the planned first 24 TRAIN tasks and public source selection immutable. If intake fails, preserve the real failure and do bounded root-cause before further source runs. No capability claim from source identity or metadata parsing.

## Receipts and research status

PR #67 exact-main receipt is now six applicable checks PASS, preserving the prior pending observation. The single PR #68 exact-main snapshot recorded five PASS and one running semantic-lab-validation job, with CSL skipped separately. No repeated poll or completion claim.

Current ledger: 41 nominations / 35 Topics / 109 missing / 28 unresolved, zero gold. Existing LSR/CSL FAIL and CIG unqualified evidence are unchanged. CIG-02 unfrozen; CIG-03 blocked and independently owner-gated. Zero-model/local-first/tiny and the frozen protocol remain unchanged.
