# SCA-03 — Family-Grouped Personal Calibration Grounding

Requires a fresh explicit user authorization for read-only use of the existing 80 legacy calibration judgments.

Before private metrics are opened, freeze:
- derived profile bundle hash;
- contrastive graph hash;
- representation/fusion matrix;
- family-grouped split policy;
- candidate gates.

Private calibration is development evidence. Raw text, refs, labels, embeddings and per-case truth remain outside Git.

Pass requires Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99, critical slices at the same thresholds, and leakage = 0.

If calibration fails, the 13-case evaluation remains unopened and SCA-04 stays BLOCKED.

STOP after SCA-03.
