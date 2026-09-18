# PAIA Semantic Lab — Execution Sequencing Amendment v0.2.1

**Applies to:** frozen architecture v0.2  
**Scope:** execution sequencing only  
**Status:** PLAN ONLY / FROZEN AMENDMENT  
**Date:** 2026-09-18

## 1. Non-change declaration

This amendment does **not** change the frozen Semantic Engine architecture:
- finite versioned Topic Catalog;
- full-catalog classification;
- active/inactive separation;
- Personal Semantic Router;
- reusable CalibrationRecord;
- no AI automatic Topic creation;
- automatic model bake-off;
- incremental semantics;
- future PAIA integration boundary.

It changes only **when product-owner semantic attention is allowed to enter the development sequence**.

## 2. Owner Attention Budget

**Product-owner semantic attention is a scarce resource.**

If a comparison, screening step, validation step, failure diagnosis, benchmark construction step, or challenge generation step can be performed by machines without losing the semantic authority that only the owner can supply, it MUST be automated rather than transferred to the product owner.

### Hard sequencing constraint

SEM-00 through SEM-05 MUST NOT require the product owner to:
- label Input→Topic assignments;
- label retrieval relevance;
- try models one by one;
- compare model A/B/C manually;
- repeat semantic judgments already captured in reusable gold;
- provide ad-hoc one-off labels merely to unblock an experiment.

Those rounds MUST prefer:
- public benchmarks;
- synthetic fixtures;
- Topic Catalog boundary fixtures;
- automated consistency checks;
- model disagreement;
- performance/resource tests;
- machine-generated challenge sets;
- existing reusable gold if such gold already exists.

SEM-00 through SEM-05 may produce engineering PASS/FAIL and semantic **PROVISIONAL / INCONCLUSIVE** findings. They MUST NOT claim personalized semantic quality has been proven without personal gold.

## 3. First product-owner semantic work: SEM-06

The first planned concentrated owner-semantic batch occurs in **SEM-06** after the infrastructure, retrieval engine, catalog candidate layer, Router machinery, activation/lifecycle system, and model shortlist are already operational.

The system selects approximately **100–200 highest-information canonical judgments**, not a random bulk sample.

Selection priority:
1. model disagreement;
2. confusing-neighbor Topics;
3. inactive Topics;
4. high-impact retrieval disagreement;
5. Router high-uncertainty;
6. UNASSIGNED vs existing Topic;
7. representative coverage gaps.

Each human judgment answers a **canonical semantic truth question**, never “which model do you prefer?”.

Each accepted judgment is written once into reusable CalibrationRecord / benchmark gold and becomes available to every future:
- embedding candidate;
- reranker;
- LLM Router;
- model revision;
- small classifier/distillation experiment.

## 4. SEM-07 reuse rule

SEM-07 automatically re-runs every qualified configuration against the SAME frozen personal gold / lockbox.

No new owner judgment is requested unless the evaluation discovers a genuinely new Topic-boundary ambiguity that cannot be resolved from the frozen Catalog contract and existing reusable gold. Such a case is a product-boundary exception, not normal model evaluation.

## 5. Revised rounds

- SEM-00 — Lab Foundation + Catalog Validation Harness
- SEM-01 — Automated Embedding Bake-off / B0
- SEM-02 — Retrieval Engine Foundation + Lab Evidence Browser
- SEM-03 — Full-Catalog Topic Candidate Retrieval
- SEM-04 — Personal Router Infrastructure + Calibration Machinery
- SEM-05 — Incremental Lifecycle + Activation Infrastructure + Local/API Performance/Privacy Trade-off
- SEM-06 — Authorized Real Snapshot + Concentrated Reusable Personal Gold + Personal Calibration
- SEM-07 — Frozen Personal Evaluation / Lockbox + Automatic Final Comparison + Integration Contract + Small-model Eligibility

This amendment supersedes only the previous human-attention timing and round sequencing. The v0.2 architecture and contracts remain frozen.
