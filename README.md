# PAIA Semantic Lab

Independent R&D repository for **PAIA Semantic Engine**.

Semantic Lab is isolated from PAIA production. It must not modify production
runtime, schema, Reader, Thought Library, Capture, ANS status, or real archive
data unless an authority document explicitly changes that boundary.

## Current state

The lightweight zero-model sparse baseline has closed:

- PAIA-LIGHTWEIGHT-SEMANTIC-ROUTER-v1 / LSR-01 = COMPLETE/FAIL;
- production footprint was very small, but source-separated semantic coverage
  and recall were not credible;
- the 80 private calibration records, 13 legacy evaluation records and consumed
  35-case lockbox were not opened by LSR-01.

The next registered direction is:

**PAIA-COMPILED-SEMANTIC-LEXICON-v1**

It tests whether a rich but compact **build-time generated static semantic
lexicon** can supply the semantic knowledge missing from the sparse baseline
while preserving a zero-model, zero-network, deterministic local PAIA runtime.

Canonical package:
- `docs/compiled-semantic-lexicon-v1/`
- `status/COMPILED_SEMANTIC_LEXICON_STATUS.yaml`

CSL-00 is READY but NOT_STARTED. Registration alone does not authorize
execution.

## Public unattended execution

After one explicit whole-public-package authorization, ChatGPT Work may execute
CSL-00 through CSL-06 continuously, including ordinary implementation fixes,
PR/CI/merge work and the predeclared CSL-03 -> CSL-04 failure path.

Hard stops remain before:
- CSL-07: existing 80 private calibration;
- CSL-08: 13 legacy evaluation records;
- CSL-09: PAIA production integration.

The consumed 35-case SEM-07 lockbox remains forbidden for tuning/promotion.

## Product constraints preserved

The compiled-lexicon direction still requires:
- 0-byte production neural model assets;
- no semantic API/network dependency;
- JS/browser-ready deterministic runtime;
- generated semantic index <= 1 MiB;
- router + index <= 2 MiB;
- incremental memory <= 32 MiB;
- warm p95 <= 20 ms;
- cold initialization <= 100 ms.

Historical BGE-M3/Qwen/E5/Nomic work remains research-oracle evidence only and
is not an automatic production fallback.
