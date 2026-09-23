# PAIA Semantic Lab

Independent R&D repository for **PAIA Semantic Engine**.

Semantic Lab is isolated from PAIA production. It must not modify production
runtime, schema, Reader, Thought Library, Capture, ANS status, or real archive
data unless an authority document explicitly changes that boundary.

## Current direction

The active product-development direction is
**PAIA-LIGHTWEIGHT-SEMANTIC-ROUTER-v1**.

Its purpose is a small, deterministic, fully local semantic classifier for the
finite PAIA Topic Catalog using current input plus bounded local context such as
conversation title and recent user inputs.

Production constraints are now first-class:
- zero neural-model assets;
- zero semantic network/API dependency;
- no heavyweight ML runtime;
- full-catalog scoring over the current 144 Topics;
- generated semantic index <= 1 MiB;
- total added semantic-router runtime + index <= 2 MiB;
- bounded latency/memory gates;
- explicit DEFER instead of forced assignment.

Canonical package:
- `docs/lightweight-semantic-router-v1/`
- `status/LIGHTWEIGHT_SEMANTIC_ROUTER_STATUS.yaml`

LSR-00 is COMPLETE/PASS. LSR-01 is READY but NOT_STARTED and requires an
explicit execution authorization.

## Historical research state

Semantic Lab v0.2, v0.3 remediation, catalog architecture SCA, bounded BAA
repairs and PAD-01 remain preserved as historical evidence.

BAA-02 closed COMPLETE/FAIL after one frozen 80-record calibration run.
PAD-01 closed COMPLETE/PASS on PUBLIC/SYNTHETIC architecture diagnostics.

The historical BGE-M3/Qwen/E5/Nomic embedding work is retained as
**research-oracle evidence only** for the lightweight package. It is not a
production dependency and is not an automatic fallback.

The 13 legacy evaluation records remain unopened. The 35 consumed SEM-07
lockbox records remain forbidden for tuning/promotion.
