import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
const norm=s=>s.normalize('NFKC').toLowerCase();
const grams=s=>{const c=Array.from(norm(s)),out=new Set();
  for(let i=0;i+3<=c.length;i++)out.add(c.slice(i,i+3).join(''));
  return out;};
const item=r=>({id:r.id,
  hash:fingerprintBundle({current:r.current,title:r.title??'',recent:r.recent??[]}).bundle_sha256,
  norm:norm(r.current),grams:grams(r.current),scenario:r.scenario_family,
  template:r.template_family,contrast:r.contrast_family});

test('fresh H1 public DEV has 18-domain coverage and no independent credit or prior overlap',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const ids=new Set(parsePinnedCatalog(catalog).map(x=>x.id));
  const domains=new Set([...ids].map(x=>x.split('.')[1]));
  const dev=JSON.parse(await read('data/zero_model_refoundation/development/provisional_h1_recall_dev_v0.1.json'));
  assert.equal(ids.size,144);assert.equal(domains.size,18);
  assert.equal(dev.schema,'ZMR-H1-RECALL-DEV-1');
  assert.equal(dev.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(dev.catalog_sha256,createHash('sha256').update(catalog).digest('hex'));
  for(const [key,value] of Object.entries({topic_universe:144,domain_universe:18,
    single_rows:36,control_rows:12,context_required_rows:6,multi_rows:6,
    row_count:60,qualification_credit_rows:0,independent_source_cohorts:0}))
    assert.equal(dev[key],value);
  assert.equal(dev.rows.length,60);
  assert.equal(dev.intake_status,'PUBLIC_H1_DEV_FROZEN_UNRUN');
  assert.equal(dev.evaluation_status,'UNRUN');
  const names=['provisional_train_v0.1','provisional_train_v0.2','provisional_train_v0.3',
    'provisional_tune_v0.1','provisional_cal_v0.1','provisional_a7_dev_v0.1',
    'provisional_a4_triads_v0.1','provisional_a4_train_v0.1',
    'provisional_a4_challenge_v0.1','provisional_a4_positive_challenge_v0.1',
    'provisional_a5_challenge_v0.1','provisional_a5_repair_dev_v0.1',
    'provisional_a5_r1_challenge_v0.1','provisional_a6_complement_challenge_v0.1',
    'provisional_a6_r1_repair_dev_v0.1','provisional_a6_r2_challenge_v0.1',
    'provisional_challenge_v0.1','provisional_challenge_v0.2',
    'provisional_challenge_v0.3','provisional_challenge_v0.4',
    'provisional_challenge_v0.5','provisional_challenge_v0.6',
    'provisional_safety_seed_v0.1','provisional_safety_seed_v0.2',
    'provisional_safety_seed_v0.3','provisional_safety_seed_v0.4',
    'provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(names.map(async n=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${n}.json`)).rows))).flat();
  assert.equal(prior.length,1882);
  const seen=prior.map(r=>({...item(r),old:true}));
  const roles={SINGLE:0,CONTROL:0,CONTEXT_REQUIRED:0,MULTI:0};
  const languages={zh:0,en:0,mixed:0};
  const singlesByDomain=new Map();
  for(const row of dev.rows){
    assert.equal(row.split,'DEV_PROVISIONAL');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_id,'writer-h1-recall-dev-20260930');
    assert.equal(row.source_family,'candidate-writer-G0');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_DEV');
    assert.equal(row.authoring_batch,'ZMR-04-H1-RECALL-DEV-V01-20260930');
    assert.equal(row.title,'');assert(row.current.trim().length>=10);
    assert.equal(row.scenario_id,row.scenario_family);
    assert.equal(row.template_family,row.scenario_family);
    assert(Object.hasOwn(roles,row.role)&&Object.hasOwn(languages,row.language));
    roles[row.role]++;languages[row.language]++;
    assert.equal(new Set(row.provisional_gold_topics).size,row.provisional_gold_topics.length);
    assert(row.provisional_gold_topics.every(x=>ids.has(x)));
    if(row.role==='SINGLE'){
      assert.equal(row.layer,'SINGLE');
      assert.equal(row.provisional_gold_topics.length,1);
      assert.equal(row.provisional_topic_id,row.provisional_gold_topics[0]);
      assert.equal(row.provisional_domain,row.provisional_topic_id.split('.')[1]);
      singlesByDomain.set(row.provisional_domain,(singlesByDomain.get(row.provisional_domain)??0)+1);
    }else if(row.role==='CONTEXT_REQUIRED'){
      assert.equal(row.provisional_gold_topics.length,1);
      assert.equal(row.recent.length,1);
      assert.equal(row.provisional_domain,row.provisional_topic_id.split('.')[1]);
    }else if(row.role==='MULTI'){
      assert.equal(row.provisional_gold_topics.length,2);
      assert.equal(row.provisional_topic_id,null);
      assert.equal(row.provisional_domain,null);
      assert.equal(new Set(row.provisional_gold_topics.map(x=>x.split('.')[1])).size,2);
    }else{
      assert.deepEqual(row.provisional_gold_topics,[]);
      assert.equal(row.provisional_topic_id,null);
      assert.equal(row.provisional_domain,null);
    }
    if(row.role!=='CONTEXT_REQUIRED')assert.deepEqual(row.recent,[]);
    const now={...item(row),old:false};
    for(const old of seen){
      assert.notEqual(now.hash,old.hash);assert.notEqual(now.norm,old.norm);
      assert.notEqual(now.scenario,old.scenario);
      assert.notEqual(now.template,old.template);
      if(old.old&&old.contrast)assert.notEqual(now.contrast,old.contrast);
      let common=0;for(const g of now.grams)if(old.grams.has(g))common++;
      assert(common/(now.grams.size+old.grams.size-common||1)<.55,
        `${now.id} overlaps ${old.id}`);
    }
    seen.push(now);
  }
  assert.deepEqual(roles,{SINGLE:36,CONTROL:12,CONTEXT_REQUIRED:6,MULTI:6});
  assert.deepEqual(languages,{zh:30,en:30,mixed:0});
  assert.equal(singlesByDomain.size,18);
  assert([...singlesByDomain.values()].every(x=>x===2));
});
