import test from 'node:test';
import assert from 'node:assert/strict';
import {createLosslessPostingView} from './lossless_posting_view.mjs';
import {unpackA1V04} from './a1_v04_compact.mjs';
const freeze = x => {if (x && typeof x === 'object') {Object.values(x).forEach(freeze); Object.freeze(x);} return x;};
function fixture(scale = 0.125) {
  return {schema:'ZMR-A1-V04-INT16-DEV-1', evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE', catalog_sha256:'0'.repeat(64), train_sha256:'1'.repeat(64), mode:'char', max_features:1500,
    topic_ids:Array.from({length:144}, (_,i) => 'SYNTHETIC_TOPIC_'+i), topic_lengths:Array(144).fill(10), average_length:10,
    tfidf_scale:scale, bm25_scale:scale*2,
    postings:[['aa', 1.2, [[0,0,1], [72,1,32767], [143,32767,0]]], ['ab',2.5,[[0,32767,32767], [143,2,3]]], ['ac',3.1,[[72,17,19]]]]};
}
test('finite synthetic full144 coefficients/idf/norms exactly match registered eager decoder without requantization', () => {
  for (const scale of [1e-9, 0.125, 2.002]) {
    const x = freeze(fixture(scale)), before = JSON.stringify(x), view = createLosslessPostingView(x), eager = unpackA1V04(x);
    for (const [term,idf,decoded] of eager.postings) {
      assert.deepEqual([...view.posting(term)],decoded); assert.deepEqual([...view.posting(term)],decoded); assert.equal(view.idf(term),idf);
    }
    eager.topic_norms.forEach((v,i) => assert.equal(view.topicNorm(i),v));
    assert.equal(view.topicCount,144); assert.equal(view.retainedNormBytes,1152); assert.equal(view.expandedPostingArraysRetained,0); assert(Object.isFrozen(view));
    assert.equal(JSON.stringify(x),before); assert.deepEqual([...view.posting('missing')],[]); assert.equal(view.idf('missing'),undefined);
  }
});
test('invalid identity/Topic mask/order/weights/scales or mutable input fail closed', () => {
  for (const mutate of [x=>x.schema='wrong', x=>x.topic_ids.pop(), x=>x.topic_ids[1]=x.topic_ids[0], x=>x.postings.reverse(), x=>x.postings[0][2].reverse(), x=>x.postings[0][2][0][0]=144, x=>x.postings[0][2][0][1]=32768, x=>x.postings[0][2][0][2]=-1, x=>x.postings[0][1]=NaN, x=>x.tfidf_scale=0, x=>x.bm25_scale=Infinity, x=>x.tfidf_scale=1e308]) {
    const x=fixture(); mutate(x); assert.throws(()=>createLosslessPostingView(freeze(x)));
  }
  assert.throws(()=>createLosslessPostingView(fixture()),/immutable/);
  const shallow=Object.freeze(fixture()); assert.throws(()=>createLosslessPostingView(shallow),/immutable/);
  let getters=0; const accessor=fixture(); Object.defineProperty(accessor,'average_length',{get:()=>{getters++; return 10;},enumerable:true});
  // Freeze data properties without invoking the getter: a frozen object can still carry dynamic accessors.
  for(const d of Object.values(Object.getOwnPropertyDescriptors(accessor)))if(Object.hasOwn(d,'value'))freeze(d.value);
  Object.freeze(accessor); assert.throws(()=>createLosslessPostingView(accessor),/accessors/); assert.equal(getters,0);
  const nested=fixture(); Object.defineProperty(nested.postings[0][2][0],'1',{get:()=>{getters++; return 0;},enumerable:true});
  const descriptorFreeze=x=>{if(x&&typeof x==='object'){for(const d of Object.values(Object.getOwnPropertyDescriptors(x)))if(Object.hasOwn(d,'value'))descriptorFreeze(d.value);Object.freeze(x);}};
  descriptorFreeze(nested); assert.throws(()=>createLosslessPostingView(nested),/accessors/); assert.equal(getters,0);
  const cycle=fixture();Object.values(cycle).forEach(freeze);cycle.extra=cycle;Object.freeze(cycle);assert.throws(()=>createLosslessPostingView(cycle),/immutable/);
});
test('view exposes no mutable retained coefficient/norm array and rejects invalid accessor arguments', () => {
  const x=freeze(fixture()), view=createLosslessPostingView(x), decoded=[...view.posting('aa')]; decoded[0][1]=999;
  assert.equal([...view.posting('aa')][0][1],0);
  assert.throws(()=>{x.postings[0][2][0][1]=9;});
  for (const i of [-1,144,1.5,'0',NaN]) assert.throws(()=>view.topicNorm(i),/Topic/);
  assert.throws(()=>[...view.posting(null)],/term/); assert.throws(()=>view.idf(null),/term/);
  assert.deepEqual(Object.keys(view).sort(),['expandedPostingArraysRetained','idf','posting','retainedNormBytes','termCount','topicCount','topicNorm'].sort());
});
