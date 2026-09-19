# PAIA Semantic Lab v0.3 Remediation — Pre-Implementation Freeze

**Status:** FROZEN  
**Baseline:** v0.2 semantic contract retained  
**Package:** `PAIA-SEMANTIC-LAB-v0.3-REMEDIATION`

## 1. Problem statement

SEM-07 closed the v0.2 experiment with:
- Input retrieval: FAIL;
- full-catalog candidate retrieval: FAIL;
- Personal Semantic Router: FAIL;
- activation quality: INCONCLUSIVE;
- local privacy/isolation engineering: PASS.

The measured failure is not a threshold-edge problem. Candidate Recall@20 was about 0.63–0.70 and Router accepted coverage about 0.029 on the consumed personal lockbox.

v0.3 therefore remediates representation/candidate generation before Router work. It does not lower gates to manufacture a PASS.

## 2. Frozen product semantics inherited from v0.2

The semantic path remains:

```text
Input revision
  -> rebuildable representation
  -> full-catalog Topic candidate retrieval
  -> Personal Semantic Router
  -> ASSIGNED / UNASSIGNED / DEFER
  -> optional activation update
```

The following remain invariant:
- finite versioned Topic Catalog;
- every ACTIVE system Topic and current custom Topic stays classification-eligible;
- ACTIVE/INACTIVE/HIDDEN UserTopicProfile state never gates semantic eligibility;
- AI cannot create a formal Topic;
- clustering remains diagnostic only;
- original Input/revision/provenance is canonical fact;
- calibration/gold is reusable across model changes;
- production PAIA remains outside the write boundary.

## 3. Remediation surfaces that may change

v0.3 may experimentally change, inside Semantic Lab only:
- Input query representation;
- Topic descriptor representation assembled from the existing Topic contract;
- allowed-context composition and context-window representation;
- chunking or multi-vector strategies;
- dense/lexical/alias fusion;
- confusing-neighbor expansion;
- candidate reranking;
- candidate pool width, provided full-catalog eligibility is preserved;
- non-trained Router scoring/evidence logic;
- calibration use and abstention logic.

A representation change must not silently alter Topic semantics. If a failure is caused by an actual catalog-boundary defect, record a `CATALOG_BOUNDARY_BLOCKER`; do not auto-edit the formal catalog.

## 4. Data roles and leakage rules

### Legacy calibration — 80 judgments

May be used for development through family-grouped cross-validation after the executing round explicitly authorizes read-only access to the existing private SEM-06/07 artifacts.

### Legacy evaluation — 13 judgments

May be used for bounded promotion validation. It must not be used for threshold fitting, repeated hyperparameter search or training.

### Consumed SEM-07 lockbox — 35 judgments

It is no longer a lockbox. It may be used in REM-00 only for retrospective failure attribution and later as a named diagnostic reference.

It MUST NOT be used for:
- threshold search;
- model/config ranking;
- early stopping;
- promotion decisions;
- certification;
- a claim of independent generalization.

### Future v0.3 lockbox

A new independent lockbox does not exist at package freeze time.

It may be created only in REM-05 after all remediation code, model revisions, representations, fusion rules, Router policies and thresholds have been frozen.

The new batch must:
- come from an explicitly authorized read-only real snapshot;
- be family-disjoint from every v0.2 gold family;
- be fixed before semantic labels are revealed;
- be model-identity blind during adjudication;
- use no label-adaptive top-up;
- contain no per-model duplicate labeling;
- remain outside Git as private gold.

Target size: 96 fixed cases: 64 representative + 32 challenge. If a predefined stratum cannot be filled from eligible data, the shortfall is recorded rather than compensated after labels are seen.

## 5. Owner attention budget

REM-00 through REM-04 require zero new owner semantic labels.

REM-05 is the only planned owner-semantic round. Clear cases may be adjudicated by ChatGPT only under a fresh explicit owner delegation for that fixed batch. Truly ambiguous Topic-boundary cases are surfaced to the owner.

REM-06 requires zero new labels.

No new owner question is justified merely because a model/config changed.

## 6. Real-data and egress policy

Historical authorizations are not automatically reusable.

- REM-00 may request explicit read-only access to existing private SEM-06/07 artifacts; it may not read the live PAIA archive.
- REM-01 through REM-04 may reuse only explicitly authorized existing private artifacts.
- REM-05 requires fresh explicit authorization for the new read-only snapshot.
- Real Input API egress remains DENY throughout v0.3 unless a future package amendment explicitly names provider, scope and budget.
- Public model weights may be fetched only before private evaluation, at pinned revisions; private evaluation then runs offline.

## 7. Training policy

No classifier, distillation or small-model training is allowed in REM-00 through REM-06.

v0.3 may reassess whether training would later be eligible, but training itself belongs to a separate package.

## 8. Final certification gates

v0.3 does not weaken v0.2 certification.

Input retrieval:
- nDCG@10 >= 0.75;
- Recall@20 >= 0.90;
- exact-term regression <= 0.02.

Full-catalog candidate retrieval:
- Candidate Recall@10 >= 0.96;
- Candidate Recall@20 >= 0.99;
- inactive Topic Recall@20 >= 0.98 when real profile evidence exists;
- active/inactive recall gap <= 0.02 when measurable.

Router:
- macro-F1 >= 0.80;
- accepted precision >= 0.95;
- accepted coverage >= 0.60;
- UNASSIGNED precision >= 0.90 when estimable;
- DEFER recall >= 0.90 when estimable;
- wrong-certain rate <= 0.05;
- user-override violations = 0.

Safety/privacy:
- unauthorized production writes = 0;
- unauthorized real-data egress = 0;
- provenance coverage = 1.0;
- silent truncation violations = 0;
- stale revision/catalog leakage = 0.

A missing class or missing evidence produces INCONCLUSIVE, never an invented PASS.

## 9. Integration rule

Only a capability that independently passes the new REM-06 lockbox may be marked `candidate_for_separate_integration_review`.

v0.3 itself never integrates into PAIA production.
