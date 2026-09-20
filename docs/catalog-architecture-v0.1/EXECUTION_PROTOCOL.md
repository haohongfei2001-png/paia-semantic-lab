# Semantic Catalog Architecture v0.1 — Execution Protocol

## Canonical source

Remote GitHub main is authoritative.

Canonical status:
status/SEMANTIC_CATALOG_ARCHITECTURE_STATUS.yaml

## Authorization

Only the round marked READY may execute.
READY is not authorization.
Each round requires a current explicit user execution message.
Completion of one round may make the next round READY but never authorizes it.

SCA-00 is the bootstrap round authorized by the user message that explicitly authorized continuation after REM-03B escalation.

## Formal/derived separation

Formal Topic Contract fields may not be silently rewritten.

Derived Semantic Profiles may contain AI-generated retrieval semantics only when:
- the referenced topic_id already exists;
- provenance marks the content as derived;
- the profile cannot create/merge/split/delete a formal Topic;
- explicit formal boundaries outrank derived content.

Any required formal-boundary change is a blocker and requires a separately authorized formal catalog review.

## Private-data rules

SCA-00 through SCA-02: private artifact reads = 0.
SCA-03: existing 80 calibration judgments require fresh explicit read-only authorization.
SCA-04: 13 legacy evaluation judgments may be read once only after SCA-03 PASS.
Consumed SEM-07 lockbox use for tuning/promotion = DENY.
Live PAIA archive read = DENY unless a future separately authorized package says otherwise.
Real Input API egress = DENY.
Raw private text/refs/vectors in Git = 0.

## Round closure

For each execution:
1. re-read remote main and canonical status;
2. verify current READY round and authorization;
3. execute only that round;
4. run validation;
5. commit sanitized evidence and status;
6. require exact-head CI PASS;
7. re-read remote canonical state;
8. STOP.
