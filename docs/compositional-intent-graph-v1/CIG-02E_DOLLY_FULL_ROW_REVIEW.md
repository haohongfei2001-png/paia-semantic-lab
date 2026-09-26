# CIG-02E pinned Dolly row boundary review

This bounded pass reads **12 already selected** human-source rows from the prior [18-Topic excerpt triage](./CIG-02E_EIGHTEEN_SPARSE_EXCERPT_TRIAGE.md). It uses the pinned Dolly mirror at commit `6d7ebf384c5e588ee1b0dff816557489bc16089c`, Git blob `7c507d16b055ae32107a6dd0585779678565dcd2`. The source instructions and relevant context were checked against the nominated formal Topic. Source text is not copied into this repository; row IDs, instruction hashes and decisions are in the [companion result](../../artifacts/compositional-intent-graph-v1/CIG-02E_DOLLY_FULL_ROW_REVIEW.json).

| Nominated Topic | Source row | Decision | Whole-request boundary |
| --- | --- | --- | --- |
| `sys.business_entrepreneurship.partnerships` | `dolly:6028` | REJECT_FOR_NOMINATED_TOPIC | Requests a title for supplied coaching prose; a business partnership is only mentioned in background. |
| `sys.business_entrepreneurship.partnerships` | `dolly:1697` | REJECT_FOR_NOMINATED_TOPIC | Requests a colleague-recognition message; the customer partnership is background to writing. |
| `sys.business_entrepreneurship.partnerships` | `dolly:1213` | REJECT_FOR_NOMINATED_TOPIC | Asks a factual question about an intelligence alliance, not a business partnership. |
| `sys.education_learning.academic_admin` | `dolly:13515` | REJECT_FOR_NOMINATED_TOPIC | Asks about civic voter registration, not academic administration. |
| `sys.family_relationships.social_interaction` | `dolly:14044` | UNCERTAIN_BOUNDARY_NO_FIXTURE_ACCEPTANCE | Asks whether a child with ASD should join group sport based on a cited study; social-skills benefit is relevant, but the immediate decision and health/education boundary require independent gold review. |
| `sys.home_daily.local_errands` | `dolly:9127` | REJECT_FOR_NOMINATED_TOPIC | Compares in-person and online learning; it does not ask to complete a local errand. |
| `sys.home_daily.local_errands` | `dolly:11080` | REJECT_FOR_NOMINATED_TOPIC | Asks about in-person human contact; it does not ask to complete a local errand. |
| `sys.home_daily.local_errands` | `dolly:9564` | REJECT_FOR_NOMINATED_TOPIC | Requests titles for a blog post; in-person relationships are background, not errands. |
| `sys.knowledge_memory.files_documents_storage` | `dolly:5735` | REJECT_FOR_NOMINATED_TOPIC | Classifies soccer equipment; a folder is merely one candidate item, not a document-storage goal. |
| `sys.projects_products.project_planning` | `dolly:11517` | REJECT_FOR_NOMINATED_TOPIC | Extracts chronological milestones from supplied Tesla history; it does not plan a current project. |
| `sys.projects_products.project_planning` | `dolly:13177` | UNCERTAIN_BOUNDARY_NO_FIXTURE_ACCEPTANCE | Asks for a generic milestone definition; the formal Project Planning Topic permits understanding, but no current project goal is shown. |
| `sys.projects_products.roadmap_prioritization` | `dolly:2486` | REJECT_FOR_NOMINATED_TOPIC | Supplies bicycle choice advice; the tradeoff word is unrelated to product or project roadmap prioritization. |

Ten reviewed rows have a different primary goal. Two remain `UNCERTAIN` because social-skills advice and a generic project-milestone definition need independent neighboring-Topic adjudication. **Zero** rows are accepted into a fixture by this pass. This does not judge the two unshown Dolly partnership hits, any other source row, or semantic absence across Dolly. The 12 rows were deterministic lexical samples, not a representative sample.

The immediate next step remains the [source intake gate](./CIG-02E_SOURCE_BOTTLENECK_ANALYSIS.md): stable rights and provenance, independently authored direct requests, full-row Topic boundaries and controls, then a 144-Topic source plan. No candidate, scorer, gold or capability floor changes follow from these findings. CIG-02 remains unfrozen and CIG-03 blocked.
