import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileA3, routeA3 } from './a3.mjs';
import { buildA3 } from './a3_compile.mjs';

const digest='a'.repeat(64);
const ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);

test('A3 hinge objective is deterministic, full144 and rejects unsafe inputs',()=>{
  const documents=Object.fromEntries(ids.map((id,i)=>[id,`unique${i} common` ]));
  const args={topic_ids:ids,documents,catalog_sha256:digest,train_sha256:digest,
    mode:'word',max_features:400,keep_per_topic:8,epochs:3};
  const a=compileA3(args),b=compileA3(args);
  assert.deepEqual(a,b);
  assert.equal(a.topic_ids.length,144);
  assert.equal(a.objective,'MULTICLASS_HINGE');
  assert.equal(a.quantization,'GLOBAL_INT16');
  const input={current:'unique79',title:'',recent:[]};
  assert.deepEqual(routeA3(a,input,{catalog_sha256:digest,min_score:0,min_margin:0}).topics,[ids[79]]);
  assert.equal(routeA3(a,input,{catalog_sha256:'b'.repeat(64)}).reason,'CATALOG_MISMATCH');
  assert.equal(routeA3(a,{current:'no-match',title:'',recent:[]},{catalog_sha256:digest}).reason,'OOV');
  assert.equal(routeA3(a,{current:'unique79',title:null,recent:[]},{catalog_sha256:digest}).reason,'BAD_INPUT');
  assert.throws(()=>compileA3({...args,topic_ids:ids.slice(1)}),/full144/);
});

test('A3 fixed TRAIN-only builds are deterministic and inside static byte caps',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-a3-test-'));
  try {
    for(const mode of ['char','word']) {
      const first=await buildA3({mode,output:join(dir,mode+'-1.json')});
      const second=await buildA3({mode,output:join(dir,mode+'-2.json')});
      assert.equal(first.index_sha256,second.index_sha256);
      assert.equal(first.topic_count,144);
      assert.equal(first.train_rows,144);
      assert.ok(first.index_bytes<=1048576);
      assert.ok(first.runtime_plus_index_bytes<=2097152);
      assert.equal(JSON.parse(await readFile(first.output,'utf8')).topic_ids.length,144);
    }
  } finally { await rm(dir,{recursive:true,force:true}); }
});
