import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildA2} from './a2_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {explicitNoRequest,combineComplementEvidence,
  routeA6ComplementScope} from './a6_complement_scope.mjs';

test('A6 current-only guard preserves later explicit tasks and corrections',()=>{
  assert.equal(explicitNoRequest('No action needed; the design is stored.'),true);
  assert.equal(explicitNoRequest('已收到方案，不需要处理。'),true);
  assert.equal(explicitNoRequest('No action needed. Please plan the next release.'),false);
  assert.equal(explicitNoRequest('不是现在需要执行的任务。请帮我整理后续步骤。'),false);
  assert.equal(explicitNoRequest('不需要旧方案，而是请改成新安排。'),false);
  assert.equal(explicitNoRequest('Please plan the next release.'),false);
});

test('A6 complement agreement, conflict, fallback and strong rescue stay bounded',()=>{
  const a3={state:'ASSIGNED',topics:['topic-a'],reason:'A3_DEV_HINGE'};
  const a2={state:'ASSIGNED',topics:['topic-a'],reason:'A2_DEV_LIKELIHOOD',score:3,margin:3};
  const low={state:'DEFER',topics:[],reason:'LOW_OR_AMBIGUOUS_EVIDENCE'};
  assert.deepEqual(combineComplementEvidence(a3,a2).topics,['topic-a']);
  assert.equal(combineComplementEvidence(a3,{...a2,topics:['topic-b']}).reason,
    'A6_CLASS_COMPLEMENT_CONFLICT');
  assert.deepEqual(combineComplementEvidence(a3,low),a3);
  assert.equal(combineComplementEvidence(low,a2).reason,'A6_STRONG_COMPLEMENT_RESCUE');
  assert.deepEqual(combineComplementEvidence(low,{...a2,score:1}),low);
  assert.equal(combineComplementEvidence(a3,{state:'DEFER',topics:[],reason:'INVALID_INDEX'}).state,'DEFER');
  assert.equal(combineComplementEvidence(a3,a2,{rescue_min_score:NaN}).reason,'BAD_CONFIG');
});

test('A6 fixed TRAIN-only full144 closure fits static caps and fails closed',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-a6-complement-'));
  try{
    const a3Build=await buildA3({mode:'char',output:join(dir,'a3.json')});
    const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
    const a3=JSON.parse(await readFile(a3Build.output,'utf8'));
    const a2=JSON.parse(await readFile(a2Build.output,'utf8'));
    const catalog_sha256=a3.catalog_sha256;
    assert.equal(a3.topic_ids.length,144);assert.equal(a2.topic_ids.length,144);
    assert.deepEqual(a3.topic_ids,a2.topic_ids);
    assert.equal(a3.train_sha256,a2.train_sha256);
    assert(a3Build.index_bytes+a2Build.index_bytes<=1048576);
    const source=await Promise.all(['a1.mjs','a2.mjs','a3.mjs','a6_complement_scope.mjs']
      .map(n=>readFile(new URL(n,import.meta.url))));
    assert(a3Build.index_bytes+a2Build.index_bytes+
      source.reduce((sum,b)=>sum+b.length,0)<=2097152);
    const input={current:'No action needed; the notes are stored.',title:'Please act',
      recent:['Please act']};
    assert.equal(routeA6ComplementScope(a3,a2,input,{catalog_sha256}).reason,
      'A6_EXPLICIT_NO_REQUEST');
    const ordinary={current:'Please organize the release notes.',title:'',recent:[]};
    const first=routeA6ComplementScope(a3,a2,ordinary,{catalog_sha256});
    assert.deepEqual(first,routeA6ComplementScope(a3,a2,ordinary,{catalog_sha256}));
    assert(['ASSIGNED','DEFER'].includes(first.state));
    assert(first.topics.every(topic=>a3.topic_ids.includes(topic)));
    assert.equal(routeA6ComplementScope(a3,a2,ordinary,
      {catalog_sha256:'b'.repeat(64)}).reason,'INDEX_CLOSURE_MISMATCH');
    assert.equal(routeA6ComplementScope(a3,{...a2,train_sha256:'b'.repeat(64)},ordinary,
      {catalog_sha256}).reason,'INDEX_CLOSURE_MISMATCH');
    assert.equal(routeA6ComplementScope(a3,a2,{...ordinary,recent:[4]},
      {catalog_sha256}).reason,'BAD_INPUT');
  }finally{await rm(dir,{recursive:true,force:true});}
});
