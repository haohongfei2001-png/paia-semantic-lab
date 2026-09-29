import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileA2, routeA2 } from './a2.mjs';
import { buildA2 } from './a2_compile.mjs';

const ids=Array.from({length:144},(_,i)=>'T'+String(i).padStart(3,'0'));
const docs=Object.fromEntries(ids.map((id,i)=>[id,'token'+i+' common']));
const digest='a'.repeat(64);
const input=current=>({current,title:'',recent:[]});

test('A2 deterministic full144 class-vs-complement statistics and safe abstention', () => {
  const source={topic_ids:ids,documents:docs,catalog_sha256:digest,train_sha256:digest,mode:'word'};
  const index=compileA2(source);
  assert.equal(index.topic_ids.length,144);
  assert.equal(JSON.stringify(index),JSON.stringify(compileA2(source)));
  assert.deepEqual(routeA2(index,input('token17'),{catalog_sha256:digest}).topics,[ids[17]]);
  assert.equal(routeA2(index,input('unknown'),{catalog_sha256:digest}).reason,'OOV');
  assert.equal(routeA2(index,input('token17'),{catalog_sha256:'b'.repeat(64)}).reason,'CATALOG_MISMATCH');
  assert.equal(routeA2(index,{current:'token17'},{catalog_sha256:digest}).reason,'BAD_INPUT');
  assert.equal(routeA2(index,input('token17'),{catalog_sha256:digest,alpha:0}).reason,'BAD_CONFIG');
  assert.equal(routeA2({...index,topic_ids:ids.slice(1)},input('token17'),{catalog_sha256:digest}).reason,'INVALID_INDEX');
  assert.throws(()=>compileA2({...source,topic_ids:ids.slice(1)}));
});

test('fixed TRAIN-only A2 build is deterministic and under unchanged static caps', async () => {
  const dir=await mkdtemp(join(tmpdir(),'zmr-a2-'));
  try {
    const output=join(dir,'index.json');
    const first=await buildA2({mode:'char',output});
    const bytes=await readFile(output);
    const second=await buildA2({mode:'char',output});
    assert.equal(first.index_sha256,second.index_sha256);
    assert.equal(first.index_bytes,bytes.length);
    assert.equal(first.train_rows,144);
    assert(first.index_bytes<=1048576 && first.runtime_plus_index_bytes<=2097152);
    assert.equal(first.classification,'DEV_ONLY_NOT_RESOURCE_QUALIFIED');
  } finally { await rm(dir,{recursive:true,force:true}); }
});
