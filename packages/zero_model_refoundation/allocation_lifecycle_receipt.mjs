/** Pure synthetic engineering receipt checks; never execute measurements or qualify resources. */
const must=(ok,message)=>{if(!ok)throw Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const zeros=['real_train_inputs','fitting','router_calls','predictions','new_semantic_samples','stable_allocations','semantic_candidate_repairs_charged','allowance_refunds','independent_quota_credit','new_paid_calls','new_permissions','consumed_as_test_reads','final_blind_execution'];
const stages=['MODULES_WARM_BLANK_BASELINE','IMMUTABLE_ENCODED_INPUT_RETAINED','POST_INIT_BEFORE_GC_NOT_PEAK','ENCODED_PLUS_DECODED_RETAINED','DECODED_RELEASED_INPUT_RETAINED','INPUT_AND_DECODED_RELEASED'];
const counters=['heapUsed','heapTotal','external','arrayBuffers','rss'];
function checkObservationSet(r,spec){
 must(r.schema==='ZMR-SYNTHETIC-ALLOCATION-LIFECYCLE-UNREGISTERED-PREPARATION-1'&&r.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&r.registered===false,'original nonindependent receipt identity');
 must(r.capability_verdict==='UNTESTED'&&r.resource_verdict==='NOT_QUALIFIED'&&r.allowance===null&&r.saturation_ceiling===false&&r.stable_candidate_constructed===false&&r.actual_candidate_index_rebuilt===false,'no qualification or allocation');
 must(zeros.every(k=>r[k]===0),'zero semantic/private/paid operations');
 must(r.child_runs===6&&r.serial===true&&r.attempts_per_profile_representation===1&&r.post_init_snapshot_is_peak===false&&same(r.profiles,spec.expected_profiles),'finite profile and method');
 must(same(r.source_pins,spec.source_pins),'registered canonical source pins');
 must(r.source_path_normalization?.observation_numeric_fields_changed===false&&r.source_path_normalization.independence_claim===false,'metadata-only normalization');
 must(Array.isArray(r.raw_observations)&&r.raw_observations.length===6&&Array.isArray(r.deltas)&&r.deltas.length===6,'six original observations');
 for(let i=0;i<6;i++){
  const o=r.raw_observations[i],p=spec.expected_profiles[Math.floor(i/2)],representation=i%2?'view':'eager';
  must(same(o.profile,p)&&o.representation===representation,'exact profile/representation order');
  must(typeof o.node==='string'&&typeof o.v8==='string'&&typeof o.platform==='string'&&typeof o.arch==='string'&&same(o.execArgv,['--expose-gc']),'engine/explicit GC context');
  must(o.node===r.raw_observations[0].node&&o.v8===r.raw_observations[0].v8&&o.platform===r.raw_observations[0].platform&&o.arch===r.raw_observations[0].arch,'same engine context');
  must(Number.isSafeInteger(o.encoded_json_bytes)&&o.encoded_json_bytes>0&&o.summaries.full_structure_topics===144&&o.summaries.terms===p.terms&&o.summaries.encoded_hits===p.terms*p.hitsPerTerm&&Number.isFinite(o.summaries.normSum)&&o.summaries.normSum>=0,'full144 synthetic structural counters');
  must(Array.isArray(o.stages)&&o.stages.length===6&&o.stages.every((s,n)=>s.stage===stages[n]&&s.collection===(n===2?'NO_GC_SINGLE_POST_INIT_SNAPSHOT_NOT_PEAK':'TWO_EXPLICIT_GC')&&counters.every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)),'complete non-peak phase counters');
  const base=o.stages[0],encoded=o.stages[1],decoded=o.stages[3],released=o.stages[5],expected={profile:p.id,representation,decoded_minus_encoded:{},released_minus_blank:{}};
  for(const k of ['heapUsed','external','arrayBuffers']){expected.decoded_minus_encoded[k]=decoded[k]-encoded[k];expected.released_minus_blank[k]=released[k]-base[k];}
  must(same(r.deltas[i],expected),'delta arithmetic not a memory total');
  if(i%2){const eager=r.raw_observations[i-1];must(o.encoded_json_bytes===eager.encoded_json_bytes&&o.summaries.normSum===eager.summaries.normSum&&o.summaries.norm_typed_array_bytes===1152&&o.summaries.expanded_posting_arrays_retained===0,'paired identical input/norms');}
 }
}
export function validateSyntheticAllocationReceipt(initial,final,spec){
 must(spec.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&spec.capability_verdict==='UNTESTED'&&spec.resource_verdict==='NOT_QUALIFIED'&&spec.allowance===null&&spec.measurement_timestamp===null&&spec.timestamp_recoverable===false&&spec.true_peak_or_latency_measured===false,'registration limits must remain explicit');
 must(same(spec.expected_profiles,[{id:'STRUCTURE_3X3',terms:3,hitsPerTerm:3},{id:'STRUCTURE_128X3',terms:128,hitsPerTerm:3},{id:'STRUCTURE_BOUND_1500X144',terms:1500,hitsPerTerm:144}]),'fixed finite profiles');
 checkObservationSet(initial,spec);checkObservationSet(final,spec);
 must(initial.measurement_validity==='INCONCLUSIVE_GC_PHASE_STACK_NOT_DRAINED'&&initial.collection==='TWO_EXPLICIT_GC_PER_RETAINED_STAGE_NOT_ROUTING_LATENCY','initial confound preserved');
 must(final.collection==='ONE_EVENT_LOOP_TURN_DRAIN_THEN_TWO_EXPLICIT_GC_PER_RETAINED_STAGE_NOT_ROUTING_LATENCY'&&final.total_preparation_child_runs===12&&final.failure_records.length===1&&final.failure_records[0].methodology_repairs===1&&final.failure_records[0].semantic_candidate_repairs_charged===0&&final.failure_records[0].allowance_refunds===0,'one method repair no unchanged retry/refund');
 must(initial.source_path_normalization.original_unpublished_receipt_sha256===spec.public_input_pins[0].original_sha256&&final.source_path_normalization.original_unpublished_receipt_sha256===spec.public_input_pins[1].original_sha256&&final.failure_records[0].initial_result_sha256===spec.public_input_pins[0].original_sha256&&final.harness_pin.sha256===spec.harness_sha256,'original provenance linkage');
 must(final.synthetic_asset_scope.index_hard_limit_bytes===1048576&&final.synthetic_asset_scope.largest_encoded_json_bytes===3066522&&final.synthetic_asset_scope.largest_structure_within_published_index_budget===false&&final.raw_observations[4].encoded_json_bytes===3066522,'oversized structure cannot become eligible index');
 return Object.freeze({classification:'NON_INDEPENDENT_ENGINEERING_RECEIPT_ONLY',initial_observations:6,final_observations:6,profiles:3,original_measurements_reexecuted:0,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',stable_allocations:0,semantic_judgment_certified:false});
}
