# Product and Deployment Constraints

These constraints are first-class acceptance criteria, not post-hoc
optimizations.

## Hard production constraints for v1

1. **Zero neural model assets**
   - embedding-model weights: 0 bytes;
   - generative-model weights: 0 bytes;
   - no local neural inference required for classification.

2. **Zero semantic network dependency**
   - classification must work offline;
   - no user input, title or recent context is sent to an embedding/LLM API;
   - no remote service is required to obtain a Topic decision.

3. **No heavyweight ML runtime**
   - no PyTorch, TensorFlow, transformers, sentence-transformers or equivalent
     production dependency;
   - no Python runtime is required by the shipped PAIA classifier.

4. **Small static footprint**
   - generated production semantic index: <= 1 MiB uncompressed;
   - total added semantic-router runtime code + generated index:
     <= 2 MiB uncompressed;
   - test fixtures and research artifacts are excluded because they are not
     shipped in PAIA.

5. **Small runtime cost**
   - warm full-catalog classification p95 target: <= 20 ms on the package's
     browser/Node reference benchmark;
   - cold initialization target: <= 100 ms;
   - incremental steady-state memory hard ceiling: <= 32 MiB, target <= 16 MiB.
   If a candidate cannot meet these product budgets, the package fails rather
   than silently increasing them.

6. **Deterministic and inspectable**
   - same input/context/catalog/version must produce the same ranking;
   - score lanes and evidence must be inspectable;
   - no hidden online learning or automatic Topic creation.

## Input contract

Required:
- current user input.

Optional, host-provided and local:
- conversation/window title;
- bounded recent user inputs from the same conversation;
- stable conversation/project identity metadata when needed for provenance,
  but identity itself must not become a semantic shortcut.

The exact recent-input cap and decay are selected on PUBLIC/SYNTHETIC evidence
and frozen before any private calibration read.

## Output contract

The lightweight router must support:
- zero, one or multiple Topic candidates;
- score/evidence decomposition;
- confidence margin;
- DEFER when evidence is weak or conflicting;
- catalog/version provenance.

## Model policy

BGE-M3 and all other neural embedding models are **RESEARCH_ORACLE_ONLY** in
this package.

Allowed:
- compare already-public aggregate results;
- run future public-only oracle comparisons if a round explicitly authorizes
  them.

Forbidden:
- ship neural-model weights with PAIA;
- require a neural model for production classification;
- use private oracle outputs as labels;
- use unopened evaluation or consumed lockbox data to tune the lightweight
  router.

A future tiny-model product direction, if ever needed, requires a separate
owner-authorized package. It is not an automatic fallback inside v1.
