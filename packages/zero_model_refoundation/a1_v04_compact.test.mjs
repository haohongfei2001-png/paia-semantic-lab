import test from 'node:test';
import assert from 'node:assert/strict';
import {compileA1,routeA1} from './a1.mjs';
import {packA1V04,unpackA1V04,routeA1V04} from './a1_v04_compact.mjs';
import {canonicalCompiledNumbers} from './compiled_numbers.mjs';
const ids=Array.from({length:144},(_,i)=>'toy-'+String(i).padStart(3,'0'));
const docs=Object.fromEntries(ids.map((id,i)=>[id,'common common marker'+String(i).padStart(3,'0')]));
const raw=()=>compileA1({topic_ids:ids,documents:docs,catalog_sha256:'a'.repeat(64),train_sha256:'b'.repeat(64),mode:'char',max_features:1500});
test('int16 coefficient error bounded by half step; synthetic routing and OOV remain safe',()=>{
 const original=raw(),packed=packA1V04(original),decoded=unpackA1V04(packed);
 assert.deepEqual(packA1V04(original),packed);assert.equal(decoded.postings.length,original.postings.length);
 original.postings.forEach(([,idf,hits],f)=>{assert.equal(decoded.postings[f][1],idf);hits.forEach(([,t,b],j)=>{
  assert(Math.abs(t-decoded.postings[f][2][j][1])<=packed.tfidf_scale/2+1e-12);
  assert(Math.abs(b-decoded.postings[f][2][j][2])<=packed.bm25_scale/2+1e-12);
 });});
 assert(decoded.topic_norms.every(Number.isFinite));
 const persisted=JSON.parse(JSON.stringify(canonicalCompiledNumbers(packed))),persistedDecoded=unpackA1V04(persisted);
 original.postings.forEach(([,idf,hits],f)=>{hits.forEach(([,t,b],j)=>{
  assert(Math.abs(t-persistedDecoded.postings[f][2][j][1])<=packed.tfidf_scale/2+Math.abs(t)*5e-12+1e-12);
  assert(Math.abs(b-persistedDecoded.postings[f][2][j][2])<=packed.bm25_scale/2+Math.abs(b)*5e-12+1e-12);
 });});
 const config={catalog_sha256:'a'.repeat(64),min_score:0,min_margin:0};
 const input={current:'marker073',title:'',recent:[]};
 assert.deepEqual(routeA1V04(packed,input,config).topics,routeA1(original,input,config).topics);
 assert.deepEqual(routeA1V04(persisted,input,config).topics,routeA1(original,input,config).topics);
 assert.equal(routeA1V04(packed,{current:'漢字無関係',title:'',recent:[]},config).state,'DEFER');
 assert.equal(routeA1V04(packed,input,{...config,catalog_sha256:'c'.repeat(64)}).reason,'CATALOG_MISMATCH');
});
test('compact runtime rejects corrupt and out-of-range indices',()=>{
 const packed=packA1V04(raw()),input={current:'marker073',title:'',recent:[]};
 for(const mutate of [x=>x.tfidf_scale=NaN,x=>x.bm25_scale=0,x=>x.postings[0][2][0][1]=32768,x=>x.postings[0][2][0][0]=144,x=>x.topic_ids.pop(),x=>x.postings[0][1]=null]){
  const bad=structuredClone(packed);mutate(bad);assert.throws(()=>unpackA1V04(bad));assert.equal(routeA1V04(bad,input,{}).reason,'INVALID_INDEX');
 }
});
