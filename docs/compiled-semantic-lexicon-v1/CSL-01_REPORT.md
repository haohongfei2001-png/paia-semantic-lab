# CSL-01 lexicon compiler

The compiler reads the public formal Catalog, public SCA-01 derived profiles
and a separate model-authored Catalog-based Chinese/English utterance file.
That file contributes two non-template requests for each of the 144 Topics.
The compiler extracts semantic-core phrases and positive-intent signals as natural
expression candidates, canonical/anchor forms as cross-lingual forms, and
same-domain formal neighbors as contrastive non-assigning evidence. Every raw
row retains its source class, family and generator mode. Rebuilding produces an
identical source, compact index, collision report and SHA-256 source digest.

The compiler normalizes Unicode, rejects low-information/generic phrases,
deduplicates per Topic, reports shared expressions across Topics, and excludes
those collisions from the assignable index. Contrastive expressions never
become positive assignment evidence. The index covers all 144 active Topics
and is below the 1 MiB production index ceiling.

Current reproducible build: 6,759 raw candidates, 4,787 retained source rows,
2,677 assignable phrases, 46 cross-Topic collision families; compact index
185,174 bytes. Of the retained rows, 2,077 are natural expressions (including
288 separately authored requests), 694 are canonical/anchor forms and 2,016
are non-assigning contrastive rows.

This is a **compiler checkpoint**, not a semantic-capability PASS. The initial
public profiles provide a small candidate pool: all 144 Topics remain below
the plan's 60 natural-expression target. There has been no blind TEST read.
CSL-02 must use a distinct public DEV corpus to assess actual coverage and
choose at most three global policy variants. If coverage remains poor, CSL-03
must report FAIL under its frozen gates rather than lower them.
