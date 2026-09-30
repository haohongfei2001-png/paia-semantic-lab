import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalJSON} from './contracts.mjs';
import {seedHash} from './mechanism_matrix_seed.mjs';
import {auditMechanismMatrixPart2Review} from './mechanism_matrix_part2_review.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
async function supplied(){
 const root='data/zero_model_refoundation/development/',planUtf8=await read(root+'development_mechanism_matrix_plan_v0.1.json'),seedUtf8=await read(root+'mechanism_matrix_train_seed_v0.1.json'),reviewUtf8=await read(root+'mechanism_matrix_train_seed_review_v0.1.json'),packetUtf8=await read(root+'mechanism_matrix_train_part2_v0.1.json'),qa=JSON.parse(await read(root+'mechanism_matrix_train_part2_review_v0.1.json')),catalog=await read('catalog/system_topic_catalog_v0.2.yaml'),topicIds=[...catalog.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);
 return {qa,packet:JSON.parse(packetUtf8),packetUtf8,seed:JSON.parse(seedUtf8),seedUtf8,review:JSON.parse(reviewUtf8),reviewUtf8,plan:JSON.parse(planUtf8),planUtf8,topicIds};
}
test('actual pinned part2 writer QA preserves 108 sources and seven holds without qualification',async()=>{
 const input=await supplied(),receipt=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_MECHANISM_MATRIX_TRAIN_PART2_REVIEW_RESULT.json'));
 for(const pin of [...receipt.input_pins,...receipt.code_pins])assert.equal(seedHash(await read(pin.path)),pin.sha256,pin.path);
 assert.equal(seedHash(input.packetUtf8),'323483c9745127f1837484264a18f1d4cf89d8d531474049fe3de306fa984353');
 const a=auditMechanismMatrixPart2Review(input);assert.deepEqual(a,receipt.audit);assert.equal(a.new_writer_reviewed_rows,54);assert.deepEqual(a.new_dispositions,{RETAIN_PROVISIONAL_WRITER_ONLY:52,LABEL_IDENTIFIABILITY_HOLD:2});assert.deepEqual(a.new_hold_ids,['ZMR-MATRIX-TRAIN-PART2-052','ZMR-MATRIX-TRAIN-PART2-054']);assert.equal(a.combined_writer_reviewed_rows,108);assert.equal(a.combined_label_holds,7);assert.equal(a.combined_source_topics,36);assert.equal(a.full_topic_universe,144);assert.equal(a.missing_topics,108);assert.equal(a.combined_provisional_neighbor_cards,36);assert.equal(a.combined_provisional_neighbor_edges,108);assert.equal(a.directional_source_cases,0);assert.equal(a.adjudicated_edges,0);assert.equal(a.accepted_gold_rows,0);assert.equal(a.independent_quota_credit,0);
});
test('rehashed source rewrites,independence,budget and boundary qualification claims are rejected',async()=>{
 const input=await supplied();for(const [change,error]of [
  [q=>q.source_path='data/private.json',/source identity/],[q=>q.independent_reviewers=1,/independent acceptance/],[q=>q.accepted_gold_rows=54,/independent acceptance/],[q=>q.new_stable_allocations=1,/mint/],[q=>q.compiler_admission='PASS',/mint/],[q=>q.candidate_predictions=1,/mint/],[q=>q.capability_verdict='PASS',/qualification claim/],
  [q=>q.records[0].original_gold_sha256='changed',/original source/],[q=>q.records[0].original_spans_sha256='changed',/original source/],[q=>q.records[0].original_bundle_sha256='changed',/original source/],[q=>q.records[51].proposed_positive_labels=[input.packet.rows[51].topic_id,...q.records[51].competing_topic_hypotheses],/silently replace/],[q=>q.records[51].disposition='RETAIN_PROVISIONAL_WRITER_ONLY',/hold must explain/],[q=>q.records[0].independent=true,/writer\/freeze/],
  [q=>q.neighbor_cards[0].neighbors[0]=q.neighbor_cards[0].neighbors[2],/neighbor scope/],[q=>q.neighbor_cards[0].required_directions=['positive'],/neighbor scope/],[q=>q.directional_source_cases=54,/not qualified/],[q=>q.qualified_heldout_family_count=2,/not qualified/]
 ]){const qa=structuredClone(input.qa);change(qa);qa.records_sha256=seedHash(canonicalJSON(qa.records));assert.throws(()=>auditMechanismMatrixPart2Review({...input,qa}),error);}
 assert.throws(()=>auditMechanismMatrixPart2Review({...input,packetUtf8:input.packetUtf8+' '}),/source identity/);assert.throws(()=>auditMechanismMatrixPart2Review({...input,topicIds:input.topicIds.slice(0,36)}),/full144/);
});
test('writer source QA is deterministic and cannot mutate originals or mint independent evidence',async()=>{
 const input=await supplied(),before=canonicalJSON(input),a=auditMechanismMatrixPart2Review(input),b=auditMechanismMatrixPart2Review(input);assert.deepEqual(a,b);assert.equal(canonicalJSON(input),before);assert.equal(a.original_inputs_gold_spans_preserved,true);assert.equal(a.source_input_revisions,0);assert.equal(a.independent_reviewers,0);assert.equal(a.candidate_predictions,0);assert.equal(a.semantic_evaluations,0);assert.equal(a.new_stable_allocations,0);assert.equal(a.remaining_stable_allowance,null);assert.equal(a.qualified_heldout_family_count,null);assert.equal(a.data_qualification,'NOT_QUALIFIED');assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');assert.equal(a.saturation_ceiling_claim,false);
});
