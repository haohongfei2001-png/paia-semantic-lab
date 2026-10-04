import test from 'node:test';
import assert from 'node:assert/strict';
import {createLosslessPostingView} from './lossless_posting_view.mjs';
import {unpackA1V04} from './a1_v04_compact.mjs';
import {accumulateSyntheticWeights} from './streaming_numeric_accumulator.mjs';
const freeze = x => {if (x && typeof x === 'object') {Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const term = n => 'SYNTHETIC_TERM_'+String(n).padStart(4,'0');
function fixture(terms, dense, scale) {
  return freeze({schema:'ZMR-A1-V04-INT16-DEV-1', evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE', catalog_sha256:'0'.repeat(64),train_sha256:'1'.repeat(64),mode:'char',max_features:1500,
    topic_ids:Array.from({length:144},(_,i)=>'SYNTHETIC_OFFSET_'+i),topic_lengths:Array(144).fill(10),average_length:10,tfidf_scale:scale,bm25_scale:scale*2,
    postings:Array.from({length:terms},(_,n)=>[term(n),1+n/10,(dense?Array.from({length:144},(_,i)=>i):[0,72,143]).map(i=>[i,(n*97+i*31)%32768,(n*131+i*29+1)%32768])])});
}
// Registered eager decoder supplies coefficients/norms. This is only the numeric
// loop before routeA1 ranking; precomputed manual weights replace all text/features.
function eagerOracle(encoded, weights, method) {
  const eager=unpackA1V04(encoded), table=new Map(eager.postings.map(([t,idf,hits])=>[t,{idf,hits}])),values=Array(144).fill(0);
  let squaredQueryNorm=0,matchedTerms=0;
  for(const [t,w] of weights){const row=table.get(t);if(!row)continue;matchedTerms++;squaredQueryNorm+=w*w;for(const [i,a,b] of row.hits)values[i]+=method==='tfidf'?w*a:b;}
  if(method==='tfidf')values.forEach((value,i)=>{values[i]=eager.topic_norms[i]&&squaredQueryNorm?value/(eager.topic_norms[i]*Math.sqrt(squaredQueryNorm)):0;});
  return {values,squaredQueryNorm,matchedTerms};
}
test('90 finite synthetic manual-weight cases preserve eager arithmetic and every144 numeric slot',()=>{
  let cases=0;
  for(const [count,dense] of [[3,false],[128,false],[128,true]])for(const scale of [1e-9,.125,2.002]){
    const x=fixture(count,dense,scale),view=createLosslessPostingView(x),before=JSON.stringify(x);
    const queries=[[],[['MISSING',2]],[[term(0),1.2]],[[term(2),2.7],['MISSING',1e100],[term(0),.5]],Array.from({length:count},(_,i)=>[term(count-i-1),1+(i%7)/10])];
    for(const weights of queries)for(const method of ['tfidf','bm25']){
      freeze(weights);const weightBefore=JSON.stringify(weights),actual=accumulateSyntheticWeights(view,weights,method),expected=eagerOracle(x,weights,method);
      assert.deepEqual(Array.from(actual.values),expected.values);assert.equal(actual.squaredQueryNorm,expected.squaredQueryNorm);assert.equal(actual.matchedTerms,expected.matchedTerms);
      assert.equal(actual.topicCount,144);assert.equal(actual.values.length,144);assert.equal(actual.accumulatorComponentBytes,1152);assert.equal(actual.expandedPostingArraysRetained,0);
      assert.equal(actual.capabilityVerdict,'UNTESTED');assert.equal(actual.resourceVerdict,'NOT_QUALIFIED');assert.equal(JSON.stringify(weights),weightBefore);assert.equal(JSON.stringify(x),before);cases++;
    }
  }
  assert.equal(cases,90);
});
test('bm25 ignores manual weight magnitude; unmatched terms do not enter matched-query norm',()=>{
  const view=createLosslessPostingView(fixture(3,false,.125)),a=accumulateSyntheticWeights(view,[[term(1),.5]],'bm25'),b=accumulateSyntheticWeights(view,[[term(1),17],['MISSING',1e100]],'bm25');
  assert.deepEqual(a.values,b.values);assert.equal(b.squaredQueryNorm,289);assert.equal(b.matchedTerms,1);
  const empty=accumulateSyntheticWeights(view,[]);assert.deepEqual(Array.from(empty.values),Array(144).fill(0));assert.equal(empty.matchedTerms,0);
});
test('finite bounds, duplicate inputs, numeric overflow/underflow and malformed view fail closed',()=>{
  const view=createLosslessPostingView(fixture(3,false,.125));
  for(const w of [null,{},[[term(0)]],[[term(0),0]],[[term(0),-1]],[[term(0),NaN]],[[term(0),Infinity]],[[null,1]],[[term(0),1],[term(0),2]],Array.from({length:1501},(_,i)=>[term(i),1]),[[term(0),1e308]],[[term(0),1e-308]]])assert.throws(()=>accumulateSyntheticWeights(view,w));
  assert.throws(()=>accumulateSyntheticWeights(view,[],'other'));assert.throws(()=>accumulateSyntheticWeights({...view,topicCount:143},[]));
  assert.throws(()=>accumulateSyntheticWeights({...view,topicNorm:()=>Infinity},[[term(0),1]]));
  for(const hit of [[144,1,1],[0,Infinity,1],[0,-1,1],[0,1,NaN]])assert.throws(()=>accumulateSyntheticWeights({...view,posting:function*(){yield hit;}},[[term(0),1]]));
});
test('caller-owned values are fresh on every use and cannot poison a retained cache or expose routing output',()=>{
  const x=fixture(3,false,.125),view=createLosslessPostingView(x),w=freeze([[term(1),1]]),before=JSON.stringify(x),a=accumulateSyntheticWeights(view,w),b=accumulateSyntheticWeights(view,w);
  assert.notEqual(a.values,b.values);a.values.fill(99);assert.deepEqual(Array.from(b.values),eagerOracle(x,w,'tfidf').values);assert.deepEqual(Array.from(accumulateSyntheticWeights(view,w).values),Array.from(b.values));
  assert(Object.isFrozen(a));assert.equal(JSON.stringify(x),before);assert(!('topics' in a));assert(!('state' in a));assert(!('rank' in a));assert(!('threshold' in a));
});
