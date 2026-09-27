# CIG-02E fixed ledger input identity verification

This coherent engineering batch implements identity verification for the existing **79 human-source nominations / 76 fixed source row IDs**, including the JVM-log follow-up. The selection is the immutable [adjudication ledger](../../artifacts/compositional-intent-graph-v1/CIG-02E_ADJUDICATION_LEDGER.json) introduced by #57 at main `690f7d539c9ad8b871934123f9561d71d6f5e7f9`. No new source nomination, semantic boundary decision, candidate prediction, gold label or score is produced.

The [verifier](../../scripts/cig02e_ledger_input_identity.mjs) matches exact decoded instruction/context pairs against the pinned official Dolly snapshot, checks queue instruction hashes and historical official mappings, and emits instruction/context/pair hashes. Official row numbers are equality mappings, never positional identity assumptions. Response and category fields are unused. No normalized or instruction-only fallback is allowed; mismatches fail closed with no replacement. Existing quarantines remain excluded.

The [targeted workflow](../../.github/workflows/cig02e-ledger-input-identities.yml) fetches each immutable GitHub blob once, checks Git blob identity, runs three engineering edge-case tests, then verifies only the fixed selection. It is bounded to three minutes and cancels superseded heads. No Catalog lexical retrieval or router evaluation is performed. The tests use artificial identity records and cover changed context/whitespace, shifted/duplicate inputs, differing responses, malformed selection/schema and changed instruction hashes; they are not a capability TEST.

The result is an Actions artifact and structured job-log JSON containing hashes and mappings, without copying source input text. It groups selected nominations by full input-pair hash and reports distinct pairs. Duplicate official positions, repeated source IDs, and independently distinct input pairs are three different concepts: input identity is not evidence of independent authorship or independent gold. Counts are observed by CI rather than guessed before execution. The artifact binds its source bytes and ledger bytes with SHA-256.

## Immutable sources

- Mirror: buayism/dolly-15k-dataset, commit `6d7ebf384c5e588ee1b0dff816557489bc16089c`, blob `7c507d16b055ae32107a6dd0585779678565dcd2`, 15,011 rows.
- Official: databrickslabs/dolly, commit `2305eb7f2f4b3beb2379f34c6addf335b46c4b43`, blob `9b0b912c478e7ccd61ce741ebb409ddf8c7c22e6`, 15,014 rows.

Reuse basis and contributor/Wikipedia attribution remain in the existing [provenance report](CIG-02E_DOLLY_PROVENANCE.md). No rights are inferred for mismatched mirror text. No source text is added to the repository.

PR #57 exact-head and exact-main six applicable checks passed; its [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_ADJUDICATION_LEDGER_MERGED_MAIN_RECEIPT.json) records job identities. This new verifier has no claimed PASS until its own exact-head Actions result is inspected.

Next preserve the verified pair identities in a separate follow-up evidence record alongside ordinary Topic/task boundary review under current profiles. Retain all original annotations and independent gold requirements. The 111 missing natural Topics and unregistered natural DEFER/context controls remain explicit. Accepted fixture/gold: 0; CIG-02 unfrozen; CIG-03 blocked. Prior genuine FAIL and DEV_UNQUALIFIED results and zero-model/local-first/tiny constraints are unchanged.
