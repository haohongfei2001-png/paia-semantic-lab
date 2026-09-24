# CSL-04 TEST v2 result

The sole allowed post-TEST-v1 repair used aggregate failure classes only. The static index, zero-model premise, zero-network runtime, frozen capability gates and scoring definitions were retained. A deterministic sparse-evidence runtime was added as a separate candidate.

The candidate, evaluator source, 396-case fixture, metric definitions and one-shot scorer were bound in `CSL-04_PRE_OPEN_FREEZE.json` and `CSL-04_SCORER_FREEZE.json` before scoring. GitHub Actions run 36002512446 invoked the frozen scorer once at PR head `e5a1d2788e4e07bd610f643323f1191533da6307`; the committed result is its logged artifact.

| Frozen public gate | TEST v2 | Required | Verdict |
| --- | ---: | ---: | --- |
| Assigned precision | 0.9397 | >= 0.95 | FAIL |
| Auto-assignment coverage, 288 single-label cases | 0.5903 | >= 0.70 | FAIL |
| Topic macro-recall, 144 Topics | 0.5556 | >= 0.70 | FAIL |
| Insufficient-evidence false assignment | 0 | <= 0.02 | PASS |
| Context harm events | 2 | 0 | FAIL |
| Deterministic repeat | true | true | PASS |

Multi-label precision and recall were both 0 and are reported separately. The result has 118/288 unassigned single-label cases and 10 wrong single-label assignments. It is a genuine public capability FAIL. No further repair round, threshold change, gold edit, or TEST-v2 rerun is allowed in this package. CSL-05 and CSL-06 are blocked; CSL-07 through CSL-09 remain unauthorized.

The evaluator builder read only the restricted formal manifest and separately authored v2 expressions; it did not read TEST v1, the production lexicon or DEV files. The same writer authored both candidate and evaluator text. A post-freeze audit found two v2 authored expressions exactly matching public DEV inputs; this weakens evaluator independence and is recorded rather than concealed. Even a two-case correction cannot close the coverage or macro-recall gaps, and context harm is independently nonzero. The FAIL verdict is robust to this limitation.
