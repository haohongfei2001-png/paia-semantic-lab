import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {auditOlderTrainRoleDispositions,OLDER_ROLE_INPUT_PINS} from './train_older_role_dispositions.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
const path='data/zero_model_refoundation/development/mechanism_matrix_train_older_role_dispositions_v0.1.json';
const hash=s=>createHash('sha256').update(s).digest('hex');
async function supplied(){const inputUtf8={};for(const p of OLDER_ROLE_INPUT_PINS)inputUtf8[p.path]=await read(p.path);return {journal:JSON.parse(await read(path)),inputUtf8};}
test('all378actual older rows have reasoned immutable writer dispositions;zero independent acceptance',async()=>{
 const input=await supplied(),result=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_OLDER_ROLE_DISPOSITIONS_RESULT.json'));
 assert.equal(hash(await read(path)),result.journal_sha256);for(const p of [...result.input_pins,...result.code_pins])assert.equal(hash(await read(p.path)),p.sha256,p.path);
 assert.deepEqual(auditOlderTrainRoleDispositions(input),result.audit);assert.equal(result.audit.writer_role_dispositions,378);assert.equal(result.audit.new_writer_role_holds,46);assert.equal(result.audit.combined_writer_role_holds,78);assert.equal(result.audit.older_subset_label_holds_preserved,28);assert.equal(result.audit.semantic_judgment_certified,false);
});
test('budget,gold,independence,role admission and source rewrite cannot be manufactured',async()=>{
 const base=await supplied();for(const change of [q=>q.accepted_role_rows=378,q=>q.independent_reviewers=1,q=>q.remaining_stable_allowance=12,q=>q.new_stable_allocations=1,q=>q.candidate_predictions=1,q=>q.capability_verdict='PASS',q=>q.resource_verdict='PASS',q=>q.saturation_ceiling_claim=true,q=>q.older_role_rows_independently_unqualified=0,q=>q.records[0].independent=true,q=>q.records[0].accepted_gold=true,q=>q.records[0].source_input_revisions=1,q=>q.records[0].reviewer_id='independent-curator',q=>q.records[0].proposed_role_replacements=[]]){
  const journal=structuredClone(base.journal);change(journal);journal.records_sha256=hash(canonicalJSON(journal.records));assert.throws(()=>auditOlderTrainRoleDispositions({...base,journal}));
 }
});
test('whole-sentence context and original gold/roles/review bytes remain immutable and scope bounded',async()=>{
 const base=await supplied(),p=OLDER_ROLE_INPUT_PINS.find(p=>p.path.includes('_part4_v')).path;
 const source=JSON.parse(base.inputUtf8[p]);source.rows[19].input.current=source.rows[19].input.current.replace('I need a troubleshooting sequence','Check the scope');
 assert.throws(()=>auditOlderTrainRoleDispositions({...base,inputUtf8:{...base.inputUtf8,[p]:JSON.stringify(source)}}),/immutable input bytes/);
 assert.throws(()=>auditOlderTrainRoleDispositions({...base,inputUtf8:{...base.inputUtf8,'data/unregistered.json':'{}'}}),/explicit input scope/);
 const journal=structuredClone(base.journal);journal.records[0].original_spans_sha256='0'.repeat(64);journal.records_sha256=hash(canonicalJSON(journal.records));assert.throws(()=>auditOlderTrainRoleDispositions({...base,journal}),/original gold/);
});
test('background method,relative-clause action and belief-object concerns cannot be silently cleared',async()=>{
 const base=await supplied();for(const id of ['ZMR-MATRIX-TRAIN-PART4-020','ZMR-MATRIX-TRAIN-PART4-050','ZMR-MATRIX-TRAIN-PART6-002']){
  const journal=structuredClone(base.journal),e=journal.records.find(x=>x.id===id);assert.equal(e.role_review_disposition,'ROLE_IDENTIFIABILITY_HOLD');e.role_review_disposition='PROVISIONAL_WRITER_ROLE_RETAIN';journal.records_sha256=hash(canonicalJSON(journal.records));assert.throws(()=>auditOlderTrainRoleDispositions({...base,journal}),/registered writer concern/);
 }
 for(const change of [q=>q.records.pop(),q=>q.records[1]=structuredClone(q.records[0]),q=>q.records[0].role_review_comment='PASS',q=>q.records[0].prior_label_disposition='ACCEPTED',q=>q.prior_explicit_role_holds=0]){const journal=structuredClone(base.journal);change(journal);journal.records_sha256=hash(canonicalJSON(journal.records));assert.throws(()=>auditOlderTrainRoleDispositions({...base,journal}));}
});
