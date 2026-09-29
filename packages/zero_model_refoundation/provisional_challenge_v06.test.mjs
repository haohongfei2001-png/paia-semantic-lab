import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url);
const read=path=>readFile(new URL(path,ROOT));
const norm=s=>s.normalize('NFKC').toLowerCase();
const bundle=row=>({current:row.current,title:row.title??'',recent:row.recent??[]});
const grams=s=>{
  const c=Array.from(norm(s)),out=new Set();
  for(let i=0;i+3<=c.length;i++)out.add(c.slice(i,i+3).join(''));
  return out;
};
function overlap(a,b) {
  let common=0;
  for(const x of a)if(b.has(x))common++;
  return common/(a.size+b.size-common||1);
}

test('fresh challenge v0.6 part1 is same-writer, unrun and distinct',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const catalogSha=createHash('sha256').update(catalog).digest('hex');
  const topics=parsePinnedCatalog(catalog);
  const fresh=JSON.parse(await read('data/zero_model_refoundation/development/provisional_challenge_v0.6.json'));
  assert.equal(fresh.schema,'ZMR-PROVISIONAL-CHALLENGE-6');
  assert.equal(fresh.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(fresh.catalog_sha256,catalogSha);
  assert.equal(fresh.qualification_credit_rows,0);
  assert.equal(fresh.intake_status,'PART1_48_PUBLIC_DEV_UNRUN');
  assert.equal(fresh.evaluation_status,'UNRUN');
  assert.equal(fresh.rows.length,48);
  const languages={zh:0,en:0,mixed:0},seen=new Set();
  let echoes=0;
  for(const [i,row] of fresh.rows.entries()) {
    assert.equal(row.topic_id,topics[i].id);
    assert.deepEqual(row.gold_topics,[row.topic_id]);
    assert.equal(row.expected_state,'ASSIGNED');
    assert.equal(row.catalog_sha256,catalogSha);
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.gold_origin,'CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_CHALLENGE');
    assert.equal(row.authoring_batch,'ZMR-05-CHALLENGE-V06-P1-20260929');
    assert.equal(row.title,'');assert.deepEqual(row.recent,[]);
    assert(row.current.trim().length>=10);
    assert(!seen.has(row.id));seen.add(row.id);
    languages[row.language]++;
    if([topics[i].name_zh,topics[i].name_en].some(name=>norm(row.current).includes(norm(name))))echoes++;
  }
  assert.deepEqual(languages,{zh:24,en:16,mixed:8});
  assert(echoes<=5);
  const priorNames=['provisional_train_v0.2','provisional_tune_v0.1','provisional_cal_v0.1',
    'provisional_challenge_v0.2','provisional_challenge_v0.3','provisional_challenge_v0.4','provisional_challenge_v0.5',
    'provisional_safety_seed_v0.1','provisional_safety_seed_v0.2',
    'provisional_safety_seed_v0.3','provisional_safety_seed_v0.4','provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(priorNames.map(async name=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${name}.json`)).rows))).flat();
  const registered=prior.map(row=>({id:row.id,hash:fingerprintBundle(bundle(row)).bundle_sha256,
    normalized:norm(row.current),features:grams(row.current)}));
  for(const row of fresh.rows) {
    const hash=fingerprintBundle(bundle(row)).bundle_sha256;
    const normalized=norm(row.current),features=grams(row.current);
    for(const other of registered) {
      assert.notEqual(hash,other.hash);
      assert.notEqual(normalized,other.normalized);
      assert(overlap(features,other.features)<.55,`${row.id} overlaps ${other.id}`);
    }
    registered.push({id:row.id,hash,normalized,features});
  }
});
