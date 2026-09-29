import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildA3} from './a3_compile.mjs';
import {buildA4Pairs} from './a4_pair_compile.mjs';
import {routeA3} from './a3.mjs';
import {routeA4Pairs} from './a4_pairwise.mjs';

test('A4 pair veto keeps full144 fallback, refuses conflict and fits static caps',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-a4-test-'));
  try{
    const a3=await buildA3({mode:'char',output:join(dir,'a3.json')});
    const a4=await buildA4Pairs({output:join(dir,'a4.json')});
    const base=JSON.parse(await readFile(join(dir,'a3.json')));
    const pair=JSON.parse(await readFile(join(dir,'a4.json')));
    assert.equal(a4.topic_count,144);assert.equal(a4.graph_pairs,4);
    assert.equal(a4.classification,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
    assert.equal(a4.resource_verdict,'NOT_QUALIFIED');
    assert(a4.total_index_bytes<=1048576);
    assert(a4.runtime_plus_total_index_bytes<=2097152);
    assert.equal(pair.topic_ids.length,144);
    assert.deepEqual(pair.rules.map(x=>x.rank),[1,3,5,8]);
    const old=JSON.parse(await readFile(new URL('../../data/zero_model_refoundation/development/provisional_train_v0.2.json',import.meta.url))).rows;
    const train=JSON.parse(await readFile(new URL('../../data/zero_model_refoundation/development/provisional_a4_train_v0.1.json',import.meta.url))).rows;
    const settings={catalog_sha256:a3.catalog_sha256};
    const sample=old[0],neutral={current:sample.current,title:'',recent:[]};
    assert.deepEqual(routeA4Pairs(base,pair,neutral,settings),routeA3(base,neutral,settings));
    for(const rule of pair.rules)for(const topic of [rule.left_topic_id,rule.right_topic_id]){
      const row=old.find(x=>x.topic_id===topic),input={current:row.current,title:'',recent:[]};
      assert.deepEqual(routeA4Pairs(base,pair,input,settings),routeA3(base,input,settings));
    }
    const rule=pair.rules[0],left=old.find(x=>x.topic_id===rule.left_topic_id),
      leftCase=train.find(x=>x.graph_rank===rule.rank&&x.role==='LEFT'),
      rightCase=train.find(x=>x.graph_rank===rule.rank&&x.role==='RIGHT');
    const negative={current:left.current+' '+rightCase.current,title:'',recent:[]};
    assert.equal(routeA3(base,negative,settings).state,'ASSIGNED');
    assert.equal(routeA4Pairs(base,pair,negative,settings).reason,'PAIR_NEGATIVE_EVIDENCE');
    const conflicting={current:left.current+' '+leftCase.current+' '+rightCase.current,
      title:'',recent:[]};
    assert.equal(routeA4Pairs(base,pair,conflicting,settings).reason,'PAIR_EVIDENCE_CONFLICT');
    assert.equal(routeA4Pairs(base,pair,neutral,{catalog_sha256:'f'.repeat(64)}).reason,
      'CATALOG_MISMATCH');
    assert.equal(routeA4Pairs({...base,train_sha256:'f'.repeat(64)},pair,neutral,settings).reason,
      'BASE_INDEX_MISMATCH');
    assert.equal(routeA4Pairs(base,{...pair,rules:[]},neutral,settings).reason,
      'INVALID_PAIR_INDEX');
  }finally{await rm(dir,{recursive:true,force:true});}
});
