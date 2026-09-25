# CIG-02E 18 sparse Topic source excerpt triage

This review uses the **existing**, immutable three-source queue from PR #42, exact-head [Actions run 36113518112](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36113518112), job `108002125705`. It adds no corpus scan, router run, gold, DEV score, or capability TEST. The queue's at-most-three deterministic excerpts per Topic are a discovery aid; many are clipped. Source row IDs and instruction hashes, but no source text, are stored in the [companion result](../../artifacts/compositional-intent-graph-v1/CIG-02E_EIGHTEEN_SPARSE_EXCERPT_TRIAGE.json).

Counts below are Dolly human / Alpaca synthetic / Self-Instruct synthetic **lexical** candidates. They are not coverage or a representative sample. A synthetic row can be semantically related but still fail the current independent natural-request intake gate. A shown human row can be rejected as an excerpt candidate without judging unseen rows. No full source row was adjudicated here; `accepted_fixture_rows = 0` means none were accepted by this pass, not that none exist.

| Sparse Topic | Lexical counts | Capped excerpt finding |
| --- | ---: | --- |
| `sys.business_entrepreneurship.business_strategy` | 0/9/0 | Only synthetic sampled rows; two ask for strategy generation, one asks for a definition. |
| `sys.business_entrepreneurship.partnerships` | 5/2/1 | Three shown Dolly rows request title writing, colleague praise, or alliance facts; two other Dolly lexical hits remain unreviewed. |
| `sys.education_learning.academic_admin` | 1/4/2 | The one shown Dolly row concerns civic voter registration; synthetic rows concern generic forms and emails. |
| `sys.education_learning.learning_methods` | 0/2/2 | Synthetic rows use machine-learning methods, a lexical collision with personal study methods. |
| `sys.family_relationships.caregiving_family_support` | 0/0/0 | No exact-anchor source candidate in the three pinned corpora. |
| `sys.family_relationships.social_interaction` | 1/1/3 | The truncated Dolly excerpt is an autism paper/enrollment question; Topic fit cannot be established from it. |
| `sys.finance_purchases.major_purchases` | 0/0/1 | The sole synthetic hit asks about a purchase already made, not a current high-impact decision. |
| `sys.home_daily.local_errands` | 3/5/1 | Shown Dolly excerpts concern in-person learning, contact, and blog titles, not errands. |
| `sys.knowledge_memory.files_documents_storage` | 1/2/3 | The shown Dolly row concerns soccer equipment; synthetic rows are file-operation commands. |
| `sys.knowledge_memory.personal_archive` | 0/1/2 | Shown synthetic hits are article archive URLs, not personal records. |
| `sys.knowledge_memory.photos_media_archive` | 0/0/0 | No exact-anchor source candidate in the three pinned corpora. |
| `sys.knowledge_memory.provenance_history` | 0/2/0 | Synthetic revision/change-log tasks need full boundary review; no human-source hit. |
| `sys.personal_direction.life_planning` | 0/1/0 | The sole synthetic hit concerns business planning, not personal life stages. |
| `sys.projects_products.product_requirements` | 0/3/0 | Synthetic user-story/feature templates may be topic-related but are not independently human-authored natural requests. |
| `sys.projects_products.product_strategy` | 0/6/0 | Synthetic value-proposition templates may be topic-related but are not independently human-authored natural requests. |
| `sys.projects_products.project_planning` | 2/5/2 | Shown Dolly rows ask for milestones or a definition without a concrete project; source context is insufficient. |
| `sys.projects_products.roadmap_prioritization` | 1/5/1 | Shown Dolly excerpt is bike-use advice; synthetic roadmap prompts are generic templates. |
| `sys.travel_places.trip_records` | 0/1/0 | The synthetic Rome journal prompt asks for a generated entry, not an observed personal trip record. |

## Bounded conclusion

The 18-topic queue shows three distinct obstacles: zero or sparse retrieval, lexical collisions with unrelated goals, and synthetic templates that do not provide independently observed natural requests. The capped samples cannot support full-row gold decisions. In particular, the two zero-retrieval Topics remain source gaps, while related synthetic product prompts are still unqualified as natural DEV rows. The [source intake gate](./CIG-02E_SOURCE_BOTTLENECK_ANALYSIS.md) therefore remains in force. Next work should review stable, licensable **whole direct requests** and neighboring Topic boundaries, rather than run another broad lexical inventory or promote these counts to capability evidence. CIG-02 remains unfrozen; CIG-03 blocked.
