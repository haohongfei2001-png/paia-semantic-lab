import test from 'node:test';
import assert from 'node:assert/strict';
import {features} from './a1.mjs';
import {compileA1Balanced} from './a1_balanced_compile.mjs';
import {compileA1BalancedR1} from './a1_balanced_r1_compile.mjs';
import {routeA1BalancedR1} from './a1_balanced_r1.mjs';
const digest='a'.repeat(64);
const topics=Array.from({length:144},(_,i)=>({id:`t${i}`,name_zh:`对象${i}`,name_en:`object${i}`,aliases_zh:['未出现的幽灵串'],aliases_en:['zzzzghostphrase']}));
const documents=Object.fromEntries(topics.map((t,i)=>[t.id,`${t.name_zh} ${t.name_en} `+Array.from({length:20},(_,j)=>`sample${i}value${j}context`).join(' ')]));
const args={topics,documents,catalog_sha256:digest,train_sha256:digest};
test('only observed features enter postings; no non-finite IDF or missing-feature reservation',()=>{
 const seen=new Set(Object.values(documents).flatMap(d=>[...features(d,'char').keys()]));
 for(const index of [compileA1Balanced(args),compileA1BalancedR1(args)]){
  assert(index.postings.every(p=>seen.has(p[0])&&Number.isFinite(p[1])&&p[2].length>0&&p[2].every(h=>h.every(Number.isFinite))));
  assert(!index.postings.some(p=>p[0]==='c3:zzz'));
 }
});
test('R1 retains the fixed frequency backbone before adding bilingual terms and rejects bad selector identity',()=>{
 const counts=Object.values(documents).map(d=>features(d,'char')),df=new Map();
 for(const c of counts)for(const f of c.keys())df.set(f,(df.get(f)??0)+1);
 const core=[...df].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0)).slice(0,4000).map(p=>p[0]);
 const index=compileA1BalancedR1(args),terms=new Set(index.postings.map(p=>p[0]));
 assert(core.every(f=>terms.has(f)));assert(index.postings.length<=6000);
 assert.deepEqual(index,compileA1BalancedR1(args));
 assert.equal(routeA1BalancedR1({...index,selector:{...index.selector,frequency_backbone:3000}},{current:'object79',title:'',recent:[]},{catalog_sha256:digest}).state,'DEFER');
});
