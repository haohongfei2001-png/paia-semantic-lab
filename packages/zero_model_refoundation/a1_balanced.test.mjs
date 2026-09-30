import test from 'node:test';
import assert from 'node:assert/strict';
import {compileA1Balanced} from './a1_balanced_compile.mjs';
import {routeA1Balanced} from './a1_balanced.mjs';
const digest='a'.repeat(64);
const topics=Array.from({length:144},(_,i)=>({id:`t${i}`,name_zh:`独特对象${i}`,name_en:`uniqueobject${i}`,aliases_zh:[],aliases_en:[]}));
const documents=Object.fromEntries(topics.map(t=>[t.id,t.name_zh+' '+t.name_en]));
const args={topics,documents,catalog_sha256:digest,train_sha256:digest};
const index=compileA1Balanced(args);
const input=current=>({current,title:'',recent:[]});
test('fixed bilingual selection preserves all144 prototypes, postings statistics and deterministic builds',()=>{
 assert.deepEqual(index,compileA1Balanced(args));assert.equal(index.topic_ids.length,144);
 assert(index.postings.length<=6000);assert(index.topic_norms.every(n=>Number.isFinite(n)&&n>0));
 for(let i=0;i<144;i++){
  const sum=index.postings.reduce((n,p)=>n+(p[2].find(h=>h[0]===i)?.[1]??0)**2,0);
  assert(Math.abs(Math.sqrt(sum)-index.topic_norms[i])<1e-10);
 }
 assert.throws(()=>compileA1Balanced({...args,topics:topics.slice(1)}));
 assert.throws(()=>compileA1Balanced({...args,catalog_sha256:'invalid'}));
});
test('bounded routing rejects selector/catalog corruption and keeps unsupported context fail closed',()=>{
 const route=x=>routeA1Balanced(index,x,{catalog_sha256:digest});
 assert.equal(routeA1Balanced({...index,selector:null},input('uniqueobject79'),{catalog_sha256:digest}).state,'DEFER');
 assert.equal(routeA1Balanced(index,input('uniqueobject79'),{catalog_sha256:'b'.repeat(64)}).state,'DEFER');
 assert.equal(route(input('x'.repeat(8193))).state,'DEFER');
 assert.equal(route({current:'?',title:'uniqueobject79',recent:['uniqueobject79']}).state,'DEFER');
 assert.deepEqual(route(input('uniqueobject79')),route(input('uniqueobject79')));
});
