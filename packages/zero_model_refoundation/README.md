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
