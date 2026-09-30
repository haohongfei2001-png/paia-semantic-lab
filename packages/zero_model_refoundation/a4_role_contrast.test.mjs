import test from 'node:test';
import assert from 'node:assert/strict';
import {compileA3,routeA3} from './a3.mjs';
import {projectA4Output,routeA4RoleContrast} from './a4_role_contrast.mjs';

const digest='a'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);
const documents=Object.fromEntries(ids.map((id,i)=>[id,`unique${i} common`]));
const index=compileA3({topic_ids:ids,documents,catalog_sha256:digest,
  train_sha256:digest,mode:'word',max_features:400,keep_per_topic:8,epochs:3});
const input=(current,title='',recent=[])=>({current,title,recent});
const route=x=>routeA4RoleContrast(index,x,{catalog_sha256:digest});

test('A4 projects output rather than source and retains full144 flat fallback',()=>{
  const text='Use unique3 as source material for unique79; unique79 is the output.';
  const projection=projectA4Output(text);
  assert.equal(projection.kind,'EN_SOURCE_TO_OUTPUT');
  assert(projection.source.text.includes('unique3'));
  assert(projection.goal.text.includes('unique79'));
  const out=route(input(text));
  assert.deepEqual(out.topics,[ids[79]]);
  assert(['A4_ROLE_CURRENT_OUTPUT_EVIDENCE','A4_ROLE_GOAL_AGREEMENT']
    .includes(out.reason));
  const chinese=projectA4Output('参考旧合同，帮我整理新合同的日期。');
  assert.equal(chinese.kind,'ZH_SOURCE_TO_OUTPUT');
  const ordinary=input('unique79','unique3',['unique3']);
  assert.deepEqual(route(ordinary).topics,
    routeA3(index,ordinary,{catalog_sha256:digest,
      min_score:.02,min_margin:.02}).topics);
});

test('A4 role scorer handles unresolved goals, controls and invalid closure safely',()=>{
  assert.equal(route(input('Use unique79 as source material for unrecognized')).state,
    'DEFER');
  assert.equal(route(input('unique79 is only a status record; no new work')).state,
    'DEFER');
  assert.equal(route(input('I have unique79 but have not chosen what to do next')).state,
    'DEFER');
  assert.equal(routeA4RoleContrast(index,input('unique79'),
    {catalog_sha256:'b'.repeat(64)}).state,'DEFER');
  assert.equal(route(input('unique79','',[4])).reason,
    'A4_ROLE_BAD_INPUT_OR_PROFILE_OVERFLOW');
  const first=route(input('Use unique3 as source material for unique79'));
  assert.deepEqual(first,route(input('Use unique3 as source material for unique79')));
});
