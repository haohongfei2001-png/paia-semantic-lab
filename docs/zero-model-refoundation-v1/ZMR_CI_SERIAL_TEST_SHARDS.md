# ZMR serial engineering test shards

## Incident

Source8 PR239 head `b7c2967b7614294cc19aa7d99510118ffd9cf03d`, tree `7204b996dcbc9cc2665c948a01023a1d6e3dd310`: Semantic CI36816529809 passed. ZMR run36816529908/job110222691285 was CANCELLED at its five-minute job limit. Its unit step logged307 assertions PASS/0FAIL and291616.398574ms before cancellation. The job is **CANCELLED_TIMEOUT_NOT_PASS**; later syntax and receipt assertions were not certified. No unchanged-head rerun was requested.

## Bounded repair

Keep the complete explicit118-unit list, every assertion and all frozen input/code pins. Add one two-test partition proof unit. The exact same119-file command uses Node's built-in `--test-shard` with `1/2` and `2/2`. Matrix `max-parallel:1` runs the jobs serially; each retains two test workers and a five-minute limit. Fail-fast is false so an ordinary first-shard failure does not discard the second shard's diagnostics. All shards must succeed for the workflow to pass. No test skipping, selective cached assertion credit, longer job timeout or wider input access.

Each shard separately verifies the exact base/head public trees and reads only the existing canonical allowlist at the immutable head SHA. Public transport remains two unauthenticated tree requests per job, no authenticated REST or blob REST, digest/size/type/path validation, four bounded raw-prefetch workers and verified immutable cache. Two serial jobs repeat that bounded materialization; this adds fixed setup/network overhead and splits test CPU work across the two jobs. It is an engineering scheduling repair, not a measured Router resource improvement or promise of total CI time/cost.

## Focused verification and boundaries

Ten focused partition/public-prefetch/public-reader assertions PASS. The partition proof runs seven synthetic files through both actual runtime shards, asserts disjoint sets and complete exactly-once union. The static proof pins the unchanged first118 unit names in order with SHA2560463573929208472d93ae7608c3dcfdbce5bdb0dbd6042a16a9aa1e4983c2627, retains unique explicit canonical test paths and admits future appended engineering units without dropping predecessors. The exact embedded workflow script parses without execution. The same ten assertions pass in an isolated four-file delivery. Initial local partition fixture inherited Node's test-child environment, causing empty nested output; that fixture error is preserved in scratch diagnostics and fixed by removing only NODE_TEST_CONTEXT from the synthetic child environment.

Source8's54frozen originals and all ancestor source/gold/role/factor/receipt bytes remain unchanged. Four-context antecedents/literalnameproxy1/54/864rawrows/full144Topics/all144Topics6rawrows/rawTRAINgap2592 remain source facts. WriterQA54notes are prepared, not registered qualification evidence. Accepted/independent quota and Router predictions/newstableallocations0; stable allowance null; dataNOT_QUALIFIED/capabilityUNTESTED/resourceNOT_QUALIFIED/noceiling. Full144/95%/70%/safety/1MiB/2MiB/32MiBincremental/20ms/100ms/local-first/zero-neural-embedding-LLM-semanticAPI are exact. No consumed CIG-v1 or future sealed contents were read. **ENGINEERING_ONLY_NOT_CAPABILITY**, all writer source evidence **NON_INDEPENDENT_DEVELOPMENT_EVIDENCE**.

After the repaired head passes and source8 actually merges, bind QA8 to that real registration, retain026label doubt and009/024/039/054role doubts without rewriting originals, then continue exact remaining family/language quota cells across144Topics.
