# PAD-01 Closure

PAD-01 is **COMPLETE/PASS** as a public/synthetic architecture diagnostic.

This verdict means the frozen decomposition executed completely,
deterministically and within its evidence boundary. It does not promote a new
architecture and does not reopen private calibration.

## Evidence

- PR #12 exact head: `0f64d0e4af742693b1078a77ddd94215f4fb94f9`
- PR-head Semantic Lab CI: `35851418804` — PASS
- PR-head evidence artifact: `10745876522`
- merged main: `3175db1e8e950a4c3b4731769b40061443030273`
- merged-main Semantic Lab CI: `35852183687` — PASS
- merged-main evidence artifact: `10746013756`
- published result/report commit: `202a203ce4b587ad82d4b69ee28621bd841e36c3`
- exact closure CI: `35879316607` — PASS
- closure job: `107243342812`
- closure evidence artifact: `10759249071`
- result digest: `99b3c64107bc0668f20227a6fcb15e76c5a2a66a1e1713eed1becd0e608a3e1b`

The PAD-01 executable was run twice in CI and the two JSON outputs were
byte-identical.

## Diagnostic findings

1. Single-vector `full_derived` control: Hit@10 0.986883, Hit@20 0.996914.
2. Removing exclusion cues from the positive concatenated representation yields
   only a small improvement: Hit@10 0.990741, Hit@20 unchanged at 0.996914.
3. Five-field multi-vector max late fusion, using the same positive semantic
   content, reaches Hit@5/10/20 = 1.0 / 1.0 / 1.0 on the frozen public suite.
   This is a structural synthetic signal only, not independent private/BGE
   evidence because the suite and semantic profiles share derived source
   semantics.
4. With imperfect direct rankings, BAA-01 sibling expansion loses more existing
   truth hits than it gains. On full_derived, cap2 loses 5 top-10 and 12 top-20
   direct hits with no gains; cap4 loses 17 top-10 and 12 top-20 while gaining
   only one top-10 hit.
5. On 288 public nonempty-context probes, rendered text and control embeddings
   change for every case; full rankings differ for every pair; expected target
   rank improves in 286/288 cases and worsens in 0. The simple hypothesis that
   context is erased by the public pipeline is therefore not supported.

The bounded architecture hypothesis supported for a future separately
authorized amendment is: multi-vector positive Topic representation plus a
full-catalog direct scoring path, with exclusion/boundary semantics separated
from positive embedding evidence. Context remains an unresolved private-effect
question rather than a confirmed broken path.

## Guards

- PAD-01 private calibration reads: **0**
- legacy evaluation reads: **0**
- consumed SEM-07 lockbox reads: **0**
- live archive reads: **0**
- real Input API egress: **0**
- model training: **0**
- formal catalog writes: **0**
- PAIA production writes: **0**
- SCA-04 started: **false**

## Stop

**STOP after PAD-01.** No architecture implementation, new private run,
evaluation read, lockbox use or SCA-04 execution is authorized by this closure.
