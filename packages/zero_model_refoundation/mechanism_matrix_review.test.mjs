import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalJSON} from './contracts.mjs';
import {seedHash} from './mechanism_matrix_seed.mjs';
import {auditMechanismMatrixReview} from './mechanism_matrix_review.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
async function supplied(){
 const planUtf8=await read('data/zero_model_refoundation/development/development_mechanism_matrix_plan_v0.1.json'),plan=JSON.parse(planUtf8),packetUtf8=await read('data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json'),packet=JSON.parse(packetUtf8),review=JSON.parse(await read('data/zero_model_refoundation/development/mechanism_matrix_train_seed_review_v0.1.json')),catalog=await read('catalog/system_topic_catalog_v0.2.yaml'),topicIds=[...catalog.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(x=>x[1]);
 return {planUtf8,plan,packetUtf8,packet,review,topicIds};
}
test('actual54 frozen originals and writer decisions bind receipt;five holds never become multi-label gold',async()=>{
 const input=await supplied(),receipt=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_MECHANISM_MATRIX_TRAIN_SEED_REVIEW_RESULT.json'));
 for(const pin of [...receipt.input_pins,...receipt.code_pins])assert.equal(seedHash(await read(pin.path)),pin.sha256,pin.path);
 assert.equal(input.review.source_sha256,'4377ecd423c38bbf4755113fffc844eb71f0e285901f921bd039d398573a0080');assert.deepEqual(auditMechanismMatrixReview(input),receipt.audit);
 assert.deepEqual(receipt.audit.dispositions,{RETAIN_PROVISIONAL_WRITER_ONLY:49,LABEL_IDENTIFIABILITY_HOLD:5});assert.deepEqual(receipt.audit.hold_ids,['010','018','045','046','054'].map(x=>'ZMR-MATRIX-TRAIN-SEED-'+x));
 assert.equal(receipt.audit.full_topic_universe,144);assert.equal(receipt.audit.missing_topics,126);assert.equal(receipt.audit.provisional_neighbor_edges,54);assert.equal(receipt.audit.directional_source_cases,0);assert.equal(receipt.audit.qualified_heldout_family_count,null);
 assert.equal(receipt.audit.accepted_gold_rows,0);assert.equal(receipt.audit.independent_reviewers,0);assert.equal(receipt.audit.source_input_revisions,0);assert.equal(receipt.audit.remaining_stable_allowance,null);
});
test('rehashed false acceptance,changed originals,directionality or family claims and invalid neighbors are rejected',async()=>{
 const input=await supplied();for(const [change,error]of [
  [r=>r.independent_reviewer_count=2,/not independent/],[r=>r.accepted_gold_rows=49,/not independent/],[r=>r.compiler_admission='PASS',/cannot mint/],[r=>r.candidate_predictions=54,/cannot mint/],
  [r=>r.records[0].original_bundle_sha256='0'.repeat(64),/original source/],[r=>r.records[0].original_gold_sha256='0'.repeat(64),/original source/],[r=>r.records[0].original_spans_sha256='0'.repeat(64),/original source/],
  [r=>r.records[9].proposed_positive_labels=[input.packet.rows[9].topic_id,...r.records[9].competing_topic_hypotheses],/silently relabel/],[r=>r.records[9].disposition='RETAIN_PROVISIONAL_WRITER_ONLY',/disguise/],
  [r=>r.boundary_graph.directional_source_cases=162,/directional gold/],[r=>r.boundary_graph.cards[0].neighbors[0].boundary_status='ADJUDICATED',/edge scope/],[r=>r.boundary_graph.cards[0].neighbors[0].topic_id='sys.invalid.topic',/edge scope/],
  [r=>r.boundary_graph.cards[0].neighbors[0].topic_id=input.plan.first_batch_selection.topics[1],/same-domain/],[r=>r.family_adjudication='TWO_HELDOUT_FAMILIES_QUALIFIED',/family observation/],[r=>r.resource_verdict='PASS',/qualification/]
 ]){const review=structuredClone(input.review);change(review);review.records_sha256=seedHash(canonicalJSON(review.records));assert.throws(()=>auditMechanismMatrixReview({...input,review}),error);}
 assert.throws(()=>auditMechanismMatrixReview({...input,packetUtf8:input.packetUtf8+' '}),/source identity/);assert.throws(()=>auditMechanismMatrixReview({...input,topicIds:input.topicIds.slice(1)}),/full144/);
});
test('source review audit preserves frozen inputs and separates graph bookkeeping from qualified evidence',async()=>{
 const input=await supplied(),before=canonicalJSON(input),a=auditMechanismMatrixReview(input),b=auditMechanismMatrixReview(input);assert.deepEqual(a,b);assert.equal(canonicalJSON(input),before);
 assert.equal(a.original_gold_and_spans_preserved,true);assert.equal(a.independent_quota_credit,0);assert.equal(a.adjudicated_edges,0);assert.equal(a.candidate_predictions,0);assert.equal(a.semantic_evaluations,0);assert.equal(a.data_qualification,'NOT_QUALIFIED');assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');assert.equal(a.saturation_ceiling_claim,false);
});
