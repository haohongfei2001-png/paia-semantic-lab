import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {auditWriterLabelProposals,LABEL_PROPOSAL_INPUT_PINS} from './train_label_proposals.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const journalPath='data/zero_model_refoundation/development/mechanism_matrix_train_label_proposals_v0.1.json';
async function supplied(){const inputUtf8={};for(const p of LABEL_PROPOSAL_INPUT_PINS)inputUtf8[p.path]=await read(p.path);return {journal:JSON.parse(await read(journalPath)),inputUtf8};}
function altered(base,change){const journal=structuredClone(base.journal);change(journal);journal.records_sha256=hash(canonicalJSON(journal.records));return {...base,journal};}

test('finite41 immutable writer judgments retain all label and role qualification HOLDs, not semantic truth',async()=>{
  const base=await supplied(),result=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_LABEL_PROPOSALS_RESULT.json'));
  assert.equal(hash(await read(journalPath)),result.journal_sha256);
  for(const p of [...result.input_pins,...result.code_pins])assert.equal(hash(await read(p.path)),p.sha256,p.path);
  assert.deepEqual(auditWriterLabelProposals(base),result.audit);
  assert.equal(result.audit.label_qualification_holds_retained,41);assert.equal(result.audit.role_qualification_holds_retained,78);
  assert.equal(result.audit.semantic_judgment_certified,false);assert.equal(result.audit.remaining_stable_allowance,null);
});

test('an overlap HOLD cannot become union gold; two mentioned plan steps do not certify multi intent or completion',async()=>{
  const base=await supplied();const find=(q,id)=>q.records.find(e=>e.id==='ZMR-MATRIX-TRAIN-'+id);
  const hold=find(base.journal,'EXPANSION9-104');assert.equal(hold.writer_decision,'HOLD');assert.equal(hold.proposed_gold,null);
  const multi=find(base.journal,'EXPANSION9-068');assert.equal(multi.accepted_gold,false);
  assert(multi.writer_reason.includes('两个独立当前目标'));assert.deepEqual(multi.current_goal_evidence.slice(1).map(s=>s.text),['先处理厨房台面','再整理餐具柜']);
  for(const change of [q=>find(q,'EXPANSION9-104').proposed_gold={expected_state:'ASSIGNED',topics:hold.competing_label_hypotheses,excluded_topics:[]},q=>find(q,'EXPANSION9-068').accepted_gold=true,q=>find(q,'EXPANSION9-068').current_goal_evidence.pop(),q=>find(q,'EXPANSION9-068').current_goal_evidence[1].field='current',q=>find(q,'EXPANSION9-068').current_goal_evidence[1].text='清洁已完成'])assert.throws(()=>auditWriterLabelProposals(altered(base,change)));
});

test('writer preferences cannot rewrite Catalog, exclusions, original gold, role acceptance or runtime outcome',async()=>{
  const base=await supplied();for(const change of [q=>q.records[0].original_gold.topics=['sys.science_technical.physics'],q=>q.records[0].proposed_gold.topics=['NEW_CANDIDATE'],q=>q.records[0].proposed_gold.excluded_topics.push('sys.education_learning.academic_courses'),q=>q.records[0].catalog_boundary_evidence[q.records[0].competing_label_hypotheses[0]]+=' invented exclusive boundary',q=>q.records[0].accepted_roles=true,q=>q.records[0].formal_pairwise_boundary_resolved=true,q=>q.records[0].runtime_output={state:'ASSIGNED'},q=>q.records[0].label_hold_retained=false,q=>q.records[0].role_holds_preserved=false])assert.throws(()=>auditWriterLabelProposals(altered(base,change)));
});

test('fake independence, budget recovery, clearance, exposure and unregistered input paths stay rejected',async()=>{
  const base=await supplied();for(const change of [q=>q.independent_reviewers=2,q=>q.records[0].independent=true,q=>q.records[0].independent_quota_credit=1,q=>q.records[0].source_input_revisions=1,q=>q.qualification_holds_cleared=41,q=>q.new_samples=41,q=>q.candidate_predictions=41,q=>q.semantic_evaluations=1,q=>q.new_stable_allocations=1,q=>q.remaining_stable_allowance=12,q=>q.compiler_admission='PASS',q=>q.capability_verdict='PASS',q=>q.resource_verdict='PASS',q=>q.saturation_ceiling_claim=true,q=>q.dependency_actual_main_verified=false,q=>q.dependency_actual_main_ci='SUCCESS_UNKNOWN',q=>q.records.pop()])assert.throws(()=>auditWriterLabelProposals(altered(base,change)));
  const p=LABEL_PROPOSAL_INPUT_PINS[0].path;
  assert.throws(()=>auditWriterLabelProposals({...base,inputUtf8:{...base.inputUtf8,[p]:base.inputUtf8[p]+'\n'}}),/immutable/);
  assert.throws(()=>auditWriterLabelProposals({...base,inputUtf8:{...base.inputUtf8,'data/unregistered.json':'{}'}}),/explicit immutable input scope/);
});
