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

## Validation result

The exact-head graph/schema/suite validator passed.

- graph nodes: 144;
- sibling-contrast edges: 504;
- every Topic degree: 7;
- every Domain edge count: 28;
- positive synthetic cases: 288;
- directional hard negatives: 1008;
- total synthetic cases: 1296;
- synthetic boundary-oracle consistency: 1.0;
- formal semantic mutation events: 0;
- formal review required count: 0;
- private artifact reads: 0;
- graph SHA-256: 630ca65335265e5e3b4a55118ea68fcfc6e3e7077bd467b3d47d21c1dd5cd711;
- synthetic suite SHA-256: f24331adcfca3c575ba3e3bcaff758c17a4fc18de3d4e112ac5e9c5376f759b7;
- Semantic Lab CI run: 35514912032;
- job: 106089101681;
- evidence artifact: 10607085159;
- validated commit: 670eab1de2c8dd797ed2aeb9ea2bee145bf36d07.

SCA-02 is COMPLETE/PASS. SCA-03 is READY / NOT_AUTHORIZED and still requires fresh explicit authorization before any calibration read.
