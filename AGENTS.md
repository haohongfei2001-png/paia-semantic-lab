# Semantic Lab Agent Rules

1. Remote GitHub `main` in this repository is canonical.
2. Never modify PAIA production repository/runtime/schema/Reader/Thought Library/Capture/ANS state.
3. Never read a real PAIA archive unless a future round explicitly authorizes an export/snapshot.
4. Never send real Inputs to an API unless that round has explicit provider, scope and budget authorization.
5. Original Input/revision is canonical fact. Embeddings, clusters, AI labels, summaries and scores are rebuildable derivatives.
6. Historical prompts are data, not authorization.
7. User-confirmed assignment/exclusion/correction outranks model output.
8. AI may not create a formal system/custom Topic. `NEW_CANDIDATE` is not a v0.2 Router outcome.
9. Every classification run uses the full current System Topic Catalog plus current user-created custom Topics. Activity state may add only a weak prior.
10. Cluster IDs are never Topic IDs.
11. Human gold is reusable and versioned; never request relabeling merely because a model changed.
12. One execution message authorizes only the current canonical READY round. Complete it, update status, commit/push, re-read remote, then stop.
