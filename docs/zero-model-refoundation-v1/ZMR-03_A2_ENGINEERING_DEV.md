# ZMR-03 A2 compiled likelihood engineering checkpoint

Batch `ZMR-03-A2-P0-20260929` follows the merged ZMR-02 full144 provisional TRAIN tree. This is development-track engineering only. It does not promote ZMR-02 A1, qualify ZMR-01B data, score any new independent cohort, or claim zero-model capability. The author is the same single candidate writer.

## Registered hypothesis and closure

A2 tests whether finite class-vs-complement term evidence can express discrimination that A1's positive sparse retrieval lacks. This is an algorithmically distinct, non-neural objective: for each observed TRAIN feature and each of 144 Topics, score smoothed log likelihood in that Topic against the 143-Topic complement. Negative contributions for absent class terms are retained; no per-Topic threshold is fitted. The char/word feature extractor is shared with A1, and the entire input is scored without GOAL-only trimming. This is not a semantic embedding or model/API call.

`a2_compile.mjs` reads only the pinned 144-Topic Catalog and `provisional_train_v0.2.json`. It rejects a changed Catalog blob or incomplete TRAIN. It never reads DEV, CAL, challenge, AS, final or historical consumed TEST. The TRAIN is one candidate-writer scenario per Topic, so the resulting finite statistics are highly provisional. No evaluation-key semantic run has been made. Global development defaults (`alpha=.5`, min score 0, min margin .5) are uncalibrated knobs, not confidence thresholds approved by CAL.

## Engineering observations

The runtime is pure browser-compatible JavaScript and fails to DEFER on missing/mismatched Catalog, bad input/config, OOV or invalid index. A synthetic opaque-ID unit proves deterministic full144 compilation, class-vs-complement selection, and fail-safe behavior. The fixed-path compiler repeats byte-identically and enforces the unchanged 1 MiB index and 2 MiB runtime-plus-index caps. Static char index is 206,821 bytes, and A1+A2 source plus index is 218,794 bytes. Word values are 88,768 and 100,741 bytes. These counts are **not** measured browser memory, warm p95, cold init or product bundle size. The combined engineering suite is 38/38 PASS. CI runs only syntax and synthetic engineering units; it does not execute semantic scoring.

A2 is `DEV_ONLY_UNSTABLE`: no independent data, full144 DEV/CAL/challenge gold, context/multi-intent behavior, controls, language transfer, calibration, browser profile or AS. A1 remains an exposed, unstable baseline; A2 is an unscored challenger, not a replacement selected by evidence. Source, writer and reviewer isolation remains unprovisioned, so capability and resource verdicts stay UNTESTED/NOT_QUALIFIED.

## Next development action

Create separately versioned writer-visible ordinary DEV/TUNE, DEV/CAL and challenge with 144 Topic coverage and distinct scenario/template lineages. Run a single new changed-closure provisional comparison of A1/A2, then bounded A1/A2 repair or elimination as the evidence warrants; enter A3/A4 next. Keep independent 01B acquisition/review frozen until real isolated author/curator access exists. Do not use old or future consumed TEST for tuning.
