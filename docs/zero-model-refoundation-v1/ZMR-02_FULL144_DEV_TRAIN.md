# ZMR-02 full144 provisional TRAIN checkpoint

Batch `ZMR-02-TRAIN144-P0-20260929`; base main `3c2ee83dfab81032be48ed65ef0009184e9b5921`. This is a single candidate writer's public development material, classified `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`. It gives A1 a complete output and provisional TRAIN Topic universe; it is not ZMR-01B DATA_READY, a stable candidate, capability evidence, a resource qualification, or a new source cohort.

## Data and provenance

`provisional_train_v0.2.json` contains 144 single-intent scenarios, exactly one for each pinned Catalog Topic. It carries forward the 18 v0.1 seed rows with their original IDs/source and adds 126 individually written scenarios; v0.1 remains preserved. Declared languages are zh 90, en 36, mixed 18. Rows record writer, source, scenario/template family, mechanism, exposure and provisional origin. All 144 rows share the same candidate writer; two source IDs distinguish authoring batches only and **do not establish independent source cohorts**. Rights status is a provisional writer declaration, not a curator license audit. There is no dual reviewer, gold arbitration, independent creator, sealed store or full mechanism quota. Independent accepted TRAIN/DEV/AS counts remain zero.

A metadata scan found 144 unique Topic IDs and 144 unique row IDs. Exact input-bundle, NFC and NFKC fingerprints are each unique within this TRAIN version and have zero exact overlaps with the already exposed 18-row v0.1 challenge. This is only an exact-match screen; near-duplicate and human source review remain undone. The same writer created TRAIN and challenge, so neither split is independent even if exact strings differ. No candidate predictions were used to accept or reject rows.

## Compiler closure and static observations

The fixed-path compiler now accepts only pinned Catalog plus v0.2 provisional TRAIN. The challenge, DEV/CAL, AS and historical consumed TEST remain outside compiler inputs. At the original 12,000 char-feature setting, the enlarged index reached 1,398,480 bytes and failed the unchanged 1 MiB guard. The deterministic char feature cap was set to 6,000; this emits a 932,855-byte index and 939,747-byte runtime-plus-index source count. Word mode emits 205,561 and 212,453 bytes respectively. This is a bounded engineering size adaptation on a new TRAIN closure, not an evidence-based semantic repair or browser memory/latency claim. The engineering suite remains 36/36 PASS and the char compiler's repeat build is byte-identical.

The 18-row v0.1 challenge is exposed and lacks 126 gold Topics. It was **not rerun as a fresh performance claim** for this batch. A1 remains unstable; no semantic repair allowance is charged and no A1 ceiling or family failure is inferred. Formal product constraints are unchanged: 144 Topics, 95% assigned precision, 70% coverage and macro floor, safety gates, 1 MiB index, 2 MiB runtime plus index, 32 MiB memory, warm p95 20 ms, cold init 100 ms, local-first, browser JS, zero neural/embedding/LLM/semantic API.

## Next action

Create new, separately versioned writer-visible ordinary DEV/TUNE, DEV/CAL and challenge with recorded scenario, template and exposure lineages; cover the full144 gold universe before treating any candidate as stable. Use only new closures for a new diagnostic, then perform at most two mechanism-level A1 repairs or eliminate A1 and implement A2/A3. Independent 01B acquisition/review remains frozen until real isolated curator/reviewer/source capacity exists; algorithm development continues. No AS/final TEST is armed.
