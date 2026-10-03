/** Unregistered finite synthetic allocation/lifecycle engineering preparation. */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const profiles=Object.freeze([
 Object.freeze({id:'STRUCTURE_3X3',terms:3,hitsPerTerm:3}),
 Object.freeze({id:'STRUCTURE_128X3',terms:128,hitsPerTerm:3}),
 Object.freeze({id:'STRUCTURE_BOUND_1500X144',terms:1500,hitsPerTerm:144})
]);
const childSource=String.raw`
import {createLosslessPostingView} from '__VIEW__';
import {unpackA1V04} from '__EAGER__';
import {cpus,totalmem} from 'node:os';
import {setImmediate as nextTurn} from 'node:timers/promises';
const p=JSON.parse(process.argv[1]),kind=process.argv[2];
if(typeof global.gc!=='function'||!['view','eager'].includes(kind))throw Error('explicit GC and representation required');
const frozen=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(frozen);Object.freeze(x);}return x;};
function fixture(){
 const postings=Array.from({length:p.terms},(_,n)=>['term_'+String(n).padStart(4,'0'),1+n/2000,
  Array.from({length:p.hitsPerTerm},(_,j)=>[p.hitsPerTerm===3?[0,72,143][j]:j,(n+j)%32768,(n+2*j+1)%32768])]);
 return frozen({schema:'ZMR-A1-V04-INT16-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256:'0'.repeat(64),train_sha256:'1'.repeat(64),mode:'char',max_features:1500,
  topic_ids:Array.from({length:144},(_,i)=>'SYNTHETIC_TOPIC_'+i),topic_lengths:Array(144).fill(10),average_length:10,
  tfidf_scale:.125,bm25_scale:.25,postings});
}
const held={packed:null,decoded:null},stages=[];
async function snapshot(stage,collect=true){if(collect){await nextTurn();global.gc();global.gc();}const m=process.memoryUsage();stages.push({stage,collection:collect?'TWO_EXPLICIT_GC':'NO_GC_SINGLE_POST_INIT_SNAPSHOT_NOT_PEAK',heapUsed:m.heapUsed,heapTotal:m.heapTotal,external:m.external,arrayBuffers:m.arrayBuffers,rss:m.rss});}
await snapshot('MODULES_WARM_BLANK_BASELINE');held.packed=fixture();const jsonBytes=Buffer.byteLength(JSON.stringify(held.packed));await snapshot('IMMUTABLE_ENCODED_INPUT_RETAINED');
held.decoded=kind==='view'?createLosslessPostingView(held.packed):unpackA1V04(held.packed);
await snapshot('POST_INIT_BEFORE_GC_NOT_PEAK',false);await snapshot('ENCODED_PLUS_DECODED_RETAINED');
let normSum=0;for(let i=0;i<144;i++)normSum+=kind==='view'?held.decoded.topicNorm(i):held.decoded.topic_norms[i];
const summaries={normSum,full_structure_topics:144,terms:p.terms,encoded_hits:p.terms*p.hitsPerTerm,norm_typed_array_bytes:kind==='view'?held.decoded.retainedNormBytes:0,expanded_posting_arrays_retained:kind==='view'?held.decoded.expandedPostingArraysRetained:null};
held.decoded=null;await snapshot('DECODED_RELEASED_INPUT_RETAINED');held.packed=null;await snapshot('INPUT_AND_DECODED_RELEASED');
console.log(JSON.stringify({profile:p,representation:kind,node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,execArgv:process.execArgv.filter(x=>x!=='--input-type=module'&&x!=='-e'&&x!==process.execArgv[process.execArgv.indexOf('-e')+1]),logicalCpuCount:cpus().length,cpuModel:cpus()[0]?.model??null,totalPhysicalMemory:totalmem(),encoded_json_bytes:jsonBytes,summaries,stages}));
`;
const root=resolve(process.argv[2]||'.'),output=resolve(process.argv[3]||'allocation_lifecycle_preparation_result.json');
const viewPath=resolve(root,'packages/zero_model_refoundation/lossless_posting_view.mjs'),eagerPath=resolve(root,'packages/zero_model_refoundation/a1_v04_compact.mjs');
const digest=p=>({path:p,sha256:createHash('sha256').update(readFileSync(p)).digest('hex')});
const source=childSource.replace('__VIEW__',pathToFileURL(viewPath).href).replace('__EAGER__',pathToFileURL(eagerPath).href),observations=[];
for(const profile of profiles)for(const representation of ['eager','view']){
 const env={...process.env};delete env.NODE_TEST_CONTEXT;delete env.NODE_COMPILE_CACHE;
 const run=spawnSync(process.execPath,['--expose-gc','--input-type=module','-e',source,JSON.stringify(profile),representation],{env,encoding:'utf8',timeout:15000,maxBuffer:65536});
 if(run.error||run.status!==0)throw Error('diagnostic child failed '+profile.id+'/'+representation+': '+String(run.error||run.stderr));
 const r=JSON.parse(run.stdout.trim());if(r.stages.length!==6||r.summaries.full_structure_topics!==144||r.summaries.terms!==profile.terms||r.summaries.encoded_hits!==profile.terms*profile.hitsPerTerm||r.stages.some(s=>['heapUsed','heapTotal','external','arrayBuffers','rss'].some(k=>!Number.isSafeInteger(s[k])||s[k]<0)))throw Error('incomplete diagnostic observation');
 observations.push(r);
}
for(let i=0;i<observations.length;i+=2){const a=observations[i],b=observations[i+1];if(a.encoded_json_bytes!==b.encoded_json_bytes||a.summaries.normSum!==b.summaries.normSum)throw Error('inconsistent input/norm diagnostic pair');}
const deltas=observations.map(o=>{const base=o.stages[0],encoded=o.stages[1],decoded=o.stages[3],released=o.stages[5];return{profile:o.profile.id,representation:o.representation,decoded_minus_encoded:{heapUsed:decoded.heapUsed-encoded.heapUsed,external:decoded.external-encoded.external,arrayBuffers:decoded.arrayBuffers-encoded.arrayBuffers},released_minus_blank:{heapUsed:released.heapUsed-base.heapUsed,external:released.external-base.external,arrayBuffers:released.arrayBuffers-base.arrayBuffers}};});
const result={schema:'ZMR-SYNTHETIC-ALLOCATION-LIFECYCLE-UNREGISTERED-PREPARATION-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',registered:false,profiles,child_runs:6,serial:true,attempts_per_profile_representation:1,post_init_snapshot_is_peak:false,collection:'ONE_EVENT_LOOP_TURN_DRAIN_THEN_TWO_EXPLICIT_GC_PER_RETAINED_STAGE_NOT_ROUTING_LATENCY',measurements:'ONE_PROCESS_PER_SYNTHETIC_PROFILE_REPRESENTATION_NO_CONFIDENCE_INTERVAL_OR_DEVICE_QUALIFICATION',raw_observations:observations,deltas,source_pins:[digest(viewPath),digest(eagerPath),digest(resolve(root,'packages/zero_model_refoundation/a1.mjs'))],capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',allowance:null,stable_candidate_constructed:false,actual_candidate_index_rebuilt:false,real_train_inputs:0,fitting:0,router_calls:0,predictions:0,new_semantic_samples:0,stable_allocations:0,semantic_candidate_repairs_charged:0,allowance_refunds:0,independent_quota_credit:0,new_paid_calls:0,new_permissions:0,consumed_as_test_reads:0,final_blind_execution:0,saturation_ceiling:false,stop_rule:'Finite six diagnostic observations complete; no retry/unchanged repeats. Register only after current writer exact-head/main/ownedbytes-tree integration and fresh canonical/source pins; no actual consumer resource claim'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,observations:6,profiles:3,capability:'UNTESTED',resource:'NOT_QUALIFIED',deltas}));
