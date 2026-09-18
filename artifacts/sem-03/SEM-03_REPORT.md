# SEM-03 Completion Report

**Round:** SEM-03 — full-catalog Topic candidate retrieval  
**Capability verdict:** PASS  
**Personalized semantic quality:** INCONCLUSIVE  
**Validated implementation commit:** `737ea6d82cb6d16a7c23c66909e33a01b3a86701`

## What shipped

SEM-03 now has a full-catalog candidate layer covering ACTIVE System Topics and non-deprecated Custom Topics; dense and lexical/alias lanes; exact-alias retention; custom safety lane; confusing-neighbor expansion; 8 reserved global slots protected from activity priors; capped personalized append slots; deterministic challenge/disagreement evidence; and a synthetic 1,024-Topic scale test.

## Engineering evidence

Main Semantic Lab CI run **35377053749**, job **105704083890**, artifact **10560453507** passed all unit tests plus SEM-00, SEM-01, SEM-02 and SEM-03 regressions.

SEM-03 main evidence used 576 catalog-boundary cases over 144 System Topics plus 4 synthetic Custom Topic fixtures. Recall@5/10/20 = 1.0; inactive Recall@20 = 1.0; active/inactive gap = 0.0; custom Recall@20 = 1.0; global-slot preservation = 1.0; confusing-neighbor challenge failures = 0/18; 1,024-Topic scale Recall@20 = 1.0. Isolation, owner-attention, real-input API egress, live API call and model-training violation counts were all zero.

## Qualified embedding stability

PR runtime run **35376532680**, aggregate job **105703772476**, artifact **10560078405** executed all four local models already qualified by SEM-01:

- BAAI/bge-m3
- Qwen/Qwen3-Embedding-0.6B
- intfloat/multilingual-e5-large-instruct
- nomic-ai/nomic-embed-text-v2-moe

All four passed the SEM-03 G4 candidate metrics on 576 cases. Pairwise mean Jaccard@20 ranged from 0.7277945736 to 0.8212142125. Exact candidate sets frequently differed, so inter-model disagreement is real and is retained as evidence rather than hidden.

## Scope boundaries

No PAIA production repository/runtime/schema/Reader/Thought Library/Capture/ANS state was touched. No real PAIA archive was read, no real Input was sent to an API, no owner semantic labeling was requested, and no model was trained. The 1.0 candidate recall values are engineering results on catalog-boundary/synthetic fixtures and must not be presented as validated personal semantic quality.

SEM-04 is only made READY by the canonical status update in this closeout; it is not executed here.
