# SEM-03 Candidate Retrieval Policy

This is the frozen implementation record for SEM-03. The executable source of truth remains `configs/sem03_candidate_retrieval_v0.1.yaml` and `semantic_lab/sem03.py`.

## Eligibility

- System Topics: only catalog Topics with `lifecycle=ACTIVE`.
- Custom Topics: `usr.*` Topics are eligible unless explicitly `DEPRECATED`.
- Topic IDs must be unique.
- No AI path creates a formal System or Custom Topic.

## Global candidate construction

1. Dense retrieval considers the entire eligible Topic universe and contributes top 32.
2. Lexical/name/alias retrieval contributes up to 16.
3. Exact normalized aliases are explicitly retained.
4. Up to 4 custom Topics may enter through the custom safety lane.
5. Declared `confusing_neighbor_topic_ids` are expanded from the global seed set.
6. The merged global set is capped at 64.

At least the first 8 candidate slots are reserved global slots. They are constructed before personalization and cannot be gated or reordered by activity state.

## Personalization lane

After the global set is fixed, up to 4 otherwise-missing Topics may be appended using ACTIVE / pinned / calibration priors. Activity state cannot remove an inactive Topic, cannot gate full-catalog retrieval, and cannot alter the reserved global prefix.

## Validation

The canonical main CI run 35377053749 passed G0 and G4. The separate qualified-runtime run 35376532680 passed for all four SEM-01 runtime-qualified local embedding candidates. Personalized semantic quality remains INCONCLUSIVE because SEM-03 used no product-owner gold.
