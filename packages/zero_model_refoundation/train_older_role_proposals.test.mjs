import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {auditOlderTrainRoleProposals,OLDER_PROPOSAL_INPUT_PINS} from './train_older_role_proposals.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8'),hash=s=>createHash('sha256').update(s).digest('hex');
const path='data/zero_model_refoundation/development/mechanism_matrix_train_older_role_proposals_v0.1.json';
async function supplied(){const inputUtf8={};for(const p of OLDER_PROPOSAL_INPUT_PINS)inputUtf8[p.path]=await read(p.path);return {journal:JSON.parse(await read(path)),inputUtf8};}
test('all46original concerns have immutable proposals or specific policy holds without gold acceptance',async()=>{
 const base=await supplied(),result=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_OLDER_ROLE_PROPOSALS_RESULT.json'));assert.equal(hash(await read(path)),result.journal_sha256);
 for(const p of [...result.input_pins,...result.code_pins])assert.equal(hash(await read(p.path)),p.sha256,p.path);
 assert.deepEqual(auditOlderTrainRoleProposals(base),result.audit);assert.equal(result.audit.unaccepted_span_repair_proposals,27);assert.equal(result.audit.specific_role_policy_holds,19);assert.equal(result.audit.qualification_holds_cleared,0);assert.equal(result.audit.semantic_judgment_certified,false);
});
test('background needs substring cannot impersonate current I need or clear modal policy',async()=>{
 const base=await supplied(),e=base.journal.records.find(r=>r.id==='ZMR-MATRIX-TRAIN-PART6-053'),row=JSON.parse(base.inputUtf8[e.source_path]).rows.find(r=>r.id===e.id);
 assert.equal(row.input.current.slice(21,25),'need');assert.equal(row.input.current.slice(21,26),'needs');assert.notEqual(e.partial_occurrence_only_proposal.proposed_action.start,21);
 for(const change of [p=>{p.proposed_action.start=21;p.proposed_action.end=25;},p=>p.accepted=true,p=>p.modality_policy_pending=false]){const journal=structuredClone(base.journal);change(journal.records.find(r=>r.id===e.id).partial_occurrence_only_proposal);journal.records_sha256=hash(canonicalJSON(journal.records));assert.throws(()=>auditOlderTrainRoleProposals({...base,journal}),/current-demand occurrence/);}
});
test('quoted belief and method layers,conversion inputs,qualifiers and antecedents cannot be silently dropped',async()=>{
 const base=await supplied();for(const change of [
 q=>q.records.find(r=>r.id==='ZMR-MATRIX-TRAIN-PART6-002').proposed_role_spans.find(s=>s.role==='OBJECT').text='how to finish meaningful work with less rework',
 q=>{const e=q.records.find(r=>r.id==='ZMR-MATRIX-TRAIN-PART4-014');e.proposed_role_spans=e.proposed_role_spans.filter(s=>s.role!=='BACKGROUND');},
 q=>{const e=q.records.find(r=>r.id==='ZMR-MATRIX-TRAIN-PART3-052');e.proposed_role_spans=e.proposed_role_spans.filter(s=>s.role!=='ANTECEDENT');},
 q=>{const e=q.records.find(r=>r.id==='ZMR-MATRIX-TRAIN-SEED-028');e.proposed_role_spans.find(s=>s.role==='OBJECT').text='完整出游方案';}
 ]){const journal=structuredClone(base.journal);change(journal);journal.records_sha256=hash(canonicalJSON(journal.records));assert.throws(()=>auditOlderTrainRoleProposals({...base,journal}));}
});
test('writer independence,qualification,source changes,predictions,allowance and erased holds are rejected',async()=>{
 const base=await supplied();for(const change of [q=>q.independent_reviewers=1,q=>q.accepted_role_rows=27,q=>q.capability_verdict='PASS',q=>q.resource_verdict='PASS',q=>q.remaining_stable_allowance=12,q=>q.new_stable_allocations=1,q=>q.qualification_holds_cleared=46,q=>q.compiler_admission='PASS',q=>q.records[0].independent=true,q=>q.records[0].accepted_gold=true,q=>q.records[0].source_input_revisions=1,q=>q.records[0].proposal_revision=3,q=>q.records.pop()]){const journal=structuredClone(base.journal);change(journal);journal.records_sha256=hash(canonicalJSON(journal.records));assert.throws(()=>auditOlderTrainRoleProposals({...base,journal}));}
 const p=OLDER_PROPOSAL_INPUT_PINS.find(p=>p.path.includes('_part6_v')).path;assert.throws(()=>auditOlderTrainRoleProposals({...base,inputUtf8:{...base.inputUtf8,[p]:base.inputUtf8[p]+'\n'}}),/immutable input bytes/);assert.throws(()=>auditOlderTrainRoleProposals({...base,inputUtf8:{...base.inputUtf8,'data/unregistered.json':'{}'}}),/explicit immutable input scope/);
});
