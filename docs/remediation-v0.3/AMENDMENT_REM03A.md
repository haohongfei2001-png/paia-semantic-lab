# PAIA Semantic Lab v0.3 Remediation — Candidate Remediation Amendment REM-03A

**Status:** PLAN ONLY / FROZEN AMENDMENT  
**Package:** PAIA-SEMANTIC-LAB-v0.3-REMEDIATION  
**Trigger:** REM-03 execution COMPLETE with candidate capability FAIL  
**Scope:** candidate-generation remediation only

## 1. Why this amendment exists

REM-03 preserved the frozen architecture and engineering invariants, but the frozen candidate policy failed private calibration by a large margin:

- Candidate topic Recall@10 = 0.391875 vs required 0.96;
- Candidate topic Recall@20 = 0.566875 vs required 0.99;
- context-dependent and context-free critical slices both failed;
- the 13-case legacy evaluation set was not opened;
- REM-04 is therefore blocked.

Public structural success did not transfer into personalized full-catalog candidate recall. The current catalog also provides weak discriminative semantic descriptor text: after Topic names/aliases are removed, the current definition/inclusion/example text collapses to a common template.

A new candidate-remediation mechanism is required before Router work.

## 2. Non-change declaration

This amendment does **not** change:

- finite versioned Topic Catalog semantics;
- full-catalog Topic eligibility;
- ACTIVE/INACTIVE separation;
- ASSIGNED / UNASSIGNED / DEFER semantics;
- prohibition on AI-created formal Topics;
- production-isolation boundary;
- no-training rule;
- no real Input API egress;
- final Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 gates;
- consumed 35-case SEM-07 lockbox role (LEGACY_DIAGNOSTIC_ONLY).

REM-04 remains blocked until REM-03A candidate promotion passes.

## 3. New round: REM-03A

REM-03A introduces one new bounded remediation surface:

**non-trained reusable calibration exemplar/prototype retrieval**.

Existing user-confirmed calibration judgments may be used as retrieval exemplars. Their embeddings and prototype derivatives are rebuildable private artifacts, not formal Topic semantics.

Allowed candidate lanes:

1. existing frozen catalog lane from REM-03;
2. exact/contained alias evidence;
3. existing domain scaffold and declared-neighbor safety mechanisms;
4. calibration exemplar maximum-similarity lane;
5. per-Topic calibration centroid lane;
6. one bounded hybrid of exemplar + centroid scores.

No other new retrieval family is authorized by this amendment.

## 4. Leakage and family isolation

Development uses only the existing 80 legacy calibration judgments and requires family-grouped evaluation.

For every held-out development fold:

- no Input from a held-out family may contribute to any prototype/exemplar used to rank that fold;
- per-Topic exemplars are constructed only from training-fold calibration cases;
- Topics with zero prototype support remain fully eligible through the catalog lane;
- prototype support may add evidence but may never gate a Topic out of the full catalog.

After one configuration is selected from family-grouped calibration, the configuration is frozen. Only then may prototypes be rebuilt from all 80 calibration judgments for one bounded 13-case legacy-evaluation promotion pass.

The 13 evaluation labels may not feed configuration selection, prototype-shape selection, threshold fitting, early stopping, or reranking design.

## 5. Bounded configuration search

REM-03A may compare only a small frozen matrix across:

- prototype aggregation: exemplar_max, centroid, hybrid;
- prototype/catalog fusion: bounded deterministic RRF or weighted score fusion with weights frozen before each family-grouped comparison;
- query representation: current-only vs canonical allowed-context representation already defined by the package.

The matrix must be frozen before private calibration metrics are opened for REM-03A execution.

No model training, gradient fitting, learned reranker, classifier, distillation, or evaluation-adaptive search is permitted.

## 6. Candidate invariants

Every configuration must preserve:

- all ACTIVE System Topics eligible;
- current non-deprecated custom Topics eligible;
- activity state cannot gate or reorder the invariant top-20 prefix;
- automatic formal Topic creation = 0;
- custom Topic safety lane;
- stale revision/catalog guards;
- no silent truncation.

Prototype derivatives are private rebuildable state and must never be committed to Git.

## 7. Promotion sequence

### Development gate — legacy calibration

Use family-grouped calibration only.

A configuration may be frozen for promotion only if:

- Candidate topic Recall@10 >= 0.96;
- Candidate topic Recall@20 >= 0.99;
- measurable critical slices do not fail the same thresholds;
- structural invariants pass;
- no leakage is detected.

If no configuration passes calibration, REM-03A closes COMPLETE / FAIL. The 13-case evaluation set remains unopened.

### Bounded promotion gate — legacy evaluation

Only after calibration PASS:

- freeze model revision, query representation, prototype aggregation, fusion, candidate width and all deterministic constants;
- rebuild private prototypes from all 80 calibration judgments;
- consume the 13-case legacy evaluation set once;
- require Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99;
- prohibit post-evaluation reselection or threshold changes.

If evaluation fails, REM-03A closes COMPLETE / FAIL.

If evaluation passes and all structural guards pass, REM-03A closes COMPLETE / PASS and REM-04 may become READY.

## 8. Private-data and owner-attention rules

REM-03A:

- requires fresh explicit round authorization before execution;
- requires fresh explicit authorization to read existing private SEM-06/07 artifacts;
- reads no live PAIA archive;
- sends no real Input to APIs;
- requests zero new owner labels;
- performs zero model training;
- performs zero production writes;
- never uses the consumed 35-case SEM-07 lockbox for tuning/promotion.

## 9. Git evidence policy

Git may contain only:

- amendment/config hashes;
- counts;
- aggregate metrics;
- family-fold aggregate evidence;
- deterministic ranking/provenance digests;
- resource and privacy audits;
- closure receipts.

Git must not contain:

- raw private Input text;
- Input refs;
- family refs;
- calibration IDs;
- per-case truth Topics;
- private embeddings;
- exemplar vectors;
- Topic prototypes derived from private Inputs.

## 10. Sequencing consequence

The amended sequence is:

REM-03 COMPLETE/FAIL  
→ REM-03A READY / NOT AUTHORIZED  
→ REM-04 only if REM-03A COMPLETE/PASS  
→ REM-05  
→ REM-06

This amendment does not authorize REM-03A execution by itself.
