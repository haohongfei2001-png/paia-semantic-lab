import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildA2} from './a2_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA6R1} from './a6_complement_r1.mjs';
import {explicitRecordOnly,routeA6R2} from './a6_complement_r2.mjs';

test('record-only scope preserves an explicit later request',()=>{
  assert.equal(explicitRecordOnly('会议纪要提到了订阅定价，但现在只需留存消息。'),true);
  assert.equal(explicitRecordOnly('This is for reference only; no follow-up action.'),true);
  assert.equal(explicitRecordOnly('This is for reference only. Please plan the next release.'),false);
  assert.equal(explicitRecordOnly('请设计下一版产品路线。'),false);
});

test('R2 uses full144 TRAIN closure and separate A2-positive goal spans',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-a6-r2-'));
  try{
    const a3Build=await buildA3({mode:'char',output:join(dir,'a3.json')});
    const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
    const a3=JSON.parse(await readFile(a3Build.output));
    const a2=JSON.parse(await readFile(a2Build.output));
    const catalog_sha256=a3.catalog_sha256;
    assert.equal(a3.topic_ids.length,144);assert.deepEqual(a3.topic_ids,a2.topic_ids);
    assert.equal(a3.train_sha256,a2.train_sha256);
    assert(a3Build.index_bytes+a2Build.index_bytes<=1048576);
    const source=await Promise.all(['a1.mjs','a2.mjs','a3.mjs',
      'a6_complement_scope.mjs','a6_complement_r1.mjs','a6_complement_r2.mjs']
      .map(n=>readFile(new URL(n,import.meta.url))));
    assert(a3Build.index_bytes+a2Build.index_bytes+
      source.reduce((sum,b)=>sum+b.length,0)<=2097152);
    const dev=JSON.parse(await readFile(new URL('../../data/zero_model_refoundation/development/provisional_a6_r1_repair_dev_v0.1.json',import.meta.url)));
    const control=dev.rows.find(x=>x.id==='a6-r1-repair-17');
    const multi=dev.rows.find(x=>x.id==='a6-r1-repair-31');
    const x=r=>({current:r.current,title:r.title,recent:r.recent});
    assert.equal(routeA6R1(a3,a2,x(control),{catalog_sha256}).state,'ASSIGNED');
    assert.equal(routeA6R2(a3,a2,x(control),{catalog_sha256}).reason,
      'A6_R2_RECORD_ONLY_NO_REQUEST');
    assert.equal(routeA6R1(a3,a2,x(multi),{catalog_sha256}).state,'DEFER');
    const result=routeA6R2(a3,a2,x(multi),{catalog_sha256});
    assert.equal(result.state,'ASSIGNED');
    assert.deepEqual(result.topics,multi.provisional_gold_topics);
    assert.deepEqual(result,routeA6R2(a3,a2,x(multi),{catalog_sha256}));
    assert.equal(routeA6R2(a3,a2,x(multi),{catalog_sha256:'b'.repeat(64)}).reason,
      'INDEX_CLOSURE_MISMATCH');
  }finally{await rm(dir,{recursive:true,force:true});}
});
