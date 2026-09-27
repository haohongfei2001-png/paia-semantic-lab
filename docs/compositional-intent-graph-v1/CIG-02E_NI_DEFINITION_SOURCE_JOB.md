# CIG-02E fixed TRAIN definition source entrypoint

Classification: source acquisition engineering, not independent gold or capability evidence.

## Stable candidate and one-shot event

The only source job is `.github/workflows/cig02e-ni-definition-intake.yml`. It runs on `ready_for_review` only for branch `cig02e-ni-fixed-definition-acquisition`. Keep the PR draft until all six applicable exact-head checks pass. The entrypoint independently reads those checks once and rejects missing, duplicated, pending, failed or wrong-head evidence. It rejects prior runs of this source workflow and run attempts beyond one. No polling, retries, workflow reruns or superseded-head certification.

The job checks out the exact PR head and uses read-only contents/checks/actions permissions. It neither commits nor opens another writer. A failed attempt records a source-only failure artifact; perform bounded root-cause analysis before considering any further action. Preserve downloaded/consumed source identity rather than silently restarting acquisition.

## Fixed source and output

Use the immutable registered feasibility plan: Natural Instructions commit `55a365637381ce7f3748fa2eac7aef1a113bbb82`, the registered TRAIN list blob and its first 24 registered paths. Git commit/tree metadata supplies task blob identities and sizes. The pinned Apache-2.0 LICENSE blob is verified and retained before task definitions materialize. Each raw resource has one request, a 30-second deadline, no redirect and no retry. The job has a ten-minute Actions ceiling; API and planned source bytes share the registered 128 MiB budget. Task limits remain 50 MiB.

Only the ten registered metadata fields and definitions can be decoded/retained. Instances and positive/negative examples are structurally skipped; no full-task JSON.parse or raw task logging. Full stream blob verification must succeed before retained fields are returned. The parser now skips ordinary spans of discarded strings in chunks while preserving quote, escape, Unicode and control-character syntax checks.

Artifact `source-intake/` contains verified license and metadata-only result or failure. Successful results also have a machine-readable log sentinel for remote review. Original task contributors/source/license metadata remain attribution; community provenance does not prove individual authorship. Definitions are excerpts without instance inputs. Author provenance, complete-input suitability and independent Catalog adjudication remain held.

## Verification and boundaries

Driver module syntax and CI/single-attempt guard authoring checks PASS; optimized selective skip passed synthetic chunk/escape checks; authoritative full Node suites pending Actions.

The Actions synthetic job runs parser, verified stream integration and new entrypoint tests together. New tests cover exact-head CI, duplicate/rerun prevention, fixed descriptors/byte limits and transport rejection/cancellation. No upstream acquisition occurs in synthetic tests.

PR #68 exact-main is six applicable PASS. PR #69 merged at `b25c1a156bd2978174671c273b5f9eceb071b1de`; its single main snapshot was five PASS and one in progress. The immutable observation is not a final PASS receipt.

Source intake does not create gold, compute DEV scores, inspect predictions, read capability TEST, or change router behavior/product constraints. Ledger stays 41 nominations / 35 Topics / 109 missing / 28 unresolved / zero gold. CIG-02 remains unfrozen; CIG-03 remains blocked and owner-gated. HH stays closed, source-only. LSR/CSL FAIL and prior CIG unqualified evidence remain unchanged.
