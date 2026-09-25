# CIG-02E bounded source bottleneck analysis

## Evidence and scope

The CIG-02E runtime has typed frames for all 144 public Topics but is still unscored against a qualifying, source-separated full-Catalog DEV. Earlier CIG-02B/C/D diagnostics remain `DEV_UNQUALIFIED`. The source work reviewed here cannot change those verdicts.

- Pinned Dolly, Alpaca and Self-Instruct instruction sources yielded two Topics with zero lexical candidates across all three and 18 Topics with at most ten lexical candidates. The selected sparse hits included past purchases, article archive URLs and business planning that did not establish the formal personal goals. See the [source feasibility analysis](./CIG-02E_SOURCE_FEASIBILITY_ANALYSIS.md).
- A bounded review of nine public GitHub issues across five sparse Topics accepted **zero** fixture rows. Caregiving and photo-archive contexts generally explained a requested software feature or technical fix; the whole request had a different goal. See the [issue adjudication](./CIG-02E_TARGETED_ISSUE_SOURCE_ADJUDICATION.md).
- The [pinned DailyDialog source triage](./CIG-02E_DIALOGUE_SOURCE_TRIAGE.md) verified the GitHub blob and scanned 13,118 dialogues, 102,980 turns and 79,488 distinct normalized turns. It found **zero lexical matches** against the existing formal names and anchors for each of the eight selected sparse Topics on exact-head Actions [run 36162118754](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36162118754), job `108160960318`. Its merged-main job also passed. These are exact-anchor retrieval counts, not semantic labels; no claim of absent Topic requests follows.

These are different source classes with the same practical intake failure: generic instruction corpora favor transform/code tasks, repository issues ask for software changes, and dialogue turns need not encode a direct user goal in the Catalog's formal wording. The current evidence does **not** isolate whether any zero-hit Topic lacks semantic examples in DailyDialog, because no independent semantic annotation of those turns was performed. It also does not establish runtime capability or impossibility of a zero-model router.

## Information bottleneck

The immediate bottleneck is a **verified request-to-Topic mapping**, not another runtime threshold. For a qualifying full-Catalog DEV, each row needs a genuine current goal, independent source authorship, stable text provenance and reuse basis, a formal Topic boundary decision, and ambiguity/insufficient-evidence controls. A word match alone answers none of those questions. Mining issue motivation as if it were the requested goal would contaminate gold. Treating a scripted conversation or synthetic template as independently observed natural expression would overstate source separation.

The exact-anchor search is useful as a cheap discovery filter but is visibly underinclusive for natural dialogue and overinclusive for multi-goal technical text. Repeating it on another broad corpus would produce another count without resolving annotation and rights. Changing formal anchors or runtime behavior in response to these source-only zeros would be premature; changing thresholds on consumed CIG-02B/C/D DEV is prohibited. No capability floor is relaxed.

## Source intake gate for the next batch

Before another large source scan or any scored DEV, record for each proposed **source family**:

1. A stable public GitHub commit/blob or equivalent immutable snapshot, provenance of the language producers, and a clear reuse/attribution basis for the actual text. A mirror's license statement without the underlying chain remains provisional.
2. Evidence that its primary items are independent **direct requests**, rather than generated instructions, software feature tickets, bug reports, dialogue background, or role-play. Evaluate the full request and neighboring Topic, not a clipped phrase.
3. A bounded manual pilot on sparse personal Topics and on common technical Topics, with `ACCEPT`, `REJECT` or `UNCERTAIN` reasons. Record whether the source can contribute unambiguous goals and new DEFER/competing-goal controls. Do not promote lexical retrieval counts to coverage.
4. A coverage plan across all 144 Topics with more than one independent expression per Topic where the frozen CIG-03 protocol will later require it. If several source families are needed, keep family separation visible. A narrow corpus cannot certify Topic macro recall.

Only sources passing this intake gate should enter fixture construction. Freeze text, gold, candidate, scorer and hashes before the first CIG-02E score. If this cannot be assembled, record CIG-02 source insufficiency honestly rather than freeze an unqualified candidate or start CIG-03. The zero-model/local-first/tiny contract, earlier genuine FAILs and all evidence-access prohibitions remain unchanged.
