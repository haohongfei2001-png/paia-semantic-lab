# ZMR-05 A7 additive public TRAIN v0.3 and compile receipt

**Evidence:** `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`. One candidate writer authored all 144 new single-intent scenarios against the fixed 144-Topic Catalog. The sole new source cohort is `writer-additive-train-20260929`; its declared license status means original candidate-writer text, not a third-party license review. Gold is candidate-writer provisional and unreviewed. Independent author/source/gold credit is zero. This file and the data cannot satisfy ZMR-01B, capability, resource or saturation gates.

The new file adds exactly one distinct scenario per Topic to the existing TRAIN v0.2 row. Existing TRAIN rows stay only in TRAIN. All new rows expose writer, source, source family, scenario/template family, mechanism, language, authoring batch, Catalog digest and review status. Each scenario and template family is unique across the public development collection; source ID deliberately repeats within the real single authoring cohort and is not misrepresented as 144 independent sources. The new language mix is 103 zh, 38 en, 3 mixed. It is a development distribution, not a language qualification claim. No provisional Topic boundary changes were made.

An exact bundle/NFKC and character trigram screen compares the 144 new rows against 1,386 prior public provisional rows and each other. There are zero exact or NFKC duplicates, zero similarity flags at Jaccard >= 0.55; the largest observed overlap is 0.48. This is a mechanical overlap screen, not proof of independent authorship or semantic novelty. The test also verifies row metadata and full144 coverage. No CIG-v1 consumed TEST or sealed AS/TEST content was read.

`a7_compile.mjs` has an explicit three-file input closure: pinned Catalog, TRAIN v0.2 and TRAIN v0.3. It rejects symlinks, validates rows and cross-cohort scenario/template IDs, then deterministically compiles 288 case vectors (two per Topic). No DEV or challenge row enters compilation. The compiled artifact is generated locally and is not a capability score. The fixed 48-feature per case build reports:

| Mode | Index bytes | Runtime plus index bytes | Index SHA256 |
| --- | ---: | ---: | --- |
| char | 616,375 | 630,891 | `d0ed330bd67e917732027f0ecda4d91547693fdc010b09d1ed1500506e5fc820` |
| word | 216,170 | 230,686 | `2fc2a8445687453ba51ff45a9bf223790ac85064b6896497ad1c962385eece88` |

Both static counts fit the unchanged 1 MiB index and 2 MiB combined ceilings. They do **not** measure browser memory, warm p95, cold init, or production bundling, so resource verdict stays `NOT_QUALIFIED`. A7 has no semantic evaluation, selection or repair spent. The next development step is a fresh public DEV diagnostic that was never used to choose A7, followed by a frozen stable configuration and fresh full144 challenge for one registered paired A3/A1/A7 comparison. Consumed v0.2-v0.6 challenge/safety keys are not reused for tuning.
