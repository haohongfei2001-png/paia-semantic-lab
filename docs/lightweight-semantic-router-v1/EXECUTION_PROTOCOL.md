# Execution Protocol

## Source of truth

GitHub remote `main` in `haohongfei2001-png/paia-semantic-lab`.

Canonical status:
`status/LIGHTWEIGHT_SEMANTIC_ROUTER_STATUS.yaml`.

## Product authority

For this package, consumer deployability is part of correctness.

A candidate that violates the hard model/network/size/runtime constraints is
not a valid PAIA v1 production candidate even if its semantic score is better.

## Round discipline

- execute only the round explicitly authorized by the owner;
- re-read remote main and canonical status before each round;
- do not modify historical SEM/REM/SCA/BAA/PAD evidence;
- keep large embedding systems as research baselines only;
- do not auto-start the next round after closure.

## Evidence discipline

LSR-00 through LSR-03:
- PUBLIC/SYNTHETIC/catalog evidence only;
- private calibration reads = 0;
- legacy evaluation reads = 0;
- consumed lockbox reads = 0.

LSR-04:
- existing 80 calibration records only, once, after explicit authorization and
  pre-evidence freeze.

LSR-05:
- existing 13 unopened evaluation records only, once, after a calibration pass
  and separate explicit authorization.

The 35 consumed SEM-07 lockbox records remain forbidden for tuning/promotion.

## Owner-attention policy

No new owner Input->Topic labeling is required in LSR-00 through LSR-03.
Existing human gold is preserved for the bounded private gates.

## Production boundary

No round in this package may write to the PAIA production repository/runtime
unless a later owner message explicitly authorizes the production integration
step.
