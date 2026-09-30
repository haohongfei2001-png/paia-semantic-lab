/** Supplied public aggregate/source metadata only; never executes historical diagnostics. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {assessHistoricalAccounting} from './competition_budget.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const at=(v,p)=>p.split('.').reduce((a,k)=>a?.[k],v);
const codePath=p=>/^packages\/zero_model_refoundation\/[a-z0-9_]+\.mjs$/.test(p);
export function auditLaterDiagnostics({inventory,status,groups,records}){
 const guard=assessHistoricalAccounting(inventory);
 must(Array.isArray(groups)&&groups.length>0&&Array.isArray(records)&&records.length>0,'later public metadata required');
 const seen=new Set(),keys=new Set(),indexes=new Set(),groupIds=new Set();
 const historicalKeys=new Set(inventory.registrations.map(x=>x.metadata.evaluation_key));
 const preserved=groups.map(g=>{
  must(!groupIds.has(g.candidate_id),'duplicate later group');groupIds.add(g.candidate_id);
  const carried=inventory.carried_repairs.find(x=>x.candidate_id===g.candidate_id);
  must(carried&&carried.source_field===g.repair_source_field&&carried.spent===g.repair_spent&&at(status,g.repair_source_field)===g.repair_spent,'later repair counter mismatch');
  const disposition=at(status,g.disposition_source_field);
  must(typeof disposition==='string'&&disposition===g.disposition&&disposition.startsWith('RETIRED_')&&carried.retirement_preserved===true,'later retirement erased');
  must(at(status,g.report_source_field)===g.report_path,'later disposition report mismatch');
  return {...g,allocation_identity:'CARRIED_SOURCE_ID_NOT_RECONCILED_MECHANISM_OR_GENERATION'};
 });
 let codePins=0,chains=0,indexMentions=0,missingCode=0,missingIndexes=0;
 const events=records.map(r=>{
  must(typeof r.aggregate_path==='string'&&!seen.has(r.aggregate_path),'duplicate later aggregate');seen.add(r.aggregate_path);
  const g=preserved.find(x=>x.candidate_id===r.candidate_id),a=r.aggregate;
  must(hex(r.aggregate_sha256),'original aggregate byte digest required');
  must(g&&Number.isInteger(r.repair_step)&&r.repair_step>=0&&r.repair_step<=g.repair_spent,'later repair step invalid');
  must(a?.classification==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&a.independent_rows===0&&a.as_consumed===0&&a.topic_universe===144&&a.capability_verdict==='UNTESTED'&&a.resource_verdict==='NOT_QUALIFIED','later evidence boundary changed');
  must(hex(a.cohort_sha256)&&/^data\/zero_model_refoundation\/development\/provisional_[a-z0-9_.]+\.json$/.test(a.cohort),'later cohort identity required');
  must(codePath(r.diagnostic_path)&&typeof r.sources?.[r.diagnostic_path]==='string','fixed diagnostic source required');
  must(r.sources[r.diagnostic_path].includes(r.aggregate_path),'diagnostic receipt path mismatch');
  must(Array.isArray(r.code_bindings),'historical code bindings required');
  const boundFields=new Set();
  const recordedCode=r.code_bindings.map(b=>{
   must(!boundFields.has(b.field)&&codePath(b.path),'duplicate or unsafe code binding');boundFields.add(b.field);
   const d=b.field.startsWith('dependency_hashes.')?a.dependency_hashes?.[b.field.slice(18)]:at(a,b.field);
   must(hex(d)&&typeof r.sources[b.path]==='string'&&sha(r.sources[b.path])===d,'historical module receipt mismatch');codePins++;
   return {field:b.field,path:b.path,sha256:d,verification:'ORIGINAL_RECORDED_MODULE_DIGEST_MATCHED'};
  });
  const expectedFields=[...Object.keys(a).filter(k=>k.endsWith('_module_sha256')),...Object.keys(a.dependency_hashes||{}).map(k=>'dependency_hashes.'+k)];
  must(canonicalJSON([...boundFields].sort())===canonicalJSON(expectedFields.sort()),'historical module binding coverage incomplete');
  if(!recordedCode.length)missingCode++;
  const indexPins=Object.entries(a).filter(([k])=>k.endsWith('_index_sha256')).map(([field,d])=>({field,sha256:d}));
  if(a.builds?.frequency&&a.builds?.balanced)for(const name of ['frequency','balanced']){
   const b=a.builds[name];must((b.topic_count??b.topic_universe)===144&&hex(b.catalog_sha256)&&hex(b.train_sha256)&&Number.isInteger(b.index_bytes)&&b.index_bytes>0,'later original build metadata invalid');
   must(b.classification==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'||b.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','later build independent claim');
   must(b.resource_verdict===undefined||b.resource_verdict==='NOT_QUALIFIED','later build resource promotion');
   indexPins.push({field:'builds.'+name+'.index_sha256',sha256:b.index_sha256,recorded_bytes:b.index_bytes});
  }
  for(const pin of indexPins){must(hex(pin.sha256),'later index digest invalid');indexes.add(pin.sha256);indexMentions++;}
  if(!indexPins.length)missingIndexes++;
  let originalKey=null;
  if(a.evaluation_key!==undefined){
   must(hex(a.evaluation_key)&&!keys.has(a.evaluation_key)&&!historicalKeys.has(a.evaluation_key),'duplicate or invalid original public key');
   must(a.dependency_hashes&&a.configs&&a.builds?.frequency&&a.builds?.balanced,'original public key recipe unsupported');
   const anchor=a.builds.frequency,candidate=a.builds.balanced;
   must(anchor.catalog_sha256===candidate.catalog_sha256&&anchor.train_sha256===candidate.train_sha256,'later build source identities differ');
   const reconstructed=sha(JSON.stringify({package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',scope:'PUBLIC_DEV_INNER_LOOP_ONLY',dependency_hashes:a.dependency_hashes,catalog_sha256:anchor.catalog_sha256,train_sha256:anchor.train_sha256,cohort_sha256:a.cohort_sha256,anchor_index:anchor.index_sha256,candidate_index:candidate.index_sha256,configs:a.configs}));
   must(reconstructed===a.evaluation_key,'original public key reconstruction mismatch');keys.add(a.evaluation_key);originalKey=a.evaluation_key;
  }
  let prior=null;
  if(r.prior_path!==null){
   const p=records.find(x=>x.aggregate_path===r.prior_path);
   must(p&&p.candidate_id===r.candidate_id&&p.repair_step===r.repair_step-1&&p.aggregate.cohort_sha256===a.cohort_sha256&&p.aggregate.cohort===a.cohort,'later repair lineage mismatch');
   must(['initial_result_sha256','prior_result_sha256'].includes(r.prior_field)&&hex(a[r.prior_field])&&a[r.prior_field]===p.aggregate_sha256,'later prior receipt mismatch');
   must(a.evaluation_status==='REUSED_PUBLIC_DEV_INNER_LOOP_NOT_FRESH_GATE','repair evidence promoted to fresh gate');chains++;
   prior={path:r.prior_path,field:r.prior_field,sha256:a[r.prior_field],classification:'REUSED_EXPOSED_PUBLIC_DEV_NOT_FRESH_GENERATION'};
  }else must(r.repair_step===0&&!a.initial_result_sha256&&!a.prior_result_sha256,'initial receipt lineage mismatch');
  return {aggregate_path:r.aggregate_path,aggregate_sha256:r.aggregate_sha256,candidate_id:r.candidate_id,repair_step:r.repair_step,
   cohort_path:a.cohort,cohort_sha256:a.cohort_sha256,original_evaluation_key:originalKey,
   missing_key_policy:originalKey?'ORIGINAL_RECORDED_KEY_RECONSTRUCTED_FROM_METADATA_ONLY':'MISSING_ORIGINAL_KEY_NOT_SYNTHESIZED_NOT_REPLAY_AUTHORIZATION',
   recorded_code_pins:recordedCode,current_diagnostic_sha256:sha(r.sources[r.diagnostic_path]),
   diagnostic_pin_scope:'CURRENT_SUPPLIED_SOURCE_NOT_COMPLETE_ORIGINAL_RUNTIME_CLOSURE',recorded_index_pins:indexPins,
   prior_receipt:prior,explicit_configs:a.configs??null,unrecorded_defaults:'NOT_INFERRED',stable_selection_event:'NOT_RECONSTRUCTED',generation_allocation:'NOT_RECONSTRUCTED'};
 });
 for(const g of preserved){const steps=events.filter(x=>x.candidate_id===g.candidate_id).map(x=>x.repair_step).sort();must(canonicalJSON(steps)===canonicalJSON(Array.from({length:g.repair_spent+1},(_,i)=>i)),'later repair event coverage incomplete');}
 return {schema:'ZMR-LATER-DIAGNOSTIC-AUDIT-1',classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',events,preserved_groups:preserved,
  diagnostic_count:events.length,original_public_keys_reconstructed:keys.size,missing_original_public_keys:events.length-keys.size,
  original_module_digest_mentions_verified:codePins,diagnostics_without_original_code_digest:missingCode,
  original_index_digest_mentions:indexMentions,distinct_original_recorded_index_digests:indexes.size,diagnostics_without_original_index_digest:missingIndexes,
  repair_receipt_links_verified:chains,combined_recorded_key_count:historicalKeys.size+keys.size,
  historical_scope:'PARTIAL_REGISTERED_AND_NINE_LATER_PUBLIC_DIAGNOSTICS_NOT_COMPLETE_CONSUMPTION_CENSUS',
  index_verification:'ORIGINAL_RECEIPT_METADATA_ONLY_NO_INDEX_REBUILD_OR_BYTE_REHASH',
  semantic_evaluations:0,source_packet_reads:0,independent_generation_credit:0,stable_configuration_allowance_remaining:null,
  accounting_status:inventory.accounting_status,new_stable_competition:guard.new_stable_competition,
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling:'NOT_ESTABLISHED'};
}
