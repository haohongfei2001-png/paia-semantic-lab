# SCA-02 — Contrastive Boundary Graph & Synthetic Validation — Closure Candidate

## Scope

SCA-02 builds a derived, versioned contrastive boundary graph and a public/synthetic positive + hard-negative validation suite from the frozen SCA-01 profile bundle.

No private calibration/evaluation artifact is read. Formal Topic semantics remain unchanged.

## Graph design

The graph uses a complete sibling-contrast policy inside every internal Domain.

Each Domain contains 8 Topics, so every Domain contributes C(8,2)=28 undirected edges. Across 18 Domains this yields:

- 144 graph nodes;
- 504 sibling-contrast edges;
- node degree = 7 for every Topic.

Every edge carries a bilingual derived boundary rule and provenance. This graph is a retrieval/validation derivative, not a formal catalog graph mutation.

## Synthetic suite

The suite contains:
- 2 positive cases per Topic: 288 total;
- 2 directional hard negatives per edge: 1008 total;
- 1296 cases total;
- Chinese and English coverage.

Hard negatives explicitly mention both sibling Topics while marking one as context and the other as the primary intent. This allows deterministic boundary-consistency validation without private user Inputs.

## Validation target

The validator must prove:
- every graph node/edge references an existing profile Topic;
- each Domain is a complete K8 sibling-contrast graph;
- every Topic has degree 7;
- every edge has two directional hard negatives;
- every Topic has two positive synthetic cases;
- all graph/suite provenance forbids formal overrides;
- synthetic boundary-oracle consistency = 1.0;
- formal semantic mutation events = 0;
- formal review required count = 0;
- private artifact reads = 0.

SCA-03 remains blocked until SCA-02 exact-head CI passes.
