/** Supplied public metadata only; no evaluator, fitting, source packet or filesystem access. */
import {canonicalJSON} from './contracts.mjs';
import {assessHistoricalAccounting} from './competition_budget.mjs';
const must=(ok,message)=>{if(!ok)throw new Error(message);};
const sha256=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const gitBlob=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const pointer=(value,path)=>path.split('.').reduce((v,k)=>v?.[k],value);

export function joinHistoricalRegistrations({inventory,status,report_links}){
 const accounting=assessHistoricalAccounting(inventory);
 must(Array.isArray(report_links)&&report_links.length===inventory.carried_repairs.length,'repair report coverage incomplete');
 const paths=new Set(),keys=new Set(),configIds=new Set();
 const registration_events=inventory.registrations.map(source=>{
  must(typeof source.path==='string'&&source.path.startsWith('data/zero_model_refoundation/development/')&&source.path.endsWith('_registration.json')&&!source.path.includes('..')&&gitBlob(source.git_blob),'invalid public registration pin');
  must(!paths.has(source.path),'duplicate registration path');paths.add(source.path);
  const m=source.metadata;
  must(m.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&m.independent_rows===0&&m.as_consumed===0&&m.capability_verdict==='UNTESTED'&&m.resource_verdict==='NOT_QUALIFIED','historical evidence boundary changed');
  must(sha256(m.evaluation_key)&&!keys.has(m.evaluation_key),'duplicate or invalid historical evaluation key');keys.add(m.evaluation_key);
  const identity=m.identity;
  must(identity?.package_id==='PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1'&&typeof identity.generation_id==='string'&&identity.generation_id.startsWith('G0_DEV_PUBLIC_'),'public packet identity missing');
  for(const field of ['candidate_closure_sha256','catalog_sha256','compiler_sha256','train_sha256','calibration_sha256','cohort_sha256','scorer_sha256'])must(sha256(identity[field]),'historical closure digest missing: '+field);
  const local=new Set();
  const configs=m.configs.map(c=>{
   must(!local.has(c.id),'duplicate configuration within registration');local.add(c.id);
   configIds.add(c.id);
   const {id,...parameters}=c;
   return {config_id:id,family:c.family,raw_parameters:parameters,raw_parameter_signature:canonicalJSON(parameters),
    control:c.family==='A0',candidate_specific_code_index_identity:'NOT_RECORDED_SEPARATELY_IN_REGISTRATION'};
  });
  return {registration_path:source.path,registration_git_blob:source.git_blob,evaluation_key:m.evaluation_key,
   public_packet_id:identity.generation_id,independent_generation_credit:0,whole_registration_identity:identity,
   configurations:configs,explicit_candidate_allocations_recorded:Object.hasOwn(m,'candidate_allocations'),
   explicit_stable_selection_event_recorded:Object.hasOwn(m,'stable_selection_event'),
   allocation_reconciliation:'UNRESOLVED_WHOLE_REGISTRATION_CLOSURE_IS_NOT_PER_CANDIDATE_IDENTITY'};
 });
 const linked=new Set();
 const repair_report_links=report_links.map(link=>{
  const carried=inventory.carried_repairs.find(r=>r.source_field===link.source_field);
  must(carried&&!linked.has(link.source_field),'unknown or duplicate repair report link');linked.add(link.source_field);
  must(pointer(status,link.source_field)===carried.spent&&carried.retirement_preserved===true,'canonical repair spending changed or retirement erased');
  must(typeof link.report_path==='string'&&/^docs\/zero-model-refoundation-v1\/ZMR-0[245]_[A-Z0-9_]+\.md$/.test(link.report_path)&&gitBlob(link.report_git_blob),'invalid public disposition report pin');
  must(pointer(status,link.report_source_field)===link.report_path,'report pointer does not join canonical status');
  return {...carried,...link,allocation_reconciliation:'REPORT_LINK_PRESERVED_NOT_A_STABLE_ALLOCATION'};
 });
 return {schema:'ZMR-HISTORICAL-REGISTRATION-JOIN-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  scope:'EXPLICIT_PUBLIC_REGISTRATION_AND_DISPOSITION_METADATA_NO_PACKET_READ_OR_REPLAY',
  registration_events,repair_report_links,registration_count:registration_events.length,
  configuration_mentions:registration_events.reduce((n,r)=>n+r.configurations.length,0),
  non_A0_configuration_mentions:registration_events.reduce((n,r)=>n+r.configurations.filter(c=>!c.control).length,0),
  distinct_display_config_ids:configIds.size,raw_non_A0_parameter_signature_count:accounting.raw_non_A0_parameter_signature_count,
  recorded_public_evaluation_keys:[...keys].sort(),recorded_key_scope:'PARTIAL_13_REGISTRATIONS_NOT_ALL_HISTORICAL_CONSUMPTION',
  repair_field_count:linked.size,stable_configuration_allowance_remaining:null,independent_generation_credit:0,
  semantic_evaluations:0,accounting_status:inventory.accounting_status,new_stable_competition:accounting.new_stable_competition,
  unresolved:['PER_CANDIDATE_CODE_AND_INDEX_IDENTITIES','STABLE_SELECTION_EVENTS_AND_ALLOCATIONS','DEFAULT_PARAMETERS_AND_REPAIR_ALIAS_LINKS','UNREGISTERED_LATER_DIAGNOSTIC_CLOSURES','CUMULATIVE_GENERATION_PARTITIONS'],
  data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling:'NOT_ESTABLISHED'};
}
