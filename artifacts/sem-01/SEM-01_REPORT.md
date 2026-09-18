# SEM-01 Closure Report

## Verdict

SEM-01 engineering capability: **PASS**.

Personalized semantic quality: **INCONCLUSIVE**. No personal gold is authorized before SEM-06, and no result in this round is a personalized winner claim.

## Validation evidence

- Semantic Lab CI: run `35372058408`, job `105688104507` — success.
- Pinned local runtime bakeoff: run `35372058837` — success.
- Local runtime jobs:
  - Qwen/Qwen3-Embedding-0.6B: `105688105428`
  - nomic-ai/nomic-embed-text-v2-moe: `105688105528`
  - intfloat/multilingual-e5-large-instruct: `105688105619`
  - BAAI/bge-m3: `105688105622`
- Benchmark: `sem01-b0-catalog-multilingual-0.1`
- Benchmark fingerprint: `daa0c3d7e79377c2edd1eaa8c7ae76405f8aa3449e208f48666847edbfcd1f72`
- 450 cases across all 144 ACTIVE catalog Topics.
- Evidence classes: catalog-boundary + synthetic only.
- Real PAIA Inputs: 0.
- Live API model calls: 0.
- Owner semantic judgments: 0.
- Model training: 0.

## Engineering controls

| Control | Recall@1 | Recall@20 | MRR | Stable repeat |
| --- | ---: | ---: | ---: | --- |
| lexical char-trigram Jaccard | 0.9711 | 0.9756 | 0.9719 | yes |
| deterministic hash-ngram exact cosine | 0.8667 | 0.9733 | 0.8987 | yes |

These controls are engineering baselines, not candidate-model results.

## Pinned local runtime B0

| Candidate | Recall@1 | Recall@20 | Over-context cases | Query throughput/s | Peak RSS | Engineering state |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| BAAI/bge-m3 | 0.9800 | 0.9889 | 0 | 1.4552 | 3.97 GB | Pareto shortlist |
| nomic-ai/nomic-embed-text-v2-moe | 0.9600 | 0.9600 | 18 | 29.7713 | 5.05 GB | Pareto shortlist |
| intfloat/multilingual-e5-large-instruct | 0.9600 | 0.9600 | 18 | 9.2458 | 3.80 GB | Pareto shortlist |
| Qwen/Qwen3-Embedding-0.6B | 0.6667 | 0.8889 | 0 | 1.4393 | 7.50 GB | dominated on this B0 |

The 18 over-context cases for Nomic/E5 were rejected by explicit token preflight at 512 tokens. They were not silently truncated. Both models were perfect on the supported zh-short, en-short, and mixed slices. Qwen and BGE-M3 accepted all long fixtures.

Qwen is excluded from the SEM-01 engineering Pareto frontier because BGE-M3 is better on this same B0 in retrieval quality, supported-query throughput, peak memory, and long-input coverage. This is not a claim that BGE-M3 is universally or personally superior.

## API candidates

`voyage-4`, `text-embedding-3-large`, and `embed-v4.0` passed their adapter/manifest contracts. They were not assigned model-quality scores because no authorized provider transport/credential was present in this execution. Their runtime state remains explicitly unevaluated rather than being inferred from vendor claims.

## Gates

- G0 isolation: PASS.
- G2 bakeoff engineering: PASS.
- Candidate manifest coverage: 1.0 (7/7).
- Adapter contract coverage: 7/7 PASS.
- Pinned local runtime coverage: 4/4 executed and reproducible.
- Silent truncation violations: 0.
- Owner-attention policy violations: 0.
- Real Input API egress events: 0.
- Personalized semantic quality: INCONCLUSIVE.

## Artifacts

- `artifacts/sem-01/model-scorecard.json`
- `artifacts/sem-01/local-runtime-results.json`
- `artifacts/sem-01/qualified-shortlist.json`
- `artifacts/sem-01/machine-disagreement.json`
- `artifacts/sem-01/run-manifest.json`
- `artifacts/sem-01/candidate-manifests.yaml`

SEM-02 is not implemented by this closure. It may become READY only after the final closeout CI passes and the canonical status transition is merged.
