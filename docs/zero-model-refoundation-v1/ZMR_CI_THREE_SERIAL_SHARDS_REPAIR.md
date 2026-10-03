# ZMR CI — three serial shards inside unchanged per-job limits

## Observed failure and diagnosis

WriterPR256 head7e0d504ad7f7905323c611281a584ff42ef70bf1/tree4f68aba3bba25eb71c55fd4ca8da11794cb858a5 ZMR37144277369 attempt1 is FAILURE. Job111264908933 succeeded; job111264909111 failed the scheduler forecast assertion `Math.max(...loads)<260000`. All137 units completed, one scheduler unit failed; the new finite41 compile-plan unit exited0, which does not make the workflow PASS. Semantic37144277346 succeeded. No consumed content or semantic gate was run.

The old127-unit timing reference plus ten1000ms fallback hints gave four forecast loads260038/260033/260132/260133ms. Adding a unit crossed the strict260000ms forecast ceiling; weakening it or increasing the5min job limit would hide the issue. Actual failed-head unit durations total1049736.261067ms (ideal four-way262434.065267ms), so merely refreshing the failed-head ordering hints would not preserve the40s setup reserve either.

The most recent verified main136-unit run37143155357 was SUCCESS in both jobs111261588885/111261589043. Its observed unit durations total1053222.306294ms (ideal four-way263305.576574ms). This independently confirms that the old four-lane estimate lacks the reserved margin. Those durations are engineering scheduling hints, not candidate resource or CI-stability certification. The cancelled127 reference and its predecessor remain unchanged and separately identified; the new immutable136 table is from this latest successful actual main, rounded upward per unit, not selected for a favorable time.

## Bounded repair and cost

Split the same ordered137 explicit units into six deterministic allocation lanes, two worker lanes per each of three serial jobs. `max-parallel:1`, two live unit workers, one worker per child,5min per job, `<260000` forecast ceiling and40s reserve are retained. No unit is duplicated, omitted, accepted from a PASS cache or assigned a smaller fabricated duration. Old two-shard API behavior is preserved for historical fixtures; only explicit2/3 shard identities and registered timing tables are admitted. Current three-shard membership uses the latest actual-main table; unknown future audits retain conservative estimates. Worker stealing still drains all failures and preserves result order.

Current latest-main forecasts are175714/175713/175714/175719/175713/175718ms. This is a forecast, not a measured new-head improvement. Adding one serial job increases setup/materialization overhead; it does not increase concurrent workers or rerun any test. Public metadata fetch totals increase from four to six tree requests across the workflow, with two per job; bounded raw prefetch remains four per job, zero Blob REST. No new paid call, permission or production deployment. The finite137-unit scope is unchanged; this is not authority for unlimited shard growth. This is the smallest additional serial partition retaining the current time ceiling and reserve without dropping assertions.

The existing shard and parser tests now require the actual three-shard matrix and prove three-way disjoint complete runtime execution. Scheduler tests preserve the old127 timing identity/baseline proof, check the newest136 table identity/coverage, verify complete137 membership and the unchanged strict time conditions, and reject arbitrary shard counts or unregistered timing hints. All model/data/semantic assertions remain unchanged. Their CI-specific two-shard expectation is explicitly updated to this engineering configuration, not silently skipped.

## Evidence and limits

Only the three changed CI unit files are tested locally, with all11 assertions/failure-propagation/cache/parser tests. No full historical local suite or real candidate predictions. The isolated closure includes workflow, scheduler and its tests, shard tests, parser helper and parser tests. The inline workflow is syntax checked without execution; the137 explicit unit paths/order are preserved. Local Node26 results do not certify Node22 or device parity; actual amended-head/main CI remains required.

The original finite41 packet/module/result remains byte-identical and all41 rows remain HOLD. Original #255 cancellation stays CANCELLED. No labels/roles/source provenance are accepted by this repair. All evidence is NON_INDEPENDENT_DEVELOPMENT_EVIDENCE; capabilityUNTESTED, resourcesNOT_QUALIFIED, stable allowance null/incomplete/unreconciled and comparisonHOLD. No semantic repair charge, allocation/refund, new samples, fitting/predictions, independent quota or ceiling. Full144/95%/70%, all safety/product resources/local-first/zero-model restrictions remain.

After this sole writer's amended exact-head/main/ownedbytes-tree verification, resume the registered standalone lossless posting-view resource development task. Its prior finite synthetic preparation is not a registered stable candidate or capability/resource result. No new paid/private/production/consumed AS-TEST/final blind actions.

## Finite receipts

Final changed CI tests11 PASS/0 FAIL/0 SKIP617.699583ms; isolated six-code closure11 PASS/0 FAIL/0 SKIP631.520333ms. Workflow declaration/materialization covers six code files and result; inline syntax PASS without execution. Unit137 list/order is byte-identical to the failed head. No unchanged full historical local rerun. Amended head/main CI pending observation.
## Prefetch matrix fixture follow-up — 2026-10-04

Head fd791fcd8ecb275092907423d90f5e9b08f1a13d/tree69454ce63b892268420e4a4408c0ab1dd164d164 ZMR37146010926 attempt1 is FAILURE, Semantic37146010912 SUCCESS. Three serial jobs completed; jobs111269980347/111269980486 succeeded, job111269980516 failed. All137 unique units ended; only pinned_public_prefetch.test.mjs failed because its last test still asserted the old two-shard workflow literal. The scheduler and other136 unit exits do not establish workflow PASS, label/role correctness, resource PASS or CI stability. The prior eleven-test local closure missed this prefetch fixture.

Require the actual three-shard matrix in the same existing test, retaining all four prefetch tests and their scope/alias rejection, four read-worker limit, failure draining/no retry, empty queue, serial document assertions, two test workers, max-parallel1 and timeout5 checks. The existing receipt additionally pins the unchanged workflow and amended test. Explicitly reviewed the five related CI engineering test sources; old two-shard scheduler API fixtures are intentionally retained. No workflow, unit list/order, finite41 semantic inputs/packet/module/result or product constraints change. No repeated unchanged eleven-test or full historical local suite. Historical failures remain separately preserved; no reset, refund, semantic repair charge, sample addition, prediction, stable allocation, independent quota or new paid/private/permission/final-blind action.

Completion requires the changed four-test prefetch proof in its three-file isolated closure, then the new exact-head and actual-main applicable CI plus owned bytes/tree verification. Local proof does not replace integration or semantic acceptance. The sole next development task remains the finite lossless posting-view engineering task after this integration; its already-completed unregistered preparation is not requalified or rerun.

Follow-up final receipts: changed prefetch tests4 PASS/0 FAIL/0 SKIP51.929708ms; three-file isolated closure4 PASS/0 FAIL/0 SKIP48.32375ms. Actual new-head/main CI pending.
