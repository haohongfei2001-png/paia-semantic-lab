# TRAIN v0.4 compiled development closure

Batch: `ZMR-TRAIN-V04-COMPILED-CLOSURE-20260930`.
Authority: full144 positive TRAIN freeze on main `6e913eb8addad2bc4205e9b0949d2fd3960c40b2` (PR174).
Evidence: `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`. This is input closure, compilation and storage engineering, with **zero semantic evaluations**.

## Registered bounded hypothesis

Three original positive scenarios per Topic may supply useful lexical statistics for full144 A2 class/complement likelihood and A3 sparse hinge development. Test this against a frequency-selected A1 anchor only after distinct fresh provisional DEV is authored and frozen. Expanded TRAIN is not evidence that the models generalize. A3 still fits **144 aggregate class documents**, not 432 independent samples; the fitting unit is recorded explicitly.

The new `train_v04_compile.mjs` loads only the strict frozen `train_v04.mjs` closure. It never loads ordinary DEV, CAL, challenge, AS, TEST or legacy generators. Existing frozen compilers and receipts are untouched. All three builds consume identical Catalog plus the same ordered 432 TRAIN rows, pinned by `8306906142c708e0876f9a64f0ba486669d8186c3bda1d7ec7a525ff66b9b2bf` and a shared aggregate-document hash.

## Fixed engineering recipes

| Family | Mode / feature cap | Selector | Objective / retention |
| --- | --- | --- | --- |
| A1 frequency anchor | char / 1500 | DF descending | TF-IDF + BM25 statistics; per-channel global int16 storage |
| A2 statistics | char / 3000 | DF × log(145/(DF+1)) descending | class/complement likelihood statistics; runtime defaults remain uncalibrated |
| A3 discriminative | char / 3000 | DF ascending | multiclass hinge, 5 deterministic epochs, 48 coefficients/Topic, global int16 |

These caps were fixed before compilation. A1 retains the smaller cap because its two weighted posting channels have a different storage cost. **Selectors and feature caps differ**: this is not a matched-feature objective ablation, and cannot attribute any future difference solely to A2/A3 objectives. A matched-feature comparison must be registered separately before such attribution. No parameter sweep, calibration or stable candidate selection occurred.

These are engineering input recipes, not an additional qualified generation or a reset of previous exploration allowances. Retired A1 balanced selector, A4 role and A6 complement candidates remain retired with existing repair counters. Prior A2/A3 public failures remain unchanged. Before a semantic batch, audit the candidate/configuration registry against the existing 6 families / 12 stable configurations per generation and carry forward repair spending; do not assign a fresh seed/name to reset limits. Maximum two mechanism repairs and automatic retirement still apply. No sealed batch has been consumed here.

## Preserved engineering failure and storage repair

The initial A1 char1500 floating-point index was **1,862,872 bytes**, rejected by the existing **1 MiB** guard before output. This failure is preserved in the companion JSON. One storage engineering repair adds `a1_v04_compact.mjs`: retain all selected features and posting memberships, quantize TF-IDF/BM25 weights independently to bounded nonnegative int16, preserve IDF, and reconstruct norms from decoded weights. Neither the feature cap nor product budget was changed. This is lossy storage, not semantic parity; future fresh DEV needs a quantization ablation. The offline floating index is an ablation diagnostic only and cannot be called a deployable resource-qualified candidate.

| Family | Index bytes | Runtime source + index bytes |
| --- | ---: | ---: |
| A1 compact | 718175 | 728109 |
| A2 | 410819 | 422792 |
| A3 | 87736 | 101354 |

Runtime source hashes and exact compiler dependency hashes are in `ZMR-03_TRAIN_V04_COMPILED_CLOSURE_RESULT.json`. The CLI optionally writes only new files outside the repository; it rejects repository outputs, symlink parents reaching repository paths, existing targets and arbitrary input/settings overrides. No generated index is committed.

Static byte counts are **not resource PASS**. Browser dependency closure, peak memory, warm/cold latency and runtime parity are unmeasured. A1's cached decoded view must be included in later memory/cold-load accounting; its on-disk compression does not establish a memory reduction. Product constraints remain 1 MiB index, 2 MiB runtime+index, 32 MiB peak memory, 20 ms warm and 100 ms cold.

## Verification and evidence limits

Four focused engineering checks pass: registered settings and byte units; deterministic frozen full144 indices and output hashes; synthetic int16 half-step error bounds / routing / OOV / Catalog mismatch; corrupt coefficient/universe rejection. The four checks complete under one second locally. Compilation reproducibility does not consume semantic evaluation keys. Synthetic routing is only engineering evidence.

All432 rows share **one writer/source-family lineage component**, even though five source batches exist. No independent grouped folds can be made from this closure. Independent01B credit is0, gold remains unreviewed, safety TRAIN quotas are missing. Independent curator/AS qualification remains frozen; offline development continues. Capability **UNTESTED**, resources **NOT_QUALIFIED**, no saturation or family ceiling claim.

## Next action

Audit generation configuration/repair accounting before freezing any semantic comparison. Author distinct original provisional DEV based on Catalog boundaries and predeclared mechanisms, with separate development TUNE/CAL exposure and full144 denominator, plus nonempty controls/context/multi safety. Freeze inputs and provenance before predictions; screen against explicit public development sources only. Same-writer lineage remains non-independent and cannot establish group uncertainty. Register a matched-feature objective and quantization ablation if claiming objective-level gain. Use only fresh registered inputs for one stable development batch; do not recycle consumed diagnostics as fresh gates or access CIG-v1/sealed AS/final TEST. Ordinary resource/engineering failures are repaired automatically within protocol.
