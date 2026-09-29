# ZMR-01A initial engineering primitives

This is lab engineering, **not a semantic Router**, a dataset, a final scorer or browser certification. Created only after the ZMR-00 canonical package merged as main2e27c7e0f36b78e61df9c72659083c8162f0f323 and exact-main checks passed.

Run only the explicit safe unit file with Node22:

```sh
node --test packages/zero_model_refoundation/contracts.test.mjs
```

No dependencies beyond Node built-ins. Node crypto is used for engineering identity hashes; this module is not a shipped browser runtime. The tests contain only fabricated opaque Topic IDs and counts, never semantic TRAIN/DEV/AS/final TEST content.

Implemented: full144 unique-ID guard; finite fixed resource observations guard; exact-path/regular-file metadata allowlist; cross-split writer/source/scenario/template/paraphrase/translation/contrast collision checks; deterministic identity serialization/hash; single-label point metrics with an immutable144 denominator, empty precision null, unsupported extras and qualification always refused.

The caller must supply genuine, canonicalized provenance. New names or IDs do not establish independent writers. Cross-generation freshness, source authenticity, reviewer quality and full language/mechanism quotas are not implemented by this initial helper. A path metadata validator is not an operating-system sandbox. The dedicated CI fetches exact allowed files and no legacy fixtures.

`single_point_gates` refers only to single-label point thresholds. `certification_allowed` is always false: controls, multi-label/context metrics, uncertainty, independent data and device resource evidence still need the complete pipeline. `assertBudget` checks supplied numbers, it does not perform resource measurement. See docs/zero-model-refoundation-v1/ZMR-01A_ENGINEERING.md for the remaining stage scope.

The ZMR-01A completion batch adds `scoring.mjs`, `intake.mjs`, `fingerprints.mjs`, `uncertainty.mjs`, and `ledger.mjs`. Run the two explicit safe unit files:

```sh
node --test packages/zero_model_refoundation/contracts.test.mjs packages/zero_model_refoundation/foundation.test.mjs
```

These are engineering guards only. `scorePointLayers` never certifies capability. `auditIntake` never certifies data independence, even when all metadata counts pass. `groupedRateBound` needs real independent-cohort attestation and remains conservative. `claimEvaluation` must run in curator-controlled persistent storage before any sealed packet read; its local unit test proves exclusive claim behavior, not operational role isolation. See `ZMR-01A_FOUNDATION_COMPLETION.md` for the evidence boundary and known limits.

ZMR-02's A0/A1 development prototype is in `a1.mjs`. It is pure browser JavaScript, while `a1_compile.mjs` and `a1_dev_eval.mjs` are offline Node tools with explicit new-data paths. Build and unit-test without accessing historical fixtures:

```sh
node --test packages/zero_model_refoundation/contracts.test.mjs packages/zero_model_refoundation/foundation.test.mjs packages/zero_model_refoundation/a1.test.mjs
node packages/zero_model_refoundation/a1_compile.mjs char
```

`a1_dev_eval.mjs` is a same-writer diagnostic for a changed development closure, not a CI step or capability test; consult `ZMR-02_A1_DEV.md` for its first exposed result. The fixed compiler now reads only `provisional_train_v0.2.json`, which provides one writer-authored scenario per all 144 Topics; v0.1 remains an immutable public seed. The old v0.1 challenge is exposed and can only serve regression. These public provisional data files cannot satisfy independent TRAIN/DEV/AS quotas. The compiler never reads challenge content. The 6,000-feature char cap keeps this larger provisional index under the unchanged 1 MiB limit; static bytes are not a browser resource qualification.
