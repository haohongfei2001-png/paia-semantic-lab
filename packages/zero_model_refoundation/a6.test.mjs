import test from 'node:test';
import assert from 'node:assert/strict';
import {routeA6} from './a6.mjs';
import {routeA3} from './a3.mjs';

const digest='a'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`T${String(i).padStart(3,'0')}`);
const index={schema:'ZMR-A3-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256:digest,train_sha256:'b'.repeat(64),mode:'char',
  topic_ids:ids,quant_scale:1,
  postings:[['c3:alp',[[0,1000]]],['c3:bet',[[1,500]]]]};
const input=current=>({current,title:'unrelated title',recent:['unrelated earlier text']});

test('A6 preserves exact full-input fallback without a goal marker',()=>{
  const value=input('alpha');
  assert.deepEqual(routeA6(index,value,{catalog_sha256:digest}),
    routeA3(index,value,{catalog_sha256:digest}));
});

test('A6 defers a conflicting focused goal instead of silently replacing full input',()=>{
  const result=routeA6(index,input('plan alpha so that beta'),{catalog_sha256:digest});
  assert.deepEqual(result,{state:'DEFER',topics:[],reason:'A6_FULL_GOAL_CONFLICT'});
});

test('A6 can supplement only a valid focused goal under explicit stronger thresholds',()=>{
  const result=routeA6(index,input('plan alpha so that beta'),
    {catalog_sha256:digest,full_min_score:9999});
  assert.equal(result.state,'ASSIGNED');
  assert.deepEqual(result.topics,['T001']);
  assert.equal(result.reason,'A6_GOAL_WITH_FULL_INPUT_DEFER');
  assert.equal(result.full_input_reason,'LOW_OR_AMBIGUOUS_EVIDENCE');
});

test('A6 cannot use a bad index, mismatched Catalog, or invalid threshold to assign',()=>{
  assert.equal(routeA6(index,input('plan alpha so that beta'),
    {catalog_sha256:'c'.repeat(64)}).state,'DEFER');
  assert.equal(routeA6({...index,topic_ids:ids.slice(1)},input('plan alpha so that beta'),
    {catalog_sha256:digest}).state,'DEFER');
  assert.equal(routeA6(index,input('plan alpha so that beta'),
    {catalog_sha256:digest,goal_min_score:NaN}).reason,'BAD_CONFIG');
});

test('quoted or negated goal cues cannot trigger role-only augmentation',()=>{
  for(const current of ['alpha “so that beta”','not alpha so that beta']) {
    assert.deepEqual(routeA6(index,input(current),{catalog_sha256:digest}),
      routeA3(index,input(current),{catalog_sha256:digest}));
  }
});
