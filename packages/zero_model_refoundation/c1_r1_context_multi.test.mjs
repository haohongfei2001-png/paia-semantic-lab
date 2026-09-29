import test from 'node:test';
import assert from 'node:assert/strict';
import {routeA3} from './a3.mjs';
import {routeC1R1} from './c1_r1_context_multi.mjs';

const digest='a'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`T${String(i).padStart(3,'0')}`);
const index={schema:'ZMR-A3-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256:digest,train_sha256:'b'.repeat(64),mode:'char',topic_ids:ids,
  quant_scale:1,postings:[['c3:alp',[[0,1000]]],['c3:bet',[[1,1000]]],['c3:gam',[[2,1000]]]]};
const input=(current,title='',recent=[])=>({current,title,recent});
const options={catalog_sha256:digest,min_score:.02,min_margin:.02,
  context_min_score:.08,context_min_margin:.05,multi_min_score:.08,multi_min_margin:.05};

test('C1-R1 preserves complete A3 output for self-contained current despite stale context',()=>{
  const row=input('alpha','beta',['gamma']);
  assert.deepEqual(routeC1R1(index,row,options),routeA3(index,row,options));
  assert.deepEqual(routeC1R1(index,input('alpha'),options),routeC1R1(index,row,options));
});

test('C1-R1 uses only an explicit continuation and last recent text for needed context',()=>{
  const row=input('这个该怎么继续？','gamma',['gamma','alpha']);
  const result=routeC1R1(index,row,options);
  assert.equal(result.state,'ASSIGNED');assert.deepEqual(result.topics,[ids[0]]);
  assert.deepEqual(result.evidence_sources,['current','recent-last']);
  assert.equal(routeC1R1(index,input('这个该怎么继续？'),options).state,'DEFER');
  assert.deepEqual(routeC1R1(index,input('刚才那个怎么继续？','',['alpha']),options).topics,[ids[0]]);
  assert.deepEqual(routeC1R1(index,input('Continuing that, what next?','',['beta']),options).topics,[ids[1]]);
});

test('C1-R1 defers a current versus context conflict and cannot use title as independent evidence',()=>{
  const conflict=routeC1R1(index,input('这个 alpha 怎么办？','',['beta beta beta']),options);
  assert.equal(conflict.reason,'CURRENT_CONTEXT_CONFLICT');
  assert.equal(routeC1R1(index,input('这个 beta beta 怎么办？','',['alpha']),options).reason,
    'RECENT_CONTEXT_CONFLICT');
  assert.equal(routeC1R1(index,input('这个该怎么继续？','beta'),options).state,'DEFER');
});

test('C1-R1 emits two Topics only for two separately supported explicit goals',()=>{
  const result=routeC1R1(index,input('alpha，另外 beta'),options);
  assert.equal(result.state,'ASSIGNED');assert.deepEqual(result.topics,[ids[0],ids[1]]);
  assert.deepEqual(result.evidence_sources,['current-span-1','current-span-2']);
  assert.equal(routeC1R1(index,input('alpha，另外 unknown'),options).reason,
    'MULTI_EVIDENCE_INSUFFICIENT');
  assert.equal(routeC1R1(index,input('alpha，另外 alpha'),options).state,'DEFER');
  assert.equal(routeC1R1(index,input('alpha，另外 beta，再 gamma'),options).reason,
    'MULTI_MORE_THAN_TWO_GOALS');
  assert.deepEqual(routeC1R1(index,input('alpha and also beta'),options).topics,[ids[0],ids[1]]);
  assert.deepEqual(routeC1R1(index,input('alpha；同时 beta'),options).topics,[ids[0],ids[1]]);
  assert.deepEqual(routeC1R1(index,input('alpha “，另外 beta”'),options),
    routeA3(index,input('alpha “，另外 beta”'),options));
});

test('C1-R1 rejects bad inputs, Catalog mismatch, invalid thresholds and profile overflow',()=>{
  assert.equal(routeC1R1(index,input('alpha'),{...options,multi_min_score:NaN}).reason,'BAD_CONFIG');
  assert.equal(routeC1R1(index,{current:'alpha',title:null,recent:[]},options).reason,'BAD_INPUT');
  assert.equal(routeC1R1(index,input('alpha'),{...options,catalog_sha256:'c'.repeat(64)}).reason,
    'CATALOG_MISMATCH');
  assert.equal(routeC1R1(index,input('x'.repeat(8193)),options).reason,'PROFILE_OVERFLOW');
  assert.equal(routeC1R1(index,input('alpha','',Array(33).fill('x')),options).reason,'PROFILE_OVERFLOW');
  assert.equal(routeC1R1({...index,topic_ids:ids.slice(1)},input('alpha'),options).reason,
    'INVALID_INDEX');
});
