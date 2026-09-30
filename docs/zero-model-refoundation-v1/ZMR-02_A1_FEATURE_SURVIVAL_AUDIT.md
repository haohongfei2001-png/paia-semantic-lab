# TRAIN-only A1 feature survival and sparse allocation audit

Batch `ZMR-A1-FEATURE-SURVIVAL-AUDIT-20260930`; expected remote main `f5837ec0aa60985ef57822893d55f733f1a59303` after PR166. Single writer, owned paths: this report/result, new TRAIN-only audit script, STATUS and explicit CI allowlist. This continues PR166 canonical next_action. Evidence `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`; semantic rows scored0, independent rows0, AS0. Catalog blob remains pinned and TRAIN is unchanged public provisional v0.2. No public DEV/challenge/consumed packet/sealed AS/final or CIG-v1 TEST is opened.

## Method and engineering observations

Reconstruct the exact A1 compiler document assembly: deduplicate Catalog names/aliases, then append the fixed TRAIN row. This corrects an earlier uncommitted exploratory calculation that retained duplicate aliases; only this exact-assembly receipt is canonical. Full144 char2/3/4 features produce14,760 distinct terms. The existing selector keeps6,000 terms ordered by descending document frequency, then code-point order.

A fixed alternative reserves up to20 rare-first Catalog alias features per Topic per language (zh/en), in round-robin order across144 Topics, then fills to6,000 with the existing global frequency order. It reserves4,618 distinct features. No labels or predictions from DEV inform this choice. Index statistics and serialization are reconstructed without calling any Router. Existing selector reconstruction exactly matches the published A1 static index932,855 bytes, providing an engineering consistency check.

| TRAIN/Catalog-only observation | Existing frequency selector | Bilingual Topic reservation |
| --- | --- | --- |
| Feature count | 6,000 | 6,000 |
| DF1 features retained | 3,170 | 2,585 |
| English Catalog feature retention, median | 84.13% | 97.44% |
| Chinese Catalog feature retention, median | 27.78% | 100% |
| Chinese Catalog feature retention, minimum | 25.00% | 77.78% |
| Reconstructed static index bytes | 932,855 | 890,757 |

The alternative saves42,098 static bytes (4.51%). Fewer DF1 terms overall shows that reservation redistributes evidence rather than merely adding rare terms. Catalog phrase retention is not natural paraphrase recall, negative/control safety, multilingual capability or a meaningful confidence calibration. The audit has no semantic assignments, scores, capability deltas or latency/memory measurement. The reconstructed alternative is not a promoted runtime; `capability_verdict=UNTESTED`, `resource_verdict=NOT_QUALIFIED`.

## Registered next development hypothesis and bounds

Hypothesis `A1_TOPIC_LANGUAGE_FEATURE_RESERVATION`: under the same6,000-feature/1MiB index cap, fixed bilingual Topic reservation may preserve low-frequency output/action/object evidence lost by corpus-frequency pruning. It remains an A1 selector variant, not a new algorithm family or independent generation. Retired A4 implementation keeps repair2/2 and stays retired. Do not reset earlier candidate allowances by renaming them.

Before semantic output, freeze distinct original candidate-writer ordinary DEV with balanced language/Topic/domain coverage plus no-request, ambiguous, context and multi slices, explicit provenance/lineage and overlap audit. Do not reuse prior consumed public challenge keys. Fresh DEV may be a bounded diagnostic subset but must report missing full144 gold; never shrink the formal output universe or capability denominator. Gold remains provisional and zero independent01B quota.

Then implement at most one fixed balanced selector alongside unchanged frequency anchor; compile only pinned Catalog/fixed TRAIN, verify all144 prototypes, deterministic index closure and aggregate static budgets. Fix TF-IDF and BM25 selection/config identities before light same-writer DEV comparison. At most two mechanism repairs, retire absent safety-preserving gain. Fresh registered heavy comparison only for a stable candidate; independent AS stays unavailable and unconsumed. All95% precision,70% floors, control/context/multi gates and resource/local-first/zero-neural/embedding/LLM/API constraints remain unchanged. No ceiling claim.
