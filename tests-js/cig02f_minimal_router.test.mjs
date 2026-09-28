import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMinimalTopicRouter} from '../runtime/compositional_intent_graph_v1/minimal_topic_router.mjs';

const freeze=JSON.parse(fs.readFileSync('artifacts/compositional-intent-graph-v1/CIG-02_SOURCE_READINESS_FREEZE.json','utf8'));
const index={format:'cig02e-typed-frame-index-v1',topic_count:144,topics:freeze.topics.map((t,i)=>({
  topic_id:t.topic_id,source_frame_path:'synthetic/frame/'+i,
  names:{zh:'测试话题'+String(i).padStart(3,'0'),en:'synthetic topic '+String(i).padStart(3,'0')},
  roles:{ACTION:{zh:['测试动作'+i],en:['do action '+i]},OBJECT:{zh:['测试对象'+i],en:['object '+i]},OUTCOME:{zh:['测试结果'+i],en:['get result '+i]}}
}))};
const sparse=freeze.topics.find(t=>t.readiness==='SPARSE');
const deferred=freeze.topics.find(t=>t.readiness==='DEFER');
const sparseName=index.topics.find(t=>t.topic_id===sparse.topic_id).names.en;
const deferName=index.topics.find(t=>t.topic_id===deferred.topic_id).names.en;
const router=createMinimalTopicRouter(index,freeze);
test('SPARSE needs a current unique formal name; typed-only phrase remains DEFER',()=>{
  const assigned=router.classify({current:'Please help me with '+sparseName});
  assert.equal(assigned.state,'ASSIGNED');
  assert.deepEqual(assigned.topics,[sparse.topic_id]);
  assert.equal(assigned.source_readiness,'SPARSE');
  assert.equal(assigned.evidence.rule,'EXACT_FORMAL_NAME');
  const i=index.topics.findIndex(t=>t.topic_id===sparse.topic_id);
  assert.equal(router.classify({current:'Please do action '+i+' with object '+i}).state,'DEFER');
});
test('DEFER mask blocks even exact formal name; context never supplies a goal',()=>{
  assert.deepEqual(router.classify({current:'Please help me with '+deferName}),{topics:[],state:'DEFER',reason:'SOURCE_READINESS_DEFER'});
  const current='Please help me with '+sparseName;
  assert.deepEqual(router.classify({current,context:'Another topic was discussed.'}),router.classify({current}));
  assert.deepEqual(router.classify({current:'Thanks',context:current}).topics,[]);
});
test('competing names and repeated calls remain safe',()=>{
  assert.equal(router.classify({current:'I want to compare '+sparseName+' and '+deferName}).state,'DEFER');
  const input={current:'Please help me with '+sparseName};
  assert.deepEqual(router.classify(input),router.classify(input));
});
test('malformed, drifted, or unsupported readiness masks fail closed',()=>{
  const dup=structuredClone(freeze);dup.topics[1].topic_id=dup.topics[0].topic_id;
  assert.throws(()=>createMinimalTopicRouter(index,dup),/mask/);
  const promoted=structuredClone(freeze);const row=promoted.topics.find(t=>t.readiness==='SPARSE');row.readiness='READY';
  assert.throws(()=>createMinimalTopicRouter(index,promoted),/READY evidence/);
  const uncounted=structuredClone(freeze);uncounted.counts.DEFER=108;
  assert.throws(()=>createMinimalTopicRouter(index,uncounted),/counts/);
  assert.throws(()=>createMinimalTopicRouter({...index,topic_count:143},freeze),/index/);
});

test('current-scope controls cannot establish assignment through formal-name mentions',()=>{
  const controls=[
    ['Please do not help me with '+sparseName,'NEGATED_CURRENT_SCOPE'],
    ["Please don't help me with "+sparseName,'NEGATED_CURRENT_SCOPE'],
    ['我不想处理'+index.topics.find(t=>t.topic_id===sparse.topic_id).names.zh,'NEGATED_CURRENT_SCOPE'],
    ['Please read the quote "'+sparseName+'" aloud.','QUOTED_CURRENT_SCOPE'],
    ['请朗读「'+sparseName+'」','QUOTED_CURRENT_SCOPE'],
    ['My friend says they want to explore '+sparseName+'.','REPORTED_CURRENT_SCOPE'],
    ['If I want to explore '+sparseName+', what would happen?','CONDITIONAL_CURRENT_SCOPE'],
    ['Please explain whether I should want to explore '+sparseName+'.','CONDITIONAL_CURRENT_SCOPE'],
    ['Please read this note. I want to explore '+sparseName+'.','MULTI_SENTENCE_CURRENT_SCOPE'],
    ['A plan to explore '+sparseName+' was mentioned.','UNSUPPORTED_CURRENT_GOAL_SCOPE']
  ];
  for(const [current,reason] of controls){
    const result=router.classify({current});
    assert.deepEqual(result,{topics:[],state:'DEFER',reason},current);
    assert.deepEqual(router.classify({current,context:'Please help me with '+sparseName}),result);
    assert.deepEqual(router.classify({current}),result);
  }
});
test('direct goals and supported means-to-goal requests still route',()=>{
  for(const current of [
    'Please help me with '+sparseName,
    'I want to explore '+sparseName+'.',
    'Use a timer to improve '+sparseName+'.',
    'Using a timer, I plan to explore '+sparseName+'.',
    '请帮我处理'+index.topics.find(t=>t.topic_id===sparse.topic_id).names.zh
  ]) assert.deepEqual(router.classify({current}).topics,[sparse.topic_id],current);
  // NFKC input normalization is performed before the safety guard.
  assert.equal(router.classify({current:'Ｐｌｅａｓｅ ｄｏ ｎｏｔ ｈｅｌｐ ｍｅ ｗｉｔｈ '+sparseName}).state,'DEFER');
  for(const current of [undefined,null,42,{toString:()=> 'Please help me with '+sparseName}])
    assert.deepEqual(router.classify({current}),{topics:[],state:'DEFER',reason:'INVALID_CURRENT_INPUT'});
});
