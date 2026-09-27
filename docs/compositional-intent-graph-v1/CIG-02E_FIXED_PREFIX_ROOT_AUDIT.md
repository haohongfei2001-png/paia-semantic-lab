# CIG-02E fixed-prefix root observability audit

Classification: **SOURCE_OBSERVABILITY_ENGINEERING_NOT_CAPABILITY**.

## Observed result, preserved

The [PR #64 source job](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36321379541/job/108625749154) passed three targeted Node tests and verified the fixed compressed TRAIN Git blob. It inspected 240 paired records, extracted 240 shared first Human segments, found 236 distinct root texts, and produced **zero matches for all six registered retrieval hints**. No root rejection occurred. Artifact ID: 10931753550; zip SHA-256: `84c013e1aab46e0df821671de9c5ff30e6f804440ca55bfbe85c64c04c35635a`.

The committed observation is copied from the exact job log, with associated PR head and actual merge-ref checkout recorded separately. It contains no request text because the original producer retained only matching roots. Engineering CI success does not establish capability PASS; the zero-hint result is not a router FAIL and proves neither source absence nor full natural-Topic feasibility.

## Bounded root cause

A source retrieval pass cannot be audited for false negatives if the evidence artifact discards every nonmatching source. The lexical hints are a heuristic discovery filter. Zero hint matches alone does not distinguish unrelated source content from relevant wording outside those hints. The missing inventory is the concrete engineering defect; repeatedly extending the prefix or widening hints would not repair its auditability.

## One coherent instrumentation batch

Retain all 240 extracted roots (including duplicate texts under their distinct source-row IDs) in the source-only result artifact, with exact instruction hashes, null nominated Topic, false full-instruction certification and false accepted-gold flags. Do not retain or emit assistant answers or subsequent conversation turns.

The source blob, 240-pair prefix, extraction rules, six hints and per-Topic selection caps stay identical. The new job compares the original source/count/selection fields against the preserved observation; any difference fails closed. A complete inventory guard rejects invalid/out-of-order/duplicate row IDs, stale hashes, count mismatches and fixture/gold promotion. It retains role-delimiter and author-provenance limitations.

The follow-up needs one new instrumented-source execution because the earlier artifact omitted the nonmatching roots. It does not rerun the completed #64 job, enlarge the corpus, certify a superseded head, change scoring or repair on a consumed TEST. The PR workflow now checks out the literal PR head; source download still does not run automatically on main.

## Verification and continuation

Four targeted synthetic engineering tests passed before push: original boundary, whitespace/assistant exclusion and bounded retrieval tests, plus inventory integrity and rejection cases. Actual Node/instrumented-source validation belongs to Actions.

#63 exact-main now has six applicable CI successes; the receipt supersedes its earlier pending observation. #64 merged after six applicable exact-head successes. A single #64 exact-main snapshot has four applicable successes and one running job; the observation records PENDING (five applicable main checks, with no repeated source download).

Next inspect the complete fixed inventory once, preserving source/role uncertainty and distinguishing explicit goals, means and background. Do not relabel the six Topic gaps from hint statistics. Current prospective accounting stays 35 Topics / 109 missing / zero gold. No score, fixture freeze, capability TEST, production access or product/protocol change; CIG-02 unfrozen, CIG-03 blocked.
