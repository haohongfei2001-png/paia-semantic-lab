/** Engineering CI partition only; no Router, data qualification or consumed input. */
import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {selectTestLanes} from './ci_test_scheduler.mjs';
const workflow=await readFile(new URL('../../.github/workflows/zmr-v1.yml',import.meta.url),'utf8');
test('CI keeps every explicit unit and serializes three shards inside existing per-job limits',()=>{
 assert(workflow.includes('timeout-minutes: 5'));assert(workflow.includes('fail-fast: false'));assert(workflow.includes('max-parallel: 1'));assert(workflow.includes("shard: ['1/3', '2/3', '3/3']"));
 const line=workflow.split('\n').find(l=>l.startsWith('          node packages/zero_model_refoundation/ci_test_scheduler.mjs '));assert(line);assert(line.includes('--shard=${{ matrix.shard }} --test-concurrency=2'));
 const paths=line.trim().split(/\s+/).filter(s=>s.endsWith('.test.mjs'));assert(paths.length>=127);assert.equal(createHash('sha256').update(JSON.stringify(paths.slice(0,126))).digest('hex'),'15e2eb318ca567db6aef178cca3d96f9b2153389a471981379c351f6a08145d7');assert.equal(new Set(paths).size,paths.length);assert.equal(createHash('sha256').update(JSON.stringify(paths.slice(0,118))).digest('hex'),'0463573929208472d93ae7608c3dcfdbce5bdb0dbd6042a16a9aa1e4983c2627');assert(paths.every(p=>/^packages\/zero_model_refoundation\/[a-z0-9_]+\.test\.mjs$/.test(p)));assert(paths.includes('packages/zero_model_refoundation/ci_test_shards.test.mjs'));
});
test('runtime scheduler union executes all synthetic file assertions exactly once with disjoint partitions',async()=>{
 const root=await mkdtemp(join(tmpdir(),'zmr-ci-shards-'));
 try{
  const files=[];for(let i=0;i<7;i++){const name='proof'+i,path=join(root,name+'.test.mjs');files.push({path,logical:'packages/zero_model_refoundation/'+name+'.test.mjs'});await writeFile(path,"import test from 'node:test';import assert from 'node:assert/strict';test('partition-proof-"+i+"',()=>assert.equal("+i+","+i+"));\n");}
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const seen=[];for(const shard of ['1/3','2/3','3/3']){
   const lanes=selectTestLanes(files.map(x=>x.logical),shard).map(l=>({...l,paths:l.paths.map(p=>files.find(f=>f.logical===p).path)}));
   const script="import {executeTestLanes,runNodeUnit} from "+JSON.stringify(new URL('./ci_test_scheduler.mjs',import.meta.url).href)+";const r=await executeTestLanes("+JSON.stringify(lanes)+",runNodeUnit);process.exitCode=r.exit_code;";
   const r=spawnSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(r.error,undefined);assert.equal(r.status,0,r.stderr);const ids=[...r.stdout.matchAll(/^ok \d+ - partition-proof-(\d+)$/gm)].map(m=>Number(m[1]));assert(ids.length>0,r.stdout);assert.equal(ids.length,new Set(ids).size);seen.push(ids);
  }
  assert.equal(seen.length,3);for(let i=0;i<seen.length;i++)for(let j=i+1;j<seen.length;j++)assert(seen[i].every(k=>!seen[j].includes(k)));assert.deepEqual(seen.flat().sort((a,b)=>a-b),[0,1,2,3,4,5,6]);
 }finally{await rm(root,{recursive:true,force:true});}
});
