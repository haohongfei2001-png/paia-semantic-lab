import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ADMISSION_INPUT_PINS} from './train_review_admission.mjs';
import {requestReviewAwareCompilation} from './train_review_compiler_adapter.mjs';
const root=new URL('../../',import.meta.url);
async function supplied(){return {manifest:JSON.parse(await readFile(new URL('data/zero_model_refoundation/development/mechanism_matrix_train_review_admission_v0.1.json',root),'utf8')),inputUtf8:Object.fromEntries(await Promise.all(ADMISSION_INPUT_PINS.map(async p=>[p.path,await readFile(new URL(p.path,root),'utf8')])))};}

test('actual finite41 manifest reaches explicit compiler HOLD and never invokes caller callback',async()=>{
  const base=await supplied();let calls=0;
  const receipt=JSON.parse(await readFile(new URL('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_REVIEW_COMPILER_ADAPTER_RESULT.json',root),'utf8'));
  for(const pin of [...receipt.input_pins,...receipt.code_pins])assert.equal(createHash('sha256').update(await readFile(new URL(pin.path,root))).digest('hex'),pin.sha256,pin.path);
  assert.equal(receipt.dependency_actual_main_ci,'SUCCESS_ATTEMPT1_SEMANTIC37137916892_ZMR37137916877');
  const result=requestReviewAwareCompilation({...base,compile:()=>{calls++;throw Error('compiler must never execute disputed rows');}});
  assert.equal(calls,0);assert.equal(result.compiler_callbacks,0);assert.equal(result.blocked_rows.length,41);
  assert.equal(result.full_catalog_topic_ids.length,144);assert.equal(new Set(result.full_catalog_topic_ids).size,144);
  assert(result.blocked_rows.every(r=>r.development_compilation_blockers.length>0));
  assert(result.blocked_rows.every(r=>!r.development_compilation_blockers.includes('INDEPENDENT_SOURCE_REVIEW_NOT_PROVISIONED')));
  assert.equal(result.features_created,0);assert.equal(result.index_bytes_created,0);assert.equal(result.router_calls,0);
  assert.equal(result.stable_allowance,null);assert.equal(result.capability_verdict,'UNTESTED');
  assert.equal(result.resource_verdict,'NOT_QUALIFIED');assert.equal(result.accepted,0);assert.equal(result.independent_quota_credit,0);
  const original=structuredClone(base.manifest.records[0].review_references);
  result.blocked_rows[0].review_references.labels.journal_sha256='caller mutation';
  assert.deepEqual(base.manifest.records[0].review_references,original);
});

test('forged acceptance, partial cohort, reduced Catalog and changed review are rejected before compiler invocation',async()=>{
  const base=await supplied();let calls=0;
  for(const change of [m=>m.records[0].accepted=true,m=>m.records[0].development_compilation_admission=true,m=>m.records[0].development_compilation_blockers=[],m=>m.records.pop(),m=>m.full_catalog_topic_ids.pop(),m=>m.records[0].review_references.labels.journal_sha256='0'.repeat(64),m=>m.candidate_budget.stable_configuration_allowance_remaining=12]){
    const manifest=structuredClone(base.manifest);change(manifest);
    assert.throws(()=>requestReviewAwareCompilation({...base,manifest,compile:()=>{calls++;}}));assert.equal(calls,0);
  }
});

test('unregistered or altered input fails closed and missing compiler cannot supply hidden execution',async()=>{
  const base=await supplied();let calls=0;
  assert.throws(()=>requestReviewAwareCompilation({...base,inputUtf8:{...base.inputUtf8,'data/unregistered.json':'{}'},compile:()=>{calls++;}}),/finite original/);
  const p=ADMISSION_INPUT_PINS[0].path;
  assert.throws(()=>requestReviewAwareCompilation({...base,inputUtf8:{...base.inputUtf8,[p]:base.inputUtf8[p]+'\n'},compile:()=>{calls++;}}),/immutable/);
  assert.throws(()=>requestReviewAwareCompilation({...base,compile:null}),/callback/);assert.equal(calls,0);
});
