# PAIA Compiled Semantic Lexicon v1

## Purpose

This package tests a narrower hypothesis after LSR-01 COMPLETE/FAIL:

> A zero-model PAIA router may still be viable if semantic knowledge is compiled
> offline into a compact static lexicon rather than expected to emerge from a
> tiny set of aliases/anchors at runtime.

Development-time model reasoning is allowed to author candidate expressions,
contrastive cases and multilingual variants. The shipped PAIA runtime still has:

- neural model assets: 0 bytes;
- semantic network/API dependency: none;
- deterministic local JS runtime;
- finite 144-Topic catalog;
- current input + bounded title/recent context;
- explicit DEFER.

The large model is a build-time author/editor, never a production dependency.

## Product hypothesis

For each Topic, compile a diverse but bounded set of natural expressions,
phrases, colloquial paraphrases and contrastive exclusions into a compact index.
The runtime performs deterministic phrase/sparse matching plus the already
useful LSR continuation/context gates.

The experiment succeeds only if **fresh independent public expressions**
generalize materially better than LSR-01 while the production package remains
within the existing consumer footprint.

## Public unattended boundary

CSL-00 through CSL-06 are designed for one continuous ChatGPT Work execution
after a single explicit package authorization.

CSL-07 and later are never included in that unattended authorization:
- CSL-07 opens the existing 80 private calibration records;
- CSL-08 opens the 13 still-unopened evaluation records;
- CSL-09 touches PAIA production integration.

Those require separate owner authorization.

Canonical status:
`status/COMPILED_SEMANTIC_LEXICON_STATUS.yaml`.
