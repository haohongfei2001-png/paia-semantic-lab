import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url);
const DATA='data/zero_model_refoundation/development/';
const read=p=>readFile(new URL(p,ROOT));
const norm=x=>x.normalize('NFKC').toLowerCase();
const grams=x=>{const s=Array.from(norm(x)),out=new Set();
  for(let i=0;i+3<=s.length;i++)out.add(s.slice(i,i+3).join(''));
  return out;};
const fp=r=>({id:r.id,hash:fingerprintBundle({current:r.current,
  title:r.title??'',recent:r.recent??[]}).bundle_sha256,
  normalized:norm(r.current),grams:grams(r.current),
  scenario:r.scenario_family,template:r.template_family});

test('public A5 chart DEV freezes separate per-goal evidence with no qualification credit or prior overlap',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const ids=new Set(parsePinnedCatalog(catalog).map(x=>x.id));
  const path=DATA+'provisional_a5_chart_dev_v0.1.json';
  const cohort=JSON.parse(await read(path));
  assert.equal(ids.size,144);
  assert.equal(cohort.schema,'ZMR-A5-CHART-DEV-1');
  assert.equal(cohort.catalog_sha256,createHash('sha256').update(catalog).digest('hex'));
  assert.equal(cohort.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(cohort.topic_universe,144);assert.equal(cohort.row_count,24);
  assert.deepEqual(cohort.role_counts,{ROLE_SWAP:6,CONTEXT_REQUIRED:6,MULTI:6,CONTROL:6});
  assert.equal(cohort.qualification_credit_rows,0);
  assert.equal(cohort.independent_source_cohorts,0);
  assert.equal(cohort.intake_status,'PUBLIC_A5_CHART_DEV_FROZEN_UNRUN');
  assert.equal(cohort.evaluation_status,'UNRUN');
  const names=['train_v0.1','train_v0.2','train_v0.3','tune_v0.1','cal_v0.1',
    'a7_dev_v0.1','a4_triads_v0.1','a4_train_v0.1','a4_challenge_v0.1',
    'a4_positive_challenge_v0.1','a5_challenge_v0.1','a5_repair_dev_v0.1',
    'a5_r1_challenge_v0.1','a6_complement_challenge_v0.1',
    'a6_r1_repair_dev_v0.1','a6_r2_challenge_v0.1','challenge_v0.1',
    'challenge_v0.2','challenge_v0.3','challenge_v0.4','challenge_v0.5',
    'challenge_v0.6','safety_seed_v0.1','safety_seed_v0.2',
    'safety_seed_v0.3','safety_seed_v0.4','role_challenge_v0.1',
    'h1_recall_dev_v0.1'];
  const prior=[];
  for(const name of names){
    const data=JSON.parse(await read(DATA+'provisional_'+name+'.json'));
    if(Array.isArray(data.rows))for(const row of data.rows)
      if(typeof row.current==='string')prior.push(fp(row));
  }
  assert.equal(prior.length,1942);
  const seen=[...prior],roles=new Map(),langs=new Map();
  for(const row of cohort.rows){
    assert.equal(row.split,'DEV_PROVISIONAL');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_id,'writer-a5-chart-dev-20260930');
    assert.equal(row.source_family,'candidate-writer-G0');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.annotation_state,'CANDIDATE_WRITER_UNREVIEWED');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_DEV');
    assert.equal(row.authoring_batch,'ZMR-04-A5-CHART-DEV-V01-20260930');
    assert.equal(row.scenario_id,row.scenario_family);
    assert.equal(row.template_family,row.scenario_family);
    assert(typeof row.current==='string'&&row.current.length>=20);
    assert(row.provisional_gold_topics.every(id=>ids.has(id)));
    assert.equal(new Set(row.provisional_gold_topics).size,row.provisional_gold_topics.length);
    roles.set(row.role,(roles.get(row.role)??0)+1);
    langs.set(row.language,(langs.get(row.language)??0)+1);
    if(row.role==='CONTROL')assert.equal(row.provisional_gold_topics.length,0);
    else if(row.role==='MULTI')assert.equal(row.provisional_gold_topics.length,2);
    else assert.equal(row.provisional_gold_topics.length,1);
    if(row.role==='CONTEXT_REQUIRED')assert.equal(row.recent.length,1);
    else if(row.role!=='CONTROL')assert.equal(row.recent.length,0);
    const now=fp(row);
    for(const old of seen){
      assert.notEqual(now.hash,old.hash);
      assert.notEqual(now.normalized,old.normalized);
      assert.notEqual(now.scenario,old.scenario);
      assert.notEqual(now.template,old.template);
      let common=0;for(const token of now.grams)
        if(old.grams.has(token))common++;
      assert(common/(now.grams.size+old.grams.size-common||1)<.55,
        `${now.id} overlaps ${old.id}`);
    }
    seen.push(now);
  }
  assert.deepEqual(Object.fromEntries(roles),{ROLE_SWAP:6,CONTEXT_REQUIRED:6,MULTI:6,CONTROL:6});
  assert.equal(langs.get('zh'),12);assert.equal(langs.get('en'),12);
});
