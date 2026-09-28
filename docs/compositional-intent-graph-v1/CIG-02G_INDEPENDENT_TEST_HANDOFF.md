# Independent CIG-03 curator handoff

The owner authorized CIG-03 after CIG-02 completion/freeze. This document prepares the handoff; it is not a TEST packet and starts no TEST.

## Allowed curator context

Use the pinned public formal 144-Topic Catalog and derived semantic profiles, protocol 1.1.0 product contract, typed current-goal versus means/background contract, and fixed CIG-03 allocation/gates. Do not read candidate runtime/index, authored TRAIN/DEV, old consumed tests, private calibration, legacy evaluation, lockbox or real PAIA archive. Work only in this GitHub repository and GitHub Actions. No production changes or external semantic API.

Curator must be separate from candidate/TRAIN/DEV authoring and start without that authoring context. The current candidate writer has already read authored DEV, so cannot honestly create an independent blind packet alone.

## Packet requirements

Produce fresh natural-language requests with gold adjudicated against full Catalog scope, not copied Catalog names or generated restatements of development atoms. Record author identity/context isolation, provenance and gold rationale. Minimum 288 single-label requests covering every Topic, 72 context cases and 36 multi-label/ambiguous/DEFER cases. Include ordinary paraphrases, scope changes, means/background distractions and insufficient evidence. Do not inspect/tune the candidate to improve TEST results.

Release only aggregate allocation, Topic coverage, packet Git blob/hash identity and independence attestation to the candidate writer before pre-open freeze. Keep TEST text/gold unseen by that writer. Test authoring commit is separate from the candidate freeze. Only the evaluator executes the frozen candidate once after the packet/scorer/candidate identities are committed.

## Fixed outcome gates

Assigned precision >=0.95; auto-assignment coverage >=0.70; Topic macro recall >=0.70 over all 144; insufficient-evidence false assignment <=0.02; context harm 0; deterministic repeat PASS. No Topic deletion or metric adjustment. Report actual PASS/FAIL. Consumed TEST cannot become later tuning material or be replayed for promotion.

## Single writer coordination

Candidate writer remains read-only while the independent curator writes the TEST packet. After curator closure, the evaluator/manager records immutable pre-open identities without loading TEST rows. Ordinary Actions/PR CI should validate packet schema/provenance/coverage without producing candidate predictions before pre-open freeze. The one-shot evaluator is explicitly triggered once; subsequent CI verifies stored result digests.

Independent curator execution method is still unassigned. No extra TEST authorization is requested; its already authorized execution must meet the owner's independence/blindness requirement.
