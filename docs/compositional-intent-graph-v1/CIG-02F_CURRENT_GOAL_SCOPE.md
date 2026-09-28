# CIG-02F current-goal scope safety

## Bounded development finding

At remote main 03756742a39a9e4b74fc089ff7c849bf829ac6f7, newly authored public/synthetic controls reproduced **five unsupported assignments** in an in-memory authoring check. Each used the same synthetic formal name for a SPARSE Topic:

1. "Please do not help me with synthetic topic 000"
2. 'Please read the quote "synthetic topic 000" aloud.'
3. "My friend says they want to explore synthetic topic 000."
4. "If I want to explore synthetic topic 000, what would happen?"
5. "Please explain whether I should want to explore synthetic topic 000."

All five returned ASSIGNED. This is a genuine **development safety FAIL**, not an independent capability TEST result. The old frame grounder falls back to the entire request when no goal is parsed; its unanchored parser can also extract another person's or hypothetical "want to" span. A unique formal-name hit then bypasses the distinction between mention and current user goal. Source readiness alone does not solve this information boundary.

## Minimal repair

The minimal Router now applies a small current-input scope guard before the existing grounder:

- reject recognized quotation, negation, reported speech and conditional/metalinguistic markers;
- reject multiple sentences and input that does not begin with a supported direct request or goal/means construction;
- reject non-string current input, and inspect normalized input for the guard;
- keep the source mask, formal Catalog, frame compiler, existing goal parser and older grounders unchanged.

This is bounded lexical safety, not a complete scope parser or semantic understanding. Valid negative goals ("not" constructions), quoted goal names, conditionally phrased requests, multiple sentences and unsupported wording may conservatively DEFER. Context cannot override this decision. Other forms of implicit goals, irony, indirect or nested scope remain unresolved; passing these controls does not establish general safety or raise capability claims.

## Verification and evidence boundary

One coherent Actions batch runs the updated minimal-Router unit tests and a fresh same-writer public/synthetic diagnostic generated from the 35 SPARSE Topics' public formal names. It checks 70 direct positive requests plus 350 negative scope controls, exact DEFER reasons, context invariance, repeat determinism and effective footprint. The footprint now includes the source readiness JSON and all four runtime modules; total index plus mask <=1 MiB and router plus index/mask <=2 MiB. This is an engineering accounting correction, not a changed resource ceiling.

The authoring check preserved 70/70 direct English formal-name requests using all public names and synthetic roles. This is not the Actions result for the actual compiled frame index. Exact-head Actions remains the merge gate.

These new controls are development regressions authored by the same writer, not natural independently adjudicated gold. They may be used for this ordinary public engineering repair. No CIG-01 or consumed TEST inputs were read or used for tuning. Existing LSR/CSL genuine FAIL, CIG-02B/C/D DEV_UNQUALIFIED and NI source FAIL/no replay remain intact. Source search stays stopped at READY 0 / SPARSE 35 / DEFER 109. CIG-02 remains unfrozen; CIG-03 stays blocked.
