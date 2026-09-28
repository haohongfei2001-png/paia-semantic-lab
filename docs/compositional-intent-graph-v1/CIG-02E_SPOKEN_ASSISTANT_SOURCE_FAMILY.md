# CIG-02E spoken assistant source-family metadata gate

This is a **GitHub metadata-only** review of a possible supplemental source family. No SLURP or MASSIVE dataset row, audio file, TEST payload, router prediction or natural-language fixture was read. The canonical 41 nominations / 35 Topics / 109 missing / 28 unresolved / zero gold remain unchanged.

## Pinned identity and reuse basis

- [SLURP](https://github.com/pswietojanski/slurp/tree/8eb16545762be97ace75334109d73824217311f1) commit `8eb16545762be97ace75334109d73824217311f1`, root tree `8d366577406450b9e1331ca991a9e9c48a907815`. Its [README](https://github.com/pswietojanski/slurp/blob/8eb16545762be97ace75334109d73824217311f1/README.md) describes textual spoken-assistant examples, and its [LICENSE](https://github.com/pswietojanski/slurp/blob/8eb16545762be97ace75334109d73824217311f1/LICENSE.txt) declares **text CC BY 4.0**, separately from audio CC BY-NC 4.0. Git tree lists train, devel, test and synthetic-train blobs. Only path/SHA/size metadata was inspected; train `c7568b5661ea802c9e41204af3d30ef892dcd5c9`, devel `de034fadea8caa5a3c08c387b2a750f37737729d`. TEST and synthetic train paths remain unopened.
- [MASSIVE](https://github.com/alexa/massive/tree/f966f21846043aabef9b0f974fa7970027f43738) commit `f966f21846043aabef9b0f974fa7970027f43738`, root tree `0571b1af95022f416c73fd8049219bb047bbaf13`. Its [README](https://github.com/alexa/massive/blob/f966f21846043aabef9b0f974fa7970027f43738/README.md) describes 60 intents across 52 languages, localized from SLURP. Its [NOTICE](https://github.com/alexa/massive/blob/f966f21846043aabef9b0f974fa7970027f43738/NOTICE.md) says the dataset is CC BY 4.0 and points to the license in the external archive. That distributed license and archive bytes have **not** been verified; repository code's Apache license is not used as a dataset license.

## Decision

**Prospective supplemental family only; no acquisition or full-Catalog DEV qualification.** SLURP utterances are task-oriented assistant speech, so direct-request fit and production authorship need full-input/source review. MASSIVE is a localization of the SLURP English base: 52 language variants cannot be counted as 52 independent examples. Neither the published 60-intent scope nor GitHub metadata establishes coverage of all 144 formal PAIA Topics, natural DEFER/context controls or independent PAIA Topic gold.

Any later bounded public TRAIN/DEV pilot requires a separate immutable source selection, verified text rights and author chain, complete direct-request review, a mapping against formal neighboring Topics, and explicit independence controls. Keep TEST partitions unopened. The current GitHub-only execution boundary does not permit the external MASSIVE archive. A later pilot would be source-only until a qualifying DEV candidate/gold/scorer is independently frozen; it does not open CIG-03 or an independent capability TEST.

Original fixed NI source run 36346751629 remains FAIL/no replay. This registration does not replace that consumed selection or repair its unknown parser root cause. CIG-02 remains unfrozen and source readiness blocked.
