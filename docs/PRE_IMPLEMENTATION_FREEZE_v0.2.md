# PAIA Semantic Engine v0 / Semantic Lab — Pre-Implementation Design Freeze v0.2

**Status:** FROZEN / PLAN ONLY  
**Date:** 2026-09-18

## 1. Frozen product semantics

The v0 path is:

```text
Input
  → general-purpose embedding
  → full-catalog Topic candidate retrieval
  → Personal Semantic Router
  → existing system/custom Topic(s) OR UNASSIGNED / DEFER
  → optional activation-state update
```

Three concepts are independent:

1. **Topic existence** — existence in the versioned System Topic Catalog or explicit user-created custom Topic set.
2. **Input → Topic assignment** — semantic classification of one Input revision against the complete eligible Topic space.
3. **User topic activation** — presentation/personal-priority state based on sustained use or explicit user action.

Inactive and hidden Topics remain classification-eligible. Active Topics are a weak personalization prior only.

### Removed from v0.1

- `NEW_CANDIDATE` is removed as normal automatic behavior.
- AI cannot materialize a new formal Topic.
- Clustering does not create Topics and is not a Router prerequisite.
- Human labeling is not repeated per model.
- User active Topics do not define the classification universe.

## 2. Architecture freeze

### Planes

**Canonical fact plane:** authorized read-only Input snapshots with stable identity, revision, provenance and authorization.  
**Catalog plane:** finite System Topic Catalog plus explicit user custom Topics.  
**Representation plane:** chunks, embeddings, lexical indexes and Topic representations; all rebuildable.  
**Retrieval plane:** semantic Input retrieval and separate full-catalog Topic candidate retrieval.  
**Personal routing plane:** candidate Topics + allowed context + reusable calibration → assignments/UNASSIGNED/DEFER.  
**Activation plane:** changes UserTopicProfile only, never Topic existence or assignment eligibility.  
**Calibration plane:** append-only user-confirmed corrections/labels; survives model/index rebuilds.  
**Diagnostic plane:** clustering/overlap/outlier analysis for catalog quality only.

There is no write arrow from Semantic Lab to PAIA archive, Thought Library, Capture, Reader, production schema/runtime or ANS state.

## 3. Topic Catalog architecture

### 3.1 Size

- Seed draft: **144 system Topics**.
- Internal metadata: **18 non-assignable domains**.
- Expected quality-first near-term band: about **150–400 Topics**.
- Architecture must be tested to **1,024 Topics** without contract change.
- 1,000 is an engineering envelope, not a target.

This is deliberately much smaller than “generate every conceivable topic”. Semantic quality and boundary clarity dominate coverage count.

### 3.2 Hierarchy

v0 uses exactly:

```text
internal domain (not assignable)
    └── assignable Topic
```

No deeper assignable hierarchy is introduced. Deep parent/child classification would create ambiguous labels before evidence shows it is needed.

### 3.3 Topic contract

A released Topic requires:
- stable `topic_id`;
- Chinese and English name;
- definition;
- inclusion boundary;
- exclusion boundary;
- multilingual aliases;
- representative examples;
- confusing-neighbor Topic IDs;
- internal domain;
- lifecycle and catalog lineage.

Topic IDs are never reused.

### 3.4 Granularity

A System Topic must be meaningful across time/events. It is too narrow when it primarily names one incident, meeting, employer application, purchase, trip, paper, version, deadline or temporary subtask. Specific projects/people/companies are usually custom Topics, entities, tags or metadata.

### 3.5 Catalog overlap audit

Before a catalog release:
1. normalize names/aliases and reject undeclared exact collisions;
2. run lexical and embedding near-duplicate checks;
3. require high-similarity pairs to become declared confusing neighbors or be rebound/merged;
4. test confusing pairs with synthetic boundary fixtures;
5. use reusable human gold later to measure actual Router confusion;
6. block release when two Topics cannot be operationally distinguished.

No automatic merge/split occurs.

### 3.6 Versioning and lineage

- PATCH: wording/alias/example corrections with no intended semantic change.
- MINOR: additive Topics/backward-compatible metadata.
- MAJOR: incompatible boundary change, split, merge or identity retirement.

Historical assignments always retain original Topic ID + catalog version.

Lifecycle:
- `ACTIVE`: available for new routing.
- `DEPRECATED`: historical identity remains, no new current routing.
- `MERGED`: old identity retained with one successor.
- `SPLIT`: old identity retained with multiple successors.

A split never silently rewrites historical user-confirmed assignments. Only affected gold becomes a targeted migration/relabel queue.

### 3.7 Custom Topics

A user-created Topic uses the same semantic contract and a stable `usr.*` ID. Only an explicit user action may create/rename/deprecate it. AI may state that no catalog match exists, but cannot create one.

## 4. Full-catalog Personal Semantic Router

Every route event considers:
1. every current ACTIVE System Topic regardless of UserTopicProfile state;
2. every current non-deprecated custom Topic.

### 4.1 Candidate generation default

Research default:
- dense retrieval over the entire Topic catalog: top 32;
- lexical/alias retrieval: up to 16;
- explicit custom-topic safety lane when custom Topics exist;
- confusing-neighbor expansion;
- deduplicate by stable Topic ID.

Router input reserves:
- at least 8 slots for best global full-catalog candidates unaffected by activity state;
- up to 4 additional personalized candidates from active/pinned/calibration priors.

The activity prior is capped and must be ablated. It cannot gate inactive Topics out.

### 4.2 Router outcomes

- `ASSIGNED`: one or more existing system/custom Topics are supported.
- `UNASSIGNED`: enough context exists to conclude no current Topic is a reliable match.
- `DEFER`: Input/context is insufficient or genuinely ambiguous.

For mixed cases, accepted assignments may coexist with `residual_state: UNASSIGNED|DEFER`.

`NEW_CANDIDATE` is not a Router outcome.

### 4.3 Assignment evidence

Every assignment records Input ref/revision, Topic ID/catalog version, evidence span or whole-Input marker, candidate rank/source, model/run provenance, calibration evidence used and activity-prior contribution. An uncalibrated self-reported confidence is not treated as probability.

### 4.4 Error attribution

SEM-04 must separate:
1. candidate miss;
2. reranker miss;
3. semantic decision error;
4. insufficient context;
5. catalog boundary defect;
6. stale catalog/revision;
7. calibration conflict.

Oracle candidates are diagnostic only.

## 5. UserTopicProfile and activation

Minimal state:
- `activity_state: ACTIVE | INACTIVE`
- `visibility: VISIBLE | HIDDEN`
- `pinned: boolean`
- `activation_lock: AUTO | FORCE_ACTIVE | FORCE_INACTIVE`

No independent ARCHIVED semantic state is needed in v0; “archived” can be a UI view over long-inactive Topics.

### Classification separation

- ACTIVE/INACTIVE/HIDDEN never changes classification eligibility.
- HIDDEN is presentation-only.
- FORCE_INACTIVE prevents automatic activation but does not prevent semantic assignment.
- FORCE_ACTIVE keeps a Topic active.
- pinned is user-controlled priority/presentation.

### Activation evidence

Only accepted Router assignments or explicit user actions count. Rejected/DEFER/UNASSIGNED/stale experimental predictions do not.

Initial deterministic policy:
- first-time Topic auto-activates after either:
  - >=3 accepted distinct Inputs across >=2 conversations in 14 days; or
  - >=5 accepted distinct Inputs in 7 days, even in one sustained conversation.
- explicit user selection/pin/force activates immediately.
- an AUTO-active non-pinned Topic becomes eligible for auto-inactivation after 60 days without accepted assignment.
- a previously active Topic can reactivate with explicit action or >=2 accepted Inputs within 14 days.

### Active-count control

- soft budget: 48 AUTO-active Topics;
- user pinned/FORCE_ACTIVE Topics do not count toward this auto budget;
- if full, a newly qualifying Topic may replace the lowest recency-weighted non-pinned AUTO Topic;
- demotion is UI state only; classification space is unchanged.

These thresholds are frozen v0 defaults to validate, not claims about universal human behavior.

## 6. Personal Calibration Layer

Each durable `CalibrationRecord` captures:
- Input ref/revision;
- catalog/version;
- candidate Topics shown;
- AI prediction;
- user final decision;
- allowed-context fingerprint;
- evidence if supplied;
- source of confirmation/correction;
- timestamp and supersession lineage.

States:
- `OBSERVED`
- `USER_CONFIRMED`
- `GOLD`
- `SUPERSEDED`

Routine rebuilds do not delete calibration. A model change never causes relabeling.

## 7. Benchmark protocol v0.2

### B0 — automated system/product signal

No owner labeling required. Run:
- synthetic fixtures;
- catalog boundary fixtures;
- public multilingual retrieval/STS diagnostics where licensing permits;
- compatibility tests;
- truncation/context tests;
- deterministic lifecycle/privacy tests;
- repeated-run consistency;
- latency/memory/cost tests on non-private inputs.

B0 can eliminate broken configurations, not prove personalized semantic correctness.

### B1 — reusable personal gold

Created only after the system can present a concentrated, useful annotation batch. It contains authorized real Inputs with:
- retrieval relevance;
- Input→Topic assignments against a specific catalog version;
- UNASSIGNED/DEFER;
- ambiguous/confusing-neighbor cases;
- Chinese-heavy, Chinese/English mixed, very short and long Inputs.

Initial B1 is intentionally compact: recommended first batch is ~100–200 high-information judgments, not thousands. Conclusions are limited to available sample size.

### B2 — frozen lockbox

Held out from prompts/thresholds/model selection and consumed in SEM-07.

### Required metrics

**Input retrieval:** nDCG@10, Recall@20, MRR@10, exact-entity regression, no-answer FPR.  
**Pair semantics:** Spearman rho, same-topic PR-AUC/F1, hard-negative FPR.  
**Full-catalog candidate retrieval:** Recall@5/10/20, inactive Recall@20, active/inactive recall gap, custom-topic recall.  
**Router:** micro/macro F1, accepted precision + coverage, UNASSIGNED P/R/F1, DEFER recall, wrong-certain rate, evidence validity, user-override violations.  
**Activation:** one-off false activation, sustained-topic activation recall, time-to-activation, inactivation precision, reactivation recall, manual-state violations.  
**Long Inputs:** Input-level retrieval, evidence-span recall, beginning/middle/end parity, silent truncation rate.

No single composite score may hide a failed safety slice.

### Human effort minimization

Human work is requested only for:
- unresolved Topic boundaries;
- real Input→Topic truth;
- UNASSIGNED/DEFER ambiguity;
- correction of AI decisions.

Annotation is late, batched, blind to model identity and permanently reusable. No ephemeral label set may be created just to compare model A vs model B.

## 8. Reusable gold protocol

Sampling is model-agnostic: representative + challenge + ensemble disagreement + confusing-neighbor cases.

A user action is not automatically gold:
- explicit semantic decision → USER_CONFIRMED;
- validated revision/catalog identity → eligible for GOLD;
- later correction → old record SUPERSEDED, never overwritten.

Catalog upgrade:
- patch/additive minor versions reuse compatible labels;
- merge maps historical IDs without deleting history;
- split targets only affected labels for migration/review.

## 9. Automatic model bake-off

The product owner does not manually try models.

### Local contenders

1. **Qwen/Qwen3-Embedding-0.6B** — Apache-2.0; 0.6B; 100+ languages; 32K; instruction-aware; up to 1024 dimensions.
2. **BAAI/bge-m3** — MIT; multilingual; 8192 context; 1024 dimensions; mature dense/sparse/multi-vector lineage.
3. **nomic-ai/nomic-embed-text-v2-moe** — Apache-2.0; 101 languages; efficiency-oriented; current SentenceTransformers config uses 512 max sequence length; custom-code use must be pinned/sandboxed.

Historical non-winning control:
- **intfloat/multilingual-e5-large-instruct** — MIT; 94 languages.

### API contenders

1. **Voyage voyage-4** — 32K; multilingual/general-purpose; 256/512/1024/2048 dimensions; current listed price $0.06 / 1M tokens.
2. **OpenAI text-embedding-3-large** — multilingual; 8192 input; default 3072 dimensions; current listed price $0.13 / 1M tokens.
3. **Cohere embed-v4.0** — 100+ languages; 128K; 256/512/1024/1536 dimensions; self-serve API price must be verified at execution time rather than inferred from Model Vault pricing.

Real Input API use remains default-deny.

### Automatic qualification

Ineligible if license/use terms conflict, runtime cannot be pinned, silent truncation occurs, memory safety fails, identical pinned inputs are unstable, privacy terms are unknown for intended account, or real data would be sent without authorization.

Passing configurations are compared on a Pareto frontier: quality, Chinese/mixed slices, long-input behavior, latency, memory, index size, API cost, egress/privacy and reproducibility. No famous model is preselected.

## 10. Local/API research policy

All configurations use the same benchmark/text view for a fair comparison. Local full-text results cannot be compared directly with differently redacted API text.

Report separately:
- cold/warm latency;
- p50/p95;
- throughput;
- peak memory;
- index storage;
- cost per 1M tokens / per 1,000 Inputs / per correct accepted decision;
- egress amount;
- retention/account mode;
- failure/retry behavior.

Provider terms/prices are time-sensitive and are re-verified during the authorized execution round.

## 11. Incremental semantics

Separate:
```text
InputBinding = inputRef + contentRevision + sourcePayloadFingerprint
EmbeddingKey = privateNamespace + effectivePayloadDigest + modelFingerprint + representationFingerprint
```

Rules:
- new Input → embed only new/changed representation;
- no-op → zero embedding calls;
- metadata-only change → no text re-embedding;
- Input edit → new revision and affected derivative invalidation;
- user Topic-state change → no Input re-embedding;
- catalog definition change → affected Topic representation/router artifacts, not whole Input corpus;
- model upgrade → new vector namespace/shadow index;
- deletion/withdrawal → stale first, then purge controlled derivatives;
- old revision must not leak into default retrieval.

## 12. Clustering

Clustering is diagnostic only:
- detect within-Topic splits;
- cross-Topic overlap;
- outliers;
- catalog blind spots;
- semantic drift.

It never creates, renames, merges or splits a formal Topic automatically and is not a Router prerequisite.

## 13. Data/privacy

Data classes:
1. read-only canonical snapshot;
2. durable human semantic records;
3. rebuildable derivatives.

Hard rules:
- no real Input/gold/vector content in Git;
- GitHub Actions synthetic/public fixtures only;
- embeddings treated as sensitive derivatives;
- default-deny API egress;
- every API run has provider/model/scope/token/time/retention ledger;
- URLs/commands inside historical Inputs are inert data;
- provider “not used for training” is not treated as equivalent to zero retention.

## 14. Future PAIA integration boundary

Allowed design operations:
- `ingestAuthorizedSnapshot`
- `searchInputs`
- `retrieveTopicCandidates`
- `routeInput`
- `describeCatalog`
- `describeCapabilities`
- `invalidateOrPurge`

Semantic Engine does **not** own:
- `createTopic`
- `applyTopicMutation`
- `rewriteInput`
- `updateThoughtLibrary`
- `mergeTopics`
- `deleteArchive`

A future custom-topic creation UI belongs to explicit PAIA user action.

## 15. Small model eligibility

No classifier/distillation is trained in SEM-00–SEM-07.

A later research package requires:
- full-catalog candidate recall already adequate;
- measured failures attributable to learnable Router decision rather than bad boundaries/context;
- enough user-confirmed calibration data with independent holdout;
- a measurable target (quality/cost/latency/privacy);
- training-use authorization;
- fallback to the stronger Router outside the student's validated coverage.

## 16. Risk controls

- topic explosion → finite catalog/no auto-create;
- overlap → automated overlap + confusing-neighbor audit;
- active-topic tunnel vision → reserved full-catalog slots + inactive recall gate;
- one-off UI clutter → multi-event activation;
- repeated owner labor → reusable blind gold;
- catalog upgrade invalidation → versioned lineage;
- API/model drift → exact provenance + canary drift;
- truncation → error, never silent;
- vectors mistaken anonymous → sensitive derivative policy;
- clustering authority creep → diagnostic-only contract;
- premature small-model work → post-SEM-07 eligibility gate;
- production contamination → separate repo, no production writer.

## 17. Research sources

Checked 2026-09-18:
- https://huggingface.co/Qwen/Qwen3-Embedding-0.6B
- https://huggingface.co/BAAI/bge-m3
- https://huggingface.co/nomic-ai/nomic-embed-text-v2-moe
- https://huggingface.co/intfloat/multilingual-e5-large-instruct
- https://docs.voyageai.com/docs/embeddings
- https://docs.voyageai.com/docs/pricing
- https://developers.openai.com/api/docs/models/text-embedding-3-large
- https://developers.openai.com/api/docs/guides/embeddings
- https://docs.cohere.com/docs/models
- https://docs.cohere.com/docs/cohere-embed

This commit authorizes no runtime implementation, model training, real-data API egress, production modification or Topic creation.
