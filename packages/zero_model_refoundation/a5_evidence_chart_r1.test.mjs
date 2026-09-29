import test from 'node:test';
import assert from 'node:assert/strict';
import {compileA3} from './a3.mjs';
import {compileA2} from './a2.mjs';
import {routeA5ChartR1} from './a5_evidence_chart_r1.mjs';

const digest='a'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);
const documents=Object.fromEntries(ids.map((id,i)=>[id,`unique${i} common`]));
const args={topic_ids:ids,documents,catalog_sha256:digest,train_sha256:digest,
  mode:'word'};
const a3=compileA3({...args,max_features:400,keep_per_topic:8,epochs:3});
const a2=compileA2({...args,max_features:400});
const input=(current,recent=[])=>({current,title:'',recent});
const route=x=>routeA5ChartR1(a3,a2,x,{catalog_sha256:digest});

test('A5 chart R1 requires separate A2 corroboration for new current-span goals',()=>{
  const multi=route(input('Make two separate lists: unique3 and unique79'));
  assert(['A5_CHART_R1_CORROBORATED_GOALS',
    'A5_CHART_R1_UNCORROBORATED_GOAL'].includes(multi.reason));
  if(multi.state==='ASSIGNED')assert.deepEqual(multi.topics,[ids[3],ids[79]]);
  const unsupported=route(input('Make two separate lists: unique3 and unrecognized'));
  assert.equal(unsupported.state,'DEFER');
  const repeated=route(input('Make two separate lists: unique3 and unique79'));
  assert.deepEqual(multi,repeated);
  const self=route(input('unique79'));
  assert.deepEqual(self.topics,[ids[79]]);
  assert.equal(route(input('unique79 is only a record; no new request')).state,'DEFER');
});

test('A5 chart R1 fails closed on mismatched Catalog, TRAIN or Topic closure',()=>{
  const ordinary=input('unique79');
  assert.equal(routeA5ChartR1(a3,a2,ordinary,
    {catalog_sha256:'b'.repeat(64)}).reason,
  'A5_CHART_R1_INDEX_CLOSURE_MISMATCH');
  assert.equal(routeA5ChartR1(a3,{...a2,train_sha256:'b'.repeat(64)},ordinary,
    {catalog_sha256:digest}).reason,
  'A5_CHART_R1_INDEX_CLOSURE_MISMATCH');
  assert.equal(routeA5ChartR1(a3,{...a2,topic_ids:ids.slice(1)},ordinary,
    {catalog_sha256:digest}).reason,
  'A5_CHART_R1_INDEX_CLOSURE_MISMATCH');
});
