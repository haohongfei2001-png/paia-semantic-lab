import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildA3} from './a3_compile.mjs';
import {buildA4Pairs} from './a4_pair_compile.mjs';
import {routeA4PairPositive} from './a4_pair_positive.mjs';

const catalog_sha256='a'.repeat(64),train_sha256='b'.repeat(64);
const topic_ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);
const base={schema:'ZMR-A3-DEV-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256,train_sha256,mode:'char',topic_ids,quant_scale:.01,
  postings:[['c2:甲乙',[[0,100]]],['c2:辛壬',[[8,100]]]]
    .sort((a,b)=>a[0]<b[0]?-1:1)};
const rules=[1,3,5,8].map((rank,i)=>({rank,
  left_topic_id:topic_ids[i*2],right_topic_id:topic_ids[i*2+1],
  left_features:['c2:戊己','c3:戊己庚'].sort(),
  right_features:['c2:乙丙','c2:丙丁','c3:乙丙丁'].sort()}));
const pairs={schema:'ZMR-A4-PAIRWISE-DEV-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256,graph_sha256:'c'.repeat(64),
  pair_train_sha256:'d'.repeat(64),base_train_sha256:train_sha256,
  topic_ids,rules};
const input=current=>({current,title:'misleading title',recent:['old topic']});
const route=(current,opts={})=>routeA4PairPositive(base,pairs,input(current),
  {catalog_sha256,...opts});

test('exclusive positive pair evidence can correct only an assigned pair member',()=>{
  const changed=route('甲乙丙丁');
  assert.deepEqual(changed.topics,[topic_ids[1]]);
  assert.equal(changed.reason,'A4_POSITIVE_CONTRASTIVE_SWITCH');
  assert.equal(changed.right_support,3);
  assert.deepEqual(route('甲乙').topics,[topic_ids[0]]);
  assert.deepEqual(route('辛壬').topics,[topic_ids[8]]);
});

test('conflict, mismatched closure and invalid configuration fail closed',()=>{
  assert.equal(route('甲乙丙丁戊己').state,'DEFER');
  assert.equal(route('甲乙',{catalog_sha256:'e'.repeat(64)}).state,'DEFER');
  assert.equal(route('甲乙',{min_positive_support:0}).state,'DEFER');
  assert.equal(routeA4PairPositive(base,{...pairs,rules:[]},input('甲乙'),
    {catalog_sha256}).state,'DEFER');
});

test('fixed public TRAIN compiler feeds the full144 positive Router within static caps',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-a4-positive-test-'));
  try{
    const b=await buildA3({mode:'char',output:join(dir,'a3.json')});
    const p=await buildA4Pairs({output:join(dir,'pair.json')});
    const a3=JSON.parse(await readFile(join(dir,'a3.json')));
    const pair=JSON.parse(await readFile(join(dir,'pair.json')));
    assert.equal(b.topic_count,144);assert.equal(p.topic_count,144);
    assert(p.total_index_bytes<=1048576);
    const runtimeBytes=(await readFile(new URL('./a1.mjs',import.meta.url))).length+
      (await readFile(new URL('./a3.mjs',import.meta.url))).length+
      (await readFile(new URL('./a4_pair_positive.mjs',import.meta.url))).length;
    assert(p.total_index_bytes+runtimeBytes<=2097152);
    const result=routeA4PairPositive(a3,pair,input('整理一个项目风险清单'),
      {catalog_sha256:p.catalog_sha256});
    assert(['ASSIGNED','DEFER'].includes(result.state));
    assert(result.topics.every(x=>pair.topic_ids.includes(x)));
  }finally{await rm(dir,{recursive:true,force:true});}
});
