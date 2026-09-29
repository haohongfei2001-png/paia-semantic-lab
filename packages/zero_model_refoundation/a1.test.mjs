import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileA1, features, routeA1, routeA0Defer, routeA0NameOnly } from './a1.mjs';
import { parsePinnedCatalog, parseProvisionalTrain, buildA1 } from './a1_compile.mjs';

const ids=Array.from({length:144},(_,i)=>'T'+String(i).padStart(3,'0'));
const digest='a'.repeat(64);
const docs=Object.fromEntries(ids.map((id,i)=>[id,'token'+i+' common']));
const input=current=>({current,title:'',recent:[]});

test('full144 sparse index is deterministic and cannot shrink its universe', () => {
  const index=compileA1({topic_ids:ids,documents:docs,catalog_sha256:digest,train_sha256:digest,mode:'word'});
  const again=compileA1({topic_ids:ids,documents:docs,catalog_sha256:digest,train_sha256:digest,mode:'word'});
  assert.equal(JSON.stringify(index),JSON.stringify(again));
  assert.equal(index.topic_ids.length,144);
  assert(index.postings.length>144);
  assert.throws(()=>compileA1({topic_ids:ids.slice(1),documents:docs,catalog_sha256:digest,train_sha256:digest}));
  assert.throws(()=>compileA1({topic_ids:ids,documents:{[ids[0]]:'x'},catalog_sha256:digest,train_sha256:digest}));
});

test('A1 returns stable opaque Topic with supported current evidence and safe failures', () => {
  const index=compileA1({topic_ids:ids,documents:docs,catalog_sha256:digest,train_sha256:digest,mode:'word'});
  const config={catalog_sha256:digest,min_score:0,min_margin:.01};
  assert.deepEqual(routeA1(index,input('token17'),config).topics,[ids[17]]);
  assert.deepEqual(routeA1(index,input('token17'),config),routeA1(index,input('token17'),config));
  assert.equal(routeA1(index,input('unseenword'),config).state,'DEFER');
  assert.equal(routeA1(index,input('token17'),{...config,catalog_sha256:'b'.repeat(64)}).reason,'CATALOG_MISMATCH');
  assert.equal(routeA1(index,{current:'token17'},config).reason,'BAD_INPUT');
  assert.equal(routeA1({...index,topic_ids:ids.slice(1)},input('token17'),config).reason,'INVALID_INDEX');
});

test('char/word features and A0 controls have no model dependency', () => {
  assert(features('甲乙丙','char').has('c2:甲乙'));
  assert(features('One two','word').has('w2:one\u001ftwo'));
  assert.equal(routeA0Defer().state,'DEFER');
  const names=ids.map((id,i)=>({id,aliases:['name'+String(i).padStart(3,'0')]}));
  assert.deepEqual(routeA0NameOnly(names,input('name017')).topics,[ids[17]]);
  assert.equal(routeA0NameOnly(names,input('nothing')).state,'DEFER');
  names[0].aliases=['name'];
  assert.equal(routeA0NameOnly(names,input('name017')).state,'DEFER');
});

test('pinned Catalog parser and provisional TRAIN reject non-TRAIN input', async () => {
  const catalog=await readFile(fileURLToPath(new URL('../../catalog/system_topic_catalog_v0.2.yaml',import.meta.url)));
  const topics=parsePinnedCatalog(catalog);
  assert.equal(topics.length,144);
  assert.equal(topics[0].id,'sys.personal_direction.life_goals');
  const train=await readFile(fileURLToPath(new URL('../../data/zero_model_refoundation/development/provisional_train_v0.1.json',import.meta.url)));
  const sha='29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18';
  assert.equal(parseProvisionalTrain(train,sha,topics.map(t=>t.id)).length,18);
  const bad=JSON.parse(train.toString()); bad.rows[0].split='AS';
  assert.throws(()=>parseProvisionalTrain(Buffer.from(JSON.stringify(bad)),sha,topics.map(t=>t.id)));
});

test('offline fixed-path build stays under static byte caps and rebuilds identically', async () => {
  const dir=await mkdtemp(join(tmpdir(),'zmr-a1-'));
  try {
    const output=join(dir,'index.json');
    const first=await buildA1({mode:'char',output});
    const bytes=await readFile(output);
    const second=await buildA1({mode:'char',output});
    assert.equal(first.index_sha256,second.index_sha256);
    assert.equal(first.index_bytes,bytes.length);
    assert(first.index_bytes<=1048576 && first.runtime_plus_index_bytes<=2097152);
    assert.equal(first.train_rows,18);
    assert.equal(first.classification,'DEV_ONLY_NOT_RESOURCE_QUALIFIED');
  } finally { await rm(dir,{recursive:true,force:true}); }
});
