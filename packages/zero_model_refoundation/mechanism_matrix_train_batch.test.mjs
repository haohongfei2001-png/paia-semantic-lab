import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalJSON} from './contracts.mjs';
import {seedHash} from './mechanism_matrix_seed.mjs';
import {auditMechanismMatrixTrainBatch} from './mechanism_matrix_train_batch.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
async function supplied(){
 const planUtf8=await read('data/zero_model_refoundation/development/development_mechanism_matrix_plan_v0.1.json'),seedUtf8=await read('data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json'),reviewUtf8=await read('data/zero_model_refoundation/development/mechanism_matrix_train_seed_review_v0.1.json'),packet=JSON.parse(await read('data/zero_model_refoundation/development/mechanism_matrix_train_part2_v0.1.json')),plan=JSON.parse(planUtf8),seed=JSON.parse(seedUtf8),review=JSON.parse(reviewUtf8),catalog=await read('catalog/system_topic_catalog_v0.2.yaml'),topicIds=[...catalog.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);return {packet,plan,planUtf8,seed,seedUtf8,review,reviewUtf8,topicIds};
}
test('actual part2 source and prior seed/review identity produce108 drafts/36Topics with144 denominator and zero qualification',async()=>{
 const input=await supplied(),receipt=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_MECHANISM_MATRIX_TRAIN_PART2_RESULT.json'));for(const pin of [...receipt.input_pins,...receipt.code_pins])assert.equal(seedHash(await read(pin.path)),pin.sha256,pin.path);
 const a=auditMechanismMatrixTrainBatch(input);assert.deepEqual(a,receipt.audit);assert.equal(a.combined_source_rows,108);assert.equal(a.combined_source_topics,36);assert.equal(a.full_topic_universe,144);assert.equal(a.missing_topics.length,108);assert.equal(a.remaining_raw_train_rows,3348);assert.deepEqual(a.remaining_raw_language_rows,{zh:1692,en:1116,mixed:540});assert.deepEqual(a.combined_language_counts,{zh:36,en:36,mixed:36});
 assert.equal(a.prior_reviewed_rows,54);assert.equal(a.prior_label_holds,5);assert.equal(a.new_source_writer_qa,'PENDING');assert.equal(a.new_continuation_source_rows,4);assert.equal(a.accepted_rows,0);assert.equal(a.independent_quota_credit,0);assert.equal(a.independent_scenario_count,null);assert.equal(a.qualified_heldout_family_count,null);assert.equal(a.remaining_stable_allowance,null);assert.equal(a.new_and_seed_near_duplicate_flags.length,0);
 for(const cells of Object.values(a.combined_nominal_family_language_matrix))assert(Object.values(cells).every(n=>n>0));assert.equal(a.own_literal_name_proxy.adjudicated_echo_fraction,null);assert.equal(receipt.rows_sha256,input.packet.rows_sha256);
});
test('rehashed fake admission,old-seed duplicates,changed role/lineage/context or first-card reuse fail before evaluation',async()=>{
 const input=await supplied();for(const [change,error]of [
  [p=>p.baseline_seed_path='data/private.json',/source paths/],[p=>p.independent_quota_credit=1,/cannot mint/],[p=>p.accepted_rows=54,/cannot mint/],[p=>p.new_competition_generations=1,/cannot mint/],[p=>p.capability_verdict='PASS',/qualification/],
  [p=>p.rows[0].topic_id=input.seed.rows[0].topic_id,/allocation/],[p=>p.rows[0].spans[0].end--,/UTF16/],[p=>p.rows[0].factors.object='wrong object',/factor\/span/],[p=>p.rows[0].lineage.writer='independent-actor',/lineage/],[p=>p.rows[0].provisional_gold.excluded_topics=[input.topicIds[2]],/labels\/holds/],
  [p=>{const r=p.rows[7];r.input.recent=[];r.bundle_sha256=seedHash(canonicalJSON(r.input));},/antecedent/],
  [p=>{const r=p.rows[0],s=input.seed.rows[0];r.input=s.input;r.input_sha256=s.input_sha256;r.normalized_current_sha256=s.normalized_current_sha256;r.bundle_sha256=s.bundle_sha256;},/duplicate/],
  [p=>p.near_duplicate_screen.scope='ALL_HISTORY_OR_SEALED_ZERO_OVERLAP',/screen scope/]
 ]){const packet=structuredClone(input.packet);change(packet);packet.rows_sha256=seedHash(canonicalJSON(packet.rows));assert.throws(()=>auditMechanismMatrixTrainBatch({...input,packet}),error);}
 assert.throws(()=>auditMechanismMatrixTrainBatch({...input,topicIds:input.topicIds.slice(0,36)}),/full144/);assert.throws(()=>auditMechanismMatrixTrainBatch({...input,seedUtf8:input.seedUtf8+' '}),/source identity/);
 const plan=structuredClone(input.plan);plan.budget.coverage_floor=.69;assert.throws(()=>auditMechanismMatrixTrainBatch({...input,plan}),/product constraints/);
});
test('source census is deterministic and keeps prior source/gold/holds immutable without claiming independent mechanisms',async()=>{
 const input=await supplied(),before=canonicalJSON(input),a=auditMechanismMatrixTrainBatch(input),b=auditMechanismMatrixTrainBatch(input);assert.deepEqual(a,b);assert.equal(canonicalJSON(input),before);assert.equal(a.writer_lineage_components,1);assert.equal(a.candidate_predictions,0);assert.equal(a.semantic_evaluations,0);assert.equal(a.new_competition_generations,0);assert.equal(a.old_v04_or_sealed_overlap_review,'NOT_PERFORMED_NO_OLD_OR_SEALED_READS');assert.equal(a.data_qualification,'NOT_QUALIFIED');assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');assert.equal(a.saturation_ceiling_claim,false);
});
