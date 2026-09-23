# Architecture

## Production pipeline

```text
current user input --------------------┐
conversation title (optional) ---------┤
recent user inputs (bounded, optional)-┤
                                      v
                           deterministic normalization
                                      |
                     +----------------+----------------+
                     |                |                |
                 alias/phrase      char n-gram      BM25/TF-IDF
                     |                |                |
                     +----------------+----------------+
                                      |
                         context-lane weighting
                                      |
                    inclusion / exclusion / boundary
                                      |
                       full-catalog Topic scoring
                            across all 144 Topics
                                      |
                         multi-label + confidence
                                      |
                         ASSIGN / DEFER / NONE
```

## Design rules

### 1. Current input remains authoritative

Context exists to resolve ambiguity, not to hijack classification. A strong
explicit topic switch in the current input must be able to defeat stale title
or prior-context evidence.

### 2. Title is a separate evidence lane

The title must never be concatenated invisibly into the current input. Its
contribution is independently measurable and ablatable.

### 3. Recent context is bounded

Only a bounded number of recent user inputs may contribute. Position/recency
weighting must be deterministic. The cap and decay policy are frozen on public
evidence before private calibration.

### 4. Full catalog is cheap enough

With 144 Topics, v1 scores the complete eligible catalog. It does not need a
neural candidate-retrieval stage or sibling-domain injection to reduce search
space.

### 5. Positive and negative semantics stay distinct

Names, aliases, definitions, inclusion cues and positive phrases contribute
positive evidence. Exclusion/boundary cues contribute a separate penalty or
contrastive signal; they are not mixed into a single opaque representation.

### 6. No forced assignment

Weak, flat or conflicting scores produce DEFER/UNASSIGNED rather than a false
high-confidence Topic.

## Candidate scoring families

LSR-01 may implement and compare only deterministic, zero-model scoring
families predeclared in its round contract, such as:

- exact normalized alias match;
- phrase/substring match with token/character boundaries;
- character n-gram similarity;
- BM25 or equivalent sparse lexical score;
- deterministic weighted fusion of current/title/recent-context lanes;
- inclusion bonus and exclusion/boundary penalty.

No neural embedding, LLM call, learned classifier, trained weights or
private-derived feature engineering is part of the v1 production architecture.
