import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {auditWriterLabelReviewCards,LABEL_CARD_INPUT_PINS} from './train_label_review_cards.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8'),hash=s=>createHash('sha256').update(s).digest('hex');
const path='data/zero_model_refoundation/development/mechanism_matrix_train_label_review_cards_v0.1.json';
async function supplied(){const inputUtf8={};for(const p of LABEL_CARD_INPUT_PINS)inputUtf8[p.path]=await read(p.path);return {journal:JSON.parse(await read(path)),inputUtf8};}
function altered(base,change){const journal=structuredClone(base.journal);change(journal);journal.records_sha256=hash(canonicalJSON(journal.records));return {...base,journal};}

test('nine finite writer cards preserve source evidence and every qualification HOLD without deciding labels',async()=>{
  const base=await supplied(),result=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_LABEL_REVIEW_CARDS_RESULT.json'));
  assert.equal(hash(await read(path)),result.journal_sha256);
  for(const p of [...result.input_pins,...result.code_pins])assert.equal(hash(await read(p.path)),p.sha256,p.path);
  assert.deepEqual(auditWriterLabelReviewCards(base),result.audit);
  assert.equal(result.audit.cards,9);assert.equal(result.audit.specific_semantic_holds_retained,9);
  assert.equal(result.audit.label_qualification_holds_retained,41);assert.equal(result.audit.role_qualification_holds_retained,78);
  assert.equal(result.audit.semantic_judgment_certified,false);assert.equal(result.audit.remaining_allowance,null);
});

test('toy knowledge, room scale and missing-record uncertainty cannot be silently replaced with invented facts',async()=>{
  const base=await supplied(),find=(q,id)=>q.records.find(e=>e.id==='ZMR-MATRIX-TRAIN-'+id);
  assert(find(base.journal,'PART4-040').non_discriminators.some(s=>s.includes('不施工不排除工程')));
  assert(find(base.journal,'EXPANSION8-026').missing.includes('不能补城市/住处'));
  assert(find(base.journal,'PART7-054').non_discriminators.some(s=>s.includes('不证明一定发生')));
  for(const change of [q=>find(q,'PART4-040').original_input.current+=' 实际施工',q=>find(q,'EXPANSION8-026').original_input.title='Across cities',q=>find(q,'PART7-054').original_input.recent.push('The missing event did happen'),q=>find(q,'PART4-041').original_input.recent=[],q=>find(q,'PART4-042').original_spans.pop()])assert.throws(()=>auditWriterLabelReviewCards(altered(base,change)));
});

test('competing single-goal interpretations stay HOLD rather than union gold, formal rewrite or runtime rules',async()=>{
  const base=await supplied(),find=q=>q.records.find(e=>e.id==='ZMR-MATRIX-TRAIN-EXPANSION9-104');
  assert.equal(find(base.journal).proposed_gold,null);assert(find(base.journal).missing.includes('两独立当前目标'));
  for(const change of [q=>find(q).proposed_gold={expected_state:'ASSIGNED',topics:find(q).competing_topic_ids},q=>find(q).outcome='ASSIGNED',q=>find(q).formal_boundary_changed=true,q=>find(q).resolver_rule={choose:find(q).competing_topic_ids[0]},q=>find(q).runtime_output={state:'ASSIGNED'},q=>find(q).accepted_gold=true,q=>find(q).accepted_roles=true,q=>find(q).actual_formal_cards[find(q).competing_topic_ids[0]]+=' new exclusive boundary',q=>find(q).missing='',q=>find(q).review_exit_condition='PASS'])assert.throws(()=>auditWriterLabelReviewCards(altered(base,change)));
});

test('no independence, quota, budget, consumption, acceptance or compiler admission is fabricated',async()=>{
  const base=await supplied();for(const change of [q=>q.records[0].independent=true,q=>q.records[0].independent_quota_credit=1,q=>q.records[0].qualification_hold_cleared=true,q=>q.independent_reviewers=2,q=>q.accepted=9,q=>q.clearance=9,q=>q.new_samples=9,q=>q.predictions=9,q=>q.semantic_evaluations=1,q=>q.allocations=1,q=>q.remaining_allowance=12,q=>q.formal_catalog_mutation=true,q=>q.compiler_admission='PASS',q=>q.capability_verdict='PASS',q=>q.resource_verdict='PASS',q=>q.saturation_ceiling_claim=true,q=>q.dependency_actual_main_verified=false,q=>q.dependency_actual_main_ci='SUCCESS_UNKNOWN',q=>q.records.pop()])assert.throws(()=>auditWriterLabelReviewCards(altered(base,change)));
  const p=LABEL_CARD_INPUT_PINS[0].path;
  assert.throws(()=>auditWriterLabelReviewCards({...base,inputUtf8:{...base.inputUtf8,[p]:base.inputUtf8[p]+'\n'}}),/immutable/);
  assert.throws(()=>auditWriterLabelReviewCards({...base,inputUtf8:{...base.inputUtf8,'data/unregistered.json':'{}'}}),/explicit immutable source scope/);
});
