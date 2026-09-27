# CIG-02E supplemental synthetic full-input review

This coherent batch reviews all 26 synthetic nominations (25 distinct row IDs) preserved as pending in the full-Catalog intake matrix at main `d964b55a4207c05a3e6950a8d23b490dc249ae59`. Complete instructions and input fields were read from pinned GitHub blobs. No replacement, broad retrieval, router prediction, score or new capability TEST occurs. Generated outputs were returned as part of upstream records, but were not used to infer request intent or validate capability. Embedded URLs were not followed and filesystem paths were not accessed.

Sources are Stanford Alpaca (CC-BY-NC-4.0 data declaration) and Self-Instruct (Apache-2.0 repository declaration with its published quality caveat). Both are model-generated upstream data, independent of CIG authorship but not independently human-authored language. No model is called. Source rights do not imply suitability for production distribution.

The [manifest](../../artifacts/compositional-intent-graph-v1/CIG-02E_SYNTHETIC_FULL_INPUT_REVIEW.json) records fixed IDs and queue hashes without copying source text. The [identity checker](../../scripts/cig02e_synthetic_review_identity.mjs) verifies the fixed 26-nomination selection, row counts and instruction hashes, then records input/pair hashes in an Actions artifact. The two immutable source blobs are verified once in Actions. This is source integrity, not gold verification.

| Decision | Nominations |
| --- | ---: |
| PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | 11 |
| UNCERTAIN_NEIGHBOR_BOUNDARY | 5 |
| INSUFFICIENT_SOURCE_INPUT | 2 |
| REJECT_FOR_NOMINATED_TOPIC | 8 |
| **Total** | **26** |

Eleven rows are prospective synthetic diagnostic candidates. Five retain neighboring-Topic uncertainty, eight are rejected for the nominated Topic, and two lack a current user's intent. A generated response cannot supply missing request evidence. A request for machine learning is a means/domain distinction, not authorization to add a model to the router.

Historical intake manifests and the 144-Topic matrix remain unchanged. These follow-up decisions are separately recorded, not promoted into the human candidate count or accepted gold. The original 33 human prospective-candidate Topics and 111 Topics without human prospective candidates remain the source-feasibility snapshot. Synthetic candidates may support diagnostic engineering after appropriate protocol readiness; they do not close independent natural-language coverage or gold/control gaps.

Next consolidate the human prospective candidates and uncertain nominations into a source/adjudication ledger with competing Topics and independence requirements. Resolve ordinary source boundaries under current profiles, retain historic decisions, and pursue missing public natural expressions and DEFER/context controls in bounded batches. No source-only count qualifies CIG-02 for freeze.

PR #55 exact-head and exact-main six applicable checks passed; the [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_FULL_CATALOG_INTAKE_MATRIX_MERGED_MAIN_RECEIPT.json) records identities. CIG-02 remains unfrozen; CIG-03 blocked. Prior FAIL/unqualified evidence and product constraints are unchanged.

## Decisions

| Topic | Source row | Decision | Reason |
| --- | --- | --- | --- |
| sys.business_entrepreneurship.business_strategy | alpaca:48073 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit business strategy request for a coffee shop. |
| sys.business_entrepreneurship.business_strategy | alpaca:20103 | UNCERTAIN_NEIGHBOR_BOUNDARY | Customer acquisition strategy for an online clothing store overlaps Business Strategy and Marketing; primary boundary requires adjudication. |
| sys.career_work.career_strategy | alpaca:19606 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicitly requests a machine-learning career path; technical field is context, career direction is the goal. |
| sys.career_work.career_strategy | alpaca:43723 | INSUFFICIENT_SOURCE_INPUT | Asks the respondent to describe a desired career path without a user's direction or constraints; generic role-play does not establish personal career intent. |
| sys.communication_writing.public_posts | alpaca:39370 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit tweet-authoring request; children's reading is content background. |
| sys.creative_design.illustration_image_creation | alpaca:28170 | UNCERTAIN_NEIGHBOR_BOUNDARY | Artwork creation is explicit but medium is unspecified; illustration/image versus broader creative direction needs adjudication without relying on generated output. |
| sys.education_learning.academic_admin | alpaca:13460 | REJECT_FOR_NOMINATED_TOPIC | Requests HTML implementation of a generic registration form, not academic enrollment administration. |
| sys.education_learning.learning_methods | alpaca:39399 | REJECT_FOR_NOMINATED_TOPIC | Learning methods refers to machine learning in an article-summary task, not study strategies. |
| sys.education_learning.learning_methods | alpaca:19856 | REJECT_FOR_NOMINATED_TOPIC | Machine learning is the requested method for a sales prediction task, not personal learning methods. |
| sys.family_relationships.social_interaction | alpaca:31999 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicitly requests workplace social skills, within general interpersonal behavior. |
| sys.finance_purchases.major_purchases | self_instruct:37002 | INSUFFICIENT_SOURCE_INPUT | Asks about the respondent's past expensive purchase, without a current user's purchasing decision; do not infer user intent from generated answer. |
| sys.knowledge_memory.files_documents_storage | alpaca:33060 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit file/folder movement request with source and destination paths; no path is accessed or action executed. |
| sys.knowledge_memory.personal_archive | alpaca:15445 | REJECT_FOR_NOMINATED_TOPIC | Archive occurs in an article URL; request is summarization, not preserving personal records. Linked page not fetched. |
| sys.knowledge_memory.personal_archive | self_instruct:26348 | REJECT_FOR_NOMINATED_TOPIC | Archive occurs in an article URL; request asks an opinion on an article, not a personal archive. Linked page not fetched. |
| sys.knowledge_memory.provenance_history | alpaca:22767 | REJECT_FOR_NOMINATED_TOPIC | Requests editor questions for prose revision, not provenance or version-history tracking. |
| sys.knowledge_memory.provenance_history | alpaca:19359 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit software change-log authoring from update context; fits change-record history, pending diagnostic adjudication. |
| sys.personal_direction.life_planning | alpaca:34453 | REJECT_FOR_NOMINATED_TOPIC | Long-term planning concerns businesses, not personal life-stage arrangements. |
| sys.projects_products.engineering_execution | alpaca:34018 | REJECT_FOR_NOMINATED_TOPIC | Implementation plan concerns transport cost policy nationally, not software/project engineering execution. |
| sys.projects_products.engineering_execution | alpaca:14192 | UNCERTAIN_NEIGHBOR_BOUNDARY | Roadmap request concerns system implementation but asks sequencing rather than code delivery; Engineering Execution versus Roadmap requires adjudication. |
| sys.projects_products.product_requirements | alpaca:14917 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit user-story authoring for contact-management application requirements. |
| sys.projects_products.product_requirements | alpaca:45484 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit feature-requirement request with employee-management application context. |
| sys.projects_products.product_strategy | alpaca:14810 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicitly requests explanation of a product value proposition; generic claim limits quality but does not remove the stated concept. |
| sys.projects_products.product_strategy | alpaca:11547 | UNCERTAIN_NEIGHBOR_BOUNDARY | Product concept and value proposition combine ideation and product strategy; competing-Topic boundary requires adjudication. |
| sys.projects_products.roadmap_prioritization | alpaca:14192 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit implementation roadmap and sequencing request for a health-management system. |
| sys.time_events.reminders_deadlines | alpaca:32888 | PLAUSIBLE_SYNTHETIC_DIAGNOSTIC_CANDIDATE | Explicit time-bound reminder request; generated refusal is not used to judge intent or router capability. |
| sys.travel_places.trip_records | alpaca:34879 | UNCERTAIN_NEIGHBOR_BOUNDARY | Requests a generated Rome experience journal without observed travel facts; trip-record versus fictional creative-writing boundary remains uncertain. |
