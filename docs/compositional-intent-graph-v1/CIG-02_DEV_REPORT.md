# CIG-02 fresh public DEV grounding comparison

A new 54-case public DEV fixture contains 18 goal/means requests, 18 natural requests, and 18 insufficient-evidence controls. It shares no CIG-01 case file. The frozen CSL-04 index/runtime is held fixed as a diagnostic lexical control; the CIG-01 parser is held fixed as the role component. GitHub Actions run `36016654502` produced the stored result.

| Diagnostic | Flat frozen control | Goal-first with the same grounder |
| --- | ---: | ---: |
| Correct role requests | 7/18 | 7/18 |
| Role-request assignment coverage | 7/18 | 8/18 |
| Correct natural requests | 7/18 | 7/18 |
| Natural-request assignment coverage | 9/18 | 9/18 |
| Assigned precision across all cases | 0.7778 | 0.7368 |
| False assignment on should-DEFER controls | 2/18 | 2/18 |

The parser extracted the annotated goal span on **18/18** role requests. Yet the fixed lexical grounder correctly assigned only 7/18 of those requests after role extraction; one additional role assignment was wrong. The goal-first composition did not improve correct coverage and reduced assigned precision on this DEV fixture. It therefore does not qualify as a 144-Topic candidate.

This result narrows the observed bottleneck: role recovery is possible on explicit public DEV syntax, but the available local span-to-Topic grounding is inadequate, and DEFER safety remains unresolved. CIG-01's same-template success does not translate into capability. The result does not establish a universal limit for zero-model routing; the 54 cases are small, same-writer public DEV and may be used for development diagnosis only. No capability floor or scoring definition was changed.

Next, CIG-02B should test a compact typed semantic-atom grounder over **all 144 Topics**, with globally defined evidence rules, contrastive conflict handling and no per-case phrase patches. It must use a new public DEV slice for selection and later a separately frozen independent blind public test for promotion. The consumed CIG-01 probe and LSR/CSL TEST v1/v2 are excluded from tuning.
