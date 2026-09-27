# CIG-02E bounded public corpus root intake

Classification: **PUBLIC_TRAIN_SOURCE_DISCOVERY_NOT_GOLD_OR_CAPABILITY**.

## Two candidates, pinned metadata

- [OpenAssistant](https://github.com/LAION-AI/Open-Assistant/tree/f1e6ed9526f5817531f3ab85441a40b3671ddccb): README describes crowdsourced collection and directs released data to an external host. The reviewed GitHub tree includes manual evaluation/prompt files; **none are opened or used**. A released train corpus is not registered from this repository. Its Apache software license alone is not substituted for a released corpus data license.
- [HH-RLHF](https://github.com/anthropics/hh-rlhf/tree/c72f5cee8eb7b4d2ea5617657f4430d5e333af07): README describes helpfulness/harmlessness preference pairs and references collection details. Root MIT notice is pinned and preserved. The helper train files are Git LFS pointers, so no external LFS/HuggingFace acquisition is attempted. The directly stored harmless-base TRAIN blob is registered for a bounded source-only pass.

GitHub is the only acquisition channel. No model is downloaded, run or used to infer labels. Upstream model-generated assistant content exists in the paired transcript encoding but is excluded from intent interpretation and output. This is an upstream-format source observation, not a claim that all role-prefixed text has independently verified human authorship.

## Fixed acquisition and selection

Registered source: `harmless-base/train.jsonl.gz`, commit `c72f5cee8eb7b4d2ea5617657f4430d5e333af07`, compressed Git blob `df7c90b1bbd6093bda9c996e8aab9a46fa557dcf`, 13,197,306 bytes.

One PR-head Actions job downloads that exact GitHub object, verifies Git blob SHA-1 including its blob header and byte count, and parses **only the first 240 train pairs**. No upstream TEST file, red-team file, model-evaluation bank or held-out capability set is read.

Only the first Human-prefixed segment may be emitted, and it must agree byte-for-byte between chosen and rejected branches. Preserve source whitespace. Missing role boundaries, nested Human markers, empty roots, branch mismatch and roots longer than 4,000 characters are rejected; there is no truncation or source rewriting. Later conversation turns are excluded because they may depend on assistant responses.

Six registered sparse-Topic retrieval hints select at most three records per Topic, deduplicated by exact root text. Hints are retrieval metadata: `nominated_topic` stays null and `accepted_gold` false. They do not implement a scorer or infer a unique label.

Delimiter-encoded transcripts can include quoted role markers, so an extracted root is **not certified to be a complete natural instruction**. Each future nominee requires full source-format/goal/provenance review before any fixture use. Preference data is not representative PAIA evidence. The harmlessness tranche has selection bias and may supply no useful sparse-Topic inputs; this outcome must be retained.

## Evidence and resource boundary

The source pass emits identities, rejection counts and only selected extracted roots to a source-only Actions artifact/log, together with the full MIT notice. Download limit is 20 MB, decompressed limit 128 MiB, request timeout 30 seconds and job timeout three minutes. These are research tooling resources; no corpus or network dependency ships in the router.

The source download job runs only on relevant PR paths. It is not repeated automatically on merged main; main's normal engineering CI still applies. Superseded PR runs are cancelled. No full capability certification is added.

## Verification and receipts

Three targeted synthetic engineering tests check source-whitespace preservation and assistant/continuation exclusion, paired-root inconsistency and malformed boundaries, and bounded/deduplicated retrieval without gold promotion. Pre-push connector-side execution passed all three; actual Node execution and the pinned source read belong to GitHub Actions.

PR #62 exact-main now has all six applicable CI successes; its completed receipt preserves the earlier pending observation. PR #63 merged after six exact-head successes. Its single exact-main snapshot has five applicable successes and one running job, recorded as PENDING.

## Next action

Inspect the one fixed source-only artifact after CI, preserving any zero-hit result and role/authorship limitations. Do not expand the prefix repeatedly to chase coverage. Complete #63 main receipt in a substantive follow-up once CI finishes. Current prospective accounting remains 35 Topics / 109 missing / zero gold. CIG-02 is unfrozen, CIG-03 blocked; no new score, capability TEST or product/protocol change.
