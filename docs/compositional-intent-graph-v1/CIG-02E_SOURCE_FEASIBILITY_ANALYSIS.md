# CIG-02E bounded public source feasibility analysis

## Evidence checked

At main `977666497e86610c130ab91cf3afd26b23df5c2b`, PR #42's source-only queue passed exact-head Actions [run 36113518112](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36113518112), job `108002125705`, and main's required checks passed. The queue uses pinned GitHub bytes from independently published Dolly (human-authored), Alpaca (synthetic), and Self-Instruct (synthetic). It emitted exactly 144 Topic entries. No router prediction, gold row, DEV score, or capability TEST was produced.

Dolly has zero **lexical** hits for 13 Topics. The union of all three sources still has zero lexical hits for family caregiving/support and photo/media archive. Eight Topics have at most three lexical candidates across all sources; 18 have at most ten. These numbers reflect the current public formal names/anchors and the source corpora, not semantic absence. Self-Instruct's own README cautions that 46% of a 200-instruction sample may have quality problems. The deterministic sample in the Actions log is for triage, not representative rate estimation.

A bounded review of the eight sparsest Topics found concrete false positives. The only exact lexical “major purchases” hit asks about a past purchase, while the formal Topic concerns a current high-impact buying decision. “Personal archive” hits article URLs containing an archive path rather than personal record preservation. “Life planning” hits business planning rather than an individual's life stages. “Provenance/history” includes software change-log and revision tasks, which require careful boundary adjudication rather than automatic gold. Broad three-gap discovery also surfaced off-topic family and photo task templates. These examples are identified by source row and instruction hash in the [source result](../../artifacts/compositional-intent-graph-v1/CIG-02E_FULL_CATALOG_SOURCE_FEASIBILITY_RESULT.json) once this report merges; the source text is not copied into the repository.

## Bounded inference

The present generic instruction corpora do not supply **verified** source-separated natural requests across the full 144-Topic Catalog. They overrepresent content transformation, coding, calculation and task templates, while several formal Topics describe personal planning, caregiving or long-term records. Exact formal anchors create both missed paraphrases and irrelevant matches. The current source queue therefore cannot be registered as a full-Catalog DEV fixture, and no capability floor or zero-model architecture claim can be inferred from it. Prior CIG-02B/C/D `DEV_UNQUALIFIED` verdicts remain intact.

This is a source and annotation bottleneck. Adding another broad instruction corpus or relaxing lexical anchors on these observations would repeat the same failure mode. Candidate runtime remains unscored against prospective DEV.

## Next bounded work within the frozen protocol

1. For the 18 Topics with at most ten lexical candidates, seek targeted, independently authored public requests. Prefer human natural requests over generic instruction templates. Record immutable source URL/ref or issue snapshot hash, source author separation, minimal excerpt, license/attribution basis and Topic boundary rationale. Screen out code, logs, credentials, personal identifiers and product bug reports whose goal is not the formal Topic.
2. Independently adjudicate full pinned source rows against formal Topic semantics. Mark `ACCEPT`, `REJECT` or `UNCERTAIN`, with a specific reason and neighboring Topic check. Treat broad/lexical hits as discovery only. Include insufficient-evidence and competing-goal controls from new public sources; do not silently synthesize them from consumed TESTs.
3. Only after every Topic and controls have enough accepted source-separated natural requests, freeze fixture text, gold, candidate, scorer and hashes before a first scored CIG-02E DEV. Preserve original precision, coverage, macro recall, DEFER and context-harm floors. If targeted sourcing cannot meet this requirement, record the source gap explicitly; do not claim CIG-02 freeze or open CIG-03.

No private calibration, legacy evaluation, consumed lockbox, real PAIA archive or PAIA production is used. The production zero-model/local-first/tiny contract is unchanged.
