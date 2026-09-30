/** Pre-freeze development accounting guard. Pure metadata; cannot prove scientific independence. */
import {canonicalJSON} from './contracts.mjs';
const must=(ok,m)=>{if(!ok)throw new Error(m);};
const token=x=>typeof x==='string'&&x.length>0&&x.trim()===x;
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const COMPETITION_LIMITS=Object.freeze({generations:6,candidates:6,stable_configs:12,semantic_repairs:2,as_batches:1});

export function rawParameterSignatures(registrations){
 must(Array.isArray(registrations),'registration metadata required');
 const signatures=new Set();
 for(const d of registrations){must(Array.isArray(d.configs),'missing historical configurations');for(const c of d.configs){
  must(token(c.id)&&token(c.family),'invalid historical config metadata');
  if(c.family==='A0')continue;const {id,...params}=c;signatures.add(canonicalJSON(params));
 }}
 return [...signatures].sort();
}

/** Counts need reconciliation: failed/nonpromoted status alone does not erase stable exploration spending. */
export function assessHistoricalAccounting(inventory){
 must(inventory?.schema==='ZMR-DEVELOPMENT-COMPETITION-INVENTORY-1'&&inventory.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','invalid inventory');
 must(inventory.accounting_status==='INCONCLUSIVE_HISTORICAL_STABLE_ALLOCATIONS_UNRECONCILED'&&inventory.stable_configuration_allowance_remaining===null,'missing conservative accounting boundary');
 must(inventory.independent_generation_credit===0&&inventory.semantic_evaluations===0,'inventory is not new scientific evidence');
 const signatures=rawParameterSignatures(inventory.registrations.map(x=>x.metadata));
 must(signatures.length===inventory.raw_non_A0_parameter_signature_count,'historical signature count mismatch');
 must(inventory.carried_repairs.every(x=>token(x.candidate_id)&&token(x.source_field)&&Number.isInteger(x.spent)&&x.spent>=0&&x.spent<=2),'invalid carried repair counts');
 return {classification:'METADATA_AUDIT_ONLY_NOT_BUDGET_CLEARANCE',new_stable_competition:'HOLD_PENDING_ACCOUNTING_RECONCILIATION',
  raw_non_A0_parameter_signature_count:signatures.length,stable_configuration_allowance_remaining:null,
  independent_generation_credit:0,allowed_tracks:['PROVISIONAL_DATA_INTAKE','SOURCE_REVIEW','METADATA_ENGINEERING','STATIC_RESOURCE_ENGINEERING']};
}

/** Future plan must have explicit cumulative allocations and immutable mechanism IDs, not only a new batch name. */
export function assertDevelopmentCompetition(plan,history){
 must(history?.reconciled===true&&history.complete===true,'historical accounting unreconciled');
 must(Number.isInteger(plan?.generation_number)&&plan.generation_number>=1&&plan.generation_number<=6,'development generation budget exceeded');
 must(Array.isArray(history.allocations)&&Array.isArray(history.retired_mechanisms)&&Array.isArray(history.repair_ledger)&&Array.isArray(history.consumed_evaluation_keys),'missing cumulative history');
 must(history.allocations.every(x=>Number.isInteger(x.generation_number)&&x.generation_number>=1&&x.generation_number<=6),'invalid historical generation allocation');
 const past=history.allocations.filter(x=>x.generation_number===plan.generation_number);
 must(Array.isArray(plan.candidates)&&plan.candidates.length>0&&Array.isArray(plan.configs)&&plan.configs.length>0,'empty competition');
 const candidates=new Map(),configs=new Map(),identities=new Map();
 for(const allocation of [...past,plan]){
  must(Array.isArray(allocation.candidates)&&Array.isArray(allocation.configs),'incomplete prior allocation');
  for(const c of allocation.candidates){
   must(token(c.candidate_id)&&token(c.mechanism_id)&&token(c.family_id)&&digest(c.dependency_sha256),'invalid candidate identity');
   const previous=candidates.get(c.candidate_id);must(!previous||canonicalJSON(previous)===canonicalJSON(c),'candidate closure changed without allocation');
   candidates.set(c.candidate_id,c);
  }
  for(const c of allocation.configs){
   must(token(c.config_id)&&candidates.has(c.candidate_id)&&digest(c.parameters_sha256),'invalid configuration identity');
   const previous=configs.get(c.config_id);must(!previous||canonicalJSON(previous)===canonicalJSON(c),'config identity changed');
   const identity=c.candidate_id+':'+c.parameters_sha256;must(!identities.has(identity)||identities.get(identity)===c.config_id,'same config renamed');
   configs.set(c.config_id,c);identities.set(identity,c.config_id);
  }
 }
 must(candidates.size<=6,'cumulative candidate budget exceeded');must(configs.size<=12,'cumulative stable configuration budget exceeded');
 for(const c of plan.candidates){
  must(!history.retired_mechanisms.includes(c.mechanism_id),'retired mechanism cannot be renamed or reopened');
  const prior=history.repair_ledger.filter(x=>x.mechanism_id===c.mechanism_id);
  const spent=Math.max(0,...prior.map(x=>x.spent));
  must(Number.isInteger(c.repair_spent)&&c.repair_spent>=spent&&c.repair_spent<=2,'repair spending reset or exceeded');
 }
 const asSpending=[...past,plan].map(x=>x.as_batches_consumed);
 must(asSpending.every(n=>Number.isInteger(n)&&n>=0)&&asSpending.reduce((a,b)=>a+b,0)<=1,'AS batch budget exceeded');
 must(digest(plan.evaluation_key)&&!history.consumed_evaluation_keys.includes(plan.evaluation_key),'unchanged evaluation key already consumed');
 return {classification:'DEVELOPMENT_ACCOUNTING_METADATA_ONLY',candidates:candidates.size,stable_configs:configs.size,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED'};
}
