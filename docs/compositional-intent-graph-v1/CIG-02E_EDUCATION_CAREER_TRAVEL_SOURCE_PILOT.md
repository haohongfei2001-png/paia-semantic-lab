# CIG-02E education, career and travel source intake

This coherent source batch reviews the first two existing queue nominations for all 24 Topics in D04/D05/D10, without replacement. Trip Records has only one selected sample, so the total is **47 nominations / 45 distinct source rows**, not 48. Selection uses immutable queue job `108002125705`, exact-head `e5a6f4c56ef882208b9bf6fe06a209058045689b`. No new lexical scan, gold, router prediction, fresh score or capability TEST is performed.

The [manifest](../../artifacts/compositional-intent-graph-v1/CIG-02E_EDUCATION_CAREER_TRAVEL_SOURCE_PILOT.json) records source IDs/hashes, official input mappings and reasons. The original Dolly [provenance and rights](./CIG-02E_DOLLY_PROVENANCE.md) remain applicable only to exact official inputs. Nine mismatched nominations are quarantined without semantic judgment. Six Alpaca nominations retain their existing queue IDs/hashes only; their full text and semantic eligibility are not reviewed in this human-source batch. The identity workflow explicitly reports them as unverified rather than indexing them into Dolly.

| Disposition | Nominations |
| --- | ---: |
| REJECT_FOR_NOMINATED_TOPIC | 23 |
| SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | 6 |
| QUARANTINED_SOURCE_INPUT_MISMATCH | 9 |
| PLAUSIBLE_SOURCE_CANDIDATE | 3 |
| ALREADY_REJECTED_NO_NEW_ADJUDICATION | 1 |
| UNCERTAIN_NEIGHBOR_BOUNDARY | 4 |
| UNCERTAIN_TASK_VS_TOPIC | 1 |
| **Total** | **47** |

Three plausible source candidates concern job-interview questions, activities in a named destination, and a direct destination travel-plan request. They are **not accepted fixture rows or independent gold**. The CIG developer performed boundary review; source language authorship is independent of CIG, but annotation is not.

The dominant failures are word-sense collisions and background mentions: software applications versus job applications, Food Network/WiFi versus professional networking, corporate growth versus employee performance, train class versus academic class, and civic registration versus academic administration. A fictional or authored output does not automatically provide a current intent for its embedded domain. Prior rejections remain immutable, and the same exercise-training request is not counted as a new independent expression when nominated under both exams and skills.

## Deferred long request follow-up

The prior [three-domain pilot](./CIG-02E_THREE_DOMAIN_SOURCE_PILOT.md) kept mirror `dolly:10835` as not fully reviewed. In the preceding recovery turn, the complete 11,698-character official request at row 10838 was read. It asks for JVM log summarization and significant anomaly identification; the public Debugging profile explicitly includes logs and anomalies. This follow-up records it as a plausible source candidate, pending independent gold. The earlier record stays unchanged, no runtime is executed, and no diagnosis of the logged system is used as a label.

This extra follow-up is outside the 47-nomination counts. It must not inflate the three new plausible candidates or full-Catalog coverage.

## Evidence and continuation

PR #50 merged at `68e46e7d2f1e0df649c87001022da3b43f89e49d` with all six applicable exact-main checks successful; its [receipt](../../artifacts/compositional-intent-graph-v1/CIG-02E_THREE_DOMAIN_SOURCE_PILOT_MERGED_MAIN_RECEIPT.json) preserves exact-head and exact-main jobs. The 48 prior nominations were source-identity verified, not semantically certified.

The two broad domain batches now cover intake **review status** for 48 of 144 Topics. This is not accepted-gold coverage: all 144 still lack a registered full-Catalog fixture. Continue the remaining 96 Topics from immutable queue IDs in coherent batches, carry forward the 18 sparse gaps, and independently adjudicate plausible/uncertain requests before gold registration. Unverified synthetic nominations and quarantined inputs need their own provenance and full-request decisions; counts alone cannot fill gaps. Natural ambiguity, insufficient-evidence and context controls also remain unregistered.

Candidate/fixture/gold/scorer hashes must freeze before any fresh DEV score. Retain the existing floors and CIG-02B/C/D unqualified results; CIG-02 is unfrozen and CIG-03 blocked.

## Decisions

| Topic | Source row | Official input row | Decision | Reason |
| --- | --- | --- | --- | --- |
| applications | dolly:490 | 490 | REJECT_FOR_NOMINATED_TOPIC | Requests business proposal authoring for software integration, not a job application. |
| applications | dolly:2718 | 2718 | REJECT_FOR_NOMINATED_TOPIC | Applications means uses of game theory in basketball, not job applications. |
| career_strategy | alpaca:19606 | none | SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | Only an existing queue ID/hash is carried forward; full source, reuse basis and semantic boundary are not reviewed in this human-source batch. |
| career_strategy | alpaca:43723 | none | SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | Only an existing queue ID/hash is carried forward; full source, reuse basis and semantic boundary are not reviewed in this human-source batch. |
| compensation_benefits | dolly:14577 | 14580 | REJECT_FOR_NOMINATED_TOPIC | LLM organizational benefits are not employment remuneration; prior rejection for a different Topic is not reused as gold. |
| compensation_benefits | dolly:8110 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| interviews | dolly:3357 | 3357 | REJECT_FOR_NOMINATED_TOPIC | Asks reasons for a civic scooter-ban proposal; an interview occurs inside supplied news, not a job-interview goal. |
| interviews | dolly:2779 | 2779 | PLAUSIBLE_SOURCE_CANDIDATE | Directly requests questions to use in a job interview. |
| job_search | dolly:6729 | 6729 | REJECT_FOR_NOMINATED_TOPIC | Asks duties of a football official; role does not establish job discovery. |
| job_search | dolly:13981 | 13984 | REJECT_FOR_NOMINATED_TOPIC | Requests weapons for role-playing games, not job discovery. |
| networking_professional | dolly:2798 | 2798 | REJECT_FOR_NOMINATED_TOPIC | Food Network is a television channel, not professional relationship building. |
| networking_professional | dolly:10962 | 10965 | REJECT_FOR_NOMINATED_TOPIC | Requests home WiFi network understanding, not professional contacts. |
| performance_growth | dolly:11711 | 11714 | REJECT_FOR_NOMINATED_TOPIC | Requests an accommodation review, not employee performance feedback. |
| performance_growth | dolly:2035 | 2035 | REJECT_FOR_NOMINATED_TOPIC | Extracts corporate revenue metrics, not personal workplace performance. |
| workplace_daily | dolly:13081 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| workplace_daily | dolly:12165 | 12168 | REJECT_FOR_NOMINATED_TOPIC | Requests a corporate office location, not a day-to-day workplace issue. |
| academic_admin | dolly:13515 | 13518 | ALREADY_REJECTED_NO_NEW_ADJUDICATION | PR #48 rejected this exact nomination: civic voter registration is not academic administration. |
| academic_admin | alpaca:13460 | none | SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | Only an existing queue ID/hash is carried forward; full source, reuse basis and semantic boundary are not reviewed in this human-source batch. |
| academic_courses | dolly:4515 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| academic_courses | dolly:2511 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| exams_assessments | dolly:12315 | 12318 | UNCERTAIN_NEIGHBOR_BOUNDARY | Grade-10 ratio-problem authoring could be coursework or assessment material; no exam use is stated. |
| exams_assessments | dolly:12374 | 12377 | REJECT_FOR_NOMINATED_TOPIC | Exercise test and training physiology do not establish academic exam preparation or skill-acquisition intent. |
| language_learning | dolly:11358 | 11361 | REJECT_FOR_NOMINATED_TOPIC | Requests recruiter self-introduction drafting, not language acquisition. |
| language_learning | dolly:9344 | 9347 | UNCERTAIN_NEIGHBOR_BOUNDARY | Grammar correction could be proofreading or language learning; no learning purpose is explicit. |
| learning_methods | alpaca:39399 | none | SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | Only an existing queue ID/hash is carried forward; full source, reuse basis and semantic boundary are not reviewed in this human-source batch. |
| learning_methods | alpaca:19856 | none | SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | Only an existing queue ID/hash is carried forward; full source, reuse basis and semantic boundary are not reviewed in this human-source batch. |
| reading_learning | dolly:11101 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| reading_learning | dolly:12290 | 12293 | REJECT_FOR_NOMINATED_TOPIC | Requests persuading a parent to allow a cellphone; reading books is a concern, not the current learning goal. |
| skill_learning | dolly:12374 | 12377 | REJECT_FOR_NOMINATED_TOPIC | Exercise test and training physiology do not establish academic exam preparation or skill-acquisition intent. |
| skill_learning | dolly:14888 | 14891 | REJECT_FOR_NOMINATED_TOPIC | Requests exercise-training rationale, not acquiring a practical or professional skill. |
| thesis_research | dolly:12105 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| thesis_research | dolly:11622 | 11625 | REJECT_FOR_NOMINATED_TOPIC | Requests household waste sorting, not scholarly research. |
| attractions_activities | dolly:3293 | 3293 | PLAUSIBLE_SOURCE_CANDIDATE | Requests activities in a named destination, directly within travel attractions and things to do. |
| attractions_activities | dolly:13874 | 13877 | REJECT_FOR_NOMINATED_TOPIC | Requests driving performance technique on a track, not destination attraction planning. |
| local_navigation | dolly:10340 | 10343 | REJECT_FOR_NOMINATED_TOPIC | Requests earthquake safety classification; an evacuation route is one possible action, not a local navigation goal. |
| local_navigation | dolly:193 | 193 | REJECT_FOR_NOMINATED_TOPIC | Requests a historical accident-route fact, not navigating a current local route. |
| lodging | dolly:5785 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| lodging | dolly:2725 | 2725 | REJECT_FOR_NOMINATED_TOPIC | Gym/bar item sorting does not concern accommodation choice or booking. |
| restaurants_travel | dolly:1301 | 1301 | UNCERTAIN_TASK_VS_TOPIC | Cuisine-category sorting lacks a travel dining decision; generic task-versus-Topic review remains necessary. |
| restaurants_travel | dolly:2561 | 2561 | REJECT_FOR_NOMINATED_TOPIC | Requests restaurant review authoring without a travel dining choice. |
| transport_travel | dolly:2967 | 2967 | UNCERTAIN_NEIGHBOR_BOUNDARY | Flight packing is travel preparation, but intercity transport versus Trip Planning is unresolved. |
| transport_travel | dolly:4515 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| trip_planning | dolly:5031 | 5031 | PLAUSIBLE_SOURCE_CANDIDATE | Directly requests a travel plan for a named destination; no competing authoring-only context is supplied. |
| trip_planning | dolly:12279 | 12282 | REJECT_FOR_NOMINATED_TOPIC | Extracts historical emigration destinations, not designing a current trip. |
| trip_records | alpaca:34879 | none | SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING | Only an existing queue ID/hash is carried forward; full source, reuse basis and semantic boundary are not reviewed in this human-source batch. |
| visas_border | dolly:12485 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context match; no semantic verdict or source substitution. |
| visas_border | dolly:1123 | 1123 | UNCERTAIN_NEIGHBOR_BOUNDARY | Broad immigration-system judgment could be civic policy rather than personal visa or travel-document requirements. |
