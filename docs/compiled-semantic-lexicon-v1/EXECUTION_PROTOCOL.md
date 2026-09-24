# Unattended Execution Protocol

This package is designed for ChatGPT Work to operate for hours without routine
owner intervention.

## Authorization model

Registration of this plan does **not** start execution.

A later owner message may authorize the whole public package in one sentence.
When that happens, CSL-00 through CSL-06 become one continuous bounded
authorization.

Work MUST auto-continue between public rounds when the transition is already
defined here. It must not pause merely to ask permission to:
- create/update the current round branch/PR;
- fix implementation defects;
- rerun targeted tests;
- resolve merge conflicts;
- retry transient GitHub failures;
- merge a round whose required exact-head CI passed;
- start the next preauthorized public round;
- close a genuine public FAIL and follow the predeclared CSL-03 -> CSL-04 path.

## Single-writer rule

Exactly one active CSL writer.

At most one execution PR per round.
Do not create competing branches/PRs for the same round.

Remote GitHub `main` is the source of truth before every round.

## Round lifecycle

For each public round:

1. re-read remote main + canonical CSL status;
2. create/use exactly one round branch;
3. implement the bounded round;
4. run fast targeted tests;
5. fix ordinary engineering defects autonomously;
6. open/update one PR;
7. require exact PR-head round CI;
8. merge when required gates pass;
9. require exact merged-main closure CI;
10. write closure receipt/status;
11. re-read remote main;
12. immediately begin the next authorized public round.

No artificial waiting between rounds.

## Test/CI efficiency

Avoid repeating the entire historical Semantic Lab suite on every small commit.

Preferred structure:
- inner loop: CSL-targeted unit/behavior tests only;
- PR promotion gate: current CSL round + critical shared guards;
- merged-main closure: one full historical regression.

Work may refactor CI to path/round-scoped jobs if behavior and existing closure
evidence are not weakened.

## Failure handling

### Engineering/infrastructure failures

Do not stop for:
- syntax/type/test implementation bugs;
- deterministic build failures;
- merge conflicts;
- stale locators/paths;
- transient GitHub/API/network errors;
- non-required historical workflows that are correctly skipped.

Fix/retry autonomously. For transient remote failures, retry up to 3 times with
bounded backoff before treating access as unavailable.

### Capability failures

Do not “fix the test”.

- DEV failures can be repaired inside the round budget.
- CSL-03 blind TEST failure automatically transitions to CSL-04.
- CSL-04 fresh TEST-v2 failure is terminal PUBLIC COMPLETE/FAIL.

Never tune on a consumed blind TEST.

## Hard stop conditions

Work MUST stop and report instead of acting when any of these is reached:

1. private 80-record calibration access (CSL-07);
2. opening the 13 legacy evaluation records (CSL-08);
3. any access to the consumed 35-case lockbox;
4. PAIA production repository/runtime modification;
5. new paid external service, billing commitment, or payment method;
6. new external credentials/security approval that requires the owner;
7. changing the frozen product premise to ship a neural model or remote
   semantic service;
8. terminal CSL-04 public capability FAIL;
9. a persistent repository access failure after bounded retry.

Everything else inside CSL-00..06 is an engineering/product-development
decision Work should make itself.

## Evidence integrity

- LSR-01 consumed public TEST is historical evidence only and cannot be reused
  as a promotion set.
- Every blind CSL test must have a pre-open freeze receipt.
- The evaluation generator must use the restricted evaluator manifest only.
- Production lexicon text must not be copied into evaluator prompts.
- Exact failed test phrases must not be patched into the production lexicon.
- All generated assets record source class, generator mode and build digest.

## Owner-attention budget

CSL-00..06 require no owner Input->Topic labeling and no repeated semantic
judgment.

Only real product-direction changes, private evidence gates, paid commitments,
security actions or terminal public failure require owner attention.
