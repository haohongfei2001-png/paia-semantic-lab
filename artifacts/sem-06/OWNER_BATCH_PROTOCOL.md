# SEM-06 Owner Batch Protocol

The owner is asked for canonical semantic truth once. The batch is not a model comparison and does not expose model identity. Accepted judgments are reusable across compatible configurations.

## Private snapshot requirements

A real SEM-06 snapshot must be explicitly authorized, read-only, local-only, and API-egress-disabled. Each record carries stable Input identity, revision, source provenance, source-payload fingerprint, and text. Snapshot and personal gold content remain outside Git.

## Machine selection

Priority: disagreement; confusing-neighbor Topics; inactive Topics; retrieval disagreement; Router uncertainty; UNASSIGNED-vs-existing-Topic; representative coverage gaps. Near-duplicate questions are removed before owner review.

The target is approximately 100–200 high-information judgments. A smaller batch is valid only when recorded information gain saturates.

## Owner answer contract

For each Input, choose existing Topic ID(s), `UNASSIGNED`, or genuinely `DEFER`. Annotation cannot create a formal Topic. Unresolved frozen-catalog boundary ambiguity is recorded instead of forcing a label.

Retrieval relevance questions are answered once as canonical relevance truth and reused across model comparisons.

## Gold persistence

Accepted answers become versioned `CalibrationRecord` entries with Input revision, catalog version, candidates, prediction provenance, owner decision, context fingerprint, source, timestamp, and supersession lineage. Corrections supersede history rather than overwrite it.

Related Input families are deterministically assigned to calibration, evaluation, or SEM-07 lockbox partitions. SEM-07 reuses the frozen SEM-06 gold and does not routinely ask for new labels.