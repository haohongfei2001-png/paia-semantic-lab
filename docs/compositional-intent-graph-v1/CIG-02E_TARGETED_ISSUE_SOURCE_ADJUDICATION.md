# CIG-02E targeted issue-source adjudication

This bounded source-only pass follows the [144-Topic feasibility result](./CIG-02E_SOURCE_FEASIBILITY_ANALYSIS.md). It checks whether publicly visible, independently authored GitHub issues can fill the most acute natural-request gaps. The issue search is a discovery channel, not a sampled corpus, fixture, gold set, router score, or capability claim. No issue body is copied into this repository; URLs below identify the reviewed source. Issue text can change, and no license for reuse as DEV fixture text has been established.

## Adjudication rule

The **whole user request** must express the formal Topic as its goal. A caregiving or photo-archive situation used only to motivate a software feature does not turn that feature request into a caregiving or archive gold row. A project user-story template is not independently observed natural expression. A technical bug, config, or storage question is judged by the requested action, not by background nouns. Mark a genuinely separable current goal `UNCERTAIN` until source authorship, immutable snapshot, reuse basis, and neighboring-Topic boundary are resolved. `REJECT` below means reject as a fixture row for the nominated Topic, not a judgment of the issue's value.

| Sparse Topic | Public issue | Decision | Boundary reason |
| --- | --- | --- | --- |
| Family caregiving/support | [careturn-issues #40](https://github.com/abbasali-io/careturn-issues/issues/40) | UNCERTAIN; not fixture eligible | First-person need to arrange care for a father appears in the scenario, but the actual request asks for an address-selection feature in a care platform. The whole request competes with a product-feature goal. |
| Family caregiving/support | [momilove #1](https://github.com/acesonder/momilove/issues/1) | REJECT | Caregiver context motivates a request to build a web application; software creation is the operative goal. |
| Family caregiving/support | [Deskflow #5983](https://github.com/deskflow/deskflow/issues/5983) | REJECT | Caregiving is background for troubleshooting a failing software client. |
| Photo/media archive | [Memories #1467](https://github.com/pulsejet/memories/issues/1467) | REJECT | Existing personal photo folders motivate automatic album-generation functionality in an application. |
| Photo/media archive | [TagFS #49](https://github.com/mwatts15/TagFS/issues/49) | REJECT | A photo archive is background for a filesystem mount and preservation question. |
| Photo/media archive | [Nextcloud iOS #1904](https://github.com/nextcloud/ios/issues/1904) | REJECT | The request is for an application export integration. |
| Life planning | [OpenTodoList #25](https://github.com/mhoeher/opentodolist/issues/25) | REJECT | A personal planning phrase supports a duplicate-task feature request, not a life-stage planning request. |
| Trip records | [CS361 #1](https://github.com/hcmend/CS361/issues/1) | REJECT | The text is a project user-story template about creating an app entry, not an observed traveler asking to document a trip. |
| Major purchases | [BudgetSimple #33](https://github.com/boneburrito/budgetsimple/issues/33) | REJECT | An application backlog sketch is not a person deciding on a current high-impact purchase. |

The candidate search was deliberately bounded to first-person phrases for the two zero-lexical-hit Topics and several other sparse Topics. The reviewed issues show a systematic **means/goal confound**: repositories collect requests to change software, while personal intents often appear only as motivation. The list is illustrative, not an estimate of GitHub issue prevalence. No accepted source-separated row was found in this pass, so the two zero-hit Topic gaps remain unfilled. This does not prove that natural requests for those Topics do not exist.

## Next evidence step

Seek sources whose primary content is a person's request rather than a software project issue; verify an immutable source snapshot and reuse rights before using any text. Independently adjudicate whole requests, neighboring Topics, ambiguous goals, and insufficient-evidence controls. Keep candidate code unopened against prospective fixture text. Only after full-Catalog source sufficiency should fixture, gold, candidate, scorer, and hashes freeze ahead of a first scored DEV. The original capability floors remain unchanged. CIG-02 is unfrozen and CIG-03 remains blocked.
