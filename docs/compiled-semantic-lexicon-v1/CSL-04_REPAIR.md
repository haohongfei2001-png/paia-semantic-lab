# CSL-04 bounded repair record

The sole allowed post-TEST-v1 repair targets the aggregate CSL-03 failure class: insufficient assignment on natural paraphrases. It does not use TEST-v1 utterance text, per-case labels, or any private artifact.

## Candidate

The CSL-02 compiler output remains unchanged. A separate deterministic JS router recovers evidence from informative Chinese bigrams and English words already present in the compiled public index. Tokens shared across too many Topics are ignored; assignment requires multiple hits, a minimum evidence score, and separation from the runner-up. Content-poor continuation keeps the frozen context path. The production candidate has no model asset or semantic network dependency.

The public DEV diagnostic on the first candidate gave assigned precision 0.6897, coverage 0.4500, represented-Topic macro recall 0.3519, insufficient-evidence false assignment 0.1667, zero context harm, and deterministic repeat. These are unqualified development numbers. They are not TEST-v2 evidence, and the capability gates remain unchanged.

## Evaluation separation

Fresh TEST v2 expressions are authored from the restricted formal manifest, stored in a separate source file, and materialized by a builder whose only inputs are that manifest and the new source file. The source and fixture have 288 single-label cases, 72 context cases, 18 multi-label cases, and 18 should-DEFER cases. The same writer prepared candidate and evaluator text, so file-level separation does not provide independent human authorship. The one-shot scorer remains blocked until a pre-open receipt binds the candidate, evaluator, metric definitions, and scorer.

No TEST-v1 case is a regression or promotion case. No metric, gold label, or threshold is relaxed to respond to a FAIL.
