# CIG-02E Dolly source provenance reconciliation

This batch addresses the source intake gate, not router capability. PR #48 merged at `622fdd3c03738dd2ce065906729d7637a55c85f3`; all five applicable exact-main checks succeeded. Its [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_DOLLY_FULL_ROW_MERGED_MAIN_RECEIPT.json) records exact-head and exact-main job identities. The ten rejected and two uncertain decisions remain unchanged.

## Authoritative source and reuse basis

The original [Databricks data card](https://github.com/databrickslabs/dolly/blob/2305eb7f2f4b3beb2379f34c6addf335b46c4b43/data/README.md) states human employee authorship, an instruction to avoid generative AI, and CC BY-SA 3.0 reuse with attribution. Some contexts derive from Wikipedia; retain the data card's Databricks and Wikipedia attribution when constructing any later fixture. These are upstream declarations, not an independent audit of every contributor. This corpus represents employee-authored instruction tasks; it is not a representative sample of natural PAIA requests.

The official GitHub historical dataset is pinned at commit `2305eb7f2f4b3beb2379f34c6addf335b46c4b43`, path `data/databricks-dolly-15k.jsonl`, blob `9b0b912c478e7ccd61ce741ebb409ddf8c7c22e6`. The current official data README redirects to Hugging Face. This batch uses only the historical GitHub snapshot; no external host is read.

The prior source inventory used the mirror `buayism/dolly-15k-dataset`, commit `6d7ebf384c5e588ee1b0dff816557489bc16089c`, blob `7c507d16b055ae32107a6dd0585779678565dcd2`. It must not be described as byte-identical to this official snapshot.

## Remote identity comparison

The connector comparison used exact decoded strings for all four fields (instruction, context, response, category), without normalization. It found 15,014 official rows and 15,011 mirror rows; 12,280 mirror full rows match at least one official row. 15,006 mirror instructions match exactly; 12,361 mirror instruction/context pairs match exactly. Counting distinct full rows, 2,729 mirror rows have no exact official counterpart and 2,732 official rows have no exact mirror counterpart. This does not identify which version is correct or explain the edits.

These observations were reproduced on PR #49 exact-head Actions run `36212895920`, job `108322984314`, and merged-main run `36212958154`, job `108323162528`, against Git-hash-verified downloads. All three identity edge-case tests passed; the [merged-main receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_DOLLY_PROVENANCE_MERGED_MAIN_RECEIPT.json) records the required checks. The script compares identities only: it contains no Catalog/Profile lookup, lexical query, runtime import, label assignment, or score. Tests cover reordered/duplicate source rows, changed contexts/answers, missing instructions, and schema/row-ID errors. The workflow runs only when its implementation or reviewed source manifest changes; superseded PR runs are cancelled. No new broad corpus retrieval experiment is introduced.

## Previously reviewed row mapping

| Mirror row | Official exact full-row ID | Mapping |
| --- | --- | --- |
| dolly:6028 | 6028 | All four fields match |
| dolly:1697 | 1697 | All four fields match |
| dolly:1213 | 1213 | All four fields match |
| dolly:13515 | 13518 | All four fields match |
| dolly:14044 | 14047 | All four fields match |
| dolly:9127 | 9129 | All four fields match |
| dolly:11080 | 11083 | All four fields match |
| dolly:9564 | 9567 | All four fields match |
| dolly:5735 | 5735 | All four fields match |
| dolly:11517 | none | Instruction maps to official row 11520; context differs |
| dolly:13177 | 13180 | All four fields match |
| dolly:2486 | 2486 | All four fields match |

The social-interaction and milestone-definition uncertainties remain uncertainties, with exact upstream full-row matches. They still have no gold or fixture acceptance. The Tesla-history row `dolly:11517` has a different context from official row 11520; its original mirror-based rejection remains preserved. Any later use must pin the exact text and attribution rather than silently substitute an official row or reuse its row number.

Whole-source rights cannot be inferred for modified mirror text from an unchanged instruction alone. Prefer exact official instruction/context identities for prospective input; quarantine unresolved differences. Keep all prior mirror-based inventory counts and hashes immutable. Do not transplant row IDs between snapshots. No text is copied into this repository, no prospective input is scored, and no full-Catalog coverage is established.

## Next batch

Read only the pinned full requests needed for neighboring-Topic adjudication and sparse source intake. Exclude unresolved source mappings and uncertain labels from fixture acceptance. Build a coverage/controls plan across all 144 Topics before a new DEV freeze. Retain CIG-02B/C/D unqualified results and the unchanged capability floor. CIG-02 is unfrozen; CIG-03 remains blocked and owner controlled.
