# Architecture

## Production pipeline

```text
current input / title / bounded recent user inputs
                  |
                  v
        deterministic normalization
                  |
                  v
           evidence extraction
      (typed phrase + sparse overlap)
                  |
                  v
       full 144-Topic sparse ranking
                  |
                  v
     evidence eligibility + boundaries
                  |
          +-------+-------+
          |               |
   ordinary input     content-poor
   context-gated      continuation
          |               |
          +-------+-------+
                  v
       ASSIGNED / DEFER / UNASSIGNED
```

LSR-v1 is an **evidence-constrained sparse classifier**, not a generic
similarity engine and not an ensemble of many scorers.

## Separation of responsibilities

### Evidence extraction

Each match preserves its source lane and evidence type. Multiple mechanisms
matching the same source span are one evidence group, not multiple votes.

### Sparse ranking

All 144 eligible Topics are scored directly. Domain metadata does not
participate in assignment. There is no sibling expansion.

### Decision

A Topic ranking first does not make it assignable. It needs sufficient,
non-conflicting evidence. No evidence remains no evidence.

## Context rules

Current input is authoritative.

For ordinary content-bearing inputs:
- title and recent context cannot create Topic eligibility;
- they may provide bounded support only to a Topic already supported by the
  current input;
- stale context must not override a strong current-topic switch.

For content-poor continuations such as “继续 / 这个呢 / 做”:
- use a separate continuation path;
- search at most three recent user inputs for the nearest independently
  classifiable content anchor;
- do not inherit from another content-poor continuation;
- ambiguous references DEFER;
- a clear title is a weaker title-only fallback.

## Multi-label and ambiguity

Multiple independent supported tasks may produce multiple labels.
Competing explanations for the same evidence produce DEFER rather than fake
multi-label recall.

Confidence is evidence provenance, sparse score and competition information.
It is not a softmax probability.

## Production index

The research Catalog/Profile bundle is build input, not the shipped index.

Allowed scoring material:
- topic/version/lifecycle identity;
- canonical names/aliases;
- filtered zh/en lexical anchors;
- semantic core;
- concrete positive intents;
- only explicitly executable local exclusions;
- contrastive neighbor IDs for diagnostics only.

Excluded:
- synthetic utterance patterns;
- representative benchmark examples;
- mixed domain-path strings;
- internal-domain positive terms;
- generator/case metadata;
- private/evaluation/lockbox-derived information.

## LSR-01 candidate contract

Exactly three candidates are evaluated:

- A: conservative typed phrase evidence + decision/continuation gates;
- B: A + field-separated binary TF-IDF, zh character 2/3-grams and Latin word
  features; **pre-registered primary hypothesis**;
- C: A + fixed BM25(k1=1.2,b=0.75) as an alternative control.

A/B/C are alternatives, not a production ensemble. Only one global threshold
per candidate may be calibrated on source-separated PUBLIC DEV, and the
threshold is frozen before PUBLIC TEST.

The existing 1,296-case synthetic contrastive suite is regression/integrity
evidence only because it shares source semantics with the profile bundle.
