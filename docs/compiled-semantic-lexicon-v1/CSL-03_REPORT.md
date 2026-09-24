# CSL-03 TEST v1 result

TEST v1 was frozen and hashed before scoring. The frozen CSL-02 runtime, index
and policy were evaluated exactly once. The result artifact contains only
aggregate metrics and failure classes, not failed utterance text.

| Public capability gate | Result | Required | Verdict |
| --- | ---: | ---: | --- |
| Assigned precision | 1.0000 | >= 0.95 | PASS |
| Auto-assignment coverage, 288 single-label cases | 0.0208 | >= 0.70 | FAIL |
| Macro recall, 144 Topics | 0.0208 | >= 0.70 | FAIL |
| Insufficient-evidence false assignment | 0 | <= 0.02 | PASS |
| Context harm events | 0 | 0 | PASS |
| Deterministic repeat within the one invocation | true | true | PASS |

Multi-label precision and recall were both zero and are reported separately.
The dominant failure class is missing evidence: 282/288 single-label cases
were not assigned and 48/72 context cases were not assigned. No incorrect
single-label assignments or context harm were observed. The candidate is
conservative but lacks generalization across natural paraphrases.

Verdict: **FAIL**. This is a real semantic-capability failure, not an
engineering or test failure. The preregistered transition is CSL-04's one
bounded structural repair, followed by a new TEST v2. TEST v1 wording is
consumed and must never be copied into the lexicon or rerun for promotion.

Source separation is enforced at the file-input level: the TEST generator
read only the restricted formal manifest and its separately authored
utterances. The same Work writer authored the candidate and evaluator text,
which is a residual independence limitation. This failure is too large for
that limitation to change the FAIL verdict.
