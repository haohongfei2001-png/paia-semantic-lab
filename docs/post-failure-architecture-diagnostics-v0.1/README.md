# SCA03 Post-Failure Architecture Diagnostics v0.1

## Purpose

BAA-02 closed COMPLETE/FAIL after one frozen 80-case calibration run. The
bounded BAA-01 repairs improved the public aggregate ceiling but remained far
below the unchanged private promotion gates. This package therefore does not
retune BAA-02. It decomposes the remaining architecture questions using only
public/synthetic evidence.

PAD-01 asks four bounded questions:

1. Does mixing exclusion cues into a single positive retrieval document create
   measurable loss under a deterministic public control?
2. With identical positive semantic content, does field-separated multi-vector
   scoring behave differently from single-vector concatenation?
3. Does BAA-01 candidate assembly itself gain or lose top-k hits relative to
   full-catalog direct scoring?
4. Does nonempty allowed context survive the text, embedding, ranking and
   candidate-assembly layers on deterministic public probes?

## Evidence boundary

Allowed inputs:

- formal Topic catalog;
- derived semantic profiles;
- the frozen 1,296-case SCA-02 synthetic contrastive suite;
- deterministic public context probes;
- the already-public sanitized BAA-02 aggregate result.

Forbidden inputs:

- raw/private BAA-02 calibration data or metadata;
- the 13 legacy evaluation cases;
- the 35 consumed SEM-07 lockbox cases;
- live PAIA archive;
- real Input API egress;
- new owner labels.

No model training, formal catalog mutation, PAIA production write or SCA-04
execution is permitted.

## Interpretation

HashNgramEmbeddingAdapter is used only as a deterministic architecture control.
PAD-01 can identify structural interactions and falsify simple architectural
claims. It cannot estimate BGE/private recall and cannot authorize another
private calibration run.

PAD-01 passes when the decomposition is complete, deterministic and respects
all evidence guards. No architecture variant is required to "win".
