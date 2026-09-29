import test from 'node:test';
import assert from 'node:assert/strict';
import {compileA3,routeA3} from './a3.mjs';
import {chartSplits,routeA5EvidenceChart} from './a5_evidence_chart.mjs';

const digest='a'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);
const documents=Object.fromEntries(ids.map((id,i)=>[id,`unique${i} common`]));
const index=compileA3({topic_ids:ids,documents,catalog_sha256:digest,
  train_sha256:digest,mode:'word',max_features:400,keep_per_topic:8,epochs:3});
const input=(current,recent=[],title='')=>({current,title,recent});
const route=x=>routeA5EvidenceChart(index,x,{catalog_sha256:digest});

test('bounded evidence chart preserves full144, source separation and two distinct goals',()=>{
  assert.equal(index.topic_ids.length,144);
  assert(chartSplits('Make two separate lists: unique3 and unique79').length>0);
  const multi=route(input('Make two separate lists: unique3 and unique79'));
  assert.equal(multi.reason,'A5_CHART_TWO_INDEPENDENT_GOAL_SPANS');
  assert.deepEqual(multi.topics,[ids[3],ids[79]]);
  assert.deepEqual(multi.evidence_sources,
    ['current-goal-span-1','current-goal-span-2']);
  const background=route(input('unique3 is only background. Please plan unique79'));
  assert.equal(background.reason,'A5_CHART_CURRENT_GOAL_AFTER_BACKGROUND');
  assert.deepEqual(background.topics,[ids[79]]);
  const context=route(input('Continue that plan with the next step.',['unique79']));
  assert.equal(context.reason,'A5_CHART_EXPLICIT_CONTINUATION');
  assert.deepEqual(context.topics,[ids[79]]);
  const self=input('unique79',['unique3'],'unique3');
  assert.deepEqual(route(self).topics,
    routeA3(index,self,{catalog_sha256:digest,min_score:.02,min_margin:.02}).topics);
});

test('chart fails closed on bad input/config, no-request and unsupported second goal',()=>{
  assert.equal(route(input('unique3 and a separate unrecognized goal')).state,'DEFER');
  assert.equal(route(input('unique79 is only a record; no new request')).state,'DEFER');
  assert.equal(routeA5EvidenceChart(index,input('unique79'),
    {catalog_sha256:'b'.repeat(64)}).state,'DEFER');
  assert.equal(route(input('unique79',[4])).reason,'A5_CHART_BAD_INPUT_OR_PROFILE_OVERFLOW');
  assert.equal(routeA5EvidenceChart(index,input('unique79'),
    {catalog_sha256:digest,slot_min_score:-1}).reason,'A5_CHART_BAD_CONFIG');
  const first=route(input('Make two separate lists: unique3 and unique79'));
  assert.deepEqual(first,route(input('Make two separate lists: unique3 and unique79')));
});
