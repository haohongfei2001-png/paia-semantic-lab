# Development Plan — PAIA-COMPILED-SEMANTIC-LEXICON-v1

## Design objective

Find out whether a **compiled static semantic lexicon** can close most of the
gap between the 123 KB LSR-01 runtime and large embedding models without
shipping any model.

The package deliberately separates:
- build-time semantic authorship;
- production index compilation;
- deterministic runtime;
- independent evaluation.

No public round may read private calibration, legacy evaluation, or consumed
lockbox records.

---

## CSL-00 — Protocol and Source-Separation Freeze

### Scope

Register the package and freeze the experiment before semantic generation.

Create:
- a restricted evaluator manifest containing only Topic IDs, canonical names,
  formal definitions and necessary formal boundaries;
- generator source classes;
- production-size and runtime gates;
- capability gates;
- fresh-test rules;
- automatic transition rules;
- maximum repair count.

### Frozen generation source classes

Production lexicon candidate expressions are produced from three independent
build-time views:

1. **natural-expression pass**
   - colloquial user requests;
   - implicit expressions that do not repeat Topic names;
   - ordinary Chinese and English phrasing.

2. **cross-lingual/form pass**
   - Chinese, English, mixed-language;
   - common abbreviations and lexical variants;
   - wording/form variation without synthetic template copying.

3. **contrastive pass**
   - neighboring intents;
   - background mentions;
   - tool-vs-goal distinctions;
   - phrases that should be weak, ambiguous or rejected.

The production generator may read the canonical Catalog and existing public
profiles, but must not read private/evaluation data.

### Evaluation separation

The blind evaluator receives only the restricted evaluator manifest. It must
not read:
- production lexicon candidates;
- compiled index;
- old same-source synthetic fixtures;
- consumed LSR-01 source-separated TEST;
- private/evaluation/lockbox data.

### Exit

PASS when protocol/guards are frozen and CSL-01 is executable.

---

## CSL-01 — Multi-Source Lexicon Generation and Compiler

### Scope

Build a deterministic lexicon-generation and compilation pipeline for all 144
Topics.

Work may use its own reasoning at build time to author candidate semantic
expressions. No external paid model/API is required.

Per Topic, target a bounded candidate pool rather than a hand-patched keyword
list:
- 60–120 positive natural expressions after filtering;
- 10–30 short phrase/anchor forms;
- 10–30 contrastive/ambiguous expressions;
- Chinese + English + useful mixed-language forms.

These are target ranges, not quotas to fill mechanically.

### Automatic filters

Implement:
- normalization and exact/near dedupe;
- source-span and paraphrase-family grouping;
- cross-Topic collision detection;
- generic-expression rejection;
- specificity scoring;
- phrase-length and information-density checks;
- same-domain collision reporting;
- “tool mentioned vs user goal” conflict checks.

Do not add a phrase merely because a benchmark case failed.

### Artifacts

- raw build-time lexicon source;
- provenance/source-class metadata;
- collision report;
- compiler;
- compact production index v1;
- deterministic rebuild digest.

### Exit

PASS if all 144 Topics compile deterministically, collision/duplication guards
work, and the production candidate remains under the package hard size ceiling.
No blind TEST is opened.

---

## CSL-02 — Public DEV Optimization and Compression

### Scope

Use a **development-only** public corpus to refine general policies.

Allowed to change:
- general filtering rules;
- global specificity thresholds;
- phrase-family dedup policy;
- global evidence weights/gates;
- compiler encoding/compression;
- per-source-class inclusion policy.

Forbidden:
- per-test-case patches;
- per-Topic special-case thresholds;
- reading blind TEST;
- private/evaluation data.

### Bounded search

At most **3 semantic/compiler variants** may be compared in this round.
No combinatorial parameter sweep.

Choose one candidate using:
1. assignment error constraint;
2. macro coverage/recall;
3. collision robustness;
4. production footprint.

Freeze the selected lexicon/index/runtime before CSL-03.

### Exit

PASS when one candidate is frozen and blind-test access is still zero.

---

## CSL-03 — Fresh Blind Public Test v1

### Test construction

Create a fresh evaluator fixture from the restricted evaluator manifest only.

Minimum coverage:
- at least 288 single-label cases (>=2 per Topic);
- at least 72 context/continuation/topic-switch/counterfactual cases;
- at least 36 multi-label, ambiguous or should-DEFER cases.

Group by semantic family/source, not random sentence splitting.

The evaluator must prefer natural paraphrases that do not simply repeat Topic
names.

### One-shot rule

Freeze the evaluator artifact, then run the already-frozen CSL-02 candidate
exactly once.

No threshold/phrase/filter changes after opening TEST v1.

### Initial public capability floor

- assigned precision >= 0.95;
- auto-assignment coverage >= 0.70;
- Topic macro-recall >= 0.70;
- insufficient-evidence false assignment <= 0.02;
- context harm events = 0;
- multi-label metrics reported separately;
- deterministic repeat = PASS.

These are public research gates, not final personalized certification.

### Transition

- PASS -> CSL-05.
- FAIL -> CSL-04 automatically.

Do not stop merely because CSL-03 FAILs; the package predefines one bounded
repair opportunity.

---

## CSL-04 — Bounded Repair + Fresh Blind Test v2

### Purpose

Use CSL-03 only to identify **failure classes**, never to copy its exact
phrases into the lexicon.

Allowed repair examples:
- improve generic expression generation;
- improve collision filtering;
- improve phrase-family coverage;
- improve continuation/context logic when the failure is structural;
- improve compiler representation.

Forbidden:
- copying TEST-v1 wording;
- adding one-off case rules;
- changing gold;
- rerunning TEST v1 as promotion evidence.

### Fresh-test requirement

Generate TEST v2 from the restricted evaluator manifest through a fresh
evaluation pass that does not read:
- TEST v1 text;
- production lexicon;
- DEV cases.

Run TEST v2 once.

### Maximum public repair budget

Exactly **one** post-test repair round is allowed in v1.

- TEST v2 PASS -> CSL-05.
- TEST v2 FAIL -> package PUBLIC COMPLETE/FAIL and STOP.

No third benchmark repair cycle.

---

## CSL-05 — Browser Runtime, Compression and Resource Hardening

Runs only after public capability PASS.

### Scope

Keep the semantic decision behavior frozen while optimizing representation.

Required:
- dependency-free JS/ESM runtime;
- deterministic browser/Node parity;
- phrase dictionary/trie/shared-token or equivalent compact encoding;
- no semantic network/API;
- no neural model asset;
- no Python requirement in shipped runtime.

### Hard consumer gates

Retain the current LSR-v1 production limits:
- generated semantic index <= 1 MiB uncompressed;
- router core + index <= 2 MiB uncompressed;
- incremental memory <= 32 MiB;
- warm full-catalog p95 <= 20 ms;
- cold initialization <= 100 ms.

If semantic capability passes but these cannot be met, report deployability
FAIL rather than silently relaxing the budget.

Resource-only optimization may iterate without creating new semantic tests.

---

## CSL-06 — Public Consumer-Behavior Certification

Final public round before private data.

### Fresh behavior suite

Build a new behavior/counterfactual suite independent of the production
lexicon, covering:
- strong current input vs stale title;
- explicit topic switch;
- content-poor continuation;
- ambiguous continuation;
- context chain limits;
- background mention vs user goal;
- tool phrase vs actual task;
- multi-label vs ambiguity;
- Chinese/English/mixed language;
- repeated text not inflating confidence;
- unknown/no-evidence DEFER.

### Final public gate

Must pass:
- CSL-03 or CSL-04 capability gate;
- all context harm invariants;
- resource gates;
- package determinism;
- privacy/network/model guards;
- browser parity;
- no benchmark leakage guards.

On PASS set package state to `PUBLIC_COMPLETE_PASS_PRIVATE_BLOCKED`.

Then **STOP**.

---

## CSL-07 — Existing 80 Private Calibration Validation

BLOCKED / NOT PREAUTHORIZED.

Requires a new explicit owner authorization.

Before opening any private artifact:
- freeze exact runtime/index;
- freeze thresholds;
- freeze metrics;
- record exact Git SHA and public evidence.

Read the existing 80 calibration records once only.

No tuning/retry on the same 80 under this package.

---

## CSL-08 — Legacy Evaluation

BLOCKED / NOT PREAUTHORIZED.

Requires CSL-07 PASS and a separate explicit owner authorization.

Open the 13 still-unopened evaluation records once. No post-open changes.

The consumed 35-case SEM-07 lockbox remains forbidden for tuning/promotion.

---

## CSL-09 — PAIA Handoff / Production Integration

BLOCKED / NOT PREAUTHORIZED.

Only after private evaluation success.

Freeze the minimal JS runtime/index contract, update strategy, privacy behavior,
Topic version migration and PAIA integration boundary.

Actual PAIA repository/runtime writes require explicit owner authorization.

---

## Terminal outcomes

Public PASS:
`PUBLIC_COMPLETE_PASS_PRIVATE_BLOCKED`

Public FAIL after CSL-04:
`PUBLIC_COMPLETE_FAIL`

Neither outcome automatically enables a neural model, remote service, private
data access, or PAIA production change.
