# CIG-02E source adjudication ledger

The [ledger](../../artifacts/compositional-intent-graph-v1/CIG-02E_ADJUDICATION_LEDGER.json) consolidates the five existing human-source intake batches across the full 144-Topic Catalog at main `a197c7fd892bf94978e9d49de119ee287a2e3061`. It contains **79 nomination records / 76 source row IDs**: 36 base prospective nominations, one separately preserved JVM-log follow-up, and 42 uncertain nominations (30 neighboring-Topic boundaries, 12 task-versus-Topic boundaries). This is a source review work queue, not an accepted fixture, independently adjudicated gold or a capability result.

Every entry retains its manifest path, historical decision/reason, instruction hash and exact official input row mapping. Cross-Topic nominations are exposed as historical nominations, not alternative gold labels: 17 entries have another Catalog nomination for the same source row. Three selected source IDs map to duplicate official inputs: dolly:5021 has two positions, dolly:3382 three, and dolly:6670 two. Neither row IDs nor repeated nominations establish independent language units. Full instruction/context pair digests still require registration before fixture acceptance; this consolidation does not silently claim that those digests already exist.

## Review sequence

1. Recheck fixed full instruction/context identities against the pinned mirror and official source blobs. Preserve quarantines; never replace a mismatched input.
2. Review ordinary source boundaries against the current formal profiles using the actual requested goal, means and background. Preserve original decisions and record any follow-up separately. Generic knowledge requests are not automatically rejected: profile eligibility and competing interpretations must be checked.
3. Obtain independent gold adjudication without exposing candidate predictions. Source authorship independence and annotation independence are separate requirements. Developer annotations remain non-gold.
4. Deduplicate input pairs and separate source units before any split. Repeated official positions, Wikipedia-derived context and shared source membership cannot be counted as independent coverage.
5. Continue bounded sourcing for the **111 Topics without a prospective human candidate** and register natural DEFER/context controls. The 33-Topic prospective snapshot is unchanged.
6. Register and freeze source, gold, candidate and scorer readiness before a new diagnostic. CIG-03 and any new independent capability TEST remain outside this work.

The 26 synthetic follow-up decisions remain in their separate [review](CIG-02E_SYNTHETIC_FULL_INPUT_REVIEW.md). Its 11 diagnostic candidates do not enter the human count. Rejected and quarantined records remain in the unchanged historical matrix/manifests.

The [integrity checker](../../scripts/cig02e_adjudication_ledger.mjs) deterministically reconstructs this ledger from committed source annotations and verifies exact selection, hashes, mappings and historical decisions. It reads repository evidence only: no corpus download, lexical scan, router predictions or scores. The existing lightweight matrix workflow runs it in the same job. No new heavy certification is added.

PR #56 exact-head and exact-main six applicable checks passed. Its [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_SYNTHETIC_REVIEW_MERGED_MAIN_RECEIPT.json) records immutable identities. Product constraints and prior FAIL/unqualified outcomes remain unchanged. Accepted fixture/gold rows: 0. CIG-02 unfrozen; CIG-03 blocked.
