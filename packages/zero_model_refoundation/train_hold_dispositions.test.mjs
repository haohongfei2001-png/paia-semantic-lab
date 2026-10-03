import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {auditTrainHoldDispositions,DISPOSITION_INPUT_PINS} from './train_hold_dispositions.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
const path='data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json';
async function supplied(){
 const sourceUtf8={},reviewUtf8={};let catalogUtf8;
 for(const pin of DISPOSITION_INPUT_PINS){const b=await read(pin.path);if(pin.path.startsWith('catalog/'))catalogUtf8=b;else if(pin.path.includes('_review_'))reviewUtf8[pin.path]=b;else sourceUtf8[pin.path]=b;}
 return {journal:JSON.parse(await read(path)),sourceUtf8,reviewUtf8,catalogUtf8};
}
test('actual known held rows have complete versioned dispositions and five unaccepted proposals without qualification',async()=>{
 const input=await supplied(),result=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_HOLD_DISPOSITIONS_RESULT.json'));
 assert.equal(createHash('sha256').update(await read(path)).digest('hex'),result.journal_sha256);
 for(const pin of [...result.input_pins,...result.code_pins])assert.equal(createHash('sha256').update(await read(pin.path)).digest('hex'),pin.sha256,pin.path);
 assert.deepEqual(auditTrainHoldDispositions(input),result.audit);
 assert.equal(result.audit.unique_held_rows,72);assert.equal(result.audit.older_roles_without_disposition,378);
 assert.equal(result.audit.semantic_judgment_certified,false);assert.equal(result.audit.independent_quota_credit,0);
});
test('false writer independence,qualification,source revisions,exposures and budget reset are rejected',async()=>{
 const base=await supplied();
 for(const change of [
 q=>q.independent_reviewers=1,q=>q.accepted_gold_rows=1,q=>q.accepted_roles=1,q=>q.remaining_stable_allowance=12,q=>q.new_stable_allocations=1,q=>q.candidate_predictions=1,q=>q.capability_verdict='PASS',q=>q.resource_verdict='PASS',q=>q.saturation_ceiling_claim=true,
 q=>q.records[0].independent=true,q=>q.records[0].reviewer_id='independent-curator',q=>q.records[0].accepted_gold=true,q=>q.records[0].source_input_revisions=1,q=>q.records[0].formal_catalog_mutation=true,q=>q.records[0].independent_quota_credit=1,q=>q.records[0].semantic_judgment_certified=true
 ]){const journal=structuredClone(base.journal);change(journal);assert.throws(()=>auditTrainHoldDispositions({...base,journal}));}
});
test('immutable packet/review/Catalog inputs and exact scope reject altered bytes even with self-rehashed metadata',async()=>{
 const base=await supplied(),p=DISPOSITION_INPUT_PINS.find(p=>p.path.includes('_seed_review_')).path;
 const b=JSON.parse(base.reviewUtf8[p]);b.records[0].accepted_gold=true;b.records_sha256=createHash('sha256').update(canonicalJSON(b.records)).digest('hex');
 const modified={...base.reviewUtf8,[p]:JSON.stringify(b)};assert.throws(()=>auditTrainHoldDispositions({...base,reviewUtf8:modified}),/immutable input bytes/);
 assert.throws(()=>auditTrainHoldDispositions({...base,catalogUtf8:base.catalogUtf8+'\n'}),/immutable input bytes/);
 assert.throws(()=>auditTrainHoldDispositions({...base,sourceUtf8:{...base.sourceUtf8,'data/unregistered.json':'{}'}}),/explicit input scope/);
 const journal=structuredClone(base.journal);journal.records[0].original_pins.gold_sha256='0'.repeat(64);assert.throws(()=>auditTrainHoldDispositions({...base,journal}),/original gold/);
});
test('first matching background needs is rejected as a current-request proposal despite exact substring',async()=>{
 const base=await supplied(),journal=structuredClone(base.journal),entry=journal.records.find(r=>r.id.endsWith('EXPANSION4-036'));
 const row=JSON.parse(base.sourceUtf8[entry.original_pins.source_path]).rows.find(r=>r.id===entry.id);
 const action=entry.unaccepted_role_proposal.spans.find(s=>s.role==='ACTION');
 assert.equal(row.input.current.slice(18,20),'需要');assert.equal(row.input.current.slice(24,26),'需要');
 action.start=18;action.end=20;assert.throws(()=>auditTrainHoldDispositions({...base,journal}),/current-request occurrence/);
});
test('proposals cannot drop objects,context qualifiers,or gain acceptance;all original holds remain',async()=>{
 const base=await supplied();
 for(const change of [
 q=>q.records.find(r=>r.unaccepted_role_proposal).unaccepted_role_proposal.accepted=true,
 q=>q.records.find(r=>r.unaccepted_role_proposal).unaccepted_role_proposal.spans.pop(),
 q=>q.records.find(r=>r.unaccepted_role_proposal).unaccepted_role_proposal.spans.find(s=>s.role==='OBJECT').text='other',
 q=>q.records.find(r=>r.role_hold).role_hold=false,
 q=>q.records.find(r=>r.label_hold).competing_label_hypotheses=[]
 ]){const journal=structuredClone(base.journal);change(journal);assert.throws(()=>auditTrainHoldDispositions({...base,journal}));}
});
test('missing,duplicate or unknown dispositions and erased old role omissions cannot satisfy completeness',async()=>{
 const base=await supplied();
 for(const change of [q=>q.records.pop(),q=>q.records[1]=structuredClone(q.records[0]),q=>q.records[0].id='UNKNOWN',q=>q.older_roles_without_disposition=0,q=>q.versioned_writer_dispositions=71,q=>q.records[0].semantic_reason='PASS']){
 const journal=structuredClone(base.journal);change(journal);assert.throws(()=>auditTrainHoldDispositions({...base,journal}));}
});
