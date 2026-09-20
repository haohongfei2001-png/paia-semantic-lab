# PAIA Semantic Lab v0.3 Remediation — Structured Candidate Amendment REM-03B

**Status:** PLAN ONLY / FROZEN AMENDMENT
**Package:** PAIA-SEMANTIC-LAB-v0.3-REMEDIATION
**Trigger:** REM-03A COMPLETE / FAIL
**Scope:** candidate-generation remediation only

## 1. Evidence forcing this amendment

REM-03A improved family-grouped candidate recall, but its best frozen configuration reached only:
- Candidate Recall@10 = 0.743542 vs required 0.96;
- Candidate Recall@20 = 0.856875 vs required 0.99;
- context-dependent Recall@10/@20 = 0.805556 / 0.916667;
- context-free Recall@10/@20 = 0.732598 / 0.846324.

Zero of 12 frozen REM-03A configurations passed, so the 13-case legacy evaluation set remains unopened.

A public catalog audit also shows that after replacing each Topic name with a placeholder:
- all 144 definitions collapse to one template;
- all 144 inclusion boundaries collapse to one template;
- all 144 representative examples collapse to one template;
- the 288 exclusion boundaries collapse to two templates;
- each Topic has only one zh alias and one en alias;
- confusing-neighbor edges = 0.

This means further weighting of the same concatenated descriptor cannot be treated as a credible primary remediation. The discriminative signal is concentrated in Topic names/aliases, domain membership, and reusable personal calibration evidence.

## 2. Non-change declaration

REM-03B does not alter formal Topic semantics or edit the Topic Catalog. It preserves:
- the finite versioned catalog;
- full-catalog eligibility;
- ACTIVE/INACTIVE separation;
- ASSIGNED / UNASSIGNED / DEFER semantics;
- prohibition on automatic formal Topic creation;
- the no-training rule;
- the production-isolation boundary;
- no real Input API egress;
- Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99;
- the consumed 35-case SEM-07 lockbox as diagnostic-only.

Derived anchors, domain prototypes and ranking state are rebuildable representations, never formal Topic definitions.

## 3. New round: REM-03B

REM-03B introduces a structured candidate generator with three bounded mechanisms.

### A. Discriminative multi-anchor Topic representation

The representation may use only existing catalog facts:
1. Topic zh/en names and aliases as independent anchors;
2. domain-name + Topic-name path anchors;
3. residual formal-field text only when a corpus-level discriminativeness audit shows it is not shared boilerplate.

Common template text must be suppressed rather than embedded repeatedly. No generated synonym, invented example, inferred boundary or AI-authored semantic expansion is permitted in REM-03B.

### B. Calibration-derived Domain evidence

Within each family-grouped development fold, training-fold calibration cases may create non-trained Domain evidence:
- Domain exemplar vote;
- Domain centroid;
- one deterministic hybrid.

A held-out family contributes zero vectors, exemplars or votes to its own fold.

Topic-level prototypes from REM-03A remain usable, but Topics with no direct prototype support must not be disadvantaged solely for lacking calibration examples.

### C. Domain-to-Topic coverage backoff

The catalog has exactly 18 domains with 8 Topics each. REM-03B may use this structural fact as a recall backoff:
- strong direct alias/topic evidence remains first-class;
- a top-ranked Domain may place all 8 of its eligible Topics inside the top-10 budget;
- a second Domain may place its eligible Topics inside the top-20 budget;
- remaining slots are filled by direct catalog/topic-prototype evidence;
- Domain IDs are never returned as assignment targets.

This lane exists specifically to recover zero-prototype Topics while preserving full-catalog eligibility.

## 4. Frozen bounded development matrix

Before private calibration metrics are opened, execution must freeze a small matrix across:
- query representation: current_only vs allowed_context;
- Domain evidence: exemplar_vote vs centroid vs hybrid;
- anchor mode: names_aliases vs names_aliases_plus_domain_path.

Maximum matrix size: 12 configurations.

Candidate lane ordering, top-10/top-20 slot budgets, RRF constants and any score weights must be frozen before private metrics. No post-result matrix expansion is allowed.

## 5. Promotion and leakage rules

Development uses only the existing 80 legacy calibration judgments through family-grouped out-of-fold evaluation.

A configuration may be frozen for promotion only if:
- Candidate Recall@10 >= 0.96;
- Candidate Recall@20 >= 0.99;
- measurable critical slices meet the same thresholds;
- held-out-family leakage events = 0;
- full-catalog eligibility and activity-state invariance pass;
- custom Topic safety passes;
- automatic Topic creation = 0.

Only after calibration PASS may the frozen configuration read the 13-case legacy evaluation set once. Evaluation must meet the same 0.96 / 0.99 thresholds. No reselection or threshold changes are allowed afterward.

If calibration fails, REM-03B closes COMPLETE / FAIL without opening evaluation. If evaluation passes, REM-03B closes COMPLETE / PASS and REM-04 may become READY.

## 6. Catalog-quality escalation rule

If REM-03B fails despite successful Domain recovery, the package must treat the remaining problem as a catalog semantic-information deficiency rather than continue retrieval weight search.

At that point, formal catalog enrichment or owner-reviewed derived semantic anchors require a separate architecture/catalog package. REM-03B itself may not silently invent those semantics.

## 7. Data, privacy and owner-attention rules

REM-03B requires a fresh explicit execution authorization before reading private artifacts. During execution:
- legacy calibration may be reused read-only;
- legacy evaluation is bounded and conditional on calibration PASS;
- the consumed SEM-07 lockbox is forbidden for tuning/promotion;
- live PAIA archive read = DENY;
- real Input API egress = DENY;
- new owner labels = 0;
- model training = 0;
- production writes = 0.

## 8. Sequencing consequence

REM-03A COMPLETE/FAIL
→ REM-03B READY / NOT AUTHORIZED
→ REM-04 only if REM-03B COMPLETE/PASS
→ REM-05
→ REM-06

This amendment freezes a legal next round; it does not authorize REM-03B execution by itself.