# CIG-02E public-source frame compiler

The compiler builds a deterministic, provenance-bound index from the formal 144-Topic Catalog, the six public semantic-profile shards, and the 18 authored frame files. It reads no DEV, TEST, private, legacy, lockbox, or PAIA archive data. It does not score a case or implement an assigner.

The build rejects missing or duplicate Topics, changed public semantic-core bases, unapproved source classes, altered formal fields, invalid role lists, normalization collisions, and an index above the frozen 1 MiB limit. It retains formal names and ACTION/OBJECT/OUTCOME phrases as distinct typed channels, records public source hashes, and sorts output deterministically. GitHub Actions compiles twice and compares exact bytes.

This engineering checkpoint is `SOURCE_COMPILE_ONLY_NOT_CAPABILITY`. An index alone is not a qualified runtime candidate. The next work is global composition and DEFER rules, then a new source-separated full-Catalog public DEV with stable gold and pre-open candidate/fixture hashes. CIG-02 remains unfrozen; CIG-03 is blocked. The original product limits and capability floors remain unchanged.
