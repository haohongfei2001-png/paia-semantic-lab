import test from 'node:test';
import assert from 'node:assert/strict';
import {routeA5Composition} from './a5_composition.mjs';

const catalog_sha256='a'.repeat(64);
const topic_ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);
const postings=[['c2:整理',[[1,100]]],['c2:旧甲',[[0,100]]]]
  .sort((a,b)=>a[0]<b[0]?-1:1);
const index={schema:'ZMR-A3-DEV-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256,train_sha256:'b'.repeat(64),mode:'char',topic_ids,
  quant_scale:.01,postings};
const input=current=>({current,title:'整理乙',recent:['整理乙']});
const route=current=>routeA5Composition(index,input(current),{catalog_sha256});

test('two explicit action clauses require separate full144 support before multi output',()=>{
  const result=route('安排旧甲；整理乙');
  assert.equal(result.state,'ASSIGNED');
  assert.deepEqual(result.topics,[topic_ids[0],topic_ids[1]]);
  assert.equal(result.reason,'A5_TWO_EXPLICIT_ACTION_CLAUSES');
  assert.deepEqual(route('安排旧甲；查找未知').topics,[topic_ids[0]]);
});

test('explicit correction needs supported old and new sides, never a naked replacement',()=>{
  const changed=route('不是旧甲而是整理乙');
  assert.deepEqual(changed.topics,[topic_ids[1]]);
  assert.equal(changed.reason,'A5_EXPLICIT_CORRECTION');
  const unsupported=route('不是旧甲而是安排未知');
  assert.equal(unsupported.state,'DEFER');
});

test('quoted cues cannot add a label and bad closure fails closed',()=>{
  assert.equal(route('“整理乙” 安排旧甲').state,'DEFER');
  assert.equal(route('他说“安排旧甲').reason,'A5_UNBALANCED_QUOTE');
  assert.equal(route('😀'.repeat(8193)).reason,'A5_PROFILE_OVERFLOW');
  assert.equal(routeA5Composition(index,input('安排旧甲'),
    {catalog_sha256:'c'.repeat(64)}).state,'DEFER');
  assert.equal(routeA5Composition(index,input('安排旧甲'),
    {catalog_sha256,segment_min_score:-1}).reason,'BAD_CONFIG');
});

test('title and recent do not change current-only decisions',()=>{
  const current='安排旧甲';
  const a=routeA5Composition(index,{current,title:'',recent:[]},{catalog_sha256});
  const b=routeA5Composition(index,{current,title:'整理乙',recent:['整理乙']},
    {catalog_sha256});
  assert.deepEqual(a,b);
  assert.deepEqual(a.topics,[topic_ids[0]]);
});
