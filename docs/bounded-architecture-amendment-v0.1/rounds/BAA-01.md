# BAA-01 — Public Implementation & Verification

Execution authorization: **GRANTED** by the current user message.

Implement only:

1. direct-evidence-preserving candidate assembly;
2. missing-evidence-neutral prototype fusion.

Allowed candidate variants:

- direct reserve 6 + at most 2 additional siblings per seeded Domain;
- direct reserve 6 + at most 4 additional siblings per seeded Domain.

Use public Topic profiles and artificial synthetic vectors/fixtures only.

The round passes only if every invariant in `../VERIFICATION.md` passes for
both candidate variants, the neutral-fusion controls pass, and the full
required regression CI passes.

No private artifact may be opened. No SCA-04 execution is permitted.

On PASS, close BAA-01 and STOP. Do not automatically begin any private round.
