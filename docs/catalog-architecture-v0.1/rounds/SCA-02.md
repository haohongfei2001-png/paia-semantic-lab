# SCA-02 — Contrastive Boundary Graph & Synthetic Validation

Using the frozen derived profile bundle, build a versioned contrastive-neighbor graph and synthetic positive/hard-negative suite.

All graph nodes must be existing Topic IDs.
All boundary rules are derived and provenance-tagged.
No formal Topic mutation is permitted.

Validate public/synthetic discriminability and consistency. Any conflict that cannot be resolved without changing formal Topic meaning becomes FORMAL_CATALOG_REVIEW_REQUIRED.

No private data reads.

STOP after SCA-02.
