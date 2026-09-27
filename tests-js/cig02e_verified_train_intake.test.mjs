import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {consumeVerifiedResponse,validateIntakePlan,verifyTrainMembership,rawSourceURL,acquireFixedTrainDefinitions} from '../scripts/cig02e_verified_train_intake.mjs';
import {extractTaskMetadata} from '../scripts/cig02e_selective_task_metadata.mjs';
const plan=JSON.parse(fs.readFileSync('artifacts/compositional-intent-graph-v1/CIG-02E_PUBLIC_TRAIN_DEFINITION_FEASIBILITY_PLAN.json','utf8'));
const blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function response(bytes,url,width=1) {
  let offset=0, cancelled=false, released=false;
  const reader={
    async read(){if(offset===bytes.length)return {done:true};const value=bytes.slice(offset,offset+width);offset+=value.length;return {done:false,value};},
    async cancel(){cancelled=true;},releaseLock(){released=true;}
  };
  return {ok:true,status:200,url,redirected:false,body:{getReader:()=>reader,async cancel(){cancelled=true;released=true;}},closed:()=>cancelled&&released};
}
const synthetic=Buffer.from(JSON.stringify({Definition:['比較兩個選項。'],Instances:[{output:['DO_NOT_RETAIN']}]}));
const d={path:'tasks/synthetic.json',sha:blob(synthetic),size:synthetic.length,type:'blob'};
const url='https://raw.githubusercontent.com/synthetic/pinned/task.json';
const budget=()=>({maxBytes:1024,usedBytes:0});
const consume=stream=>extractTaskMetadata(stream);
test('verified bytes, split UTF-8 and selective parser yield only permitted excerpts',async()=>{
  const r=response(synthetic,url);
  const value=await consumeVerifiedResponse(r,d,{url,budget:budget(),maxBytes:1024,consume});
  assert.deepEqual(value.result.metadata.Definition,['比較兩個選項。']);
  assert.equal(value.result.acceptedGold,false);
  assert.equal(value.result.stats.excludedValueStringsDecoded,0);
  assert.equal(value.receivedBytes,synthetic.length);assert.equal(value.verifiedBlob,d.sha);
  assert.ok(r.closed());assert.ok(!JSON.stringify(value).includes('DO_NOT_RETAIN'));
});
test('rejects Git identity, declared/received totals, truncation and malformed UTF-8; closes streams',async()=>{
  const cases=[
    {bytes:synthetic,desc:{...d,sha:'0'.repeat(40)}},
    {bytes:synthetic.slice(0,-1),desc:d},
    {bytes:Buffer.concat([synthetic,Buffer.from(' ')]),desc:d},
    {bytes:Buffer.from([0xc3,0x28]),desc:{...d,size:2,sha:blob(Buffer.from([0xc3,0x28]))}},
    {bytes:Buffer.from([0xe4,0xb8]),desc:{...d,size:2,sha:blob(Buffer.from([0xe4,0xb8]))}}
  ];
  for(const c of cases){
    const r=response(c.bytes,url);
    await assert.rejects(consumeVerifiedResponse(r,c.desc,{url,budget:budget(),maxBytes:1024,consume}));
    assert.ok(r.closed());
  }
  await assert.rejects(consumeVerifiedResponse(response(synthetic,url),d,{url,budget:{maxBytes:1,usedBytes:0},maxBytes:1024,consume}),/total declared/);
  await assert.rejects(consumeVerifiedResponse(response(synthetic,url),d,{url,budget:budget(),maxBytes:1,consume}),/limits/);
});
test('rejects redirects, wrong origins/status and incomplete consumers',async()=>{
  for(const change of [{url:'https://example.com/task'},{redirected:true},{status:429,ok:false}]){
    const r=Object.assign(response(synthetic,url),change);
    await assert.rejects(consumeVerifiedResponse(r,d,{url,budget:budget(),maxBytes:1024,consume}),/origin\/status/);
  }
  const r=response(synthetic,url);
  await assert.rejects(consumeVerifiedResponse(r,d,{url,budget:budget(),maxBytes:1024,
    consume:async stream=>{for await(const text of stream)return text;}}),/complete stream/);
  assert.ok(r.closed());
});
test('checks registered multilingual selection and rejects order, TEST paths or plan drift',()=>{
  assert.equal(validateIntakePlan(plan).length,24);
  const names=[...plan.source.selected_task_names,...Array.from({length:1246},(_,i)=>'synthetic_train_'+i)];
  verifyTrainMembership(plan,names);
  assert.throws(()=>verifyTrainMembership(plan,[...names].reverse()),/membership\/order/);
  for(const mutate of [
    p=>p.source.selected_paths[0]='splits/xlingual/test_tasks.txt',
    p=>p.source.selected_task_names[0]=p.source.selected_task_names[1],
    p=>p.source.commit='0'.repeat(40),p=>p.limits.retries=1,p=>p.gold_rows_created=1
  ]){const p=structuredClone(plan);mutate(p);assert.throws(()=>validateIntakePlan(p),/TRAIN_INTAKE_REJECT/);}
  assert.ok(rawSourceURL(plan,plan.source.selected_paths[0]).startsWith('https://raw.githubusercontent.com/allenai/natural-instructions/'+plan.source.commit+'/tasks/'));
});
test('bad TRAIN identity cannot trigger a task request or retry',async()=>{
  let calls=0;
  const trainBytes=Buffer.from('synthetic-only-train-list');
  const trainDescriptor={path:plan.source.train_list_path,sha:plan.source.train_list_blob,size:trainBytes.length,type:'blob'};
  const tasks=plan.source.selected_paths.map(path=>({...d,path}));
  await assert.rejects(acquireFixedTrainDefinitions(plan,{
    trainDescriptor,trainResponse:response(trainBytes,rawSourceURL(plan,trainDescriptor.path)),
    taskDescriptors:tasks,fetchTask:async()=>{calls++;throw Error('must not request');}
  }),/Git blob mismatch/);
  assert.equal(calls,0);
});
