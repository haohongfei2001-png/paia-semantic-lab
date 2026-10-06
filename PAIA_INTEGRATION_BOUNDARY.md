# PAIA integration boundary — Personal Topic Architecture

Owner-approved product-boundary clarification, 2026-10-07. Documentation only. This file defines the Lab-to-PAIA interface; it is not a new research package, execution queue, classifier target, experiment authorization or integration implementation.

The sole normative PAIA Topic product contract is [Personal Topic Architecture PT-1.0 in PAIA](https://github.com/haohongfei2001-png/paia/blob/main/extension/docs/consumer-product-v1/TOPIC_ARCHITECTURE.md), with its [adoption/supersession record](https://github.com/haohongfei2001-png/paia/blob/main/extension/docs/consumer-product-v1/TOPIC_ARCHITECTURE_ADOPTION.md). PAIA [STATUS](https://github.com/haohongfei2001-png/paia/blob/main/extension/docs/consumer-product-v1/STATUS.md) alone selects PAIA development. Lab research remains governed by [its existing canonical ZMR status](status/ZERO_MODEL_REFOUNDATION_STATUS.json) and [current research plan](docs/zero-model-refoundation-v1/DEVELOPMENT_PLAN.md). No duplicate product contract or independent next-task pointer is maintained here.

## 1. Independent concepts

System Topic answers what general semantic category a piece of content has. It is a versioned cross-user catalog concept. The existing Catalog identity and its Derived Semantic Profile remain distinct: profile expansion is a replaceable research/retrieval representation, not a formal identity change.

Personal / Library Topic answers where this user will return to read, think, decide or reuse material. It is an identity around a stable object or sustained subject, including a bounded short-term project. PAIA has one Thought Library with Personal Topic -> Section -> Entry, shared Entry bodies and protected human organization. AI can form Personal Topics only under the approved identity-first evidence/authority contract; it cannot overwrite explicit human intent.

The two concepts have independent identity spaces. No one-to-one mapping, mandatory systemTopicId/domainId, System Topic parent or System-label admission veto exists. Catalog lifecycle and UserTopicProfile activation are not Personal Topic formation. Cluster/profile IDs are not Library identities. The 144 System Topics and 18 Domains never become the Thought Library user directory.

## 2. Production non-dependency

**PAIA production architecture does not depend on the 18 Domains or 144 System Topics.** Personal organization, Thought Library, retrieval and Context reuse must operate and develop without the taxonomy module, assets or a semantic service. Optional does not mean a hidden mandatory core. The Lab remains independent R&D, not a required upstream blocker for PAIA delivery.

Future admitted semantic signals may aid one proven downstream purpose but cannot decide Personal identities, create fixed parent folders, override keep-separate or membership exclusions, auto-merge established Topics, change permissions or require classification before safe capture/save. Internal organization and external Context access remain distinct authorizations. Topic-related Context uses stable Personal IDs and the current PAIA trusted eligibility/read-only boundaries, not classification as permission.

## 3. Evidence required for any future optional integration

A proposed integration must identify a concrete downstream purpose: Personal Topic organization, retrieval, candidate generation or Context reuse. Predeclare material gain, critical regressions, resource/cost limits, evaluation independence and authorization before testing. Compare at least:

| Baseline | Intervention |
|---|---|
| A | No fixed taxonomy |
| B | Optional 18-Domain signals |
| C | Optional 144-System-Topic signals |

Keep content/history access, model or decision mechanism, chronological task split, permission scope and budgets comparable; disclose differences instead of attributing their effects to taxonomy. These comparisons do not reduce the existing full-144 research label universe or make Domains assignable in the formal Catalog. A different downstream experiment is not a change to past classifier gold or denominators.

Measure human corrections, duplicate Topics, wrong merges, Topic identity errors, retrieval misses/noise, Context relevance, latency, cost and permission/human-intent violations. Reference/schema correctness and synthetic fixtures are necessary engineering evidence, not proof of real downstream utility. Use properly authorized independent held-out tasks; do not reuse consumed TEST content, leak private archives into Git or silently expand product telemetry/auditing.

Permission or explicit-human-intent violations block admission regardless of average score. Demonstrate safe behavior with the optional module absent or failing. No material downstream benefit means no production dependency or admission. Even an admitted optional signal leaves a functional no-taxonomy production path.

> 通过“144 标签分类测试”，不等于通过“个人思想库组织测试”。

Classification success is not sufficient integration evidence. A useful result still requires explicit PAIA integration authorization and normal source/security/release gates before shipping. This documentation change runs no comparison, model, private-data evaluation or paid call.

## 4. Scoped supersession; research evidence unchanged

Earlier references in README, AGENTS rules 8/9/19/25, docs/PRE_IMPLEMENTATION_FREEZE_v0.2.md, catalog-architecture documents and the ZMR development plan to formal/system/custom Topic creation restrictions, full Catalog routing, UserTopicProfile activation or an internal PAIA Router must be interpreted within their research/historical scope. They do not veto PAIA's newly approved Personal Topic formation, bind its user directory or promise mandatory production integration.

The current Lab program still evaluates the complete formal 144-label Catalog under its registered constraints. This product-boundary clarification does not authorize changing Catalog IDs, definitions, lifecycle, Domain membership or semantic profiles; lowering 95%/70% gates; adding a neural/embedding/LLM/API dependency; relaxing resource budgets; allocating new research allowance; opening AS/final tests; reopening historical FAIL packages; accessing a real archive; or writing production code/schema. Research-only restrictions remain fully in force for research work.

The fresh read baseline for this clarification was Lab main `0ec6d9748cb88422d20a1e02c8d2047343f8bf96`, PAIA main `73f07b3dbe42fdb66f89500efa87513c2da96239`. The Catalog at that Lab head declared DRAFT, release_eligible=false, 18 non-assignable Domains and 144 System Topics. Current ZMR status reported capability UNTESTED and data/resource NOT_QUALIFIED. These are baseline observations, not new evaluations; consult current status for later research state.

Catalog blob `6bcdd2af66879d7ac098cf237b5586c3c9818aad` and ZMR status blob `f1374e8128c535dcb920a3ed81e73b94d1b9bd2b` are preserved by this documentation-only amendment, along with all historical closures, evidence, runtime, tests and budgets. README/AGENTS route to this boundary; frozen research documents are not rewritten as though they originally described Personal Topic Architecture.
