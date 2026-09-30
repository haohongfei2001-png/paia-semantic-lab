import test from 'node:test';
import assert from 'node:assert/strict';
import {compileA1} from './a1.mjs';
import {compileA3,routeA3} from './a3.mjs';
import {routeA4RoleContrastR1} from './a4_role_contrast_r1.mjs';
import {routeA4RoleContrastR2} from './a4_role_contrast_r2.mjs';
const digest='a'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);
const documents=Object.fromEntries(ids.map((id,i)=>[id,`unique${i} common`]));
const common={topic_ids:ids,documents,catalog_sha256:digest,train_sha256:digest,mode:'word',max_features:400};
const a1=compileA1(common),a3=compileA3({...common,keep_per_topic:8,epochs:3});
const input=current=>({current,title:'',recent:[]});
const route=x=>routeA4RoleContrastR2(a3,a1,x,{catalog_sha256:digest});
test('role repairs retain full144 fallback and current output projection',()=>{
  const ordinary=input('unique79');
  assert.deepEqual(route(ordinary).topics,routeA3(a3,ordinary,{catalog_sha256:digest,min_score:.02,min_margin:.02}).topics);
  assert.deepEqual(route(input('Use unique3 as source material for unique79')).topics,[ids[79]]);
  assert.equal(route(input('unique79; please do not reopen either task.')).state,'DEFER');
  assert.deepEqual(route(input('unique79; please do not reopen either task. Now help me with unique79.')).topics,[ids[79]]);
  assert.deepEqual(route(input('Use unique3 as source material for unique79')),route(input('Use unique3 as source material for unique79')));
});
test('dual-index closure rejects corruption, source mismatch and bounded profile overflow',()=>{
  for(const invalid of [null,{...a1,postings:null},{...a1,train_sha256:'b'.repeat(64)},
    {...a1,topic_ids:[...ids].reverse()}])
    assert.equal(routeA4RoleContrastR1(a3,invalid,input('unique79'),{catalog_sha256:digest}).state,'DEFER');
  assert.equal(routeA4RoleContrastR1(a3,a1,input('unique79'),{catalog_sha256:'b'.repeat(64)}).state,'DEFER');
  assert.equal(route(input('x'.repeat(8193))).state,'DEFER');
  assert.equal(route(input('unique79 is only a status record; no new work')).state,'DEFER');
});
