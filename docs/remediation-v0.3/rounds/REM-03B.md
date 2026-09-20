# REM-03B — Structured Domain-Backoff Candidate Remediation

Implement and evaluate a non-trained structured candidate generator that suppresses catalog boilerplate, uses discriminative existing catalog anchors, derives Domain evidence from training-fold calibration, and uses Domain→Topic full-coverage backoff for Topics lacking direct prototype support.

Private development evidence is limited to the existing 80 legacy calibration judgments and requires a fresh explicit execution authorization.

Development is family-grouped. Held-out families contribute zero prototype, exemplar, centroid or vote evidence to their own fold.

The execution matrix is bounded to at most 12 pre-frozen configurations across:
- current_only vs allowed_context query representation;
- exemplar_vote vs centroid vs hybrid Domain evidence;
- names_aliases vs names_aliases_plus_domain_path anchors.

No generated synonyms, AI-authored examples, catalog edits, model training, learned reranker or post-result matrix expansion are allowed.

Freeze one candidate configuration only if family-grouped calibration reaches Candidate Recall@10 >= 0.96 and Recall@20 >= 0.99, all measurable critical slices meet the same gates, leakage is zero and structural guards pass.

Only after calibration PASS may the 13-case legacy evaluation set be opened once. If calibration or evaluation fails, close REM-03B COMPLETE/FAIL and keep REM-04 BLOCKED. If promotion passes, close REM-03B COMPLETE/PASS and make REM-04 READY but NOT_AUTHORIZED.

STOP after REM-03B closure.