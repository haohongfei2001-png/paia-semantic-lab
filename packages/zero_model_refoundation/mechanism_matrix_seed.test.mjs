import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalJSON} from './contracts.mjs';
import {seedHash,auditMechanismMatrixSeed} from './mechanism_matrix_seed.mjs';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
async function supplied(){
 const planUtf8=await read('data/zero_model_refoundation/development/development_mechanism_matrix_plan_v0.1.json'),plan=JSON.parse(planUtf8),seedUtf8=await read('data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json'),packet=JSON.parse(seedUtf8),catalogUtf8=await read('catalog/system_topic_catalog_v0.2.yaml'),topicIds=[...catalogUtf8.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);
 return {planUtf8,plan,packet,topicIds,seedUtf8,catalogUtf8};
}
test('actual frozen draft and receipt bind source/plan/code identities;full144 denominator and zero qualification retained',async()=>{
 const input=await supplied(),r=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-03_MECHANISM_MATRIX_TRAIN_SEED_RESULT.json'));
 for(const pin of [...r.input_pins,...r.code_pins])assert.equal(seedHash(await read(pin.path)),pin.sha256,pin.path);
 assert.equal(seedHash(input.catalogUtf8),input.packet.catalog_sha256);assert.equal(input.packet.registration_main,'d54a12fb6fdbeff0cd2f9138a8a22376ab08d61a');assert.equal(input.packet.registration_tree,'fb10b1e816a2e9116fe8b4d4cb3fa7d609aeaf6c');
 assert.deepEqual(auditMechanismMatrixSeed(input),r.audit);assert.equal(r.rows_sha256,input.packet.rows_sha256);assert.equal(r.audit.full_topic_universe,144);assert.equal(r.audit.source_topics,18);assert.equal(r.audit.missing_topics.length,126);assert.deepEqual(r.audit.language_counts,{zh:18,en:18,mixed:18});assert.equal(r.audit.raw_train_remaining,3402);
 assert.equal(r.audit.accepted_rows,0);assert.equal(r.audit.independent_quota_credit,0);assert.equal(r.audit.independent_scenario_count,null);assert.equal(r.audit.writer_lineage_components,1);assert.equal(r.audit.candidate_predictions,0);assert.equal(r.audit.remaining_stable_allowance,null);assert.equal(input.packet.rows.filter(r=>r.mechanism_family==='mf-context-continuation').length,7);
 assert.equal(r.audit.within_packet_near_duplicate_flags.length,0);assert.equal(r.audit.own_literal_name_proxy.adjudicated_echo_fraction,null);assert(input.packet.rows.every(r=>r.provisional_gold.excluded_topics.length===0));
});
test('rehashed counterfeit metadata,span,bundle,context,split or nominal credit cannot bypass source guards',async()=>{
 const input=await supplied();for(const [change,error]of [
  [p=>p.accepted_rows=54,/cannot mint/],[p=>p.independent_quota_credit=1,/cannot mint/],[p=>p.candidate_prediction_exposures=1,/cannot mint/],[p=>p.new_competition_generations=1,/cannot mint/],
  [p=>p.rows[0].spans[0].start++,/UTF16/],[p=>p.rows[0].factors.object='substituted goal',/factors/],[p=>p.rows[0].split='DEV_CAL',/allocation/],[p=>p.rows[0].writer_cohort='independent-agent',/provenance/],
  [p=>p.rows[0].provisional_gold.topics.push(input.topicIds[1]),/label universe/],[p=>p.rows[0].lineage.template_review='CERTIFIED_UNIQUE',/lineage/],[p=>p.rows[0].independent_reviewer_count=2,/independence/],
  [p=>{const r=p.rows[3];r.input.recent=[];r.bundle_sha256=seedHash(canonicalJSON(r.input));},/antecedent/],
  [p=>{p.rows[1].input.current=p.rows[0].input.current;p.rows[1].input_sha256=p.rows[0].input_sha256;p.rows[1].normalized_current_sha256=p.rows[0].normalized_current_sha256;p.rows[1].bundle_sha256=seedHash(canonicalJSON(p.rows[1].input));},/duplication/],
  [p=>p.near_duplicate_screen.scope='ALL_HISTORY_SEALED_ZERO_OVERLAP',/screen scope/],[p=>p.resource_verdict='PASS',/qualification/]
 ]){const packet=structuredClone(input.packet);change(packet);packet.rows_sha256=seedHash(canonicalJSON(packet.rows));assert.throws(()=>auditMechanismMatrixSeed({...input,packet}),error);}
 assert.throws(()=>auditMechanismMatrixSeed({...input,topicIds:input.topicIds.slice(0,18)}),/full144/);
 assert.throws(()=>auditMechanismMatrixSeed({...input,planUtf8:input.planUtf8+' '}),/identity/);
});
test('pure source audit is deterministic,does not alter original bundles or assert semantic families/group independence',async()=>{
 const input=await supplied(),before=canonicalJSON(input.packet),a=auditMechanismMatrixSeed(input),b=auditMechanismMatrixSeed(input);assert.deepEqual(a,b);assert.equal(canonicalJSON(input.packet),before);
 assert.equal(a.semantic_family_equivalence,'UNADJUDICATED_POSSIBLE_OVERLAP');assert.equal(a.old_source_overlap_review,'NOT_PERFORMED_NO_LEGACY_OR_SEALED_READS');assert.equal(a.data_qualification,'NOT_QUALIFIED');assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');assert.equal(a.saturation_ceiling_claim,false);
});
