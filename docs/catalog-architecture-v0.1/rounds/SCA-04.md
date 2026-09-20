# SCA-04 — One-Time Legacy Evaluation Promotion

Runs only after SCA-03 COMPLETE/PASS.

Use the exact frozen SCA-03 profile bundle, graph, compiler/config and candidate policy.

Read the 13-case legacy evaluation set once.
Do not edit profiles, graph, representation, weights or thresholds after evaluation opens.

Pass requires Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99 with all measurable critical slices passing.

If promotion fails, close COMPLETE/FAIL and preserve evidence.

STOP after SCA-04.
