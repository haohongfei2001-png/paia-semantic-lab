# LSR-01 Execution-Design Amendment v0.1

This amendment incorporates the independent Pro capability review into the
already-registered lightweight direction. It does not relax any LSR-v1 product
constraint.

## Core correction

LSR-01 is not an ensemble of traditional scorers. It is an
**evidence-constrained sparse classifier** with three separate responsibilities:

1. evidence extraction: what attributable lexical evidence exists;
2. sparse ranking: among Topics with evidence, which fit better;
3. decision: is the evidence sufficient and non-conflicting enough to ASSIGN,
   otherwise DEFER/UNASSIGNED.

No-evidence ranking is not assignment evidence.

## Frozen invariants

- all 144 Topics remain eligible; no domain prefilter/prior;
- sibling expansion remains off;
- same source span matching alias/phrase/n-grams is one evidence group, not
  multiple independent votes;
- context cannot create ordinary Topic eligibility when the current input has a
  strong contradictory Topic;
- content-poor continuation inputs use a separate continuation branch;
- a continuation decision cannot itself become an inheritable content anchor;
- ambiguity is not multi-label;
- boundary/exclusion evidence may limit existing evidence but cannot generate
  evidence for another Topic;
- confidence is evidence metadata + score/margin, not a probability softmax.

## Production implementation correction

LSR-01 implements the real dependency-free JS/ESM scoring core. Python may be
used only as build/test tooling for compiling the canonical research assets.
LSR-03 is therefore browser packaging/parity/resource hardening, not a rewrite
from Python into JavaScript.

## Candidate set

Exactly three bounded candidates are allowed:

A. conservative typed alias/phrase + evidence and continuation gates;
B. A + field-separated binary TF-IDF with fixed zh character 2/3-grams and
   Latin word/phrase features (**preregistered primary hypothesis**);
C. A + the same fields/features with fixed BM25 k1=1.2, b=0.75.

TF-IDF and BM25 are alternatives, not an ensemble. No grid search is allowed.

## Context hypotheses

The review-proposed values are frozen only as initial hypotheses:
recent cap=3, recent decay=1/0.5/0.25, title relative support cap=0.5,
ordinary context bonus cap=0.2, competition margin=0.10.

They are not claimed as product truths. Each candidate may select only one
global absolute assignment threshold on source-separated public DEV, using
assignment error constraint first and coverage second. That threshold is then
frozen before public TEST. No per-Topic/per-language thresholds.

## Benchmark authority

The existing 1,296-case contrastive suite remains regression/integrity
evidence only because it shares source semantics with the profile bundle.

The new source-separated fixture was written from the canonical Catalog
task/name definitions before reading production semantic profiles. It is the
LSR-01 selection/credibility benchmark together with behavioral and
counterfactual tests. Family split, not random sentence split, separates
public DEV and TEST.

A human-clear case that the zero-model router defers still counts as a recall
loss. DEFER must not be used to hide poor coverage.

## LSR-01 credibility floor

- zero-model/network/determinism/resource invariants all pass;
- no reproducible stale-context override or no-evidence forced assignment;
- source-separated assigned precision >= 0.95;
- source-separated coverage >= 0.60;
- source-separated Topic macro-recall >= 0.60;
- insufficient-evidence false assignment <= 0.02;
- context harm events = 0;
- all existing hard size/latency/memory budgets pass.

These are LSR-01 credibility floors, not final product certification.

## Evidence boundary

Private calibration reads = 0.
Legacy evaluation reads = 0.
Consumed SEM-07 lockbox reads = 0.
No new owner labels.
No PAIA production write.
