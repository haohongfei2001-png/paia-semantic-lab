import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {requirePassingHead,requireFirstRun,selectPinnedDescriptors,fetchOnce} from '../scripts/cig02e_ni_definition_source_job.mjs';
const plan=JSON.parse(fs.readFileSync('artifacts/compositional-intent-graph-v1/CIG-02E_PUBLIC_TRAIN_DEFINITION_FEASIBILITY_PLAN.json','utf8'));
const sha='a'.repeat(40);
const required=['selective-metadata-synthetic-tests','csl-public-pr-validation','cig02b-public-dev','fresh-public-train-dev','source-separated-public-train-dev','pinned-dialogue-source-triage'];
test('source gate requires every exact-head check without waiting or polling',()=>{
  const checks={total_count:6,check_runs:required.map(name=>({name,head_sha:sha,status:'completed',conclusion:'success'}))};
  requirePassingHead(checks,sha);
  for(const change of [c=>c.check_runs.pop(),c=>c.check_runs[0].head_sha='b'.repeat(40),c=>c.check_runs[0].status='in_progress',c=>c.check_runs[0].conclusion='failure',c=>c.check_runs.push(c.check_runs[0]),c=>c.total_count=101]){
    const copy=structuredClone(checks);change(copy);assert.throws(()=>requirePassingHead(copy,sha),/NI_SOURCE_GATE_REJECT/);
  }
});
test('source attempt is one-shot across runs and reruns',()=>{
  requireFirstRun({id:7,run_attempt:1},{total_count:1,workflow_runs:[{id:7}]});
  assert.throws(()=>requireFirstRun({id:7,run_attempt:2},{total_count:1,workflow_runs:[{id:7}]}),/prior source/);
  assert.throws(()=>requireFirstRun({id:7,run_attempt:1},{total_count:2,workflow_runs:[{id:7},{id:6}]}),/prior source/);
});
test('metadata-only pinned tree selects exactly registered tasks and license',()=>{
  const root={tree:[{path:'LICENSE',type:'blob',sha:'29f81d812f3e768fa89638d1f72920dbfd1413a8',size:11558}],truncated:false};
  const tasks={tree:plan.source.selected_paths.map(path=>({path:path.slice(6),type:'blob',sha:'c'.repeat(40),size:100})),truncated:false};
  const result=selectPinnedDescriptors(plan,root,tasks);
  assert.deepEqual(result.taskDescriptors.map(d=>d.path),plan.source.selected_paths);
  assert.equal(result.trainDescriptor.sha,plan.source.train_list_blob);
  for(const change of [t=>t.truncated=true,t=>t.tree.pop(),t=>t.tree[0].size=50331649,t=>t.tree.push(t.tree[0])]){
    const copy=structuredClone(tasks);change(copy);assert.throws(()=>selectPinnedDescriptors(plan,root,copy),/NI_SOURCE_GATE_REJECT/);
  }
});
test('transport is one request, finite timeout, redirect-disabled, GitHub-only and no retry',async()=>{
  let calls=0,options,cancelled=false;
  const url='https://raw.githubusercontent.com/example/pin/file';
  const fake=async(u,o)=>{calls++;options=o;return {ok:true,status:200,url:u,redirected:false,body:{async cancel(){cancelled=true;}}};};
  await fetchOnce(url,{fetchFn:fake});assert.equal(calls,1);assert.equal(options.redirect,'error');assert.ok(options.signal);
  assert.deepEqual(options.headers,{});
  await assert.rejects(fetchOnce('https://example.com/not-github',{fetchFn:fake}),/non-GitHub/);assert.equal(calls,1);
  await assert.rejects(fetchOnce(url,{fetchFn:async()=>{calls++;return {ok:false,status:429,url,body:{async cancel(){cancelled=true;}}};}}),/no retry/);
  assert.equal(calls,2);assert.equal(cancelled,true);
});
