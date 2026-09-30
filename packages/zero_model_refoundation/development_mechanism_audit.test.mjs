import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditDevelopmentMechanisms} from './development_mechanism_audit.mjs';
import {reviewDigest} from './development_review_journal.mjs';
const root=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8'),json=async p=>JSON.parse(await read(p)),sha=s=>createHash('sha256').update(s).digest('hex');
const D='data/zero_model_refoundation/development/';
async function supplied(){
 const registry=await json(D+'development_review_registry_v0.1.json'),trainManifest=await json(D+'provisional_train_v0.4_manifest.json');
 return {catalogUtf8:await read('catalog/system_topic_catalog_v0.2.yaml'),registry,journal:await json(D+'development_review_journal_v0.13.json'),packets:await Promise.all(registry.source_packets.map(async p=>({path:p.path,utf8:await read(p.path)}))),trainManifest,trainPlanUtf8:await read(D+'provisional_train_v0.4_plan.json'),trainPackets:await Promise.all(trainManifest.slices.map(async p=>({path:p.path,utf8:await read(p.path)})))};
}

test('actual registered TRAIN432/DEV1200 name and mechanism census keeps every hold in the original denominator',async()=>{
 const args=await supplied(),result=await json('docs/zero-model-refoundation-v1/ZMR-03_DEV_V04_MECHANISM_AUDIT_RESULT.json'),before=reviewDigest(args),a=auditDevelopmentMechanisms(args);
 assert.deepEqual(a,result.audit);assert.equal(reviewDigest(args),before);assert.equal(a.source_rows,1632);assert.equal(a.train_rows,432);assert.equal(a.dev_rows,1200);assert.equal(a.reviewed_dev_rows,1200);assert.equal(a.ordinary_dev_rows,864);assert.equal(a.journal_sha256,'cce80d003f91ed34c5be019cb19f97259cd89dcdc864e7a3ad22508e15e7cff2');assert.equal(a.journal_tail_sha256,'b7476038d982cd9f440da963455ae5ee3f79509c1da6405b245e3eb493308626');
 assert.deepEqual(a.review_dispositions,{LABEL_IDENTIFIABILITY_HOLD:100,PROPOSE_REVISION:782,RETAIN_PROVISIONAL:318});assert.equal(a.per_topic.length,144);assert(a.per_topic.every(t=>t.train_rows===3&&t.ordinary_dev_rows===6&&t.train_declared_mechanisms.length===3&&t.dev_declared_mechanisms.length===1&&t.nominal_dev_labels_absent_from_train.length===1&&t.formal_heldout_families_minimum===2&&t.independent_scenario_credit===0));
 for(const [split,count]of [['TUNE_PROVISIONAL',78],['CAL_PROVISIONAL',142]]){const v=a.literal_name_presence[split];assert.equal(v.rows,432);assert.equal(Object.values(v.review_dispositions).reduce((n,x)=>n+x,0),432);assert.equal(v.literal_presence_rows,count);assert.equal(v.formal_name_echo_limit,.1);assert.equal(v.adjudicated_fraction,null);assert.equal(v.verdict,'NOT_ADJUDICATED_NO_PASS');assert.equal(a.literal_flags.filter(f=>f.split===split).length,count);assert(v.review_dispositions.LABEL_IDENTIFIABILITY_HOLD>0);}
 assert.equal(a.literal_flags.length,220);assert(a.literal_flags.some(f=>f.review_disposition==='LABEL_IDENTIFIABILITY_HOLD'));assert(a.literal_flags.every(f=>f.proposal_acceptance==='UNACCEPTED_NO_SOURCE_OR_GATE_CHANGE'));assert.equal(a.factor_matrix.train_rows_with_action_object_qualifier,432);assert.equal(a.factor_matrix.ordinary_dev_rows_with_action_object_qualifier,0);
 for(const pin of [...result.input_pins,...result.engineering_dependencies]){const bytes=await read(pin.path);assert.equal(sha(bytes),pin.sha256,pin.path);if(pin.git_blob)assert.equal(createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(bytes)+'\0')).update(bytes).digest('hex'),pin.git_blob,pin.path);}
});

test('nominal mechanism names cannot certify heldout families or independent groups across TRAIN/TUNE/CAL',async()=>{
 const a=auditDevelopmentMechanisms(await supplied());
 assert.deepEqual(a.train_language_mechanism_counts,{'zh / problem-or-constraint-first':144,'en / indirect-need-or-result-first':144,'mixed / comparison-or-correction':144});assert.deepEqual(a.ordinary_dev_language_mechanism_counts,{'zh / ordinary-current-subject':288,'en / ordinary-current-subject':288,'mixed / ordinary-current-subject':288});
 assert.deepEqual(a.lineage_components,[{rows:1632,splits:['CAL_PROVISIONAL','TRAIN_PROVISIONAL','TUNE_PROVISIONAL'],writer_cohorts:['candidate-writer-G0']}]);assert.equal(a.cross_split_components,1);assert.equal(a.declared_lineage_component_count,1);assert.equal(a.source_license_review.declaration_rows,1632);assert.equal(a.source_license_review.independent_reviews,0);assert.equal(a.source_quota_observations.train_raw_base_scenario_shortfall,3024);assert.equal(a.source_quota_observations.ordinary_raw_shortfall.rows,864);assert.equal(a.source_quota_observations.independent_quota_credit,0);
 assert.equal(a.heldout_mechanism_verdict,'NOT_ADJUDICATED_NO_QUALIFIED_FAMILY_EQUIVALENCE');assert.equal(a.grouped_uncertainty,'UNAVAILABLE_SINGLE_WRITER_LINEAGE_COMPONENT');assert.equal(a.remaining_competition_allowance,null);assert.equal(a.saturation_ceiling_claim,false);assert.equal(a.sealed_overlap_claim,false);for(const k of ['review_credit','candidate_prediction_exposures','semantic_evaluations','source_mutations','new_source_intake_revisions','independent_mechanism_reviews'])assert.equal(a[k],0);assert.equal(a.data_qualification,'NOT_QUALIFIED');assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');
});

test('mechanism census refuses positive credit, partial review, altered sources and duplicate TRAIN paths',async()=>{
 const original=await supplied();for(const [change,error]of [
  [a=>a.trainManifest.independent_source_cohorts=1,/independence cannot/],
  [a=>a.journal.records.pop(),/complete original source review/],
  [a=>a.packets[0].utf8+=' ',/byte digest/],
  [a=>a.trainPackets.push(a.trainPackets[0]),/duplicate TRAIN/],
  [a=>a.journal.records[0].independent=true,/cannot claim independent/],
  [a=>a.catalogUtf8+=' ',/Catalog bytes changed/]
 ]){const changed=structuredClone(original);change(changed);assert.throws(()=>auditDevelopmentMechanisms(changed),error);}
});
