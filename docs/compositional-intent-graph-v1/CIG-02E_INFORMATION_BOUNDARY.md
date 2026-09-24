# CIG-02E evidence boundary and next in-protocol candidate

## What the completed public development rounds establish

CIG-02B compiled typed atoms for all 144 Topics but reached 24/36 correct on a same-writer public DEV. CIG-02C added a global formal-name gate and reached 576/576 on source-derived name probes; a separately crowd-authored CLINC `train` slice then yielded only 3/110 correct for both CIG-02B and CIG-02C. CIG-02D broadened request-form recognition and added typed token overlap on a disjoint crowd-authored `train` slice: 16/110 correct, 16/17 assigned precision, 1/22 synthetic DEFER false assignment. None of these measurements qualifies the 144-Topic router. The unchanged capability floors are 0.95 precision, 0.70 coverage, 0.70 Topic macro recall, at most 0.02 insufficient-evidence false assignment, and zero context harm.

The CIG-02C aggregate diagnostic found action cues in 17/110 requests, any object anchor in 59/110, both in 12/110. CIG-02D recovered some requests by relaxing both gates but introduced a wrong Topic and a DEFER error. The evidence supports a **bounded inference**: preserving goal role is insufficient when the build-time semantic inventory does not encode common objects and requested outcomes. It does not prove zero-model routing impossible. It does show that another threshold-only relaxation on these consumed DEV rows would be unsound.

## Next candidate allowed by the current protocol

A possible CIG-02E candidate is a curated, provenance-bound set of topic predicate frames authored from the public Catalog and public profiles, with global rules for action/object/outcome composition. It may use general semantic reasoning at build time, which the CIG-02B design already permits, but must not copy any scored utterance or create per-case patches. The shipped runtime would still be zero-model, offline, deterministic and tiny, with all 144 Topics eligible. Every new atom would record its source class and intended role; the compiler would reject unmapped or unsupported provenance. Resource and DEFER gates stay unchanged.

That candidate needs **new, unconsumed public DEV** for selection. The existing CLINC selections and synthetic controls are consumed. A narrow external corpus may diagnose a subset, but it cannot establish 144-Topic macro recall. Before CIG-02 freeze, a source-separated public development corpus covering all 144 Topics and ambiguous/DEFER cases must be registered with stable gold and scoring. No such full-Catalog corpus is currently registered. A later CIG-03 independent capability TEST remains a separate, owner-controlled gate and must not be opened here.

## Decision boundary

CIG-02 remains open and unfrozen. Ordinary source-only atom authoring and new public DEV engineering may continue within the existing contract. Any proposal to add a production neural model, semantic network, larger resource budget, private/legacy/lockbox/archive source, PAIA production write, altered frozen metric, or new independent capability TEST requires owner approval first.
