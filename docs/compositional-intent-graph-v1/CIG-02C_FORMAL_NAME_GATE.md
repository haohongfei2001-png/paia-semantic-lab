# CIG-02C formal-name eligibility extension

The CIG-02B index contained all 144 Topics, but an all-Catalog source-derived smoke check found 13 misses among 288 bilingual probes that explicitly named a formal Topic. The initial failing GitHub Actions run was [36029103024](https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36029103024). This is an engineering defect in full-Catalog eligibility, not a public capability result.

CIG-02C adds a single global exact-formal-name gate using the same public profile canonical names already bound to the formal Catalog. It checks only the current goal span, requires a request cue, and defers when distinct formal names compete. When one formal name contains another, the longer name wins. It then falls back to the unchanged CIG-02B typed grounder. No per-Topic exception, threshold, new source class, production model or network dependency is introduced.

The 288 probes are generated directly from the source names and test routing reachability only. They do **not** measure natural-language paraphrase coverage or support a CIG-02 freeze. The recorded CIG-02B new public DEV result and its source hashes remain unchanged. Before any capability claim, the CIG-02C candidate needs a separately authored new public DEV and source-separated evidence under the existing frozen protocol. CIG-03 remains blocked.
