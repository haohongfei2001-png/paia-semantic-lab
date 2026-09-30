import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateMechanismMatrixPlan} from './mechanism_matrix_plan.mjs';
const root=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8'),sha=s=>createHash('sha256').update(s).digest('hex');
async function supplied(){const catalog=await read('catalog/system_topic_catalog_v0.2.yaml'),plan=JSON.parse(await read('data/zero_model_refoundation/development/development_mechanism_matrix_plan_v0.1.json'));return {catalog,plan,ids:[...catalog.matchAll(/^  - topic_id: (.+)$/gm)].map(m=>m[1])};}
test('registered144 authoring cards preserve formal quotas with rotated nominal families and zero actual data credit',async()=>{
 const {catalog,plan,ids}=await supplied(),source=await read('docs/zero-model-refoundation-v1/ZMR-03_DEV_V04_MECHANISM_AUDIT_RESULT.json'),s=JSON.parse(source),a=validateMechanismMatrixPlan(plan,ids);
 assert.equal(sha(catalog),plan.catalog_sha256);assert.equal(sha(source),plan.source_audit_sha256);assert.equal(plan.source_audit_journal_sha256,s.audit.journal_sha256);assert.equal(s.audit.dev_rows,1200);assert.equal(s.audit.journal_sha256,'cce80d003f91ed34c5be019cb19f97259cd89dcdc864e7a3ad22508e15e7cff2');
 assert.deepEqual(a.planned_ordinary_scenarios,{TRAIN:3456,ordinary_DEV:1728,challenge_DEV:1728});assert.equal(a.actual_authored_rows,0);assert.equal(a.independent_quota_credit,0);assert.equal(a.candidate_predictions,0);assert.equal(a.new_competition_generations,0);assert.equal(a.semantic_family_adjudication,'NOT_ADJUDICATED_NO_AUTHORING_OR_CAPABILITY_CREDIT');assert.equal(a.boundary_adjudication,'UNADJUDICATED');
 assert.equal(a.data_qualification,'NOT_QUALIFIED');assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');assert.equal(Object.keys(a.planned_family_language_matrix).length,10);for(const m of Object.values(a.planned_family_language_matrix))for(const counts of Object.values(m))assert(Object.values(counts).every(n=>n>0));
 assert.equal(new Set(plan.cards.filter(c=>plan.first_batch_selection.topics.includes(c.topic_id)).map(c=>c.domain)).size,18);assert.equal(new Set(plan.cards.map(c=>c.heldout_family_hypotheses.join('/'))).size,10);assert(plan.cards.every(c=>c.adjudicated_heldout_families===null));
});
test('registration refuses lowered gates,fabricated authoring or independence,overlapping heldouts and mismatched language counts',async()=>{
 const {plan,ids}=await supplied();for(const [change,error]of [
  [p=>p.actual_authored_rows=1,/cannot claim authored/],
  [p=>p.independent_quota_credit=1,/mint qualification/],
  [p=>p.budget.coverage_floor=.69,/product constraints/],
  [p=>p.budget.incremental_memory_bytes++,/product constraints/],
  [p=>p.targets.TRAIN.minimum_mechanism_families=7,/formal quota/],
  [p=>p.name_echo.formal_adjudicated_maximum_fraction=.11,/name echo/],
  [p=>p.cards[0].heldout_family_hypotheses[0]=p.cards[0].train_family_hypotheses[0],/overlap/],
  [p=>p.cards[0].train_allocations[0].languages.zh--,/scenario count/],
  [p=>p.cards[0].adjudicated_heldout_families=2,/semantic\/boundary/],
  [p=>p.source_audit_path='data/private.json',/source registration/],
  [p=>p.family_review.existing_v04_tags_relabelled=true,/nominal family/],
  [p=>p.safety_requirements.ordinary_DEV.controls=299,/safety quota/]
 ]){const changed=structuredClone(plan);change(changed);assert.throws(()=>validateMechanismMatrixPlan(changed,ids),error);}
 assert.throws(()=>validateMechanismMatrixPlan(plan,ids.slice(1)),/full144/);
});
