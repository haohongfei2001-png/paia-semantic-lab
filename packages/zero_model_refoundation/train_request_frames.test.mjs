import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {auditWriterRequestFrames,POLICY_FRAME_INPUT_PINS} from './train_request_frames.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8'),hash=s=>createHash('sha256').update(s).digest('hex');
const path='data/zero_model_refoundation/development/mechanism_matrix_train_request_frames_v0.1.json';
async function supplied(){const inputUtf8={};for(const p of POLICY_FRAME_INPUT_PINS)inputUtf8[p.path]=await read(p.path);return {journal:JSON.parse(await read(path)),inputUtf8};}
function altered(base,change){const journal=structuredClone(base.journal);change(journal);journal.records_sha256=hash(canonicalJSON(journal.records));return {...base,journal};}
test('registered19writer frames preserve actual source bytes and every qualification hold without certifying roles',async()=>{
 const base=await supplied(),result=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_REQUEST_FRAMES_RESULT.json'));assert.equal(hash(await read(path)),result.journal_sha256);for(const p of [...result.input_pins,...result.code_pins])assert.equal(hash(await read(p.path)),p.sha256,p.path);
 assert.deepEqual(auditWriterRequestFrames(base),result.audit);assert.equal(result.audit.exact_utf16_frame_spans,104);assert.equal(result.audit.accepted_role_rows,0);assert.equal(result.audit.semantic_judgment_certified,false);assert.equal(result.audit.remaining_stable_allowance,null);
});
test('background needs cannot replace the actual current demand and an absent main operator cannot be manufactured',async()=>{
 const base=await supplied(),id='ZMR-MATRIX-TRAIN-PART6-053';const find=q=>q.records.find(e=>e.id===id);assert.equal(find(base.journal).proposed_request_frame.find(s=>s.kind==='DEMAND').start,87);
 for(const change of [q=>{const s=find(q).proposed_request_frame.find(s=>s.kind==='DEMAND');s.start=21;s.end=25;s.text='need';},q=>find(q).explicit_main_operation_spans.push({field:'current',start:94,end:100,text:'export'}),q=>find(q).operation_evidence_state='MAIN_OPERATION_CONFIRMED'])assert.throws(()=>auditWriterRequestFrames(altered(base,change)));
});
test('design content,explanation contents and means cannot be discarded or reassigned by byte-only integration',async()=>{
 const base=await supplied();const find=(q,id)=>q.records.find(e=>e.id==='ZMR-MATRIX-TRAIN-'+id);
 assert.equal(find(base.journal,'PART2-019').proposed_request_frame.find(s=>s.start===0).kind,'CONTENT');
 for(const change of [q=>find(q,'PART2-019').proposed_request_frame.find(s=>s.start===0).kind='BACKGROUND',q=>find(q,'PART6-008').proposed_request_frame.find(s=>s.kind==='CONTENT').kind='GOAL',q=>{const e=find(q,'PART4-020');e.proposed_request_frame=e.proposed_request_frame.filter(s=>s.kind!=='MEANS');},q=>{const e=find(q,'SEED-041');e.proposed_request_frame=e.proposed_request_frame.filter(s=>!s.kind.startsWith('ORIGINAL_'));}])assert.throws(()=>auditWriterRequestFrames(altered(base,change)));
});
test('nominal request frames cannot silently change Topic,state,gold,independence,allowance or compiler admission',async()=>{
 const base=await supplied();for(const change of [q=>q.independent_reviewers=1,q=>q.source_input_revisions=1,q=>q.records[0].proposed_gold={expected_state:'ASSIGNED'},q=>q.records[0].runtime_output={topic_ids:[]},q=>q.records[0].automatic_gold_state_change=true,q=>q.records[0].automatic_topic_change=true,q=>q.records[0].accepted_roles=true,q=>q.records[0].accepted_gold=true,q=>q.records[0].independent=true,q=>q.records[0].source_input_revisions=1,q=>q.accepted_role_rows=19,q=>q.independent_quota_credit=19,q=>q.new_samples=19,q=>q.new_stable_allocations=1,q=>q.candidate_predictions=19,q=>q.remaining_stable_allowance=12,q=>q.policy_hold_clearance=19,q=>q.compiler_admission='PASS',q=>q.capability_verdict='PASS',q=>q.resource_verdict='PASS',q=>q.records.pop()])assert.throws(()=>auditWriterRequestFrames(altered(base,change)));
 const p=POLICY_FRAME_INPUT_PINS.find(p=>p.path.includes('_train_part6_')).path;assert.throws(()=>auditWriterRequestFrames({...base,inputUtf8:{...base.inputUtf8,[p]:base.inputUtf8[p]+'\n'}}),/immutable/);assert.throws(()=>auditWriterRequestFrames({...base,inputUtf8:{...base.inputUtf8,'data/unregistered.json':'{}'}}),/explicit immutable/);
});
