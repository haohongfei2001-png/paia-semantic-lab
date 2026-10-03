import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalJSON} from './contracts.mjs';
import {ADMISSION_INPUT_PINS,buildReviewAwareTrainAdmission,auditReviewAwareTrainAdmission} from './train_review_admission.mjs';
const root=new URL('../../',import.meta.url);
async function sources(){return Object.fromEntries(await Promise.all(ADMISSION_INPUT_PINS.map(async p=>[p.path,await readFile(new URL(p.path,root),'utf8')])));}

test('finite admission manifest derives 41 blocked rows without converting writer preferences into truth',async()=>{
  const inputUtf8=await sources(),manifest=buildReviewAwareTrainAdmission({inputUtf8});
  const prior=JSON.parse(await readFile(new URL('data/zero_model_refoundation/development/mechanism_matrix_train_review_admission_v0.1.json',root),'utf8'));
  assert.equal(canonicalJSON(manifest),canonicalJSON(prior));
  const result=JSON.parse(await readFile(new URL('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_REVIEW_ADMISSION_RESULT.json',root),'utf8'));
  for(const pin of [...result.input_pins,...result.code_pins])assert.equal(createHash('sha256').update(await readFile(new URL(pin.path,root))).digest('hex'),pin.sha256,pin.path);
  assert.equal(createHash('sha256').update(await readFile(new URL(result.manifest_path,root))).digest('hex'),result.manifest_sha256);
  const audit=auditReviewAwareTrainAdmission({manifest,inputUtf8});assert.deepEqual(audit,result.audit);
  assert.equal(audit.disputed_rows,41);assert.equal(audit.full_catalog_topics,144);assert.equal(audit.specific_card_links,9);assert.equal(audit.older_role_proposal_links,3);assert.equal(audit.request_frame_links,0);
  assert.equal(audit.development_compile_admitted,0);assert.equal(audit.remaining_allowance,null);
  assert(manifest.records.every(e=>!e.development_compilation_blockers.includes('INDEPENDENT_SOURCE_REVIEW_NOT_PROVISIONED')));
  assert(manifest.records.some(e=>e.known_writer_role_hold===false&&e.role_truth_and_acceptance==='NOT_ESTABLISHED_BY_WRITER_METADATA_OR_TEST_PASS'));
});

test('forged acceptance, missing blockers, invented row links, quota, topic masks and refunds cannot enter the manifest',async()=>{
  const inputUtf8=await sources(),original=buildReviewAwareTrainAdmission({inputUtf8});
  for(const mutate of [m=>m.records[0].development_compilation_admission=true,m=>m.records[0].qualification_blockers=[],m=>m.records[0].development_compilation_blockers=[],m=>m.records[0].accepted=true,m=>m.records[0].review_references.frames={path:'invented',record_sha256:'0'.repeat(64),accepted_as_semantic_evidence:true},m=>m.records[0].lineage.writer='independent-curator',m=>m.records[0].original_bundle_sha256='0'.repeat(64),m=>m.records[0].original_context_sha256='0'.repeat(64),m=>m.records[0].original_role_spans=[],m=>m.records[0].review_references.labels.journal_sha256='0'.repeat(64),m=>m.publication_dependency_head='0'.repeat(40),m=>m.dependency_actual_main_ci='PASS_WITHOUT_RECEIPT',m=>m.records[0].source_license_not_independent_review_receipt=false,m=>m.records[0].independent_quota_credit=1,m=>m.candidate_budget.stable_configuration_allowance_remaining=12,m=>m.candidate_budget.history_reconciled=true,m=>m.full_catalog_topic_ids.pop(),m=>m.predictions=41,m=>m.fitted_features=1,m=>m.capability_verdict='PASS',m=>m.resource_verdict='PASS',m=>m.semantic_judgment_certified=true,m=>m.records.pop()]){
    const manifest=structuredClone(original);mutate(manifest);assert.throws(()=>auditReviewAwareTrainAdmission({manifest,inputUtf8}),/exactly derive/);
  }
});

test('only the finite original TRAIN and review pins are accepted; source/current/gold or Catalog changes fail closed',async()=>{
  const inputUtf8=await sources();
  const original=canonicalJSON(inputUtf8);buildReviewAwareTrainAdmission({inputUtf8});assert.equal(canonicalJSON(inputUtf8),original);
  for(const p of ADMISSION_INPUT_PINS)assert.throws(()=>buildReviewAwareTrainAdmission({inputUtf8:{...inputUtf8,[p.path]:inputUtf8[p.path]+'\n'}}),/immutable source/);
  assert.throws(()=>buildReviewAwareTrainAdmission({inputUtf8:{...inputUtf8,'data/unregistered.json':'{}'}}),/finite original/);
  const missing={...inputUtf8};delete missing[ADMISSION_INPUT_PINS[0].path];assert.throws(()=>buildReviewAwareTrainAdmission({inputUtf8:missing}),/finite original/);
});
