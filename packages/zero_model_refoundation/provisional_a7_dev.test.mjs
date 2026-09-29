import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url);
const read=p=>readFile(new URL(p,ROOT));
const norm=s=>s.normalize('NFKC').toLowerCase();
const grams=s=>{const c=Array.from(norm(s)),out=new Set();
  for(let i=0;i+3<=c.length;i++)out.add(c.slice(i,i+3).join(''));
  return out;};
const hash=r=>fingerprintBundle({current:r.current,title:r.title??'',recent:r.recent??[]}).bundle_sha256;

test('A7 public DEV v0.1 is frozen, non-independent, lineage-screened and unrun',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const catalogSha=createHash('sha256').update(catalog).digest('hex');
  const ids=parsePinnedCatalog(catalog).map(t=>t.id);
  const fresh=JSON.parse(await read('data/zero_model_refoundation/development/provisional_a7_dev_v0.1.json'));
  assert.equal(fresh.schema,'ZMR-A7-PROVISIONAL-DEV-1');
  assert.equal(fresh.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(fresh.catalog_sha256,catalogSha);
  assert.equal(fresh.intake_status,'PUBLIC_DEV_FROZEN_UNRUN');
  assert.equal(fresh.evaluation_status,'UNRUN');
  assert.equal(fresh.qualification_credit_rows,0);
  assert.equal(fresh.rows.length,60);
  const names=['provisional_train_v0.1','provisional_train_v0.2','provisional_train_v0.3',
    'provisional_tune_v0.1','provisional_cal_v0.1',
    'provisional_challenge_v0.1','provisional_challenge_v0.2','provisional_challenge_v0.3',
    'provisional_challenge_v0.4','provisional_challenge_v0.5','provisional_challenge_v0.6',
    'provisional_safety_seed_v0.1','provisional_safety_seed_v0.2',
    'provisional_safety_seed_v0.3','provisional_safety_seed_v0.4',
    'provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(names.map(async n=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${n}.json`)).rows))).flat();
  assert.equal(prior.length,1530);
  const registered=prior.map(r=>({id:r.id,hash:hash(r),norm:norm(r.current),
    grams:grams(r.current),scenario:r.scenario_family,template:r.template_family}));
  const languages={zh:0,en:0,mixed:0};
  for(const [i,row] of fresh.rows.entries()){
    assert.equal(row.split,'DEV_TUNE_PROVISIONAL');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.source_id,'writer-a7-dev-20260929');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.gold_origin,'CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_WRITER_VISIBLE_DEV');
    assert.equal(row.authoring_batch,'ZMR-05-A7-DEV-V01-20260929');
    assert.equal(row.title,'');assert.deepEqual(row.recent,[]);
    assert(row.current.trim().length>=(i<48?10:4));
    if(i<48){assert.equal(row.topic_id,ids[i*3]);
      assert.deepEqual(row.gold_topics,[row.topic_id]);
      assert.equal(row.expected_state,'ASSIGNED');}
    else{assert.equal(row.topic_id,null);assert.deepEqual(row.gold_topics,[]);
      assert.equal(row.expected_state,'DEFER');}
    languages[row.language]++;
    const item={id:row.id,hash:hash(row),norm:norm(row.current),
      grams:grams(row.current),scenario:row.scenario_family,template:row.template_family};
    for(const p of registered){
      assert.notEqual(item.hash,p.hash);assert.notEqual(item.norm,p.norm);
      assert.notEqual(item.scenario,p.scenario);assert.notEqual(item.template,p.template);
      let common=0;for(const g of item.grams)if(p.grams.has(g))common++;
      assert(common/(item.grams.size+p.grams.size-common||1)<.55,
        `${item.id} overlaps ${p.id}`);
    }
    registered.push(item);
  }
  assert.deepEqual(languages,{zh:35,en:20,mixed:5});
});
