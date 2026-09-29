import test from 'node:test';
import assert from 'node:assert/strict';
import {compileA7,routeA7} from './a7_case_memory.mjs';

const catalog='a'.repeat(64),train='b'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`T${String(i).padStart(3,'0')}`);
const glyph=i=>String.fromCodePoint(0x4e00+i);
const cases=ids.flatMap((topic_id,i)=>[
  {topic_id,current:`请检查${glyph(i)}号凭据和登记日期`,
    source_id:`source-${i}-a`,scenario_family:`scenario-${i}-a`},
  {topic_id,current:`梳理${glyph(i)}号资料的保存顺序`,
    source_id:`source-${i}-b`,scenario_family:`scenario-${i}-b`}
]);
const options={catalog_sha256:catalog,min_score:.25,min_margin:.05,min_matched_features:2};

test('A7 full144 case memory is deterministic and bounded without a raw sentence field',()=>{
  const a=compileA7({topic_ids:ids,cases,catalog_sha256:catalog,train_sha256:train});
  const b=compileA7({topic_ids:ids,cases:[...cases].reverse(),
    catalog_sha256:catalog,train_sha256:train});
  assert.deepEqual(a,b);
  assert.equal(a.topic_ids.length,144);
  assert.equal(a.prototypes.length,288);
  assert.equal(a.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert(a.prototypes.every(p=>!Object.hasOwn(p,'current')));
  assert(new TextEncoder().encode(JSON.stringify(a)+'\n').length<=1048576);
});

test('A7 chooses an individual TRAIN scenario and keeps title/recent inert',()=>{
  const index=compileA7({topic_ids:ids,cases,catalog_sha256:catalog,train_sha256:train});
  for(const i of [0,47,143]) for(const offset of [0,1]){
    const current=cases[i*2+offset].current;
    const plain=routeA7(index,{current,title:'',recent:[]},options);
    assert.equal(plain.state,'ASSIGNED');assert.deepEqual(plain.topics,[ids[i]]);
    assert.equal(plain.evidence_source,'TRAIN_PROTOTYPE');
    assert.deepEqual(routeA7(index,{current,title:'unrelated',recent:['stale context']},options),plain);
  }
  assert.equal(routeA7(index,{current:'%%%%%%',title:'',recent:[]},options).state,'DEFER');
});

test('A7 fails closed on bad lineage, Catalog, input, index and configuration',()=>{
  const index=compileA7({topic_ids:ids,cases,catalog_sha256:catalog,train_sha256:train});
  assert.throws(()=>compileA7({topic_ids:ids,cases:cases.slice(1),
    catalog_sha256:catalog,train_sha256:train}),/invalid A7 training plan/u);
  assert.throws(()=>compileA7({topic_ids:ids,cases:[...cases.slice(0,-1),cases[0]],
    catalog_sha256:catalog,train_sha256:train}),/lineage/u);
  const input={current:cases[0].current,title:'',recent:[]};
  assert.equal(routeA7(index,input,{...options,catalog_sha256:'c'.repeat(64)}).reason,
    'CATALOG_MISMATCH');
  assert.equal(routeA7(index,{...input,recent:[42]},options).reason,'BAD_INPUT');
  assert.equal(routeA7(index,{...input,current:'x'.repeat(8193)},options).reason,
    'PROFILE_OVERFLOW');
  assert.equal(routeA7(index,input,{...options,min_score:NaN}).reason,'BAD_CONFIG');
  assert.equal(routeA7({...index,topic_ids:ids.slice(1)},input,options).reason,'INVALID_INDEX');
});
