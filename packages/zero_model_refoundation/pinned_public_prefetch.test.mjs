import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../../.github/workflows/zmr-v1.yml',import.meta.url),'utf8');
const begin='            // BEGIN_BOUNDED_PUBLIC_PREFETCH',end='            // END_BOUNDED_PUBLIC_PREFETCH';
assert.equal(workflow.split(begin).length,2);assert.equal(workflow.split(end).length,2);
const source=workflow.slice(workflow.indexOf(begin)+begin.length,workflow.indexOf(end));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const entry=i=>({mode:'100644',type:'blob',size:32,sha:i.toString(16).padStart(40,'0')});
async function make(entries,read){return new AsyncFunction('allowed','after','read','assert',source+'\nreturn prefetch;')(new Set(entries.map(([p])=>p)),new Map(entries),read,assert);}

test('four workers overlap unique blobs once and deduplicate validated aliases',async()=>{
 const entries=Array.from({length:11},(_,i)=>['safe/'+i,entry(i+1)]);entries.push(['safe/alias',entry(1)]);
 let active=0,peak=0;const calls=[],releases=[];
 const prefetch=await make(entries,async p=>{active++;peak=Math.max(peak,active);calls.push(p);await new Promise(resolve=>releases.push(resolve));active--;});
 const run=prefetch(entries.map(([p])=>p));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(active,4);assert.equal(calls.length,4);
 while(releases.length){releases.splice(0).forEach(resolve=>resolve());await new Promise(resolve=>setImmediate(resolve));}
 await run;assert.equal(peak,4);assert.equal(active,0);assert.equal(calls.length,11);assert.equal(new Set(calls).size,11);assert(!calls.includes('safe/alias'));
});
test('all aliases and scope validate before first read including a bad duplicate alias',async()=>{
 for(const [path,bad,error] of [['safe/alias',{...entry(1),mode:'120000'},/regular/],['safe/../alias',entry(1),/canonical/],['safe/alias',{...entry(1),size:8*1024*1024+1},/bounded/],['safe/alias',{...entry(1),sha:'main'},/immutable/]]){
  let calls=0;const prefetch=await make([['safe/good',entry(1)],[path,bad]],async()=>{calls++;});
  await assert.rejects(prefetch(['safe/good',path]),error);assert.equal(calls,0);
 }
 let calls=0;const prefetch=await make([['safe/good',entry(1)]],async()=>{calls++;});await assert.rejects(prefetch(['safe/good','sealed/TEST.json']),/not allowlisted/);assert.equal(calls,0);
});
test('failure stops queued reads and drains already active workers without retry or false success',async()=>{
 const entries=Array.from({length:12},(_,i)=>['safe/'+i,entry(i+1)]),calls=[],releases=[];let active=0;
 const prefetch=await make(entries,async p=>{calls.push(p);if(p==='safe/0')throw Error('HTTP 403');active++;await new Promise(resolve=>releases.push(resolve));active--;});
 let settled=false;const run=prefetch(entries.map(([p])=>p)).then(()=>{throw Error('false success');},error=>{assert.match(error.message,/HTTP 403/);settled=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,4);assert.equal(settled,false);
 releases.splice(0).forEach(resolve=>resolve());await run;assert.equal(active,0);assert.equal(calls.length,4);assert.equal(settled,true);
});
test('empty queue reads nothing and workflow retains serial assertions and two test workers',async()=>{
 let calls=0;const prefetch=await make([],async()=>{calls++;});await prefetch([]);assert.equal(calls,0);
 assert(workflow.includes('await prefetch([...allowed].filter(p => after.has(p)));'));
 assert(workflow.includes("for (const p of docs) assert((await read(p)).length >= 200"));
 const command=workflow.split('\n').find(line=>line.startsWith('          node packages/zero_model_refoundation/ci_test_scheduler.mjs '));
 assert(command);assert(command.includes('--shard=${{ matrix.shard }} --test-concurrency=2 '));
 assert(workflow.includes("shard: ['1/3', '2/3', '3/3']"));
 const repair=JSON.parse(readFileSync(new URL('../../docs/zero-model-refoundation-v1/ZMR_CI_THREE_SERIAL_SHARDS_REPAIR_RESULT.json',import.meta.url),'utf8'));
 assert.equal(repair.matrix_fixture_followup.preserved_failed_run.workflow_verdict,'FAILURE_NOT_INTEGRATION_PASS');
 assert.equal(repair.matrix_fixture_followup.code_pins.length,2);
 // Historical pins identify the completed repair snapshot, not every future legitimate workflow revision.
 assert.deepEqual(repair.matrix_fixture_followup.code_pins,[
  {path:'.github/workflows/zmr-v1.yml',sha256:'09b4ee4bba1fad4979fd3efab22d6196b74ae1f37e9f79efb5a9b5596e00b829'},
  {path:'packages/zero_model_refoundation/pinned_public_prefetch.test.mjs',sha256:'ccef784736fb5356358cb088542706d2cf8efc52cca0e0a0224b08abcb1e40f4'}
 ]);
 assert.equal(repair.matrix_fixture_followup.semantic_judgment_certified,false);assert(workflow.includes('max-parallel: 1'));assert(workflow.includes('timeout-minutes: 5'));
});
