# PAIA Semantic Lab v0.3 Remediation — Development Plan

## Sequencing principle

The package is ordered by causal dependency:

1. attribute the v0.2 failures;
2. repair representation and candidate retrieval;
3. freeze candidate generation;
4. repair Router behavior only after candidate generation is good enough;
5. freeze all remediation configuration;
6. create a new independent lockbox;
7. certify once.

No later stage may compensate for an earlier failed stage by lowering downstream gates.

## REM-00 — Legacy failure attribution and remediation hypotheses

Read-only analysis of committed SEM-07 aggregate evidence and, only under explicit authorization, existing private SEM-06/07 gold/predictions.

Outputs:
- per-case failure taxonomy;
- cross-model failure matrix;
- candidate-vs-Router attribution;
- context-dependent failure audit;
- catalog-boundary/evidence-gap queue;
- remediation hypothesis register.

No model/config/threshold/catalog changes. No live archive read. No new labels.

## REM-01 — Diagnostic harness and representation probes

Build deterministic tooling for:
- oracle candidate attribution;
- Topic descriptor variants derived only from existing catalog fields;
- Input/context representation probes;
- chunk/multi-vector diagnostics;
- dense vs lexical/alias/fusion contribution;
- latency/memory/truncation measurements.

Use legacy calibration only through family-grouped development folds. The consumed SEM-07 lockbox is not consulted for config selection.

No owner labels and no Router remediation yet.

## REM-02 — Representation and retrieval bake-off

Evaluate pinned local embedding configurations plus allowed representation strategies.

Promotion evidence:
- family-grouped results on legacy calibration;
- one bounded read of legacy evaluation;
- public/synthetic long/short/multilingual fixtures;
- resource/privacy/reproducibility evidence.

API models remain synthetic/public only unless the package is explicitly amended.

## REM-03 — Full-catalog candidate remediation and freeze

Implement bounded candidate-generation changes selected from REM-01/02 evidence:
- context-aware query representation;
- Topic descriptor composition;
- fusion/reranking;
- candidate-width changes;
- confusing-neighbor handling;
- multi-vector/chunk aggregation.

Before REM-04 can become READY, at least one frozen candidate configuration must meet the original full-catalog candidate thresholds on legacy promotion evidence without hidden slice regressions.

If no candidate configuration clears that promotion gate, REM-03 closes with capability FAIL and REM-04 remains BLOCKED. Do not spend Router work on an unresolved candidate bottleneck.

## REM-03A — Calibration-prototype candidate remediation amendment

Runs only because REM-03 closed COMPLETE/FAIL without meeting the frozen candidate gates.

Adds one bounded, non-trained candidate evidence source: reusable calibration exemplar/prototype retrieval. Existing catalog/alias/domain candidate lanes remain available and full-catalog eligibility remains invariant.

Development uses legacy calibration through family-grouped folds with strict leakage isolation: held-out families contribute zero exemplars/prototypes to their own fold. Allowed prototype aggregation is bounded to exemplar-max, centroid and one deterministic hybrid.

If no frozen configuration reaches Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 on family-grouped calibration without critical-slice failure, REM-03A closes capability FAIL and REM-04 remains BLOCKED.

Only after calibration PASS may one frozen configuration rebuild prototypes from all 80 calibration judgments and consume the 13-case legacy evaluation set once. The same .96/.99 gates apply. No post-evaluation reselection or threshold changes are permitted.

The consumed 35-case SEM-07 lockbox remains forbidden for tuning/promotion.

## REM-03B — Structured Domain-backoff candidate remediation amendment

Runs only because REM-03A closed COMPLETE/FAIL without meeting the original candidate gates.

REM-03B suppresses non-discriminative catalog boilerplate and uses only existing catalog facts as retrieval anchors: names/aliases, domain-name + Topic-name paths, and residual formal-field text only when it survives a corpus-level discriminativeness audit.

Calibration evidence may derive Domain exemplar votes, Domain centroids, or one deterministic hybrid under family-grouped leakage isolation. Because every current system Domain contains exactly 8 Topics, a top Domain may provide complete Topic coverage within top-10, and a second Domain may provide complete coverage within top-20. This is a bounded recall backoff for zero-prototype Topics; Domain IDs are never assignment targets.

The development matrix is capped at 12 pre-frozen configurations. No generated synonym, invented representative example, formal catalog edit, model training, learned reranker or post-result matrix expansion is allowed.

If no frozen configuration reaches Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 on calibration with all critical slices passing, REM-03B closes COMPLETE/FAIL and the 13-case legacy evaluation remains unopened. A failure after Domain recovery escalates to catalog semantic-information review rather than another retrieval-weight search.

## REM-04 — Router remediation and pre-lockbox freeze

Runs only after the latest candidate-remediation prerequisite (currently REM-03B) has a frozen candidate configuration that passed promotion.

May change non-trained Router scoring, evidence aggregation, calibration use and abstention logic. Development uses legacy calibration; legacy evaluation is bounded promotion evidence.

At REM-04 close:
- all model revisions are pinned;
- candidate configuration is immutable;
- Router configuration/thresholds are immutable;
- code and evaluation schemas are committed;
- no new semantic labels have been requested;
- a complete pre-lockbox manifest is frozen.

UNASSIGNED/DEFER classes absent or too sparse in legacy personal gold remain explicitly INCONCLUSIVE until the new lockbox.

## REM-05 — New independent personal lockbox construction

Requires a fresh explicit authorization for a read-only PAIA snapshot.

Automatically select a fixed 96-case batch before labels:
- 64 representative cases;
- 32 challenge cases;
- all families disjoint from every v0.2 gold family;
- no label-adaptive top-up.

After the batch is fixed, obtain one reusable semantic adjudication pass. Config/code changes are forbidden once labeling starts.

If a genuinely new catalog-boundary defect appears, record it as a blocker. Do not repair the catalog or remediation model after seeing lockbox labels.

The new gold remains private and outside Git. Only hashes, counts and provenance metadata may be committed.

## REM-06 — Frozen certification

Consume the REM-05 lockbox with the exact REM-04 frozen configuration.

Produce:
- per-capability PASS/FAIL/INCONCLUSIVE;
- critical-slice results;
- confidence intervals;
- Pareto/resource report;
- reproducibility evidence;
- owner-attention audit;
- integration-eligibility matrix;
- updated small-model eligibility assessment.

No new labels, threshold changes, model selection, catalog edits, training or production integration.

Execution may be COMPLETE even when capability verdict is FAIL.