# SCA-05 — Immutable Semantic-Profile Handoff

Runs only after SCA-04 COMPLETE/PASS.

Freeze:
- Derived Semantic Profile bundle hash;
- contrastive graph hash;
- profile compiler/config hash;
- provenance manifest;
- promoted candidate-policy hash;
- catalog baseline identity.

Produce a handoff manifest to the v0.3 remediation package.

This round does not modify production PAIA and does not start REM-04.
A separate v0.3 amendment must consume the handoff and make REM-04 READY.

STOP after SCA-05.
