# REM-03 — Full-Catalog Candidate Remediation and Freeze

Implement bounded candidate changes supported by REM-00/01/02 evidence: context-aware representation, Topic descriptor composition, fusion/reranking, candidate width, confusing-neighbor handling and chunk/multi-vector aggregation.

Promotion uses legacy calibration plus bounded legacy evaluation; the consumed SEM-07 lockbox is forbidden for selection.

REM-04 unlock condition: at least one frozen configuration meets Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 with no hidden critical-slice failure and preserved full-catalog eligibility.

If that condition fails, close REM-03 with capability FAIL and leave REM-04 BLOCKED. STOP.
