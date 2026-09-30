/** Static supplied-source/receipt audit only. Never imports or executes historical comparators. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {assessHistoricalAccounting} from './competition_budget.mjs';
const must=(ok,m)=>{if(!ok)throw Error(m);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>sha(canonicalJSON(x));
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const codePath=p=>typeof p==='string'&&/^packages\/zero_model_refoundation\/[a-z0-9_]+\.mjs$/.test(p);
const pointer=(v,p)=>p.split('.').reduce((a,k)=>a?.[k],v);

export function literalComparatorClosure(source){
 const match=source.match(/\bconst CLOSURE\s*=\s*\[([^\]]*)\];/);
 must(match,'literal historical closure required');
 const body=match[1],paths=[...body.matchAll(/'([^']+)'/g)].map(m=>m[1]);
 must(paths.length>0&&body.replace(/'[^']+'/g,'').replace(/[\s,]/g,'')===''&&paths.every(codePath)&&new Set(paths).size===paths.length,'nonliteral or unsafe historical closure');
 return paths;
}
function runtimeClosure(root,sources,allowed){
 const seen=new Set(),pending=[root];
 while(pending.length){
  const path=pending.pop();if(seen.has(path))continue;
  must(codePath(path)&&allowed.has(path)&&typeof sources[path]==='string','runtime dependency outside registered closure');seen.add(path);
  for(const m of sources[path].matchAll(/^import\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"];?/gm)){
   must(/^\.\/[a-z0-9_]+\.mjs$/.test(m[1]),'runtime import outside local package');
   pending.push('packages/zero_model_refoundation/'+m[1].slice(2));
  }
 }
 return [...seen].sort().map(path=>({path,sha256:sha(sources[path])}));
}
export function auditHistoricalIdentities({inventory,records}){
 const accounting=assessHistoricalAccounting(inventory);
 must(Array.isArray(records)&&records.length===inventory.registrations.length,'historical record coverage incomplete');
 const seen=new Set(),events=[],indexDigests=new Set(),routeIds=new Set();
 for(const r of records){
  const entry=inventory.registrations.find(x=>x.path===r.registration_path);
  must(entry&&!seen.has(r.registration_path),'unknown or duplicate historical record');seen.add(r.registration_path);
  const m=entry.metadata,a=r.aggregate;
  must(a?.classification==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&a.independent_rows===0&&a.as_consumed===0&&a.capability_verdict==='UNTESTED'&&a.resource_verdict==='NOT_QUALIFIED','historical aggregate evidence boundary changed');
  must(a.registration_path===r.registration_path&&a.evaluation_key===m.evaluation_key&&canonicalJSON(a.identity)===canonicalJSON(m.identity),'aggregate registration identity mismatch');
  must(codePath(r.comparator_path)&&typeof r.sources?.[r.comparator_path]==='string','comparator source missing');
  const paths=literalComparatorClosure(r.sources[r.comparator_path]),allowed=new Set(paths);
  must(allowed.has(r.comparator_path),'comparator outside closure');
  const pins=paths.map(path=>{must(typeof r.sources[path]==='string','historical source missing');return {path,sha256:sha(r.sources[path])};});
  must(digest(pins)===m.identity.candidate_closure_sha256,'historical code closure mismatch');
  must(Array.isArray(r.bindings)&&r.bindings.length===m.configs.length&&a.fixed_config_count===m.configs.length,'configuration binding coverage incomplete');
  const bindingIds=new Set(),configurations=[];
  for(const c of m.configs){
   const b=r.bindings.find(x=>x.config_id===c.id);
   must(b&&!bindingIds.has(b.config_id)&&b.family===c.family,'configuration binding mismatch');bindingIds.add(b.config_id);
   must(codePath(b.route_root)&&allowed.has(b.route_root)&&typeof b.route_symbol==='string'&&/^route[A-Za-z0-9]+$/.test(b.route_symbol),'invalid historical route binding');
   must(r.sources[b.route_root].includes('export function '+b.route_symbol+'(')&&r.sources[r.comparator_path].includes(b.route_symbol+'('),'route export or callsite missing');
   const runtime_pins=runtimeClosure(b.route_root,r.sources,allowed);
   must(Array.isArray(b.index_selectors)&&((c.family==='A0'&&b.index_selectors.length===0)||(c.family!=='A0'&&b.index_selectors.length>=1)),'control or candidate index binding missing');
   const selectorIds=new Set();
   const indexes=b.index_selectors.map(selector=>{
    must(typeof selector.build_pointer==='string'&&/^(build|builds\.[A-Za-z0-9_]+)$/.test(selector.build_pointer)&&['index_sha256','pair_index_sha256'].includes(selector.digest_field),'invalid index receipt selector');
    const selectorId=selector.build_pointer+':'+selector.digest_field;
    must(!selectorIds.has(selectorId),'duplicate index selector');selectorIds.add(selectorId);
    const build=pointer(a,selector.build_pointer),d=build?.[selector.digest_field];
    const bytes=build?.[selector.digest_field==='pair_index_sha256'?'pair_index_bytes':'index_bytes'];
    must(hex(d)&&Number.isInteger(bytes)&&bytes>0&&build.topic_count===144&&build.catalog_sha256===m.identity.catalog_sha256,'invalid recorded index receipt');
    must(build.resource_verdict===undefined||build.resource_verdict==='NOT_QUALIFIED','index receipt resource promotion');
    must(build.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'||build.classification==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','index receipt independent claim');
    if(build.mode!==undefined)must(build.mode===b.mode,'recorded index mode mismatch');
    indexDigests.add(d);return {...selector,index_sha256:d,index_bytes:bytes,recorded_build:build,materialization:'EPHEMERAL_ORIGINAL_INDEX_NOT_REBUILT_BY_AUDIT'};
   });
   must(c.family==='A0'?b.mode===null:['char','word'].includes(b.mode),'explicit effective mode required');
   if(c.mode!==undefined)must(c.mode===b.mode,'registered mode mismatch');
   const {id,...parameters}=c;
   const code_index_parameters={registered_family:c.family,route_root:b.route_root,route_symbol:b.route_symbol,runtime_pins,
    effective_feature_mode:b.mode,parameters,indexes:indexes.map(x=>({build_pointer:x.build_pointer,index_sha256:x.index_sha256,index_bytes:x.index_bytes}))};
   const route_identity_sha256=digest(code_index_parameters);if(c.family!=='A0')routeIds.add(route_identity_sha256);
   configurations.push({config_id:id,...code_index_parameters,route_identity_sha256,
    comparator_callsite_sha256:sha(r.sources[r.comparator_path]),execution_identity_sha256:digest({code_index_parameters,comparator_path:r.comparator_path,comparator_sha256:sha(r.sources[r.comparator_path])}),
    index_receipt_bindings:indexes,mode_source:c.mode!==undefined?'EXPLICIT_REGISTRATION':c.family==='A0'?'CONTROL_NO_INDEX':'REVIEWED_FIXED_COMPARATOR_AND_INDEX_RECEIPT',
    binding_classification:'STATIC_CALLSITE_MAP_NOT_EXECUTED_NOT_STABLE_ALLOCATION',
    unrecorded_runtime_defaults:'NOT_CANONICALIZED_NO_ALLOCATION_EQUIVALENCE',index_bytes_recorded:indexes.reduce((n,x)=>n+x.index_bytes,0)});
  }
  events.push({registration_path:r.registration_path,evaluation_key:m.evaluation_key,aggregate_path:r.aggregate_path,
   comparator_path:r.comparator_path,registered_dependency_pins:pins,whole_registered_closure_sha256:digest(pins),
   configurations,stable_selection_event:'NOT_RECONSTRUCTED',generation_allocation:'NOT_RECONSTRUCTED'});
 }
 return {schema:'ZMR-HISTORICAL-IDENTITY-AUDIT-1',classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  events,registration_count:events.length,configuration_mentions:events.reduce((n,e)=>n+e.configurations.length,0),
  non_A0_configuration_mentions:events.reduce((n,e)=>n+e.configurations.filter(c=>c.registered_family!=='A0').length,0),
  whole_registered_closures_matched:events.length,distinct_recorded_index_digests:indexDigests.size,
  non_A0_route_index_parameter_identities:routeIds.size,identity_count_interpretation:'STATIC_ROUTE_IDENTITIES_NOT_CANDIDATE_OR_STABLE_CONFIGURATION_ALLOCATIONS',
  index_verification:'ORIGINAL_AGGREGATE_RECEIPT_IDENTITIES_ONLY_NO_INDEX_REBUILD_OR_BYTE_REHASH',
  historical_scope:'PARTIAL_13_REGISTERED_PUBLIC_DIAGNOSTICS_EXCLUDES_LATER_UNREGISTERED_DIAGNOSTICS',
  semantic_evaluations:0,source_packet_reads:0,independent_generation_credit:0,
  accounting_status:inventory.accounting_status,stable_configuration_allowance_remaining:null,new_stable_competition:accounting.new_stable_competition,
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling:'NOT_ESTABLISHED'};
}
