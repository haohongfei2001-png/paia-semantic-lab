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

test('A5 fresh role/scope challenge is frozen, same-writer and lineage-screened',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const catalogSha=createHash('sha256').update(catalog).digest('hex');
  const ids=new Set(parsePinnedCatalog(catalog).map(x=>x.id));
  assert.equal(ids.size,144);
  const fresh=JSON.parse(await read('data/zero_model_refoundation/development/provisional_a5_challenge_v0.1.json'));
  assert.equal(fresh.schema,'ZMR-A5-FRESH-PUBLIC-CHALLENGE-1');
  assert.equal(fresh.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(fresh.catalog_sha256,catalogSha);
  assert.equal(fresh.row_count,32);assert.equal(fresh.rows.length,32);
  assert.equal(fresh.correction_rows,8);assert.equal(fresh.multi_rows,8);
  assert.equal(fresh.quote_rows,4);assert.equal(fresh.ambiguous_unscored_rows,4);
  assert.equal(fresh.control_rows,8);assert.equal(fresh.qualification_credit_rows,0);
  assert.equal(fresh.independent_source_cohorts,0);
  assert.equal(fresh.intake_status,'PUBLIC_CHALLENGE_FROZEN_UNRUN');
  assert.equal(fresh.evaluation_status,'UNRUN');
  const names=['provisional_train_v0.1','provisional_train_v0.2','provisional_train_v0.3',
    'provisional_tune_v0.1','provisional_cal_v0.1','provisional_a7_dev_v0.1',
    'provisional_a4_triads_v0.1','provisional_a4_train_v0.1',
    'provisional_a4_challenge_v0.1','provisional_challenge_v0.1',
    'provisional_challenge_v0.2','provisional_challenge_v0.3',
    'provisional_challenge_v0.4','provisional_challenge_v0.5',
    'provisional_challenge_v0.6','provisional_safety_seed_v0.1',
    'provisional_safety_seed_v0.2','provisional_safety_seed_v0.3',
    'provisional_safety_seed_v0.4','provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(names.map(async n=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${n}.json`)).rows))).flat();
  assert.equal(prior.length,1654);
  const priorItems=prior.map(item),seen=[...priorItems];
  const languages={zh:0,en:0,mixed:0};
  const roles={CORRECTION:0,MULTI:0,QUOTE:0,AMBIGUOUS:0,NO_REQUEST:0};
  let maxOverlap=0;
  for(const row of fresh.rows){
    assert.equal(row.split,'CHALLENGE_DEV_PROVISIONAL');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_id,'writer-a5-fresh-challenge-20260930');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.authoring_batch,'ZMR-05-A5-FRESH-CHALLENGE-V01-20260930');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_CHALLENGE');
    assert.equal(row.title,'');assert.deepEqual(row.recent,[]);
    assert(row.current.trim().length>=10);
    assert(Object.hasOwn(languages,row.language)&&Object.hasOwn(roles,row.role));
    languages[row.language]++;roles[row.role]++;
    assert(Array.isArray(row.provisional_gold_topics));
    assert(row.provisional_gold_topics.every(x=>ids.has(x)));
    assert.equal(new Set(row.provisional_gold_topics).size,row.provisional_gold_topics.length);
    if(row.role==='MULTI'){
      assert.equal(row.layer,'ROLE_SCOPE');
      assert.equal(row.provisional_gold_topics.length,2);
      assert.equal(row.provisional_topic_id,null);
    }else if(['CORRECTION','QUOTE'].includes(row.role)){
      assert.equal(row.layer,'ROLE_SCOPE');
      assert.equal(row.provisional_gold_topics.length,1);
      assert.equal(row.provisional_topic_id,row.provisional_gold_topics[0]);
    }else{
      assert.deepEqual(row.provisional_gold_topics,[]);
      assert.equal(row.provisional_topic_id,null);
      assert.equal(row.layer,row.role==='NO_REQUEST'?'CONTROL':'UNRESOLVED');
      assert.equal(row.annotation_state,row.role==='NO_REQUEST'?
        'CANDIDATE_WRITER_PROVISIONAL_DEFER_UNREVIEWED':'AMBIGUOUS_UNRESOLVED_NO_GOLD');
    }
    const now=item(row);
    for(const old of seen){
      assert.notEqual(now.hash,old.hash);assert.notEqual(now.norm,old.norm);
      assert.notEqual(now.scenario,old.scenario);
      assert.notEqual(now.template,old.template);
      if(priorItems.includes(old)&&old.contrast)assert.notEqual(now.contrast,old.contrast);
      let common=0;for(const g of now.grams)if(old.grams.has(g))common++;
      const overlap=common/(now.grams.size+old.grams.size-common||1);
      maxOverlap=Math.max(maxOverlap,overlap);
      assert(overlap<.55,`${now.id} overlaps ${old.id}`);
    }
    seen.push(now);
  }
  assert.deepEqual(languages,{zh:16,en:16,mixed:0});
  assert.deepEqual(roles,{CORRECTION:8,MULTI:8,QUOTE:4,AMBIGUOUS:4,NO_REQUEST:8});
  assert(maxOverlap<.55);
});
