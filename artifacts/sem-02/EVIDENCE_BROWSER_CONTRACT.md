# SEM-02 Evidence Browser Contract

Status: frozen for SEM-02 engineering evidence.

The Lab Evidence Browser is a read-only inspection surface for public, synthetic, and catalog-boundary retrieval evidence. It is not a production PAIA UI and it must not expose owner semantic-label controls before SEM-06.

Required visible fields:
- query identifier and query text;
- retrieval scoring mode and whole/chunk aggregation mode;
- no-answer state and threshold;
- ranked document identifiers;
- lexical, dense, exact-term bonus, and hybrid score components;
- exact character start/end offsets and rendered evidence text;
- challenge, disagreement, and no-answer flags.

Correctness rules:
- every evidence span must equal the exact source substring at [start, end);
- browser records must validate against contracts/sem02_evidence_schema_v0.1.json;
- HTML must escape fixture text and use no external assets or network calls;
- challenge/disagreement queues are diagnostic and never create or mutate Topics;
- empty or low-confidence evidence may be shown with NO_ANSWER rather than forcing a semantic answer.

Authorization rules:
- evidence classes are limited to public, synthetic, and catalog_boundary;
- real PAIA archive reads and real Input API egress remain forbidden;
- no owner retrieval-relevance labels, Input-to-Topic labels, per-model trials, or repeated semantic judgments are requested in SEM-02;
- no training occurs in this round.

SEM-02 may pass the retrieval/evidence engineering gate only. Personalized retrieval quality remains INCONCLUSIVE until the authorized personal-gold rounds.
