import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle,screenNearDuplicates} from './fingerprints.mjs';

const read=relative=>readFile(fileURLToPath(new URL('../../'+relative,import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const input=row=>({current:row.current,title:row.title??'',recent:row.recent??[]});

test('fresh challenge v0.3 first 48 rows remain partial, public, unrun and same-writer',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const topics=parsePinnedCatalog(catalog),catalogSha=sha(catalog);
  const value=JSON.parse((await read('data/zero_model_refoundation/development/provisional_challenge_v0.3.json')).toString('utf8'));
  assert.equal(value.schema,'ZMR-PROVISIONAL-CHALLENGE-3');
  assert.equal(value.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(value.catalog_sha256,catalogSha);
  assert.equal(value.qualification_credit_rows,0);
  assert.equal(value.intake_status,'PARTIAL_48_OF_144');
  assert.equal(value.evaluation_status,'UNRUN');
  assert.equal(value.rows.length,48);
  assert.deepEqual(value.rows.map(r=>r.topic_id),topics.slice(0,48).map(t=>t.id));
  assert.deepEqual(Object.fromEntries(['zh','en','mixed'].map(x=>[x,value.rows.filter(r=>r.language===x).length])),
    {zh:24,en:16,mixed:8});
  const ids=new Set(),scenarios=new Set(),templates=new Set(),mechanisms=new Set();
  for(const row of value.rows) {
    assert.equal(row.split,'CHALLENGE_PROVISIONAL');
    assert.equal(row.generation_id,'G0_DEV');
    assert.equal(row.catalog_sha256,catalogSha);
    assert.equal(row.expected_state,'ASSIGNED');
    assert.deepEqual(row.gold_topics,[row.topic_id]);
    assert.equal(row.gold_origin,'CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_family,'candidate-writer-G0');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_CHALLENGE');
    assert.equal(row.authoring_batch,'ZMR-03-CHALLENGE-V03-P1-20260929');
    assert(typeof row.current==='string'&&row.current&&row.title===''&&
      Array.isArray(row.recent)&&row.recent.length===0);
    for(const [value,set] of [[row.id,ids],[row.scenario_family,scenarios],
      [row.template_family,templates],[row.mechanism,mechanisms]]) {
      assert(typeof value==='string'&&value&&!set.has(value));set.add(value);
    }
  }
  const names=['provisional_train_v0.2.json','provisional_tune_v0.1.json',
    'provisional_cal_v0.1.json','provisional_challenge_v0.1.json',
    'provisional_challenge_v0.2.json','provisional_safety_seed_v0.1.json'];
  const old=(await Promise.all(names.map(async n=>JSON.parse((await read('data/zero_model_refoundation/development/'+n)).toString('utf8'))))).flatMap(x=>x.rows);
  const keys=['bundle_sha256','nfc_sha256','nfkc_sha256'];
  for(const key of keys) {
    const prior=new Set(old.map(r=>fingerprintBundle(input(r))[key]));
    assert(value.rows.every(r=>!prior.has(fingerprintBundle(input(r))[key])));
  }
  const flags=screenNearDuplicates([...old.map((r,i)=>({id:'old-'+i,split:'OLD',input:input(r)})),
    ...value.rows.map((r,i)=>({id:'new-'+i,split:'NEW',input:input(r)}))],
    {threshold:.55,gram_size:3}).flags.filter(f=>f.cross_split);
  assert.equal(flags.length,0,'new/old near-duplicate flags need review');
});
