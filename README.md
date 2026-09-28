# PAIA Semantic Lab

Independent R&D repository for **PAIA Semantic Engine**.

Semantic Lab is isolated from PAIA production. It must not modify production
runtime, schema, Reader, Thought Library, Capture, ANS status, or real archive
data unless an authority document explicitly changes that boundary.

## Current state

Canonical public package: **PAIA-COMPOSITIONAL-INTENT-GRAPH-v1**, protocol1.1.0.

- [Package plan](docs/compositional-intent-graph-v1/DEVELOPMENT_PLAN.md)
- [Canonical STATUS](status/COMPOSITIONAL_INTENT_GRAPH_STATUS.yaml)
- [Independent CIG-03 closure](docs/compositional-intent-graph-v1/CIG-03_CLOSURE.md)
- [Immutable aggregate result](artifacts/compositional-intent-graph-v1/CIG-03_TEST_RESULT.json)

CIG-v1 is **PUBLIC_COMPLETE_FAIL**. Its once-consumed independent blind TEST covers all144 Topics: assigned precision100% on1 assignment, single coverage and full144 macro recall0.347222%, below the unchanged70% floor. Controls/context/determinism gates pass. CIG-04 remains blocked; no capability is promoted. Same-writer DEV96.875% is development evidence and did not establish independent capability.

LSR-01, CSL-03 and CSL-04 genuine FAIL remain preserved; CSL-v1 is also PUBLIC_COMPLETE_FAIL. These statuses close their research routes. Semantic Lab remains an ongoing research project; future directions use separate packages and evidence boundaries. No consumed TEST is reused for tuning or promotion.

## Execution and evidence boundary

The manager uses GitHub remote/connector/Actions only. Ordinary public engineering proceeds under owner authorization and exact-head/exact-main CI discipline. Product constraints and frozen scoring rules remain fixed. No private80 calibration, legacy13 evaluation, consumed35 lockbox, real PAIA archive or production access is authorized in these public packages. CIG-03 packet/scorer/candidate were committed before its sole blinded evaluation; the candidate writer reads aggregates/hashes, never TEST text/gold/per-case results. Later CI verifies stored result integrity without TEST replay.

## Product constraints preserved

The public zero-model research contract requires:
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
