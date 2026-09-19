# SEM-07 — Frozen Personal Evaluation / Lockbox Closure

## Verdict

SEM-07 execution is **COMPLETE**. The measured **semantic capability verdict is FAIL**, while the evaluation/isolation engineering contract is **PASS**. Execution completion does not mean semantic capability approval.

No capability is currently eligible for production integration. No classifier/distillation training was started.

## Frozen evidence

- Baseline remote HEAD: `8aa822c14852f9c653eaf7a1276e64d498904bad`.
- Catalog: `0.2.0`, 144 system Topics.
- Reused SEM-06 gold: 128 judgments; calibration 80 / evaluation 13 / lockbox 35.
- Lockbox truth: 33 ASSIGNED / 2 DEFER / 0 UNASSIGNED.
- New owner labels in SEM-07: 0.
- Real-input API egress: 0.
- Model training: 0.
- PAIA production modifications: 0.

Personal lockbox evaluation is limited to the two pinned local models actually processed over the authorized real snapshot in SEM-06: Qwen/Qwen3-Embedding-0.6B and BAAI/bge-m3. SEM-01-qualified Nomic/E5 and all API candidates remain INCONCLUSIVE for personal quality rather than receiving fabricated scores.

## Lockbox results — base Router

| Capability | Qwen3-Embedding-0.6B | BGE-M3 | Frozen gate |
| --- | ---: | ---: | --- |
| Input retrieval nDCG@10 | 0.7354 | 0.0000 | >= 0.75 |
| Input retrieval Recall@20 | 1.0000 | 0.5294 | >= 0.90 |
| Candidate topic Recall@10 | 0.4222 | 0.4172 | >= 0.96 |
| Candidate topic Recall@20 | 0.6343 | 0.6975 | >= 0.99 |
| Router macro-F1 | 0.0333 | 0.0333 | >= 0.80 |
| Router accepted precision | 1.0000 | 1.0000 | >= 0.95 |
| Router accepted coverage | 0.0286 | 0.0286 | >= 0.60 |
| Router exact-match rate | 0.0000 | 0.0000 | diagnostic |

The apparent accepted precision of 1.0 is not a success condition: each base Router accepted only 1 of 35 lockbox cases. Its 95% family-bootstrap coverage interval is `[0.0, 0.1111]`, and the exact-match interval is `[0.0, 0.0]`.

Qwen retrieval fails because nDCG@10 is below the frozen threshold despite perfect judged Recall@20. BGE-M3 retrieval fails both nDCG@10 and Recall@20. Candidate retrieval and Router fail for both models by wide margins.

## Critical slices and activation

Chinese, Chinese/English mixed, and short-input slices are separately measured. Candidate/Router gates fail on all measured semantic slices. The lockbox has zero long-input cases, so the long slice is **INCONCLUSIVE_LOW_N**, not silently treated as PASS.

Activation replay used confirmed semantic assignment events only. It is deterministic across repeated replay, but is diagnostic-only: among 126 assigned gold cases, only 22 have original `source_sent_at`; 104 use `captured_at` as a timing proxy, and there is no gold UserTopicProfile. Activation quality therefore remains **INCONCLUSIVE**.

## Reproducibility

Final frozen private evaluation was replayed twice without changing evaluation/model/Router configuration. Both runs produced deterministic result digest:

`dc71239a2b00f7c985062b645d27134059a45793dda542d894b69927d18ca1d6`

Aggregate digests differ because aggregate metadata records runtime durations. During SEM-07, earlier lockbox replays were also used to repair metric implementation and evidence reporting; after first lockbox exposure there were **zero embedding configuration changes, zero Router-threshold changes, and zero acceptance-gate reductions**.

## Validation

Local repository regression: **65/65 PASS** in **201.296 s**.

Canonical public SEM-07 engineering benchmark: **PASS**:
- G0 isolation: PASS;
- G8 final engineering contract: PASS;
- owner-attention policy violations: 0;
- private artifacts allowed in Git: false;
- real-input API egress: DENY;
- model training: DENY.

Existing regressions also cover revision/catalog mismatch, stale decisions, incremental rebuild/purge, default-deny external calls, activation lifecycle, and provider-unavailable behavior.

Remote closure validation passed on candidate commit `26f3e1ed31dc9c068e84f1604d94bba0dfac107f`: `Semantic Lab CI` run `35421017814`, job `105838614336`, evidence artifact `10577258290` — **PASS**. Canonical status may therefore mark SEM-07 COMPLETE with capability verdict FAIL.

## Integration and small-model decision

`candidate_for_separate_integration_review` is empty. The future integration boundary remains design-only and must not modify PAIA production state.

Small-model eligibility is **NOT_ELIGIBLE** in SEM-07: candidate recall is already inadequate, Router failure is not isolated from upstream retrieval/candidate defects, the reusable gold has no UNASSIGNED truth cases, and no separate training authorization exists.
