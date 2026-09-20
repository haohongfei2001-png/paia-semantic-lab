# REM-03A — Calibration-Prototype Candidate Remediation

Implement and evaluate a non-trained reusable calibration exemplar/prototype candidate lane while preserving the REM-03 catalog candidate lane and full-catalog eligibility.

Allowed private development evidence: existing 80 legacy calibration judgments only, and only after fresh explicit read-only authorization for this round.

Development must be family-grouped so held-out families contribute zero prototype/exemplar evidence to their fold.

Allowed prototype strategies are bounded to exemplar-max, centroid, and one deterministic hybrid. Model revision remains pinned. No training.

Freeze one candidate configuration only if family-grouped calibration reaches Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 with no measurable critical-slice failure and all structural guards PASS.

Only after calibration PASS may the 13-case legacy evaluation set be opened once for bounded promotion. No post-evaluation reselection or threshold changes.

The consumed 35-case SEM-07 lockbox is forbidden for tuning or promotion.

If calibration or evaluation promotion fails, close REM-03A COMPLETE/FAIL and keep REM-04 BLOCKED.

If promotion passes, close REM-03A COMPLETE/PASS and make REM-04 READY but NOT_AUTHORIZED.

STOP after REM-03A closure.
