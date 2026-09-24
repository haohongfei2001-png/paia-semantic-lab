# CIG-01 fresh public synthetic identifiability probe

The candidate goal parser, newly authored public synthetic fixture, formal Topic manifest and scorer were hashed in `CIG-01_PRE_EVIDENCE_FREEZE.json` before one score. GitHub Actions run `36015639235` scored it once. The committed result was copied from that run's complete logged artifact. Later CI only verifies the stored result.

| Diagnostic | Result |
| --- | ---: |
| Balanced minimal-pair cases | 48 (24 opposite-gold pairs) |
| Identical bag-signature groups | 24/24 |
| Deterministic bag-only exact-label ceiling on those pairs | 50% |
| Goal-span extraction on pairs | 48/48 (100%) |
| Goal-span extraction on additional wording | 11/12 (91.67%) |
| Unsupported goal extraction on ambiguous controls | 0/12 |
| Formal-name-only local Topic grounding | 12/60 (20% coverage), 12/12 correct |
| Deterministic repeat | PASS |
| Parser source bytes | 1,260 |

The sole additional-wording failure was `h04`: the parser kept a means phrase after the goal. It is recorded as a structural boundary failure, not patched from the scored sample.

**Interpretation:** this controlled evidence confirms the information loss of a bag-only representation on balanced opposite-goal pairs. A tiny deterministic parser can recover explicitly marked goal roles in this synthetic setting. Formal-name-only grounding still misses most goal expressions even when role selection is available, so the next public research question is semantic grounding of the extracted goal span. The 20% control is deliberately weak and is not a ceiling for a richer public grounder. LSR and CSL aggregates independently show large deferral and partial-match confusion, but they do not prove that all zero-model routes fail.

**Limits:** the same writer designed the parser and fixture; the 48 balanced cases use explicit shared templates. The 12 additional wording cases are small and also not independent human-authored product evidence. This is a mechanism diagnostic, not a PASS for 144-Topic assignment, browser performance, or PAIA integration. CIG-01 is consumed and cannot become a CIG-02 tuning or promotion set. CIG-02 must use new public DEV expressions; a later capability claim requires a fresh independently authored blind suite and the unchanged product gates.

No consumed LSR/CSL TEST text, private calibration, legacy evaluation, lockbox, real archive or PAIA production was accessed.
