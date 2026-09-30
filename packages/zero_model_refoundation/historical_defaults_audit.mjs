/** Static literal options audit only: no Router, compiler, source packets or historical evaluator. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const digest=v=>sha(canonicalJSON(v));
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const pathOK=x=>typeof x==='string'&&/^packages\/zero_model_refoundation\/[a-z0-9_]+\.mjs$/.test(x);
export function parseLiteralOptions(declaration){
 must(typeof declaration==='string'&&declaration.length>0,'literal options required');
 const fields=[],defaults={};
 for(const item of declaration.split(',')){
  const match=item.trim().match(/^([a-z][a-z0-9_]*)(?:\s*=\s*('(?:[a-z][a-z0-9_]*)'|(?:0|[1-9][0-9]*)(?:\.[0-9]+)?|\.[0-9]+))?$/);
  must(match&&!['constructor','prototype','__proto__'].includes(match[1])&&!fields.includes(match[1]),'dynamic, duplicate or unsafe option declaration');
  const [,name,value]=match;fields.push(name);
  if(value!==undefined){const v=value.startsWith("'")?value.slice(1,-1):Number(value);must(typeof v==='string'||Number.isFinite(v),'nonfinite option default');defaults[name]=v;}
 }
 return {fields,defaults,required:fields.filter(f=>!Object.hasOwn(defaults,f))};
}
export function auditHistoricalDefaults({identity_audit,entries,sources}){
 must(identity_audit?.schema==='ZMR-HISTORICAL-IDENTITY-AUDIT-1'&&identity_audit.classification==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&identity_audit.semantic_evaluations===0&&identity_audit.source_packet_reads===0&&identity_audit.independent_generation_credit===0&&identity_audit.stable_configuration_allowance_remaining===null&&identity_audit.accounting_status==='INCONCLUSIVE_HISTORICAL_STABLE_ALLOCATIONS_UNRECONCILED'&&identity_audit.new_stable_competition==='HOLD_PENDING_ACCOUNTING_RECONCILIATION'&&identity_audit.capability_verdict==='UNTESTED'&&identity_audit.resource_verdict==='NOT_QUALIFIED','original audit evidence boundary');
 must(Array.isArray(entries)&&entries.length>0,'entry review required');
 const table=new Map(),resolved=new Map();
 for(const e of entries){
  const key=e.route_root+':'+e.route_symbol;must(pathOK(e.route_root)&&/^route[A-Za-z0-9]+$/.test(e.route_symbol)&&!table.has(key)&&hex(e.source_sha256),'invalid or duplicate reviewed entry');
  must(typeof sources[e.route_root]==='string'&&sha(sources[e.route_root])===e.source_sha256,'reviewed runtime source mismatch');table.set(key,e);
 }
 function resolve(key,ancestors=[]){
  must(!ancestors.includes(key),'forwarding default cycle');if(resolved.has(key))return resolved.get(key);
  const e=table.get(key);must(e,'missing reviewed route entry');const s=sources[e.route_root];let options;
  if(e.kind==='DIRECT_LITERAL_DESTRUCTURING'){
   must(s.includes(e.source_anchor)&&e.source_anchor.startsWith('export function '+e.route_symbol+'(')&&e.source_anchor.includes('{'+e.declaration+'}'),'literal entry anchor mismatch');
   options=parseLiteralOptions(e.declaration);
  }else{
   must(e.kind==='FORWARDED_OPTIONS'||e.kind==='FORWARDED_OPTIONS_WITH_LOCAL_SUBSET','unsupported option review');
   must(typeof e.forward_anchor==='string'&&s.includes(e.forward_anchor)&&typeof e.parent_key==='string','forwarding source anchor mismatch');
   options=resolve(e.parent_key,[...ancestors,key]);
   const parent=table.get(e.parent_key);must(e.forward_anchor.includes(parent.route_symbol+'('),'forwarding route mismatch');
   if(e.kind==='FORWARDED_OPTIONS_WITH_LOCAL_SUBSET'){
    must(s.includes(e.local_anchor)&&e.local_anchor.includes('{'+e.declaration+'}'),'local options anchor mismatch');
    const local=parseLiteralOptions(e.declaration);
    must(local.fields.every(f=>options.fields.includes(f)&&Object.hasOwn(local.defaults,f)===Object.hasOwn(options.defaults,f)&&canonicalJSON(local.defaults[f]??null)===canonicalJSON(options.defaults[f]??null)),'local forwarding defaults conflict');
   }
  }
  const answer={...options};resolved.set(key,answer);return answer;
 }
 for(const key of table.keys())resolve(key);
 const mentions=[],groups=new Map(),used=new Set();let filled=0,omittedMode=0;
 for(const event of identity_audit.events){
  must(pathOK(event.comparator_path)&&typeof sources[event.comparator_path]==='string','fixed comparator source required');
  for(const c of event.configurations){
   if(c.registered_family==='A0')continue;
   must(c.comparator_callsite_sha256===sha(sources[event.comparator_path]),'historical callsite pin mismatch');
   const key=c.route_root+':'+c.route_symbol,e=table.get(key),opts=resolve(key);used.add(key);
   must(c.runtime_pins.some(p=>p.path===e.route_root&&p.sha256===e.source_sha256),'original runtime pin mismatch');
   const ignored=['family','mode'];must(Object.keys(c.parameters).every(f=>ignored.includes(f)||opts.fields.includes(f)),'unreviewed registered option');
   must(c.parameters.family===c.registered_family&&['char','word'].includes(c.effective_feature_mode),'historical family or mode mismatch');
   if(c.parameters.mode===undefined)omittedMode++;else must(c.parameters.mode===c.effective_feature_mode,'historical explicit mode mismatch');
   const indexes=c.index_receipt_bindings;
   must(Array.isArray(indexes)&&indexes.length>0&&indexes.every(x=>hex(x.index_sha256)),'original index binding required');
   const catalog=indexes[0].recorded_build.catalog_sha256;must(hex(catalog)&&indexes.every(x=>x.recorded_build.catalog_sha256===catalog),'index Catalog identity mismatch');
   const effective={};const defaults_applied=[];
   for(const field of opts.fields){
    if(field==='catalog_sha256')effective[field]=catalog;
    else if(Object.hasOwn(c.parameters,field)){const v=c.parameters[field];must((typeof v==='number'&&Number.isFinite(v))||typeof v==='string','unsupported explicit parameter value');effective[field]=v;}
    else {must(Object.hasOwn(opts.defaults,field),'missing mandatory historical option');effective[field]=opts.defaults[field];defaults_applied.push(field);filled++;}
   }
   const index_roles=indexes.map(x=>({digest_field:x.digest_field,index_sha256:x.index_sha256}));
   const static_identity={route_root:c.route_root,route_symbol:c.route_symbol,runtime_pins:c.runtime_pins,effective_feature_mode:c.effective_feature_mode,effective_options:effective,index_roles};
   const normalized_static_identity_sha256=digest(static_identity);
   const row={registration_path:event.registration_path,config_id:c.config_id,registered_family:c.registered_family,raw_parameters:c.parameters,original_route_identity_sha256:c.route_identity_sha256,
    original_execution_identity_sha256:c.execution_identity_sha256,...static_identity,defaults_applied,normalized_static_identity_sha256,
    alias_scope:'DIRECT_ROUTE_INDEX_OPTIONS_ONLY_NOT_COMPLETE_EXECUTION_OR_STABLE_ALLOCATION'};
   mentions.push(row);if(!groups.has(normalized_static_identity_sha256))groups.set(normalized_static_identity_sha256,[]);
   groups.get(normalized_static_identity_sha256).push({registration_path:event.registration_path,config_id:c.config_id,original_execution_identity_sha256:c.execution_identity_sha256});
  }
 }
 must(used.size===table.size&&mentions.length===identity_audit.non_A0_configuration_mentions,'reviewed entry or configuration coverage incomplete');
 return {schema:'ZMR-HISTORICAL-DEFAULTS-AUDIT-1',classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',reviewed_runtime_entries:table.size,
  non_A0_configuration_mentions:mentions.length,raw_static_identity_count:identity_audit.non_A0_route_index_parameter_identities,
  normalized_direct_route_index_options_identities:groups.size,default_parameter_values_applied:filled,configuration_mentions_with_omitted_feature_mode:omittedMode,
  mentions,alias_groups:[...groups].map(([sha256,members])=>({sha256,members})),
  equivalence_scope:'FIXED_REVIEWED_DIRECT_ROUTE_OPTIONS_NOT_AST_EXECUTION_EQUIVALENCE_NOT_BUDGET_SPENDING',
  repair_aliases:'DIFFERENT_RUNTIME_ROOTS_AND_DEPENDENCY_PINS_NEVER_COLLAPSED_REPAIR_LEDGER_UNCHANGED',
  semantic_evaluations:0,source_packet_reads:0,independent_generation_credit:0,stable_configuration_allowance_remaining:null,
  accounting_status:identity_audit.accounting_status,new_stable_competition:identity_audit.new_stable_competition,
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling:'NOT_ESTABLISHED'};
}
