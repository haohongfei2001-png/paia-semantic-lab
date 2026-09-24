# CIG-00 bounded failure analysis

This analysis uses only published aggregate LSR-01 and CSL-02/03/04 results. It does not inspect any consumed test utterance or gold row, private calibration, legacy evaluation, lockbox, or real PAIA archive.

## Observations

| Candidate and evidence | Assigned precision | Coverage | Topic macro recall | False assignment / context harm |
| --- | ---: | ---: | ---: | --- |
| LSR-01 primary B, source-separated public TEST (20 cases) | 0.5000 | 0.0556 | 0.0588 | insufficient-evidence false assignment 0.5000; context harm 0 |
| CSL-02 selected public DEV policy (72 cases) | 0.7500 | 0.0667 | 0.0370 across represented Topics | false assignment 0; context harm 0 |
| CSL-03 frozen TEST v1 (288 single-label cases) | 1.0000 | 0.0208 | 0.0208 across 144 Topics | false assignment 0; context harm 0 |
| CSL-04 one repair, frozen TEST v2 (288 single-label cases) | 0.9397 | 0.5903 | 0.5556 across 144 Topics | false assignment 0; context harm 2 |

The LSR TEST has a small, different denominator and is not numerically pooled with CSL. The two CSL blind fixtures are distinct, so their deltas are not a controlled threshold curve.

CSL-03 deferred 282/288 single-label cases. CSL-04 still deferred 118/288 and misassigned 10; its broader partial evidence also caused two context harm events. The LSR index and runtime largely met size, memory and cold-init limits; warm p95 missed by about 0.50 ms. CSL's browser resource gate was not certified after capability FAIL. These are capability observations, not proof that every zero-model design is impossible.

The old 1,296-case same-source synthetic ranking suite reached Hit@10/20 of 1.0 while LSR source-separated capability collapsed. It is regression evidence, not independent generalization evidence. CSL-04's evaluator had the same writer as the candidate and two exact public DEV expression overlaps; those limitations are retained. Its FAIL is robust to a two-case correction.

## Bounded attribution

1. **Grounding gap:** a finite alias/phrase inventory often supplies no eligible evidence for natural paraphrases. Strict assignment then DEFERs clear requests.
2. **Discrimination gap:** loosening partial lexical overlap raises assignment but admits neighboring or background concepts as if they were the user's goal. A score gap cannot recover information erased when all words are treated as untyped evidence.
3. **Context-role gap:** a stale topic, a tool used to achieve a goal, and the goal itself require different roles. The two CSL-04 context harm events show that the current repair did not fully preserve those roles; aggregate evidence does not identify which exact structure failed.
4. **Unknown:** these reports do not measure a ceiling for all local symbolic methods or a 144-Topic compositional parser. That must be tested with fresh evidence.

A deterministic bag-of-terms function cannot distinguish two inputs with the same term multiset but different goal/tool order and different gold Topics: it must return the same output for both. This is an information limit of that representation, not of zero-model computation. The next architecture preserves goal, means, background and continuation roles before Topic grounding.

## Falsifiable next step

CIG-01 uses new public synthetic minimal pairs with identical token multisets and different goal Topics. It compares (a) the mathematical bag-only ceiling, (b) goal-span extraction with an oracle Topic mapping used only for diagnosis, and (c) a local lexical grounding control. If oracle role accuracy is high but local grounding is low, the remaining bottleneck is lexical/semantic coverage. If oracle role accuracy is low, role parsing also remains unresolved. No result promotes a production classifier or reopens LSR/CSL.
