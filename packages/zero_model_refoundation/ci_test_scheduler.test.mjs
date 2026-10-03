import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile,access,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {planTestLanes,selectTestLanes,executeTestLanes,estimatedUnitCost,CI_TIMING_REFERENCE,CURRENT_MAIN_CI_TIMING_REFERENCE,PREVIOUS_CI_TIMING_REFERENCE,withEphemeralCompileCache,runNodeUnit} from './ci_test_scheduler.mjs';
const unit=n=>'packages/zero_model_refoundation/'+n+'.test.mjs';
test('historical and latest-main timing hints preserve full unit coverage and setup reserve in three bounded shards',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/zmr-v1.yml',import.meta.url),'utf8');
 const line=workflow.split('\n').find(l=>l.startsWith('          node packages/zero_model_refoundation/ci_test_scheduler.mjs '));assert(line);
 const paths=line.trim().split(/\s+/).filter(p=>p.endsWith('.test.mjs')),reference=CI_TIMING_REFERENCE;
 assert.equal(reference.head,'027e4f2e98e3cec418b082a72db7e3fd9f93363e');assert.equal(reference.run_id,37118392470);assert.equal(reference.attempt,1);assert.equal(PREVIOUS_CI_TIMING_REFERENCE.run_id,37116129462);assert.equal(PREVIOUS_CI_TIMING_REFERENCE.run_verdict,'CANCELLED_WITH_ASSERTION_FAILURE_NOT_PASS');
 assert.equal(reference.run_verdict,'CANCELLED_WITH_ALL_UNIT_PASS_NOT_JOB_PASS');assert.equal(reference.evidence_class,'ENGINEERING_SCHEDULING_HINTS_ONLY');
 assert.equal(reference.units,127);assert(paths.length>=127);assert.deepEqual(Object.keys(reference.unit_ms).sort(),paths.slice(0,127).sort());assert(Object.keys(reference.unit_ms).every(p=>paths.includes(p)));assert(Object.values(reference.unit_ms).every(ms=>Number.isInteger(ms)&&ms>0));
 const plan=planTestLanes(paths,{shards:3,timing:CURRENT_MAIN_CI_TIMING_REFERENCE}),loads=plan.flat().map(l=>l.estimated_ms);
 assert(Math.max(...loads)<260000);assert(loads.every(ms=>ms+40000<300000)); // Ordering forecast only;actual CI still required.
 assert.equal(CURRENT_MAIN_CI_TIMING_REFERENCE.run_id,37143155357);assert.equal(CURRENT_MAIN_CI_TIMING_REFERENCE.units,136);assert.deepEqual(Object.keys(CURRENT_MAIN_CI_TIMING_REFERENCE.unit_ms).sort(),paths.slice(0,136).sort());
 assert.equal(plan.length,3);assert(plan.every(s=>s.length===2));
 assert.equal(plan.flat().reduce((n,l)=>n+l.paths.length,0),paths.length);
 const historicalPlan=planTestLanes(paths.slice(0,127)).flat();assert(historicalPlan.every(l=>l.estimated_ms+40000<300000));
 const future=unit('mechanism_matrix_train_expansion12');assert(!Object.hasOwn(reference.unit_ms,future));assert(estimatedUnitCost(future)>=120000);
 const extended=planTestLanes([...paths,future],{shards:3,timing:CURRENT_MAIN_CI_TIMING_REFERENCE}).flat().flatMap(l=>l.paths);assert.equal(extended.filter(p=>p===future).length,1);assert.equal(new Set(extended).size,paths.length+1);assert.throws(()=>planTestLanes(paths,{shards:4}),/two or three/);assert.throws(()=>planTestLanes(paths,{shards:3,timing:{unit_ms:{}}}),/registered timing/);
 for(const shard of ['1/3','2/3','3/3'])assert.deepEqual(selectTestLanes(paths,shard),plan[Number(shard[0])-1]);
});
test('explicit schedule partitions every unit exactly once without mutating the list or exceeding two lanes per shard',()=>{
 const paths=['contracts','mechanism_matrix_train_expansion11','mechanism_matrix_train_expansion10','mechanism_matrix_expansion11_review','mechanism_matrix_expansion10_review','ci_test_scheduler','ci_test_shards'].map(unit),before=JSON.stringify(paths),plan=planTestLanes(paths);
 assert.equal(JSON.stringify(paths),before);assert.deepEqual(plan,planTestLanes(paths));assert.equal(plan.length,2);assert(plan.every(shard=>shard.length===2));
 const flat=plan.flat(2).flatMap(l=>l.paths);assert.equal(new Set(flat).size,paths.length);assert.deepEqual([...flat].sort(),[...paths].sort());
 assert.deepEqual(selectTestLanes(paths,'1/2'),plan[0]);assert.deepEqual(selectTestLanes(paths,'2/2'),plan[1]);assert.throws(()=>selectTestLanes(paths,'1/4'),/two or three serial/);assert.throws(()=>planTestLanes([...paths,paths[0]]),/unique/);assert.throws(()=>planTestLanes(['data/consumed.test.mjs']),/explicit/);assert.throws(()=>planTestLanes([]),/explicit/);
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

test('completed worker drains remaining work across lane boundaries while a long unit stays active',{timeout:1000},async()=>{
 const lanes=[{paths:['long','left1','left2']},{paths:['short']}],seen=[];let unblock;
 const longDone=new Promise(resolve=>{unblock=resolve;});
 const pending=executeTestLanes(lanes,async path=>{
  seen.push(path);
  if(path==='long')await longDone;
  if(path==='left2')unblock();
  return 0;
 });
 const outcome=await pending;
 assert.deepEqual(seen,['long','left1','left2','short']);
 assert.equal(outcome.results.length,4);assert.equal(outcome.exit_code,0);
 assert.deepEqual(outcome.results.map(r=>r.path),['long','left1','left2','short']);
});

test('fresh bytecode cache retains compact failure diagnostics,reruns assertions and invalidates changed source',{timeout:10000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'zmr-bytecode-proof-')),file=join(root,'changing.test.mjs');let cache;
 try{
  await withEphemeralCompileCache(async directory=>{
   cache=directory;assert.deepEqual(await readdir(directory),[]);
   const writes=v=>writeFile(file,"import test from 'node:test';import assert from 'node:assert/strict';test('bytecode-proof-changing',()=>assert.equal("+v+",1));\n");
   const child=()=>{
    const script="import {runNodeUnit} from "+JSON.stringify(new URL('./ci_test_scheduler.mjs',import.meta.url).href)+";const r=await runNodeUnit("+JSON.stringify(file)+",{reporter:'spec',compileCacheDirectory:"+JSON.stringify(directory)+"});process.exitCode=r;";
    const env={...process.env};delete env.NODE_TEST_CONTEXT;
    return spawnSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
   };
   await writes(1);const first=child();assert.equal(first.error,undefined);assert.equal(first.status,0);assert(first.stdout.includes('bytecode-proof-changing'));assert((await readdir(directory)).length>0);
   await writes(2);const changed=child();assert.equal(changed.error,undefined);assert.equal(changed.status,1);assert(changed.stdout.includes('AssertionError'));assert(changed.stdout.includes('bytecode-proof-changing'));
   const unchangedFailure=child();assert.equal(unchangedFailure.error,undefined);assert.equal(unchangedFailure.status,1);assert(unchangedFailure.stdout.includes('AssertionError'));
   await writes(1);assert.equal(child().status,0);
  });
  await assert.rejects(access(cache),/ENOENT/);
  let failedCache;await assert.rejects(withEphemeralCompileCache(async directory=>{failedCache=directory;throw Error('fixture failure');}),/fixture failure/);await assert.rejects(access(failedCache),/ENOENT/);
  await assert.rejects(withEphemeralCompileCache(null),/callback/);
  assert.throws(()=>runNodeUnit(file,{reporter:'invented'}),/reporter/);assert.throws(()=>runNodeUnit(file,{compileCacheDirectory:''}),/directory/);
 }finally{await rm(root,{recursive:true,force:true});}
});
