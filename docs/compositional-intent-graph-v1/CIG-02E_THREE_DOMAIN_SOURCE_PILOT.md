# CIG-02E three-domain source-boundary pilot

## Scope and source separation

This is a coherent 24-Topic intake batch across D03 Health & Wellbeing, D07 AI & Computing, and D09 Home & Daily Life. For each Topic it takes the **first two existing deterministic samples**, without replacement, from the full-Catalog queue on exact-head `e5a6f4c56ef882208b9bf6fe06a209058045689b`, Actions job `108002125705`. The selection is 48 Topic nominations containing 47 distinct mirror rows (the vaccine request occurs in two Topic queues). It is not a random or representative sample, and no new lexical retrieval was performed.

Source rights and identity use the [official historical Dolly data card and snapshot](./CIG-02E_DOLLY_PROVENANCE.md). Only exact instruction/context matches can remain plausible candidates. Full-row identity is not assumed, response content is not used as gold, and differing mirror inputs are quarantined without replacement. Source text is not copied here; the [manifest](../../artifacts/compositional-intent-graph-v1/CIG-02E_THREE_DOMAIN_SOURCE_PILOT.json) records queue instruction hashes and official input row IDs. The targeted Actions job verifies those identities against pinned Git blobs before any later fixture construction.

Databricks contributors authored the source language independently of CIG. The CIG developer made this **source-boundary** review. It is not independent gold adjudication; no final labels, scores, fixture acceptance or full-Catalog capability result are produced.

## Results

| Disposition | Topic nominations |
| --- | ---: |
| Plausible source candidate, pending gold adjudication | 10 |
| Uncertain neighboring-Topic boundary | 9 |
| Uncertain generic task versus Topic boundary | 4 |
| Rejected for nominated Topic | 16 |
| Prior Local Errands rejection preserved; no new adjudication | 2 |
| Quarantined: no exact official instruction/context pair | 6 |
| Long request not completely reviewed | 1 |
| **Total** | **48** |

The ten plausible candidates concern nine distinct Topics: AI models/tools, software development, cybersecurity/privacy, data systems, debugging/logs, mental wellbeing, nutrition, chores/laundry and moving/relocation. These counts are **not** accepted gold or coverage. Broad questions, neighboring Topics and the validity of treating an instruction-task subject as a real primary goal still require final adjudication. Medical content is classified only as source intent; no medical answer, recommendation or correctness judgment is made.

Generic equipment/category sorting is treated consistently as unresolved task-versus-Topic evidence. A task may describe exercise or cleaning while asking for an artificial classification output; those rows are not silently promoted because anchors match. Conversely, direct understanding questions are not automatically rejected merely for being definitions: public profiles permit understanding, and log-related goals are explicitly in the Debugging semantic core. Domain facts such as national power generation do not establish management of household utility services.

The same vaccination request occurs under Medication & Treatment and Preventive Health. Both nominations remain uncertain rather than becoming two single-label examples. The earlier Local Errands rejects and the two PR #48 social-interaction/project-milestone uncertainties remain unchanged. The 11,698-character GC-log request has not been completely reviewed in this bounded pass and has no semantic verdict. Long requests are not globally excluded or treated as a protocol limit.

## All-Catalog intake plan and controls

- Carry forward the 18 sparse-Topic gaps and earlier rejections; the three-domain batch does not resolve them. Quarantined rows require an exact authoritative input and full review before use; do not substitute snapshots or alter prior evidence.
- Review the remaining 120 Topics from existing immutable queue IDs in coherent domain batches. Treat absence of plausible selected samples as a source gap, not proof of semantic absence. New source families must pass the existing provenance/direct-request/manual-pilot gate.
- Keep per-Topic expression count and source-family separation visible. Two lexical samples, a duplicate across Topics, or a plausible candidate do not satisfy full-144 fixture readiness. Source inventory alone cannot establish macro recall.
- Independently adjudicate neighboring Topics and generic task boundaries before registering gold. The CIG developer's intake decisions are not independent annotation.
- Source genuinely underspecified and competing-goal requests for DEFER controls, and natural context pairs for context-harm checks. Existing label conflicts are flags for review, not automatically labeled DEFER controls. Do not fabricate controls by trimming a source until it changes meaning.
- Freeze full fixture text, gold, candidate and scorer hashes before any first scored fresh DEV. The 0.95 precision, 0.70 coverage, 0.70 Topic macro recall, 0.02 insufficient-evidence false-assignment ceiling and zero context harm remain unchanged.

No runtime, formal Topic, floor or frozen protocol is changed. CIG-02B/C/D unqualified results and LSR/CSL FAILs remain immutable. CIG-02 is unfrozen; CIG-03 is blocked.

## Row decisions

| Topic | Mirror row | Official input row | Disposition | Reason |
| --- | --- | --- | --- | --- |
| ai_models_tools | dolly:1015 | 1015 | PLAUSIBLE_SOURCE_CANDIDATE | Requests understanding of the Transformer model's central mechanism, rather than merely using AI as background. |
| ai_models_tools | dolly:2572 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context pair at the pinned snapshot; no semantic verdict or silent source substitution. |
| coding_software_development | dolly:5120 | 5120 | PLAUSIBLE_SOURCE_CANDIDATE | Directly compares programming languages; broad wording lacks selection criteria but the software-development subject is explicit. |
| coding_software_development | dolly:9488 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context pair at the pinned snapshot; no semantic verdict or silent source substitution. |
| cybersecurity_privacy | dolly:14298 | 14301 | PLAUSIBLE_SOURCE_CANDIDATE | Requests browser options specifically for privacy protection; device/platform context does not replace that goal. |
| cybersecurity_privacy | dolly:6426 | 6426 | UNCERTAIN_NEIGHBOR_BOUNDARY | Privacy-policy judgment concerns census statistics as well as privacy; independent neighboring-Topic gold adjudication is required. |
| data_systems | dolly:10560 | 10563 | PLAUSIBLE_SOURCE_CANDIDATE | Requests an explanation of a database schema, directly within data models and databases. |
| data_systems | dolly:4323 | 4323 | PLAUSIBLE_SOURCE_CANDIDATE | Requests an explanation of a data pipeline, directly within data-processing architecture. |
| debugging_troubleshooting | dolly:4970 | 4970 | PLAUSIBLE_SOURCE_CANDIDATE | Requests understanding of log rotation; the Debugging profile explicitly includes logs, not only active error repair. |
| debugging_troubleshooting | dolly:10835 | 10838 | NOT_FULLY_REVIEWED | The 11,698-character log request was not completely displayed in the bounded review; no semantic eligibility decision is recorded. |
| hardware_devices | dolly:2967 | 2967 | REJECT_FOR_NOMINATED_TOPIC | Flight packing is the requested decision; the phone is only one possible item, not a device goal. |
| hardware_devices | dolly:9681 | 9684 | UNCERTAIN_NEIGHBOR_BOUNDARY | Ways to make a phone call can concern device use, connectivity, or communication; no specific hardware decision is supplied. |
| networking_connectivity | dolly:12082 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context pair at the pinned snapshot; no semantic verdict or silent source substitution. |
| networking_connectivity | dolly:8586 | 8588 | REJECT_FOR_NOMINATED_TOPIC | Primary task assesses security controls; VPN is one item, not a connectivity goal. |
| prompt_workflows | dolly:6649 | 6649 | REJECT_FOR_NOMINATED_TOPIC | Fictional character's education is the requested fact; agent is not an AI workflow. |
| prompt_workflows | dolly:4333 | 4333 | REJECT_FOR_NOMINATED_TOPIC | Fictional character's diagnosis is the requested fact; agent is not an AI workflow. |
| fitness | dolly:4682 | 4682 | UNCERTAIN_TASK_VS_TOPIC | A generic item-classification exercise includes exercise equipment, but its eligibility as a fitness goal requires separate adjudication. |
| fitness | dolly:12374 | 12377 | UNCERTAIN_NEIGHBOR_BOUNDARY | Exercise adaptation explanation is relevant, but coaching response generation, fitness, and physiological knowledge overlap. |
| medical_care | dolly:12557 | 12560 | REJECT_FOR_NOMINATED_TOPIC | Classifies game characters; Doctor is part of a name, not a healthcare goal. |
| medical_care | dolly:7723 | 7724 | REJECT_FOR_NOMINATED_TOPIC | Requests authoring a fictional dialogue; the appointment is story content, not current care seeking. |
| medication_treatment | dolly:4013 | 4013 | UNCERTAIN_NEIGHBOR_BOUNDARY | The same request is nominated for both treatment and prevention. Vaccination eligibility and product selection cannot be assigned twice by lexical nomination. |
| medication_treatment | dolly:620 | 620 | UNCERTAIN_NEIGHBOR_BOUNDARY | Generic therapy benefits lack the intended condition or purpose; treatment, preventive health, and cosmetic goals may compete. |
| mental_wellbeing | dolly:13679 | 13682 | PLAUSIBLE_SOURCE_CANDIDATE | Requests understanding of an effect on mood, directly within mental wellbeing; no personal diagnosis is inferred. |
| mental_wellbeing | dolly:9833 | 9836 | UNCERTAIN_TASK_VS_TOPIC | Generic disease-category sorting is not clearly an emotional-regulation/support goal; medicine knowledge is a neighboring possibility. |
| nutrition | dolly:5447 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context pair at the pinned snapshot; no semantic verdict or silent source substitution. |
| nutrition | dolly:12373 | 12376 | PLAUSIBLE_SOURCE_CANDIDATE | Requests dietary item choice for an explicit weight-loss diet. Source answer correctness is not evaluated or used. |
| preventive_health | dolly:4013 | 4013 | UNCERTAIN_NEIGHBOR_BOUNDARY | The same request is nominated for both treatment and prevention. Vaccination eligibility and product selection cannot be assigned twice by lexical nomination. |
| preventive_health | dolly:9778 | 9781 | UNCERTAIN_NEIGHBOR_BOUNDARY | Asks vaccine efficacy knowledge without a current prevention decision; prevention and medicine knowledge need gold boundary review. |
| sleep | dolly:12487 | 12490 | REJECT_FOR_NOMINATED_TOPIC | Asks bird behavior, not a human sleep habit or sleep-quality goal. |
| sleep | dolly:939 | 939 | REJECT_FOR_NOMINATED_TOPIC | Classifies Stephen King works; sleep terms occur only in titles. |
| symptoms_conditions | dolly:4027 | 4027 | REJECT_FOR_NOMINATED_TOPIC | Requests paraphrase/summarization of news; health conditions are background in the quoted story. |
| symptoms_conditions | dolly:8009 | 8010 | REJECT_FOR_NOMINATED_TOPIC | Classifies cold-weather gear; condition occurs in air conditioning rather than a symptom goal. |
| chores_cleaning | dolly:6817 | 6817 | PLAUSIBLE_SOURCE_CANDIDATE | Requests laundry detergent options, directly relevant to performing laundry; purchase-versus-chore boundary remains for later gold review. |
| chores_cleaning | dolly:12031 | 12034 | UNCERTAIN_TASK_VS_TOPIC | Generic useful/not-useful sorting in a cleaning scenario requires the same task-versus-Topic adjudication as exercise-equipment sorting. |
| home_improvement | dolly:12992 | 12995 | REJECT_FOR_NOMINATED_TOPIC | Current request is letter drafting; faucet repair is the message's content. Do not replace the writing goal with its motivation. |
| home_improvement | dolly:14421 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context pair at the pinned snapshot; no semantic verdict or silent source substitution. |
| housing | dolly:11926 | 11929 | UNCERTAIN_NEIGHBOR_BOUNDARY | Homeowner maintenance responsibilities overlap Housing, Home Improvement, and Chores rather than unambiguously establishing Housing. |
| housing | dolly:10565 | 10568 | UNCERTAIN_NEIGHBOR_BOUNDARY | Home automation explanation overlaps hardware, networking and home improvement; home mention alone does not establish Housing. |
| local_errands | dolly:9127 | 9129 | ALREADY_REJECTED_NO_NEW_ADJUDICATION | PR #48 rejected the same row for Local Errands; preserve the existing decision rather than count repeated review as new evidence. |
| local_errands | dolly:11080 | 11083 | ALREADY_REJECTED_NO_NEW_ADJUDICATION | PR #48 rejected the same row for Local Errands; preserve the existing decision rather than count repeated review as new evidence. |
| moving_relocation | dolly:10181 | 10184 | PLAUSIBLE_SOURCE_CANDIDATE | Asks about living in a different city explicitly for a person relocating, rather than merely sightseeing. |
| moving_relocation | dolly:6800 | none | QUARANTINED_SOURCE_INPUT_MISMATCH | No exact official instruction/context pair at the pinned snapshot; no semantic verdict or silent source substitution. |
| possessions_organization | dolly:14577 | 14580 | REJECT_FOR_NOMINATED_TOPIC | Requests organizational LLM build-versus-buy benefits; organization does not mean organizing personal possessions. |
| possessions_organization | dolly:2976 | 2976 | REJECT_FOR_NOMINATED_TOPIC | Requests hydrogen's boiling point; industrial hydrogen storage is not management of personal belongings. |
| transportation_ownership | dolly:4269 | 4269 | UNCERTAIN_TASK_VS_TOPIC | Car-manufacturer origin classification does not clearly establish vehicle use, choice, maintenance or ownership. |
| transportation_ownership | dolly:10340 | 10343 | REJECT_FOR_NOMINATED_TOPIC | Requests earthquake safety classification; a car is one candidate action, not the primary transport goal. |
| utilities_services | dolly:10667 | 10670 | REJECT_FOR_NOMINATED_TOPIC | Requests energy-source classification, not household utility service management. |
| utilities_services | dolly:5026 | 5026 | REJECT_FOR_NOMINATED_TOPIC | Requests national electricity-generation facts, not a household service decision. |
