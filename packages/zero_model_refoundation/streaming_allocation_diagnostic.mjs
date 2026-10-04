/** Unregistered synthetic numeric allocation preparation. Run only after dependency integration. */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const profiles=[{terms:3,hits_per_term:3},{terms:128,hits_per_term:3},{terms:1500,hits_per_term:144}];
const child=String.raw`
import {createLosslessPostingView} from '__VIEW__';
import {unpackA1V04} from '__CODEC__';
import {accumulateSyntheticWeights} from '__ACCUMULATOR__';
import {setImmediate as drain} from 'node:timers/promises';
import {createHash} from 'node:crypto';
const p=JSON.parse(process.argv[1]),kind=process.argv[2];
if(typeof global.gc!=='function'||!['eager','stream'].includes(kind))throw Error('explicit diagnostic process required');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const held={encoded:null,representation:null,table:null,weights:null,last:null},snapshots=[];
async function sample(phase,gc=true){if(gc){await drain();global.gc();global.gc();}const m=process.memoryUsage();snapshots.push({phase,gc,heapUsed:m.heapUsed,external:m.external,arrayBuffers:m.arrayBuffers,rss:m.rss});}
function fixture(){return freeze({schema:'ZMR-A1-V04-INT16-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',catalog_sha256:'0'.repeat(64),train_sha256:'1'.repeat(64),mode:'char',max_features:1500,topic_ids:Array.from({length:144},(_,i)=>'SYNTHETIC_OFFSET_'+i),topic_lengths:Array(144).fill(10),average_length:10,tfidf_scale:.125,bm25_scale:.25,postings:Array.from({length:p.terms},(_,n)=>['SYNTHETIC_TERM_'+String(n).padStart(4,'0'),1+n/2000,Array.from({length:p.hits_per_term},(_,j)=>[p.hits_per_term===3?[0,72,143][j]:j,(n*97+j*31)%32768,(n*131+j*29+1)%32768])])});}
function eager(weights,method){const values=new Float64Array(144);let squared=0;for(const[t,w]of weights){const hits=held.table.get(t);if(!hits)continue;squared+=w*w;for(const[i,a,b]of hits)values[i]+=method==='tfidf'?w*a:b;}if(method==='tfidf')for(let i=0;i<144;i++)values[i]=held.representation.topic_norms[i]&&squared?values[i]/(held.representation.topic_norms[i]*Math.sqrt(squared)):0;return values;}
await sample('WARM_MODULE_BLANK');held.encoded=fixture();held.weights=freeze(Array.from({length:p.terms},(_,i)=>['SYNTHETIC_TERM_'+String(p.terms-i-1).padStart(4,'0'),1+(i%7)/10]));
const encoded_bytes=Buffer.byteLength(JSON.stringify(held.encoded)),input_hash=createHash('sha256').update(JSON.stringify(held.encoded)).digest('hex'),weights_hash=createHash('sha256').update(JSON.stringify(held.weights)).digest('hex');
await sample('ENCODED_AND_MANUAL_WEIGHTS_RETAINED');
held.representation=kind==='stream'?createLosslessPostingView(held.encoded):unpackA1V04(held.encoded);
if(kind==='eager')held.table=new Map(held.representation.postings.map(([term,idf,hits])=>[term,hits]));
await sample('REPRESENTATION_RETAINED');const arithmetic_digests=[],post_call_snapshots=[];
for(const method of ['tfidf','bm25']){for(let i=0;i<32;i++){held.last=kind==='stream'?accumulateSyntheticWeights(held.representation,held.weights,method).values:eager(held.weights,method);if(held.last.length!==144||Array.from(held.last).some(v=>!Number.isFinite(v)))throw Error('finite144 numeric slots required');const m=process.memoryUsage();post_call_snapshots.push({method,iteration:i,heapUsed:m.heapUsed,arrayBuffers:m.arrayBuffers});}arithmetic_digests.push({method,sha256:createHash('sha256').update(JSON.stringify(Array.from(held.last))).digest('hex')});}
await sample('AFTER_FINITE_CALLS_NO_GC_NOT_PEAK',false);await sample('LAST_ARRAY_PLUS_REPRESENTATION_RETAINED');held.last=null;await sample('ARRAY_RELEASED_REPRESENTATION_RETAINED');held.representation=null;held.table=null;held.weights=null;held.encoded=null;await sample('REPRESENTATION_AND_INPUT_RELEASED');
console.log(JSON.stringify({profile:p,kind,input_hash,weights_hash,encoded_bytes,arithmetic_digests,calls:64,full144_numeric_slots:144,snapshots,post_call_snapshots,node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,measurement_time_iso:new Date().toISOString(),peak_measured:false,latency_measured:false}));
`;
const root=resolve(process.argv[2]||'.'),output=resolve(process.argv[3]||'streaming_allocation_preparation_result.json');
const sourcePaths=['lossless_posting_view.mjs','a1_v04_compact.mjs','streaming_numeric_accumulator.mjs','a1.mjs'].map(n=>resolve(root,'packages/zero_model_refoundation/'+n));
const source=child.replace('__VIEW__',pathToFileURL(sourcePaths[0]).href).replace('__CODEC__',pathToFileURL(sourcePaths[1]).href).replace('__ACCUMULATOR__',pathToFileURL(sourcePaths[2]).href);
const observations=[],failures=[];
diagnostic: for(const profile of profiles)for(const kind of ['eager','stream']){
 const env={...process.env};delete env.NODE_TEST_CONTEXT;delete env.NODE_COMPILE_CACHE;
 const run=spawnSync(process.execPath,['--expose-gc','--input-type=module','-e',source,JSON.stringify(profile),kind],{env,encoding:'utf8',timeout:15000,maxBuffer:65536});
 if(run.error||run.status!==0){failures.push({profile,kind,error:String(run.error||run.stderr),status:run.status,signal:run.signal});break diagnostic;}
 const record=JSON.parse(run.stdout.trim());if(record.calls!==64||record.full144_numeric_slots!==144||record.snapshots.length!==7||record.post_call_snapshots.length!==64)throw Error('incomplete diagnostic observation');observations.push(record);
}
for(let i=0;i+1<observations.length;i+=2){const a=observations[i],b=observations[i+1];if(a.input_hash!==b.input_hash||a.weights_hash!==b.weights_hash||JSON.stringify(a.arithmetic_digests)!==JSON.stringify(b.arithmetic_digests))failures.push({profile:a.profile,kind:'PAIR_ARITHMETIC_OR_INPUT_MISMATCH'});}
const result={schema:'ZMR-STREAMING-ALLOCATION-UNREGISTERED-PREPARATION-1',registered:false,evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',profiles,observations,failures,verdict:failures.length||observations.length!==6?'INCONCLUSIVE':'FINITE_SYNTHETIC_COMPONENT_OBSERVATIONS_ONLY',source_pins:sourcePaths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),peak_measured:false,latency_measured:false,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',allowance:null,stable_allocations:0,router_calls:0,predictions:0,fitting:0,new_samples:0,independent_quota_credit:0,paid_calls:0,new_permissions:0,consumed_as_test_reads:0,final_blind_execution:0,stop_rule:'Six finite observations or INCONCLUSIVE; no automatic retry/unchanged replay. Sampled post-call memory is not true peak; one pair per profile has no interval or consumer-device certification. Oversized stress is not eligible index.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,observations:observations.length,failures:failures.length,verdict:result.verdict,capability:'UNTESTED',resource:'NOT_QUALIFIED'}));
