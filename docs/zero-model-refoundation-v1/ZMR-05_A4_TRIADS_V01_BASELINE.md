# ZMR-05 A4 triad v0.1 baseline diagnostic

One registered public development comparison used evaluation key `1f2fd248e005c1deb5beeca36c2ca4d06a53f24efe2efdb88e1e9c89dd71f5aa`. The fixed cohort is four Catalog-derived neighboring Topic pairs, each with left-positive, right-negative and ambiguous members. Only the eight candidate-writer provisional left/right labels were scored. The four ambiguous rows have no gold; their assignment counts are descriptive and **not** false-assignment counts. The key is consumed, and no per-row prediction is retained.

| Fixed baseline | Labeled assigned / 8 | Provisional correct / 8 | Both sides correct / 4 pairs | Ambiguous assigned / 4, unscored |
| --- | ---: | ---: | ---: | ---: |
| A0 defer | 0 | 0 | 0 | 0 |
| A1 char | 3 | 1 | 0 | 2 |
| A3 char | 6 | 1 | 0 | 3 |
| A1 word | 2 | 0 | 0 | 0 |
| A3 word | 3 | 0 | 0 | 1 |

All fixed configurations had zero deterministic repeat differences. The char anchors each got only one right-side provisional label correct and no left-side label; word anchors got none. This suggests the selected boundaries are difficult for these fixed bag-feature baselines, but eight same-writer labels do not establish a calibrated error rate or an A4 resolver gain. The apparent assignment on unresolved ambiguous text is an uncertainty signal, not a scored safety violation.

The baseline compilers read only pinned Catalog and public TRAIN v0.2. The triad challenge was never a training input. All text and provisional labels came from the same candidate writer, with zero ZMR-01B credit. There was no independent AS, blind TEST, resource qualification or capability PASS. The unchanged 144 Topic universe remains the denominator for future full gates; four pair tests cannot substitute for it.

Next create **separate fresh designated TRAIN evidence** for the four selected pairs, with source, lineage and license disclosure and no reuse of this consumed triad cohort. A bounded A4 pairwise resolver may then be built as a development-only mechanism with full144 fallback. Register a fresh challenge to test its incremental effect and deletion ablation. Eliminate the component if it lacks an isolated safety-preserving gain; do not count an unresolved ambiguous row as DEFER gold or relax any product gate.
