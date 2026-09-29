import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildA2} from './a2_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {activeRequestCurrent,splitExplicitGoals,combineA2Primary,
  routeA6R1} from './a6_complement_r1.mjs';

test('A6-R1 keeps later positive scope and splits only explicit task coordination',()=>{
  assert.equal(activeRequestCurrent('No further release work. Please plan a career move.'),
    'Please plan a career move.');
  assert.equal(activeRequestCurrent('请设计产品路线。'),'请设计产品路线。');
  assert.deepEqual(splitExplicitGoals('Plan pricing and distribution channels.'),null);
  assert.deepEqual(splitExplicitGoals('Plan release steps and prioritize features.').goals,
    ['Plan release steps','prioritize features.']);
  assert.deepEqual(splitExplicitGoals('请规划转岗，并优化发票流程。').goals,
    ['请规划转岗','优化发票流程。']);
  assert.deepEqual(splitExplicitGoals('请规划转岗，并优化流程，并联络同事。'),
    {error:'MULTI_UNSUPPORTED_ARITY'});
  assert.deepEqual(splitExplicitGoals('Please quote "plan and troubleshoot".'),null);
});

test('A2-primary arbitration never falls back to A3 and vetoes conflicts',()=>{
  const a2={state:'ASSIGNED',topics:['topic-a'],score:3,margin:2};
  const a3={state:'ASSIGNED',topics:['topic-b']};
  const low={state:'DEFER',topics:[],reason:'LOW_OR_AMBIGUOUS_EVIDENCE'};
  assert.equal(combineA2Primary(low,a3).reason,'A6_R1_A2_INSUFFICIENT');
  assert.equal(combineA2Primary(a2,a3).reason,'A6_R1_A2_A3_CONFLICT');
  assert.equal(combineA2Primary(a2,low).reason,'A6_R1_A2_PRIMARY');
  assert.equal(combineA2Primary(a2,{...a3,topics:['topic-a']}).reason,'A6_R1_AGREED');
  assert.equal(combineA2Primary(a2,{state:'DEFER',topics:[],reason:'INVALID_INDEX'}).state,'DEFER');
});

test('A6-R1 full144 TRAIN closure, deterministic output and static caps',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-a6-r1-'));
  try{
    const a3Build=await buildA3({mode:'char',output:join(dir,'a3.json')});
    const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
    const a3=JSON.parse(await readFile(a3Build.output,'utf8'));
    const a2=JSON.parse(await readFile(a2Build.output,'utf8'));
    const catalog_sha256=a3.catalog_sha256;
    assert.equal(a3.topic_ids.length,144);assert.deepEqual(a3.topic_ids,a2.topic_ids);
    assert.equal(a3.train_sha256,a2.train_sha256);
    assert(a3Build.index_bytes+a2Build.index_bytes<=1048576);
    const source=await Promise.all(['a1.mjs','a2.mjs','a3.mjs',
      'a6_complement_scope.mjs','a6_complement_r1.mjs']
      .map(n=>readFile(new URL(n,import.meta.url))));
    assert(a3Build.index_bytes+a2Build.index_bytes+
      source.reduce((sum,b)=>sum+b.length,0)<=2097152);
    const noRequest={current:'No action needed; the notes are stored.',title:'Please act',
      recent:['Please act']};
    assert.equal(routeA6R1(a3,a2,noRequest,{catalog_sha256}).reason,
      'A6_R1_EXPLICIT_NO_REQUEST');
    const x={current:'Please organize the release notes.',title:'',recent:[]};
    const first=routeA6R1(a3,a2,x,{catalog_sha256});
    assert.deepEqual(first,routeA6R1(a3,a2,x,{catalog_sha256}));
    assert(['ASSIGNED','DEFER'].includes(first.state));
    assert(first.topics.every(topic=>a3.topic_ids.includes(topic)));
    assert.equal(routeA6R1(a3,a2,x,{catalog_sha256:'b'.repeat(64)}).reason,
      'INDEX_CLOSURE_MISMATCH');
    assert.equal(routeA6R1(a3,{...a2,train_sha256:'b'.repeat(64)},x,
      {catalog_sha256}).reason,'INDEX_CLOSURE_MISMATCH');
    assert.equal(routeA6R1(a3,a2,{...x,recent:[4]},
      {catalog_sha256}).reason,'BAD_INPUT');
  }finally{await rm(dir,{recursive:true,force:true});}
});
