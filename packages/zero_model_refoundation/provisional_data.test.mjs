import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePinnedCatalog, parseProvisionalTrain } from './a1_compile.mjs';
import { fingerprintBundle } from './fingerprints.mjs';

const read=relative=>readFile(fileURLToPath(new URL('../../'+relative,import.meta.url)));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const fingerprint=row=>fingerprintBundle({current:row.current,title:row.title??'',recent:row.recent??[]});

test('public same-writer TUNE covers full144 without pretending to qualify or sharing exact TRAIN text',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const ids=parsePinnedCatalog(catalog).map(t=>t.id),catalogSha=sha256(catalog);
  const train=parseProvisionalTrain(await read('data/zero_model_refoundation/development/provisional_train_v0.2.json'),catalogSha,ids);
  const tune=JSON.parse((await read('data/zero_model_refoundation/development/provisional_tune_v0.1.json')).toString('utf8'));
  assert.equal(tune.schema,'ZMR-PROVISIONAL-DEV-TUNE-1');
  assert.equal(tune.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(tune.qualification_credit_rows,0);
  assert.equal(tune.catalog_sha256,catalogSha);
  assert.equal(tune.split,'DEV_TUNE_PROVISIONAL');
  assert.equal(tune.exposure,'PUBLIC_WRITER_VISIBLE_DEV');
  assert.equal(tune.rows.length,144);
  assert.deepEqual(new Set(tune.rows.map(r=>r.topic_id)),new Set(ids));
  const rowIds=new Set(),scenarios=new Set(),templates=new Set(),bundleHashes=new Set();
  const trainScenarios=new Set(train.map(r=>r.scenario_family));
  const trainTemplates=new Set(train.map(r=>r.template_family));
  const trainFingerprints=['bundle_sha256','nfc_sha256','nfkc_sha256'].map(key=>new Set(train.map(r=>fingerprint(r)[key])));
  for(const row of tune.rows){
    assert.equal(row.split,'DEV_TUNE_PROVISIONAL');
    assert.equal(row.generation_id,'G0_DEV');
    assert.equal(row.catalog_sha256,catalogSha);
    assert.equal(row.expected_state,'ASSIGNED');
    assert.deepEqual(row.gold_topics,[row.topic_id]);
    assert.equal(row.gold_origin,'CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_family,'candidate-writer-G0');
    assert.equal(row.source_id,'writer-tune-20260929');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_WRITER_VISIBLE_DEV');
    assert(['zh','en','mixed'].includes(row.language));
    assert(typeof row.current==='string' && row.current && row.title==='' && Array.isArray(row.recent) && row.recent.length===0);
    assert(typeof row.mechanism==='string' && row.mechanism);
    assert.equal(row.paraphrase_family,null);
    assert.equal(row.translation_family,null);
    assert.equal(row.contrast_family,null);
    for(const [value,set] of [[row.id,rowIds],[row.scenario_family,scenarios],[row.template_family,templates]]){
      assert(typeof value==='string' && value && !set.has(value)); set.add(value);
    }
    assert(!trainScenarios.has(row.scenario_family));
    assert(!trainTemplates.has(row.template_family));
    const fp=fingerprint(row);
    assert(!bundleHashes.has(fp.bundle_sha256)); bundleHashes.add(fp.bundle_sha256);
    for(const [i,key] of ['bundle_sha256','nfc_sha256','nfkc_sha256'].entries())
      assert(!trainFingerprints[i].has(fp[key]),'exact TRAIN/TUNE overlap');
  }
  assert.equal(bundleHashes.size,144);
  assert.deepEqual(Object.fromEntries(['zh','en','mixed'].map(x=>[x,tune.rows.filter(r=>r.language===x).length])),{zh:90,en:36,mixed:18});
});
