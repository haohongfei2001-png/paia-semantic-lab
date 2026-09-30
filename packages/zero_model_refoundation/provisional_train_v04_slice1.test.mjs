import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';
const ROOT=new URL('../../',import.meta.url),DATA='data/zero_model_refoundation/development/';
const read=p=>readFile(new URL(p,ROOT));
const norm=x=>x.normalize('NFKC').toLowerCase();
const grams=x=>{const c=Array.from(norm(x)),s=new Set();for(let i=0;i+3<=c.length;i++)s.add(c.slice(i,i+3).join(''));return s;};
const fp=r=>({id:r.id,hash:fingerprintBundle({current:r.current,title:r.title??'',recent:r.recent??[]}).bundle_sha256,current:norm(r.current),grams:grams(r.current),scenario:r.scenario_family,template:r.template_family});

test('TRAIN v0.4 cards preserve full144 and initial slice is source-tracked, unfit and non-independent',async()=>{
 const cb=await read('catalog/system_topic_catalog_v0.2.yaml'),topics=parsePinnedCatalog(cb),digest=createHash('sha256').update(cb).digest('hex');
 const plan=JSON.parse(await read(DATA+'provisional_train_v0.4_plan.json'));
 const cohort=JSON.parse(await read(DATA+'provisional_train_v0.4_slice1.json'));
 const ids=new Set(topics.map(t=>t.id));
 assert.equal(plan.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(plan.catalog_sha256,digest);
 assert.equal(plan.cards.length,144);assert.equal(new Set(plan.cards.map(c=>c.topic_id)).size,144);
 assert(plan.cards.every(c=>ids.has(c.topic_id)&&c.required_base_scenarios.length===3&&c.qualification_credit_rows===0));
 assert.equal(plan.target_original_base_scenarios,432);assert.equal(plan.independent_quota_credit,0);
 assert.equal(plan.candidate_generation_claim,'NONE');
 assert.equal(plan.compiler_admission,'FULL144_NEW_TRAIN_FREEZE_REQUIRED_BEFORE_A2_A3_REENTRY');
 const status=JSON.parse(await read('status/ZERO_MODEL_REFOUNDATION_STATUS.json'));
 assert.equal(status.rounds['ZMR-02'].provisional_train_v04_rows,54);
 assert.equal(status.rounds['ZMR-02'].provisional_train_v04_remaining_rows,378);
 assert.equal(status.rounds['ZMR-02'].provisional_train_v04_independent_rows,0);
 assert.equal(status.capability_verdict,'UNTESTED');assert.equal(status.resource_verdict,'NOT_QUALIFIED');
 const selected=new Map();for(const t of topics)if(!selected.has(t.domain))selected.set(t.domain,t.id);
 assert.deepEqual(plan.first_slice_topics,[...selected.values()]);
 assert.equal(cohort.schema,'ZMR-PROVISIONAL-TRAIN-V04-SLICE-1');
 assert.equal(cohort.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(cohort.catalog_sha256,digest);
 assert.equal(cohort.topic_universe,144);assert.equal(cohort.row_count,54);assert.equal(cohort.rows.length,54);
 assert.equal(cohort.topic_count,18);assert.equal(cohort.missing_topics,126);assert.equal(cohort.domain_count,18);
 assert.equal(cohort.intake_status,'PUBLIC_TRAIN_V04_SLICE1_FROZEN_NOT_COMPILER_ADMITTED');
 assert.equal(cohort.evaluation_status,'UNFIT_UNEVALUATED');assert.equal(cohort.independent_source_cohorts,0);assert.equal(cohort.qualification_credit_rows,0);
 const languages={},coverage=new Map(),seen=new Set();
 for(const r of cohort.rows){
  assert(ids.has(r.topic_id)&&plan.first_slice_topics.includes(r.topic_id));assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);
  assert.equal(r.expected_state,'ASSIGNED');assert.equal(r.row_id,r.id);assert(!seen.has(r.id));seen.add(r.id);
  assert.equal(r.split,'TRAIN_PROVISIONAL');assert.equal(r.catalog_sha256,digest);
  assert.equal(r.writer_id,'candidate-writer');assert.equal(r.writer_cohort,'candidate-writer-G0');assert.equal(r.source_family,'candidate-writer-G0');
  assert.equal(r.source_id,'writer-train-v04-slice1-20260930');assert.equal(r.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
  assert.equal(r.annotation_state,'CANDIDATE_WRITER_UNREVIEWED');assert.equal(r.review_status,'UNREVIEWED_PROVISIONAL');
  assert.equal(r.exposure,'PUBLIC_TRAIN');assert.equal(r.generation_id,'G0_DEV');assert.equal(r.qualification_credit_rows,0);
  assert.equal(r.authoring_batch,'ZMR-TRAIN-V04-SLICE1-20260930');assert.equal(r.scenario_id,r.scenario_family);assert.equal(r.template_family,r.scenario_family);
  assert.equal(r.paraphrase_family,null);assert.equal(r.translation_family,null);
  assert(typeof r.current==='string'&&r.current.length>=30&&r.title===''&&r.recent.length===0);
  assert(['zh','en','mixed'].includes(r.language));assert(Object.values(r.factors).every(v=>typeof v==='string'&&v.length>0));
  if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));
  languages[r.language]=(languages[r.language]??0)+1;
  const set=coverage.get(r.topic_id)??new Set();assert(!set.has(r.language));set.add(r.language);coverage.set(r.topic_id,set);
 }
 assert.deepEqual(languages,{zh:18,en:18,mixed:18});assert.equal(coverage.size,18);assert([...coverage.values()].every(s=>s.size===3));
});

test('slice1 duplicate/lineage screen uses explicit public provisional files only',async()=>{
 const names=['train_v0.1','train_v0.2','train_v0.3','tune_v0.1','cal_v0.1',
 'a7_dev_v0.1','a4_triads_v0.1','a4_train_v0.1','a4_challenge_v0.1','a4_positive_challenge_v0.1','a5_challenge_v0.1','a5_repair_dev_v0.1','a5_r1_challenge_v0.1','a6_complement_challenge_v0.1','a6_r1_repair_dev_v0.1','a6_r2_challenge_v0.1','challenge_v0.1','challenge_v0.2','challenge_v0.3','challenge_v0.4','challenge_v0.5','challenge_v0.6','safety_seed_v0.1','safety_seed_v0.2','safety_seed_v0.3','safety_seed_v0.4','role_challenge_v0.1','h1_recall_dev_v0.1','a5_chart_dev_v0.1','a4_role_dev_v0.1','a1_balanced_dev_v0.1'];
 const seen=[];for(const n of names){const c=JSON.parse(await read(DATA+'provisional_'+n+'.json'));for(const r of c.rows??[])if(typeof r.current==='string')seen.push(fp(r));}
 assert.equal(seen.length,2026);
 const cohort=JSON.parse(await read(DATA+'provisional_train_v0.4_slice1.json'));
 for(const r of cohort.rows){const now=fp(r);
  for(const old of seen){assert.notEqual(now.hash,old.hash);assert.notEqual(now.current,old.current);assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);
   let common=0;for(const t of now.grams)if(old.grams.has(t))common++;
   assert(common/(now.grams.size+old.grams.size-common||1)<.55,`${now.id} overlaps ${old.id}`);
  }seen.push(now);
 }
});
