# SCA-03 calibration closure

Capability verdict: **FAIL**. Execution completed; remote closure CI pending.

All 80 authorized calibration records were evaluated once through the frozen 12-configuration, five-fold family-grouped evaluator. No configuration passed the unchanged Recall@10 >= 0.96 and Recall@20 >= 0.99 gates or critical-slice gates. No winner is promoted. SCA-04 is BLOCKED; 13 evaluation judgments remain unopened.

| Query | Profile | Weight | Recall@10 | Recall@20 | Pass |
|---|---|---:|---:|---:|---|
| current_only | core | 3.0 | 0.632708 | 0.824167 | No |
| allowed_context | core | 3.0 | 0.632708 | 0.824167 | No |
| allowed_context | full_derived | 1.5 | 0.630625 | 0.837500 | No |
| current_only | full_derived | 1.5 | 0.630625 | 0.837500 | No |
| allowed_context | core_anchors | 3.0 | 0.625625 | 0.824167 | No |
| current_only | core_anchors | 3.0 | 0.625625 | 0.824167 | No |
| allowed_context | full_derived | 3.0 | 0.623958 | 0.830417 | No |
| current_only | full_derived | 3.0 | 0.623958 | 0.830417 | No |
| current_only | core | 1.5 | 0.621250 | 0.839167 | No |
| allowed_context | core | 1.5 | 0.621250 | 0.839167 | No |
| allowed_context | core_anchors | 1.5 | 0.605000 | 0.830417 | No |
| current_only | core_anchors | 1.5 | 0.605000 | 0.830417 | No |

Highest Recall@10 is 0.632708; highest Recall@20 is 0.839167 (different configurations). All family leakage and graph structural failure counts are zero, and full catalog eligibility is preserved. Engineering/invariant success does not imply capability success.

The evaluator, matrix, model revision, profile bundle, graph and thresholds were not changed after private evidence. The historical freeze receipt remains the pre-evidence checkpoint; this separate closure receipt records consumption.

A local transport filter scanned shared JSON structure and input/revision metadata, then deserialized only the 80 allowlisted calibration context payloads. Evaluation and lockbox context payloads were not deserialized; labels were loaded by the existing calibration allowlist. No raw texts, identifiers, refs, families, per-case labels or vectors are included here. Five synthetic isolation tests passed. The frozen evaluator received a calibration-only local batch.

Local full regression before closure: 176 passed. Closure regression and exact-head remote CI are tracked in canonical status. Real Input API egress, live archive reads, model training, formal catalog writes and production PAIA writes are zero.

Current-only and allowed-context metric pairs are identical. This observation is preserved; it is not evidence of context effectiveness and does not authorize retuning. Any subsequent repair must be a separately frozen, documented action rather than reinterpretation of this failed run.
