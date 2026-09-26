# CIG-02E full-Catalog intake matrix

This [matrix](../../artifacts/compositional-intent-graph-v1/CIG-02E_FULL_CATALOG_INTAKE_MATRIX.json) consolidates the five immutable intake manifests on main `0c8330c3afbb397a64d8f5cc4b85ba3541ec8bc7`. The [validator](../../scripts/cig02e_intake_matrix.mjs) recomputes it from those manifests, the public profiles and the existing 18 sparse-gap records. It reads no corpus text or router predictions and performs no capability scoring. It validates batch membership, unique 144-Topic topology, queue identity, disposition counts and zero-gold/unfrozen boundaries.

## Findings

- 144 Topics have intake records; 281 selected nominations correspond to 244 distinct source row IDs.
- 36 prospective plausible nominations cover 33 Topics. The separately preserved JVM-log follow-up adds one candidate record but no additional Topic.
- 111 Topics have no prospective plausible candidate in this bounded selected intake.
- 40 nominations are quarantined, 26 synthetic nominations remain unreviewed, and one original long-row review remains immutable as NOT_FULLY_REVIEWED with a separate follow-up.
- Two Topics have no selected source rows. The original 18 sparse retrieval gaps remain visible.
- Accepted fixture rows and gold labels: 0. Natural DEFER/context controls: NOT_REGISTERED.

| Disposition | Nominations |
| --- | ---: |
| PLAUSIBLE_SOURCE_CANDIDATE | 36 |
| QUARANTINED_SOURCE_INPUT_MISMATCH | 40 |
| UNCERTAIN_NEIGHBOR_BOUNDARY | 30 |
| NOT_FULLY_REVIEWED | 1 |
| REJECT_FOR_NOMINATED_TOPIC | 126 |
| UNCERTAIN_TASK_VS_TOPIC | 12 |
| ALREADY_REJECTED_NO_NEW_ADJUDICATION | 3 |
| SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | 26 |
| PRIOR_DECISION_PRESERVED | 7 |
| **Total** | **281** |

Counts describe this fixed intake selection. A distinct row ID is not a proof of independently authored text: exact duplicate inputs may exist at different source positions, and one row may be nominated for several Topics. A candidate is not accepted gold, and a lack of candidates does not establish semantic absence or model-free impossibility. Prior decisions and quarantines are retained, not overwritten by later annotations. Developer annotation is not independent gold.

The recurring information gaps are (a) requests whose goal differs from an anchor's sense or background role, (b) boundaries between a specialized Topic and a generic output task, (c) missing independently authored source language in sparse Topics, and (d) input provenance mismatches. No aggregate here measures the runtime's ability to resolve those gaps.

## Bounded next work

1. Review the 26 existing synthetic nominations in one coherent batch, by their pinned IDs and complete instruction/input. Preserve source class and rights; no replacements or new lexical scan. A synthetic semantic match may support diagnostic engineering but cannot silently supply independent human evidence.
2. Consolidate the 36 prospective candidates plus the separate log follow-up into an adjudication ledger with complete input identities, explicit competing-Topic decisions and author/annotator independence. Do not treat the developer's current annotations as independent gold.
3. Resolve the 42 uncertain nominations under existing formal Topic definitions, retaining historical records and separately recording any new decisions. No frozen protocol or product-contract change.
4. Address remaining source/control gaps with bounded public-source work. Keep every missing Topic and natural DEFER/context control explicit. No fixture freeze or fresh scored DEV until provenance, source separation, gold and candidate/scorer hashes are ready.

Source feasibility remains **SOURCE_FEASIBILITY_UNQUALIFIED_NOT_ROUTER_CAPABILITY**. CIG-02 remains unfrozen and CIG-03 blocked. Earlier LSR/CSL FAIL and CIG-02B/C/D unqualified results remain unchanged.

## Merge receipt

PR #54 merged at `0c8330c3afbb397a64d8f5cc4b85ba3541ec8bc7`; all six applicable exact-head and exact-main checks passed. The [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_SCIENCE_CREATIVE_BUSINESS_TIME_SOURCE_PILOT_MERGED_MAIN_RECEIPT.json) records job identities.

## Topic matrix

P = prospective plausible nominations; Q = quarantines; U = uncertain neighbor/task boundaries; S = synthetic pending. Counts are nominations, not accepted gold.

| Topic | Selected | P | Q | U | S | Sparse |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| sys.ai_computing.ai_models_tools | 2 | 1 | 1 | 0 | 0 |  |
| sys.ai_computing.coding_software_development | 2 | 1 | 1 | 0 | 0 |  |
| sys.ai_computing.cybersecurity_privacy | 2 | 1 | 0 | 1 | 0 |  |
| sys.ai_computing.data_systems | 2 | 2 | 0 | 0 | 0 |  |
| sys.ai_computing.debugging_troubleshooting | 2 | 1 | 0 | 0 | 0 |  |
| sys.ai_computing.hardware_devices | 2 | 0 | 0 | 1 | 0 |  |
| sys.ai_computing.networking_connectivity | 2 | 0 | 1 | 0 | 0 |  |
| sys.ai_computing.prompt_workflows | 2 | 0 | 0 | 0 | 0 |  |
| sys.business_entrepreneurship.business_strategy | 2 | 0 | 0 | 0 | 2 | yes |
| sys.business_entrepreneurship.customer_feedback | 2 | 0 | 1 | 0 | 0 |  |
| sys.business_entrepreneurship.entrepreneurship | 2 | 1 | 0 | 0 | 0 |  |
| sys.business_entrepreneurship.market_research | 2 | 0 | 0 | 1 | 0 |  |
| sys.business_entrepreneurship.marketing_growth | 2 | 1 | 0 | 0 | 0 |  |
| sys.business_entrepreneurship.operations_process | 2 | 0 | 1 | 0 | 0 |  |
| sys.business_entrepreneurship.partnerships | 2 | 0 | 0 | 0 | 0 | yes |
| sys.business_entrepreneurship.sales | 2 | 0 | 0 | 0 | 0 |  |
| sys.career_work.applications | 2 | 0 | 0 | 0 | 0 |  |
| sys.career_work.career_strategy | 2 | 0 | 0 | 0 | 2 |  |
| sys.career_work.compensation_benefits | 2 | 0 | 1 | 0 | 0 |  |
| sys.career_work.interviews | 2 | 1 | 0 | 0 | 0 |  |
| sys.career_work.job_search | 2 | 0 | 0 | 0 | 0 |  |
| sys.career_work.networking_professional | 2 | 0 | 0 | 0 | 0 |  |
| sys.career_work.performance_growth | 2 | 0 | 0 | 0 | 0 |  |
| sys.career_work.workplace_daily | 2 | 0 | 1 | 0 | 0 |  |
| sys.communication_writing.documents_reports | 2 | 1 | 0 | 0 | 0 |  |
| sys.communication_writing.email_messages | 2 | 0 | 2 | 0 | 0 |  |
| sys.communication_writing.negotiation_persuasion | 2 | 0 | 0 | 0 | 0 |  |
| sys.communication_writing.presentations | 2 | 2 | 0 | 0 | 0 |  |
| sys.communication_writing.public_posts | 2 | 0 | 0 | 1 | 1 |  |
| sys.communication_writing.speaking_conversation | 2 | 1 | 0 | 1 | 0 |  |
| sys.communication_writing.translation | 2 | 0 | 0 | 0 | 0 |  |
| sys.communication_writing.writing_editing | 2 | 0 | 0 | 1 | 0 |  |
| sys.creative_design.branding_identity | 2 | 1 | 1 | 0 | 0 |  |
| sys.creative_design.creative_writing | 2 | 0 | 0 | 0 | 0 |  |
| sys.creative_design.ideation_concepts | 2 | 0 | 1 | 0 | 0 |  |
| sys.creative_design.illustration_image_creation | 2 | 0 | 0 | 0 | 1 |  |
| sys.creative_design.photography | 2 | 1 | 1 | 0 | 0 |  |
| sys.creative_design.ux_ui_design | 2 | 1 | 0 | 0 | 0 |  |
| sys.creative_design.video_audio_creation | 2 | 1 | 0 | 0 | 0 |  |
| sys.creative_design.visual_design | 2 | 0 | 1 | 0 | 0 |  |
| sys.education_learning.academic_admin | 2 | 0 | 0 | 0 | 1 | yes |
| sys.education_learning.academic_courses | 2 | 0 | 2 | 0 | 0 |  |
| sys.education_learning.exams_assessments | 2 | 0 | 0 | 1 | 0 |  |
| sys.education_learning.language_learning | 2 | 0 | 0 | 1 | 0 |  |
| sys.education_learning.learning_methods | 2 | 0 | 0 | 0 | 2 | yes |
| sys.education_learning.reading_learning | 2 | 0 | 1 | 0 | 0 |  |
| sys.education_learning.skill_learning | 2 | 0 | 0 | 0 | 0 |  |
| sys.education_learning.thesis_research | 2 | 0 | 1 | 0 | 0 |  |
| sys.family_relationships.caregiving_family_support | 0 | 0 | 0 | 0 | 0 | yes |
| sys.family_relationships.conflict_boundaries | 2 | 0 | 0 | 0 | 0 |  |
| sys.family_relationships.friendships | 2 | 0 | 0 | 0 | 0 |  |
| sys.family_relationships.parents_family | 2 | 0 | 1 | 0 | 0 |  |
| sys.family_relationships.partner_relationship | 2 | 0 | 0 | 0 | 0 |  |
| sys.family_relationships.pets | 2 | 0 | 0 | 1 | 0 |  |
| sys.family_relationships.siblings | 2 | 0 | 2 | 0 | 0 |  |
| sys.family_relationships.social_interaction | 2 | 0 | 0 | 0 | 1 | yes |
| sys.finance_purchases.banking_payments | 2 | 1 | 1 | 0 | 0 |  |
| sys.finance_purchases.budgeting_cashflow | 2 | 1 | 0 | 0 | 0 |  |
| sys.finance_purchases.debt_credit | 2 | 1 | 0 | 1 | 0 |  |
| sys.finance_purchases.investing | 2 | 2 | 0 | 0 | 0 |  |
| sys.finance_purchases.major_purchases | 1 | 0 | 0 | 0 | 1 | yes |
| sys.finance_purchases.shopping_research | 2 | 0 | 0 | 0 | 0 |  |
| sys.finance_purchases.subscriptions_recurring | 2 | 0 | 0 | 0 | 0 |  |
| sys.finance_purchases.taxes_insurance | 2 | 0 | 1 | 0 | 0 |  |
| sys.health_wellbeing.fitness | 2 | 0 | 0 | 2 | 0 |  |
| sys.health_wellbeing.medical_care | 2 | 0 | 0 | 0 | 0 |  |
| sys.health_wellbeing.medication_treatment | 2 | 0 | 0 | 2 | 0 |  |
| sys.health_wellbeing.mental_wellbeing | 2 | 1 | 0 | 1 | 0 |  |
| sys.health_wellbeing.nutrition | 2 | 1 | 1 | 0 | 0 |  |
| sys.health_wellbeing.preventive_health | 2 | 0 | 0 | 2 | 0 |  |
| sys.health_wellbeing.sleep | 2 | 0 | 0 | 0 | 0 |  |
| sys.health_wellbeing.symptoms_conditions | 2 | 0 | 0 | 0 | 0 |  |
| sys.home_daily.chores_cleaning | 2 | 1 | 0 | 1 | 0 |  |
| sys.home_daily.home_improvement | 2 | 0 | 1 | 0 | 0 |  |
| sys.home_daily.housing | 2 | 0 | 0 | 2 | 0 |  |
| sys.home_daily.local_errands | 2 | 0 | 0 | 0 | 0 | yes |
| sys.home_daily.moving_relocation | 2 | 1 | 1 | 0 | 0 |  |
| sys.home_daily.possessions_organization | 2 | 0 | 0 | 0 | 0 |  |
| sys.home_daily.transportation_ownership | 2 | 0 | 0 | 1 | 0 |  |
| sys.home_daily.utilities_services | 2 | 0 | 0 | 0 | 0 |  |
| sys.knowledge_memory.backup_export | 2 | 0 | 0 | 0 | 0 |  |
| sys.knowledge_memory.files_documents_storage | 2 | 0 | 0 | 0 | 1 | yes |
| sys.knowledge_memory.journaling | 2 | 0 | 0 | 0 | 0 |  |
| sys.knowledge_memory.memory_context | 2 | 0 | 0 | 0 | 0 |  |
| sys.knowledge_memory.notes_knowledge_management | 2 | 0 | 0 | 0 | 0 |  |
| sys.knowledge_memory.personal_archive | 2 | 0 | 0 | 0 | 2 | yes |
| sys.knowledge_memory.photos_media_archive | 0 | 0 | 0 | 0 | 0 | yes |
| sys.knowledge_memory.provenance_history | 2 | 0 | 0 | 0 | 2 | yes |
| sys.legal_civic.civic_public_policy | 2 | 1 | 0 | 0 | 0 |  |
| sys.legal_civic.complaints_disputes | 2 | 0 | 0 | 1 | 0 |  |
| sys.legal_civic.consumer_rights | 2 | 0 | 0 | 0 | 0 |  |
| sys.legal_civic.contracts_agreements | 2 | 0 | 1 | 0 | 0 |  |
| sys.legal_civic.government_services | 2 | 0 | 0 | 0 | 0 |  |
| sys.legal_civic.identity_documents | 2 | 0 | 0 | 1 | 0 |  |
| sys.legal_civic.immigration_residency | 2 | 0 | 1 | 1 | 0 |  |
| sys.legal_civic.legal_questions | 2 | 0 | 2 | 0 | 0 |  |
| sys.media_culture.art_culture | 2 | 0 | 1 | 0 | 0 |  |
| sys.media_culture.books_literature | 2 | 0 | 0 | 0 | 0 |  |
| sys.media_culture.film_tv | 2 | 0 | 0 | 1 | 0 |  |
| sys.media_culture.games | 2 | 1 | 0 | 1 | 0 |  |
| sys.media_culture.live_events | 2 | 0 | 0 | 1 | 0 |  |
| sys.media_culture.music | 2 | 1 | 0 | 0 | 0 |  |
| sys.media_culture.news_media | 2 | 0 | 0 | 0 | 0 |  |
| sys.media_culture.online_culture | 2 | 0 | 0 | 2 | 0 |  |
| sys.personal_direction.habits_behavior | 2 | 1 | 0 | 0 | 0 |  |
| sys.personal_direction.life_goals | 2 | 0 | 1 | 0 | 0 |  |
| sys.personal_direction.life_planning | 1 | 0 | 0 | 0 | 1 | yes |
| sys.personal_direction.major_decisions | 2 | 0 | 0 | 0 | 0 |  |
| sys.personal_direction.personal_admin | 2 | 0 | 0 | 0 | 0 |  |
| sys.personal_direction.personal_productivity | 2 | 1 | 1 | 0 | 0 |  |
| sys.personal_direction.self_reflection | 2 | 0 | 0 | 0 | 0 |  |
| sys.personal_direction.values_principles | 2 | 0 | 0 | 0 | 0 |  |
| sys.projects_products.engineering_execution | 2 | 0 | 0 | 0 | 2 |  |
| sys.projects_products.launch_operations | 2 | 0 | 0 | 1 | 0 |  |
| sys.projects_products.product_requirements | 2 | 0 | 0 | 0 | 2 | yes |
| sys.projects_products.product_strategy | 2 | 0 | 0 | 0 | 2 | yes |
| sys.projects_products.project_planning | 2 | 0 | 0 | 0 | 0 | yes |
| sys.projects_products.roadmap_prioritization | 2 | 0 | 0 | 0 | 1 | yes |
| sys.projects_products.testing_quality | 2 | 0 | 0 | 0 | 0 |  |
| sys.projects_products.ux_user_research | 2 | 0 | 0 | 0 | 0 |  |
| sys.science_technical.biology_life_science | 2 | 1 | 0 | 0 | 0 |  |
| sys.science_technical.chemistry_materials | 2 | 0 | 1 | 1 | 0 |  |
| sys.science_technical.computer_science | 2 | 1 | 1 | 0 | 0 |  |
| sys.science_technical.engineering | 2 | 1 | 0 | 1 | 0 |  |
| sys.science_technical.mathematics | 2 | 0 | 0 | 1 | 0 |  |
| sys.science_technical.medicine_knowledge | 2 | 0 | 0 | 0 | 0 |  |
| sys.science_technical.physics | 2 | 0 | 0 | 0 | 0 |  |
| sys.science_technical.statistics_data_analysis | 2 | 0 | 1 | 0 | 0 |  |
| sys.time_events.appointments_bookings | 2 | 0 | 0 | 1 | 0 |  |
| sys.time_events.calendar_scheduling | 2 | 0 | 1 | 0 | 0 |  |
| sys.time_events.celebrations_holidays | 2 | 0 | 0 | 1 | 0 |  |
| sys.time_events.life_events | 2 | 0 | 0 | 0 | 0 |  |
| sys.time_events.plans_checklists | 2 | 0 | 0 | 1 | 0 |  |
| sys.time_events.reminders_deadlines | 2 | 0 | 0 | 0 | 1 |  |
| sys.time_events.routines_recurring | 2 | 0 | 1 | 1 | 0 |  |
| sys.time_events.time_management | 2 | 0 | 0 | 2 | 0 |  |
| sys.travel_places.attractions_activities | 2 | 1 | 0 | 0 | 0 |  |
| sys.travel_places.local_navigation | 2 | 0 | 0 | 0 | 0 |  |
| sys.travel_places.lodging | 2 | 0 | 1 | 0 | 0 |  |
| sys.travel_places.restaurants_travel | 2 | 0 | 0 | 1 | 0 |  |
| sys.travel_places.transport_travel | 2 | 0 | 1 | 1 | 0 |  |
| sys.travel_places.trip_planning | 2 | 1 | 0 | 0 | 0 |  |
| sys.travel_places.trip_records | 1 | 0 | 0 | 0 | 1 | yes |
| sys.travel_places.visas_border | 2 | 0 | 1 | 1 | 0 |  |
