# SEM-03 Topic Descriptor Representation

The candidate layer uses one descriptor per eligible Topic.

The base descriptor reuses `semantic_lab.b0.topic_document`, in this order:

1. Chinese Topic name.
2. English Topic name.
3. Definition.
4. Chinese aliases.
5. English aliases.
6. Inclusion-boundary statements.
7. Representative examples.

SEM-03 then appends:

8. Exclusion-boundary statements.
9. `internal_domain=<value>`.
10. `lifecycle=<value>`.

The same representation contract applies to System and Custom Topics. The descriptor contains catalog metadata only; it does not read the real PAIA archive, include real Inputs, or add owner-authored semantic labels. Query prompting for qualified local embeddings reuses each SEM-01 candidate's frozen query/document prompt contract and pinned model revision.
