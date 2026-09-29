# ZMR-01B pre-intake annotation guideline v0.1

This is a pre-prediction procedure for independent writers and reviewers, derived from the fixed Catalog and DATA_PROTOCOL. It is not a new Topic definition, a set of training examples, or an authorization to create sealed AS in this repository. Catalog identity: Git blob `6bcdd2af66879d7ac098cf237b5586c3c9818aad`, version `0.2.0`, 144 ACTIVE Topics. Every reviewer uses the full 144 IDs; domains are navigation metadata, never output labels.

## Gold decision sequence

1. Preserve the original `current`, `title`, and ordered `recent` bundle. Mark source roles and the spans that support a *current* goal, object, action and qualifier. Do not infer a new current request solely from a request word, a Topic name, a source site, a title or prior Router output.
2. Determine whether a current, sufficiently identifiable subject/intent exists. A statement, fragment or problem description can be assignable. A quotation, hypothetical or past event can also be assignable when the current message explicitly makes it the matter to handle. Mere background mention is not enough. If necessary evidence is absent, record DEFER with a reason; do not delete the row.
3. Resolve GOAL/MEANS/BACKGROUND before labels. The Topic follows the object or sustained matter the user is addressing, not automatically the communication format or tool used. If a method is itself a separate current objective, mark it as an additional intent. Keep multiple spans; a trailing goal phrase cannot erase earlier decisive evidence.
4. Apply negation, correction and temporal scope. Current explicit correction takes priority over an older context statement. A negated option is not the gold target unless the current objective is to discuss that option. Past/quoted material does not become a current goal merely because it contains an action verb.
5. Use title/recent only for genuine continuation, ellipsis or referent resolution. Current explicit content outranks conflicting title/recent. Record both the with-context gold and the expected output when necessary context is removed or replaced. If current alone suffices, record an invariance pair whose complete output must remain stable.
6. Choose one or more formal Topic IDs only when each is supported by a distinct current target. Multi-intent is a conjunction of separable targets. Competing interpretations of one unclear target are uncertainty: DEFER with candidate ambiguity noted privately, never a union of guesses.
7. Record prohibited Topics where a nearby formal boundary could plausibly be confused. The positive and prohibited choices need evidence spans and a boundary rationale. Do not change Catalog definitions to repair a candidate score.

## Required row and review record

Each base scenario has an immutable row ID, split/generation, Catalog digest, language, mechanism/factor tags, author and source cohort, license evidence, lineage family IDs, exact/NFC/NFKC/bundle fingerprints, near-duplicate review, input bundle, expected state/set, excluded set, evidence spans, identifiability state and freeze time. A variant inherits its scenario/contrast/translation lineage and stays in the same split. The runner receives only the input bundle.

Two non-author reviewers independently record exact sets and state before any candidate prediction. Agreement is computed on the unreconciled pair; every disagreement is retained and resolved by a third reviewer before freeze. If the formal Catalog itself cannot distinguish two labels, mark `LABEL_IDENTIFIABILITY` with the conflicting IDs and rationale. This is a data qualification issue; no annotator may rewrite, merge, split or hide a formal Topic.

## Mechanism and factor cards

Writers receive only the public Catalog, this guideline, product input shape, quota table and mechanism cards. Cards require direct/indirect/fragment/problem/result/comparison/correction/quotation/continuation forms; action/object/goal/qualifier variation; Chinese/English/mixed language; near-neighbor positive/negative/ambiguous cases; context deletion/replacement/conflict; multi-intent versus ambiguity; and controls. They do not contain candidate errors, TRAIN/DEV text, selected lexical cues, AS material or consumed TEST content. At least two mechanism families per Topic are reserved out of TRAIN and first appear in DEV. The ordinary DEV is split by lineage into TUNE and CAL before any candidate is evaluated.

## Source and independence decisions

Accepted source rows need a traceable source/session or original author, a license permitting the intended research use, an independent source review receipt, and writer/source lineage that remains split-isolated. A site name or random file split is not an independent source cohort. Unknown license, derived translations across splits, unreviewed near duplicates, same-writer AS, and post-prediction gold are rejected or held out of qualification. Near-duplicate scores are review flags, not automatic semantic equivalence.

This guideline can be frozen as a procedure now, but its usability and Topic boundary map still require independent pre-prediction review. It does not establish reviewer agreement or data readiness on its own.
