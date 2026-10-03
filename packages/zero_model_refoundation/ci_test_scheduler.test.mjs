import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {planTestLanes,selectTestLanes,executeTestLanes,estimatedUnitCost} from './ci_test_scheduler.mjs';
const unit=n=>'packages/zero_model_refoundation/'+n+'.test.mjs';
test('explicit schedule partitions every unit exactly once without mutating the list or exceeding two lanes per shard',()=>{
 const paths=['contracts','mechanism_matrix_train_expansion11','mechanism_matrix_train_expansion10','mechanism_matrix_expansion11_review','mechanism_matrix_expansion10_review','ci_test_scheduler','ci_test_shards'].map(unit),before=JSON.stringify(paths),plan=planTestLanes(paths);
 assert.equal(JSON.stringify(paths),before);assert.deepEqual(plan,planTestLanes(paths));assert.equal(plan.length,2);assert(plan.every(shard=>shard.length===2));
 const flat=plan.flat(2).flatMap(l=>l.paths);assert.equal(new Set(flat).size,paths.length);assert.deepEqual([...flat].sort(),[...paths].sort());
 assert.deepEqual(selectTestLanes(paths,'1/2'),plan[0]);assert.deepEqual(selectTestLanes(paths,'2/2'),plan[1]);assert.throws(()=>selectTestLanes(paths,'1/3'),/two serial/);assert.throws(()=>planTestLanes([...paths,paths[0]]),/unique/);assert.throws(()=>planTestLanes(['data/consumed.test.mjs']),/explicit/);assert.throws(()=>planTestLanes([]),/explicit/);
 assert(estimatedUnitCost(unit('mechanism_matrix_train_expansion11'))>estimatedUnitCost(unit('mechanism_matrix_train_expansion10')));
});
test('two workers drain all lanes,retain failures and errors,and never report skipped units as pass',async()=>{
 const lanes=[{paths:['a','b','c']},{paths:['d','e','f']}],seen=[];let active=0,peak=0;
 const outcome=await executeTestLanes(lanes,async path=>{active++;peak=Math.max(peak,active);seen.push(path);await new Promise(resolve=>setImmediate(resolve));active--;if(path==='c')throw Error('start failed');return path==='b'?1:0;});
 assert.equal(peak,2);assert.equal(active,0);assert.deepEqual([...seen].sort(),['a','b','c','d','e','f']);assert.equal(outcome.exit_code,1);assert.deepEqual(outcome.results.filter(r=>!r.passed).map(r=>r.path),['b','c']);
 const pass=await executeTestLanes(lanes,async()=>0);assert.equal(pass.exit_code,0);assert.equal(pass.results.length,6);await assert.rejects(executeTestLanes([] ,async()=>0),/two workers/);
});
test('real isolated Node child assertion failures and exit errors propagate through the bounded runner',async()=>{
 const root=await mkdtemp(join(tmpdir(),'zmr-scheduler-proof-'));
 try{
  const paths=['pass','fail'].map(n=>join(root,n+'.test.mjs'));
  await writeFile(paths[0],"import test from 'node:test';import assert from 'node:assert/strict';test('scheduler-proof-pass',()=>assert.equal(1,1));\n");
  await writeFile(paths[1],"import test from 'node:test';import assert from 'node:assert/strict';test('scheduler-proof-fail',()=>assert.equal(1,2));\n");
  const url=new URL('./ci_test_scheduler.mjs',import.meta.url).href,env={...process.env};delete env.NODE_TEST_CONTEXT;
  const script="import {executeTestLanes,runNodeUnit} from "+JSON.stringify(url)+";const r=await executeTestLanes("+JSON.stringify([{paths:[paths[0]]},{paths:[paths[1]]}]) +",runNodeUnit);console.log('PROOF_RESULT '+JSON.stringify(r));process.exitCode=r.exit_code;";
  const r=spawnSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(r.error,undefined);assert.equal(r.status,1);assert(r.stdout.includes('scheduler-proof-pass'));assert(r.stdout.includes('scheduler-proof-fail'));const result=JSON.parse(r.stdout.match(/PROOF_RESULT (.+)/)[1]);assert.equal(result.results.length,2);assert.equal(result.results.filter(x=>x.passed).length,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
