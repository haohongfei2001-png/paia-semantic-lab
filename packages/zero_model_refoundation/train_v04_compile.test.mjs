import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildTrainV04,trainV04Recipe,assertTrainV04StaticBudget} from './train_v04_compile.mjs';
import {trainV04Hash} from './train_v04.mjs';

test('fixed engineering recipes and hard byte units reject unsupported overrides',async()=>{
 assert.equal(trainV04Recipe('A1').max_features,1500);
 assert.equal(trainV04Recipe('A3').epochs,5);
 assert.throws(()=>trainV04Recipe('A4'),/unregistered/);
 assert.throws(()=>trainV04Recipe('toString'),/unregistered/);
 assert(Object.isFrozen(trainV04Recipe('A3')));
 assert.equal(assertTrainV04StaticBudget(1048576,1048576),'STATIC_BYTES_WITHIN_LIMITS_NOT_RESOURCE_QUALIFIED');
 assert.throws(()=>assertTrainV04StaticBudget(1048577,1),/1 MiB/);
 assert.throws(()=>assertTrainV04StaticBudget(1048576,1048577),/2 MiB/);
 assert.throws(()=>assertTrainV04StaticBudget(NaN,1),/byte counts/);
 await assert.rejects(buildTrainV04({family:'A2',train_path:'forbidden'}),/override/);
 await assert.rejects(buildTrainV04({family:'A3',epochs:6}),/override/);
 await assert.rejects(buildTrainV04({family:'A4'}),/unregistered/);
 await assert.rejects(buildTrainV04({family:'A1',output:new URL('./a1.mjs',import.meta.url).pathname}),/outside repository/);
});

test('closed full144 TRAIN produces reproducible finite bounded indices without semantic evaluation',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'zmr-train-v04-'));
 try{
  const pinned=JSON.parse(await readFile(new URL('../../docs/zero-model-refoundation-v1/ZMR-03_TRAIN_V04_COMPILED_CLOSURE_RESULT.json',import.meta.url),'utf8'));
  let shared=null;
  for(const family of ['A1','A2','A3']){
   const output=join(folder,family+'.json');
   const {index,receipt:r}=await buildTrainV04({family,output});
   const second=await buildTrainV04({family});
   assert.deepEqual(second.receipt,pinned.recipes.find(x=>x.family===family));
   assert.equal(second.receipt.index_sha256,r.index_sha256);
   assert.deepEqual(second.index,index);
   assert.equal(trainV04Hash(await readFile(output)),r.index_sha256);
   assert.equal(index.topic_ids.length,144);assert.equal(new Set(index.topic_ids).size,144);
   assert.equal(r.train_rows,432);assert.equal(r.training_unit,'ONE_AGGREGATE_DOCUMENT_PER_TOPIC');
   assert.equal(r.independent_quota_credit,0);assert.equal(r.lineage_component_count,1);
   assert.equal(r.grouped_validation,'UNAVAILABLE_SINGLE_WRITER_LINEAGE_COMPONENT');
   assert.equal(r.semantic_evaluations,0);assert.equal(r.stable_candidate,false);
   assert.equal(r.resource_verdict,'NOT_QUALIFIED');assert.equal(r.capability_verdict,'UNTESTED');
   assert.equal(r.runtime_plus_index_bytes,r.index_bytes+r.runtime.reduce((n,x)=>n+x.bytes,0));
   assert(r.index_bytes<=1048576&&r.runtime_plus_index_bytes<=2097152);
   assert.equal(r.feature_comparison,'NATIVE_SELECTORS_DIFFER_NOT_MATCHED_FEATURE_OBJECTIVE_ABLATION');
   assert.equal(r.train_sha256,'8306906142c708e0876f9a64f0ba486669d8186c3bda1d7ec7a525ff66b9b2bf');
   if(shared===null)shared=r.document_sha256;else assert.equal(r.document_sha256,shared);
   // JSON cannot represent NaN/Infinity: ensure no coefficient silently becomes null.
   const encoded=JSON.stringify(index);assert(!encoded.includes('null'));
  }
 }finally{await rm(folder,{recursive:true,force:true});}
});
