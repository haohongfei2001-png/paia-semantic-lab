# CIG-02E: source provenance closure and next bounded feasibility

This registration is **metadata only, not gold, a fixture freeze or capability evidence**. Candidate runtime, formal profiles, product limits and frozen research gates are unchanged.

## Fixed HH closure

The [pinned HH README](https://github.com/anthropics/hh-rlhf/blob/c72f5cee8eb7b4d2ea5617657f4430d5e333af07/README.md) describes chosen/rejected preference transcripts and points to collection methods. It does not provide per-root author identity, quote-safe delimiter certification or independent Catalog labels. General human preference provenance cannot close the row-level holds. Keep the fixed 240-root review and lexical false negative intact; do not expand the prefix or alter hints. No assistant response or additional HH corpus text was read in this follow-up.

## Two distinct source families reviewed together

| Source | Verified metadata | Decision |
| --- | --- | --- |
| Taskmaster at d92cb6af3005f1dc09c39e75e7daf4a04905e00b | TM1 distinguishes spoken crowdworker USER turns and self-dialogue authors; six transaction domains. Its 65,748,638-byte self-dialogue file mixes train/dev/test IDs. TM4 is human self-dialogue coffee ordering. Dataset READMEs state CC-BY-4.0. | Hold acquisition. A safe split-specific access path is not established and metadata does not justify broad Catalog coverage. No conversation text read. |
| Natural Instructions at 55a365637381ce7f3748fa2eac7aef1a113bbb82 | Community task definitions, Contributor/Source metadata, official multilingual TRAIN task allowlist. Definitions/metadata Apache-2.0; instances have source-specific licenses. | Register one bounded definition-only feasibility intake. Individual authorship and independent Catalog mapping remain unresolved. |

Sources: [TM1 methodology](https://github.com/google-research-datasets/Taskmaster/blob/d92cb6af3005f1dc09c39e75e7daf4a04905e00b/TM-1-2019/README.md), [TM4 methodology](https://github.com/google-research-datasets/Taskmaster/blob/d92cb6af3005f1dc09c39e75e7daf4a04905e00b/TM-4-2024/README.md), [NI schema/license](https://github.com/allenai/natural-instructions/blob/55a365637381ce7f3748fa2eac7aef1a113bbb82/README.md), [NI split rules](https://github.com/allenai/natural-instructions/blob/55a365637381ce7f3748fa2eac7aef1a113bbb82/splits/README.md).

## Pre-acquisition selection and boundaries

The manifest fixes the first **24** nonempty names, in published order, from `splits/xlingual/train_tasks.txt` (1,270 names; blob `42dfa619f1f4c3be5f5da3546260dc7afdf3acf9`). This track includes several languages; no English-only restriction or Topic-hint selection is imposed. The fetched TRAIN lists contain task names only. Directory listings exposed TEST filenames but no TEST list or task contents were opened.

Before acquisition, implement a bounded top-level streaming extractor in one coherent engineering batch. It must materialize allowlisted task definitions/metadata only, structurally skip Instances and positive/negative examples without decoding their content, enforce source Git identity, train membership and size limits, and fail closed. Synthetic tests must cover nested/escaped skipped content, duplicates, malformed/truncated JSON and limits. No candidate predictions, scores, copied source outputs or model assets.

Task definitions are source excerpts, not complete requests: missing instance input and individual author provenance must remain explicit. A task may involve NLP classification or translation; the subject of its input document is not automatically its goal Topic. No forced unique label, personal-action prerequisite or format-first assignment rule is introduced. Broad coverage and independent gold remain unproven.

This separate registration preserves selection before acquisition; it does not change a frozen capability protocol. Acquire once only after this registration passes exact-head CI and merges. Do bounded feasibility analysis on that fixed result before considering another source. No repeated source trials to chase coverage.

## Remote receipts and research state

PR #66 merged at `70b61a00de48a7ffbb17c460c7793a201f7127b4` after six applicable exact-head checks PASS at `9e16a87769668de8982bfaac50707ad82c243de5`. The new integrity check ran successfully in Actions. One exact-main snapshot recorded **five PASS / one running**, with CSL skipped separately; no completion claim or repeated poll.

PR #65 exact-main is now five applicable checks PASS, with a new final receipt beside its preserved pending observation. Prior observations remain immutable.

Current prospective ledger stays **41 nominations / 35 Topics / 109 missing / 28 unresolved**; accepted fixtures and independent gold remain **zero**. Preserve LSR/CSL FAIL and CIG B/C/D unqualified evidence. CIG-02 is unfrozen; CIG-03 stays blocked and a new independent capability TEST still needs owner authorization.
