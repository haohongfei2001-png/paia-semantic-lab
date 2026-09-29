import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePinnedCatalog } from './a1_compile.mjs';
import { fingerprintBundle } from './fingerprints.mjs';

const read=relative=>readFile(fileURLToPath(new URL('../../'+relative,import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fingerprint=row=>fingerprintBundle({current:row.current,title:row.title??'',recent:row.recent??[]});

test('public safety seed is incomplete, unreviewed and separate from prior development bundles',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const ids=new Set(parsePinnedCatalog(catalog).map(t=>t.id));
  const safety=JSON.parse((await read('data/zero_model_refoundation/development/provisional_safety_seed_v0.1.json')).toString('utf8'));
  assert.equal(safety.schema,'ZMR-PROVISIONAL-SAFETY-SEED-1');
  assert.equal(safety.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(safety.qualification_credit_rows,0);
  assert.equal(safety.evaluation_status,'UNRUN');
  assert.equal(safety.catalog_sha256,sha(catalog));
  assert.equal(safety.rows.length,36);
  const layers={CONTROL:12,CONTEXT_REQUIRED:6,CONTEXT_INVARIANCE:6,MULTI_INTENT:12};
  assert.deepEqual(Object.fromEntries(Object.keys(layers).map(k=>[k,safety.rows.filter(r=>r.layer===k).length])),layers);
  const priorNames=['provisional_train_v0.2.json','provisional_tune_v0.1.json',
    'provisional_cal_v0.1.json','provisional_challenge_v0.1.json','provisional_challenge_v0.2.json'];
  const prior=(await Promise.all(priorNames.map(async name=>JSON.parse((await read('data/zero_model_refoundation/development/'+name)).toString('utf8'))))).flatMap(x=>x.rows);
  const previous=new Set(prior.map(r=>fingerprint(r).bundle_sha256));
  const seen=new Set(),scenarios=new Set(),bundles=new Set();
  for(const row of safety.rows) {
    assert.equal(row.split,'CHALLENGE_SAFETY_PROVISIONAL');
    assert.equal(row.generation_id,'G0_DEV');
    assert.equal(row.catalog_sha256,safety.catalog_sha256);
    assert.equal(row.gold_origin,'CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_family,'candidate-writer-G0');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_CHALLENGE');
    assert(['zh','en','mixed'].includes(row.language));
    assert(typeof row.current==='string'&&row.current&&typeof row.title==='string'&&
      Array.isArray(row.recent)&&row.recent.every(x=>typeof x==='string'));
    assert(!seen.has(row.id));seen.add(row.id);
    assert(!scenarios.has(row.scenario_family));scenarios.add(row.scenario_family);
    const fp=fingerprint(row).bundle_sha256;
    assert(!bundles.has(fp)&&!previous.has(fp));bundles.add(fp);
    assert(row.gold_topics.every(id=>ids.has(id)));
    if(row.layer==='CONTROL') {
      assert.equal(row.expected_state,'DEFER');assert.deepEqual(row.gold_topics,[]);
      assert.equal(row.variant,null);
    } else if(row.layer==='MULTI_INTENT') {
      assert.equal(row.expected_state,'ASSIGNED');assert.equal(row.gold_topics.length,2);
      assert.equal(new Set(row.gold_topics).size,2);assert.equal(row.variant,null);
    } else {
      assert.equal(row.expected_state,'ASSIGNED');assert.equal(row.gold_topics.length,1);
      assert.equal(row.variant.current,row.current);
      assert.equal(row.variant.title,'');assert.deepEqual(row.variant.recent,[]);
      assert.equal(row.variant.kind,row.layer==='CONTEXT_REQUIRED'?'REMOVE_REQUIRED_CONTEXT':'REMOVE_DISTRACTING_CONTEXT');
      assert.deepEqual(row.variant.gold_topics,row.layer==='CONTEXT_REQUIRED'?[]:row.gold_topics);
      assert.equal(row.variant.expected_state,row.layer==='CONTEXT_REQUIRED'?'DEFER':'ASSIGNED');
    }
  }
});
