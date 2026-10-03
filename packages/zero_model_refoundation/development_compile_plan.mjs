/** Versioned finite41 development planning only. No fitting, predictions or budget allocation. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {ADMISSION_INPUT_PINS} from './train_review_admission.mjs';
import {requestReviewAwareCompilation} from './train_review_compiler_adapter.mjs';

export function prepareDevelopmentCompilePlan({manifest, inputUtf8, request}) {
  const admission = requestReviewAwareCompilation({manifest, inputUtf8, compile: () => {throw Error('held data must not reach fitting');}});
  const ids = manifest.records.map(r => r.id);
  if (canonicalJSON(request) !== canonicalJSON({schema: 'ZMR-FINITE41-PLAN-REQUEST-1', row_ids: ids, topic_ids: manifest.full_catalog_topic_ids})) throw Error('exact finite41 request and full144 universe required');
  return {
    schema: 'ZMR-FINITE41-DEVELOPMENT-COMPILE-PLAN-1', status: 'HOLD_NO_EXECUTABLE_PLAN',
    evidence_class: 'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE', executable: false,
    scope: 'EXISTING41_ONLY_NOT_ALL_TRAIN_ELIGIBILITY_OR_TOPIC_MASK',
    closure_sha256: createHash('sha256').update(canonicalJSON({inputs: ADMISSION_INPUT_PINS, manifest})).digest('hex'),
    topic_ids: [...admission.full_catalog_topic_ids],
    rows: manifest.records.map((r, i) => ({...admission.blocked_rows[i], original_current_sha256: r.original_current_sha256,
      original_context_sha256: r.original_context_sha256, original_spans_sha256: r.original_spans_sha256, original_role_spans: structuredClone(r.original_role_spans),
      original_gold_sha256: r.original_gold_sha256, lineage: structuredClone(r.lineage)})),
    compiler_callbacks: 0, fitted_features: 0, index_bytes_created: 0, predictions: 0,
    accepted: 0, independent_quota_credit: 0, stable_allocations: 0, remaining_allowance: null,
    capability_verdict: 'UNTESTED', resource_verdict: 'NOT_QUALIFIED'
  };
}

export function dispatchDevelopmentCompilePlan({plan, manifest, inputUtf8, request, executeCompiler}) {
  const actual = prepareDevelopmentCompilePlan({manifest, inputUtf8, request});
  if (canonicalJSON(actual) !== canonicalJSON(plan)) throw Error('plan must derive from current registered source/review closure');
  if (typeof executeCompiler !== 'function') throw Error('explicit compiler callback required');
  // Current cohort has no accepted development compilation row. No executable plan can be minted.
  return {status: 'HOLD_NO_EXECUTABLE_PLAN', closure_sha256: actual.closure_sha256, blocked_rows: actual.rows,
    compiler_callbacks: 0, fitted_features: 0, index_bytes_created: 0, predictions: 0};
}
