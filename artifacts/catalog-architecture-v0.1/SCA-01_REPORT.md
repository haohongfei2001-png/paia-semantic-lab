# SCA-01 — Full Derived Semantic Profile Generation — Closure Candidate

## Scope

SCA-01 generated a complete Derived Semantic Profile bundle for every current system Topic using only the formal public catalog plus general semantic reasoning.

No private calibration/evaluation artifact was read. The formal catalog was not modified.

## Bundle structure

- 144 system Topic profiles;
- six JSON shards, 24 profiles per shard;
- one manifest binding shard paths and Git blob SHAs;
- one deterministic compiler/validator;
- one existing formal Topic ID per profile;
- zero new Topic IDs.

Each profile includes:
- bilingual topic-specific semantic core;
- positive intent cues;
- exclusion cues;
- Chinese / English / mixed lexical anchors;
- bilingual synthetic utterance patterns;
- provenance;
- an empty contrastive-neighbor proposal list reserved for SCA-02.

## Formal / derived boundary

Every profile sets formal_semantics_unchanged = true and provenance.formal_fields_overridden = false.

Generated content is a rebuildable retrieval derivative. It does not create, merge, split, delete or redefine a formal Topic.

## Validation target

The compiler validates every profile against the frozen JSON Schema, checks exact Topic-ID equality against catalog v0.2.0, verifies canonical names and Domains, verifies Git blob SHAs, checks provenance coverage, checks semantic-core uniqueness, and computes a canonical SHA-256 over the sorted profile set.

SCA-02 remains blocked until the SCA-01 closure candidate passes exact-head CI.

## Validation result

The exact-head compiler/schema/catalog gate passed.

- profile coverage: 144 / 144;
- Topic ID set exact match: PASS;
- semantic-core unique count: 144;
- provenance coverage: 1.0;
- formal semantic mutation events: 0;
- private artifact reads: 0;
- canonical profile bundle SHA-256: 018738035c10e23faea18719a26a395dc6fb22297d0c6df3a8f93100d331d37b;
- Semantic Lab CI run: 35513261633;
- job: 106084790257;
- evidence artifact: 10605668165;
- validated commit: 4bbb283f2ea97ef85e36cf6a96e1c546d7623e96.

SCA-01 is COMPLETE/PASS. SCA-02 is READY / NOT_AUTHORIZED.
