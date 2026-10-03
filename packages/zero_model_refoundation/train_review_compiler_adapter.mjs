/** Registered finite blocked-cohort entrypoint; no compiler or Router execution. */
import {auditReviewAwareTrainAdmission} from './train_review_admission.mjs';

export function requestReviewAwareCompilation({manifest,inputUtf8,compile}) {
  // Validate all source/review evidence before considering any caller-supplied callback.
  const evidence=auditReviewAwareTrainAdmission({manifest,inputUtf8});
  if(typeof compile!=='function')throw Error('explicit compiler callback required');
  if(evidence.disputed_rows!==41||evidence.development_compile_admitted!==0||manifest.records.some(r=>r.development_compilation_admission!==false))throw Error('only registered all-blocked finite cohort is supported');
  // Current registered cohort has no admissible rows. Other eligible development data is outside this API.
  return {
    classification:'ENGINEERING_COMPILER_ENTRYPOINT_HOLD_NOT_SEMANTIC_OR_RESOURCE_CERTIFICATION',
    status:'HOLD_EXISTING41_UNACCEPTED_LABEL_ROLE_REVIEWS',evidence_class:manifest.evidence_class,
    scope:'EXISTING41_ONLY_NOT_ALL_TRAIN_ELIGIBILITY_OR_TOPIC_MASK',
    full_catalog_topic_ids:[...manifest.full_catalog_topic_ids],
    blocked_rows:manifest.records.map(r=>({id:r.id,source_path:r.source_path,
      source_packet_sha256:r.source_packet_sha256,review_references:structuredClone(r.review_references),
      development_compilation_blockers:[...r.development_compilation_blockers],qualification_blockers:[...r.qualification_blockers]})),
    compiler_callbacks:0,features_created:0,index_bytes_created:0,router_calls:0,
    qualified_admitted:0,accepted:0,independent_quota_credit:0,semantic_judgment_certified:false,
    stable_allowance:manifest.candidate_budget.stable_configuration_allowance_remaining,
    stable_comparison:manifest.candidate_budget.stable_comparison,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED'
  };
}
