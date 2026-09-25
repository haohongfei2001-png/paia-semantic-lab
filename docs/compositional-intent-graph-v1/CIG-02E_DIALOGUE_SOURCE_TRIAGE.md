# CIG-02E pinned dialogue source triage

## Purpose and boundary

The three pinned generic instruction corpora remain source-inadequate for full-Catalog DEV, and the targeted GitHub-issue review yielded no fixture-eligible natural requests. This separate source-only check examines a **dialogue** source for the eight sparsest Topics identified by the [full-Catalog result](../../artifacts/compositional-intent-graph-v1/CIG-02E_FULL_CATALOG_SOURCE_FEASIBILITY_RESULT.json). It is a bounded retrieval experiment to identify human-language candidates and source mismatch. It does not run the CIG router, create gold, score DEV, or open CIG-03.

The public mirror is `diixo/daily-dialogs-dataset` at commit `d74f69c3184b1771f5f92bd06bebffbe42b541bb`, `dataset/dialogues_text.txt` Git blob `22674013988cfca4cf2069f6971ad6b049a9d79d`. The mirror describes DailyDialog as human-written multi-turn dialogue and states CC BY-NC-SA 4.0. Its card leaves initial collection and language-producer provenance unspecified. Those claims and the reuse chain require adjudication before any fixture text is copied; the triage itself copies none.

The script uses only the eight Topics' existing public formal names and anchors. It counts deduplicated dialogue turns with lexical phrase boundaries and prints at most three short deterministic excerpts per Topic to Actions logs for source review. The artifact holds only counts, row/turn IDs, and SHA-256 digests. A hit can be a scripted exchange, background mention, advice rather than a current goal, or the wrong Topic. Zero hits cannot prove semantic absence. Dialogue context and source licensing must be checked before accepting any row. No runtime phrase, threshold, protocol, or capability floor is changed.

## Adjudication after the source-only run

Review full pinned turns and surrounding dialogue for the current goal, neighboring Topic competition, authorship, personal identifiers, and reuse rights. Reject scripted or background-only turns. This source cannot by itself establish coverage across all 144 Topics or the required DEFER/ambiguity controls. Continue independent natural-request sourcing for the other sparse Topics. The candidate remains unscored against prospective DEV; CIG-02 stays unfrozen and CIG-03 blocked.
