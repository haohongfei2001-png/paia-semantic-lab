# ZMR-01B independent data readiness checkpoint

Batch `ZMR-01B-INTAKE-20260929`; expected remote main `b9d93e17663a1145dc30863084c21eca073adc1a`. Scope is annotation and intake qualification preparation, not architecture competition. ZMR-01A PR92 has exact-head ZMR/evidence-scope PASS and exact-main ZMR/evidence-scope PASS; receipt is on PR92. No semantic dataset or Router candidate was created.

## Catalog audit before authoring

The fixed Catalog has 144 ACTIVE Topics in 18 domains of eight. All 144 have `boundary_status: PROVISIONAL`, the same templated definition structure, and empty `confusing_neighbor_topic_ids`. These facts were counted from the allowed Catalog file; no legacy TEST was opened. The Catalog supplies names and broad inclusion/exclusion text, but it does not yet provide the two same-domain and one cross-domain reasoned neighbor boundaries per Topic required by DATA_PROTOCOL. A cyclic or positional auto-generated edge list would not be a reasoned boundary graph. Register `LABEL_IDENTIFIABILITY_REVIEW_REQUIRED` rather than fabricate one. Formal Topic changes remain owner-controlled; this checkpoint does not propose or make any.

The pre-intake annotation procedure is recorded in `ZMR-01B_ANNOTATION_GUIDELINE.md`. It sets goal/means/background, correction, context, multi-intent, ambiguity and independent review rules without writing scenario content. It has not been independently reviewed or frozen for authoring; therefore no qualification dataset may be represented as accepted yet.

## Intake and isolation inventory

| Requirement | Current evidence | Qualification |
|---|---|---|
| TRAIN 24/Topic plus safety; 3 independent cohorts | No new rows/cohorts | DATA_INSUFFICIENT |
| ordinary DEV 12/Topic, lineage-separated TUNE/CAL; 2 cohorts | No new rows/cohorts | DATA_INSUFFICIENT |
| challenge DEV 12/Topic; 2 cohorts | No new rows/cohorts | DATA_INSUFFICIENT |
| sealed AS 8/Topic; 3 cohorts; curator storage outside writer access | No curator/store/rows | INDEPENDENCE_NOT_PROVISIONED |
| independent two-reviewer gold and third-person arbitration | No reviewer attestations or gold | INDEPENDENCE_NOT_PROVISIONED |
| source license, original lineage, duplicate review | Metadata auditor exists; no accepted source records | SOURCE_NOT_AUDITED |
| Topic neighbor graph with directional reasons | Catalog has 0 recorded edges; no independent pre-prediction boundary review | LABEL_IDENTIFIABILITY_REVIEW_REQUIRED |

The `auditIntake` helper can reject missing quotas and metadata but always returns `data_qualification: NOT_QUALIFIED`. Its fabricated 144-Topic positive unit tests establish only arithmetic/schema behavior. The fingerprint helper and isolated claim helper are not themselves proof that a real curator store is inaccessible to the candidate writer. No public or sealed cohort can be promoted from this checkpoint.

## Next safe work and gate

Continue independent, pre-prediction boundary review across all 144 formal Topics and evidence-backed source/author cohort intake using only already authorized public material and roles. The candidate writer may maintain schema and quota tooling, but may not author or adjudicate AS/final rows. A curator-held store and genuinely separate reviewers must be demonstrated through access attestations before AS data qualification. All required quotas, near-duplicate review, reviewer agreement >=90%, frozen gold, and full144 manifest must pass before ZMR-02. If reasoned boundaries cannot be resolved without changing formal Topic definitions, record the affected IDs and seek the required owner decision on those definitions; do not silently change them. Until those gates pass, capability stays UNTESTED and resource stays NOT_QUALIFIED.
