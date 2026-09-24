# CIG-02B typed grounding design

## Hypothesis

A goal-role parser removes a means/background confound but still leaves a span-to-Topic mapping problem. Flat phrase matching does not preserve whether an observed word is an action, object, outcome or incidental tool. A compact typed semantic-atom index may provide stronger compositional evidence without a production model.

## Build inputs

Only the public formal 144-Topic Catalog and public derived profiles may supply semantic source material. Build-time authorship may add generic action/object/outcome paraphrase families with provenance. Do not read CIG-01 scored cases, consumed LSR/CSL TEST utterances or gold, private calibration, legacy evaluation, the 35-case lockbox, or a real PAIA archive. The CIG-02 DEV aggregate may identify failure classes; exact DEV utterances are development data and may not be copied as one-off index entries.

## Candidate representation

For each Topic compile bounded `ACTION`, `OBJECT`, `OUTCOME` and `EXCLUSION` atoms. Keep source class, language, Topic ID, family and build digest. At runtime:

1. extract current-input goal span; keep explicit continuation separate;
2. match typed atoms only inside that goal span;
3. require a globally defined co-evidence rule or one uniquely identifying object;
4. subtract or DEFER on competing same-domain explanations and tool-only matches;
5. assign only when the evidence margin and source provenance are sufficient.

No domain prior, sibling expansion, per-Topic threshold, neural asset or semantic network call. All 144 Topics remain eligible. Index <= 1 MiB, router plus index <= 2 MiB, memory <= 32 MiB, warm p95 <= 20 ms and cold init <= 100 ms.

## Bounded validation

Compare at most two global policies on a **new** public DEV slice. Report assigned precision, coverage, 144-Topic macro recall where represented, means/background false assignment, DEFER false assignment, context harm, deterministic repeat, index size and runtime. A later independent blind TEST is one-shot after candidate and metric freeze, with the package's original 0.95/0.70/0.70/0.02/zero-harm gates. If atom coverage remains insufficient, report a genuine architecture FAIL rather than lowering gates or adding examples from a scored TEST.
