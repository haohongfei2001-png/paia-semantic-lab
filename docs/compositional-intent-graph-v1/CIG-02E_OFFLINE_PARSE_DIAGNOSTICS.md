# CIG-02E offline source parser diagnostics

This coherent engineering batch responds to the observability gap in source run 36346751629. That genuine FAIL remains immutable; no source replay or new acquisition is included. The source workflow remains disabled.

## Metadata-only diagnostics

Selective syntax errors expose reason, consumed text-character offset, number of chunks read, retained node count and retained/excluded decoded-string counters. Character offset is not byte offset. Errors contain no source substring, decoded values or per-case predictions. Retained JSON string parse errors are normalized to a stable reason rather than exposing native error snippets.

Verified TRAIN intake errors expose stage, registered task path/Git blob/declared size when a task has been entered, requests attempted, fully verified task count, consumed source bytes and whether the TRAIN list fully verified. Received bytes include unverified consumed bytes; they never imply successful full verification. Partial metadata records are not returned. Driver failure artifacts propagate only these bounded diagnostics.

These fields describe future offline executions; they cannot reconstruct the prior attempt's unknown task path or partial consumption. They do not solve or certify the root cause of the original value-syntax rejection.

## Verification

Targeted authoring checks: malformed synthetic value at three chunk widths produced the exact expected text offset, with no source marker in structured error output. Test source syntax checked. Authoritative Node integration remains pending Actions.

Actions regression tests cover error offsets/no discarded-text leakage and failed synthetic TRAIN blob identity with exact consumption counters and zero task requests. Existing strict JSON, limits, identity and stream-close tests remain unchanged. No downloaded task text, independent capability rows or router scores are used.

## State

PR #70 closure is merged at `1d083b52e83ecf5a5449300abe841503cdb2091f`; one exact-main observation shows five applicable PASS and one running. Persist this observation, resolve it on restoration, and batch the final receipt with the next substantive work. Do not poll or rerun.

41 nominations / 35 Topics / 109 missing / 28 unresolved / zero gold remain. CIG-02 unfrozen; CIG-03 blocked and owner-gated. Product constraints, source selection, research protocol and previous FAIL/unqualified evidence unchanged.
