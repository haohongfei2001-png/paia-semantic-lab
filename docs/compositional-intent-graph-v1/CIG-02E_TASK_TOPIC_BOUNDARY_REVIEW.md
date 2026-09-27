# CIG-02E complete task versus Topic source review

This coherent batch reviews all **12 historical UNCERTAIN_TASK_VS_TOPIC nominations** in the immutable ledger at main `417749372f4b13ae3bb2f917ac64055beb572776`. Complete instructions and contexts were read only for the fixed official Dolly inputs already verified in #58. Generated responses were not used. No new retrieval, substitute text, router prediction, gold label or score occurs.

The [follow-up manifest](../../artifacts/compositional-intent-graph-v1/CIG-02E_TASK_TOPIC_BOUNDARY_REVIEW.json) records full-input hashes, official mappings, original decisions, reasons and 16 unchanged bilingual profile snapshots.

| Follow-up | Count |
| --- | ---: |
| Prospective source candidate | 3 |
| Uncertain Topic scope | 2 |
| Uncertain neighboring boundary | 4 |
| No explicit nominated goal | 3 |

Three prospective candidates concern cleaning-tool suitability, a film's award identity, and game-platform/publisher categories. Classification or multiple-choice form alone does not exclude a request whose actual goal is understanding the nominated Topic. These are developer source judgments, not independent gold or demonstrated runtime success.

Cuisine-origin categorization lacks travel dining intent; packing necessity treats a passport as one item within travel preparation; a fictional appointment-call script requests writing rather than a current booking action. These three follow-ups record absent nominated goals without forcing alternate single-label gold.

Exercise-equipment and manufacturer-origin tasks retain scope uncertainty under the existing broad understanding profiles. Mental-disorder categorization overlaps diagnostic Medical Knowledge. Tweet and fictional dialogue authorship overlap communication formats with Creative Writing. Procrastination-trait extraction overlaps Personal Productivity with Chinese Time Management scope. Six remain uncertain; no narrower personal-action requirement, English-only scope, output-format priority or tie-breaker is added.

## Information boundary and next work

Task verbs describe operations; semantic eligibility still depends on the current requested goal and the unchanged profile. Domain words in story content, supplied passages, examples or packing lists cannot by themselves establish the nominated goal. Conversely, informational understanding is eligible where the profile admits it; demanding immediate execution would silently narrow the research scope.

Historical matrix, ledger and all prior annotations remain immutable, including the original 42 uncertainties. Follow-ups are separate source evidence. Do not add three prospective counts to unique Topic coverage without reconciling the entire ledger, duplicates and other unresolved neighbors. The 33-Topic prospective snapshot / 111 missing-Topic gap and zero accepted gold remain unchanged.

Continue the remaining 25 historical neighboring-Topic uncertainties outside the five reviewed in #59 as one coherent fixed-input batch. Independently adjudicated gold, natural DEFER/context controls, source separation and readiness freeze remain required before new DEV scoring. Preserve unresolved source boundaries and collect clearer public expressions without rewriting consumed or ambiguous inputs.

The [checker](../../scripts/cig02e_task_topic_boundary_integrity.mjs) verifies full selection, saved input hashes, original decisions, counts and profiles using committed evidence only. It joins the existing two-minute matrix job, with no download or heavy certification. PR #59 six successful exact-head and exact-main checks are recorded in its [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_REPEATED_INPUT_BOUNDARY_MERGED_MAIN_RECEIPT.json).

## Individual follow-ups

| Fixed row | Topic | Decision | Reason |
| --- | --- | --- | --- |
| dolly:4682 | sys.health_wellbeing.fitness | UNCERTAIN_TOPIC_SCOPE | Exercise-equipment identification directly concerns exercise concepts, so classification form alone is not exclusion. The profile emphasizes training, technique and performance; equipment knowledge eligibility still needs independent boundary review. |
| dolly:9833 | sys.health_wellbeing.mental_wellbeing | UNCERTAIN_NEIGHBOR_BOUNDARY | The requested distinction is diagnostic categories spanning mental disorders and cancers. Mental Wellbeing includes anxiety/psychological states, while Medical Knowledge covers diagnostic knowledge. Do not infer a support goal from disorder names. |
| dolly:12031 | sys.home_daily.chores_cleaning | PLAUSIBLE_SOURCE_CANDIDATE | The requested useful/not-useful distinction is explicitly for cleaning a house. Cleaning is the stated goal context and tool suitability directly serves it; classification format does not erase the cleaning goal. |
| dolly:4269 | sys.home_daily.transportation_ownership | UNCERTAIN_TOPIC_SCOPE | Manufacturer nationality is directly queried, and Vehicle & Personal Transport broadly includes cars and understanding. Its profile does not impose an ownership transaction requirement. Vehicle-topic versus general entity/geography fact eligibility remains unresolved. |
| dolly:1301 | sys.travel_places.restaurants_travel | NO_EXPLICIT_NOMINATED_GOAL_SOURCE_ONLY | Cuisine origins are queried without travel, restaurant choice or dining-arrangement intent. Travel Dining's travel scope is not established by dish names. |
| dolly:3330 | sys.communication_writing.public_posts | UNCERTAIN_NEIGHBOR_BOUNDARY | Explicit tweet authoring fits Public Posts, while fictional dog perspective supplies character-based creative writing. Format and fictional content both concern the requested output; no frozen priority resolves the overlap. |
| dolly:5021 | sys.communication_writing.speaking_conversation | UNCERTAIN_NEIGHBOR_BOUNDARY | The requested output is an authored fictional-character dialogue. Creative Writing includes scripts/characters; Speaking & Conversation also includes dialogue. Live communication is absent, but its broader dialogue scope cannot silently be narrowed. |
| dolly:13682 | sys.legal_civic.identity_documents | NO_EXPLICIT_NOMINATED_GOAL_SOURCE_ONLY | The actual goal is travel-packing necessity classification across multiple items. Passport is one item/background mention, without an identity-document procedure or document-specific goal. Trip Planning explicitly includes travel preparation. |
| dolly:3006 | sys.media_culture.film_tv | PLAUSIBLE_SOURCE_CANDIDATE | The current instruction asks which film won awards; the supplied context describes the screen work. Understanding screen works is eligible. Multiple-choice format alone is not a reason to exclude Film & TV; unrelated plot details remain background. |
| dolly:2173 | sys.media_culture.games | PLAUSIBLE_SOURCE_CANDIDATE | The requested game-to-platform/publisher categorization concerns video-game identities and platforms, explicitly within the Games core. Classification format does not remove the game-understanding goal. |
| dolly:7723 | sys.time_events.appointments_bookings | NO_EXPLICIT_NOMINATED_GOAL_SOURCE_ONLY | The current action is writing a fictional phone dialogue; arranging a doctor's appointment occurs inside that authored scene. No booking action or current user's appointment request exists. This does not establish a unique alternate gold label. |
| dolly:4045 | sys.time_events.time_management | UNCERTAIN_NEIGHBOR_BOUNDARY | Extraction concerns procrastination traits, permitted as understanding rather than execution. Personal Productivity and Chinese Time Management both include procrastination; general extraction form alone cannot reject either or supply a unique boundary. |

Accepted fixture/gold: 0. CIG-02 unfrozen; CIG-03 blocked. Prior genuine FAIL/DEV_UNQUALIFIED and zero-model/local-first/tiny contract remain unchanged.
