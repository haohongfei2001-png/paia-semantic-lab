import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {assertDevelopmentCompetition} from './competition_budget.mjs';
import {auditLaterDiagnostics} from './later_diagnostic_audit.mjs';
const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const at=(v,p)=>p.split('.').reduce((v,k)=>v?.[k],v);
async function fixture(){
 const receipt=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-06_LATER_DIAGNOSTIC_AUDIT_RESULT.json'));
 const rb=await read(receipt.recipe_path);assert.equal(sha(rb),receipt.recipe_sha256);const recipe=JSON.parse(rb);
 const ib=await read(recipe.inventory_path);assert.equal(blob(ib),recipe.inventory_git_blob);assert.equal(sha(ib),recipe.inventory_sha256);
 const status=JSON.parse(await read('status/ZERO_MODEL_REFOUNDATION_STATUS.json'));
 for(const g of recipe.groups)for(const field of [g.repair_source_field,g.disposition_source_field,g.report_source_field])assert.equal(at(status,field),at(recipe.historical_status_projection,field));
 const sources={};for(const d of recipe.code_dependencies){assert(/^packages\/zero_model_refoundation\/[a-z0-9_]+\.mjs$/.test(d.path));const b=await read(d.path);assert.equal(blob(b),d.git_blob);assert.equal(sha(b),d.sha256);sources[d.path]=b.toString();}
 const records=[];for(const r of recipe.records){assert(/^docs\/zero-model-refoundation-v1\/ZMR-0[24]_[A-Z0-9_]+_RESULT\.json$/.test(r.aggregate_path));const b=await read(r.aggregate_path);assert.equal(blob(b),r.aggregate_git_blob);assert.equal(sha(b),r.aggregate_sha256);records.push({...r,aggregate:JSON.parse(b),sources});}
 for(const d of receipt.engineering_dependencies)assert.equal(sha(await read(d.path)),d.sha256);
 return {receipt,args:{inventory:JSON.parse(ib),status:recipe.historical_status_projection,groups:recipe.groups,records}};
}
test('nine original public aggregates verify two keys and five repair links while seven missing keys remain missing',async()=>{
 const {receipt,args}=await fixture(),a=auditLaterDiagnostics(args);assert.equal(canonicalJSON(a),canonicalJSON(receipt.audit));assert.equal(canonicalJSON(a),canonicalJSON(auditLaterDiagnostics(args)));
 assert.equal(a.diagnostic_count,9);assert.equal(a.original_public_keys_reconstructed,2);assert.equal(a.missing_original_public_keys,7);assert.equal(a.original_module_digest_mentions_verified,19);assert.equal(a.original_index_digest_mentions,14);assert.equal(a.distinct_original_recorded_index_digests,6);assert.equal(a.repair_receipt_links_verified,5);assert.equal(a.combined_recorded_key_count,15);
 assert.equal(a.diagnostics_without_original_code_digest,1);assert.equal(a.diagnostics_without_original_index_digest,1);
 assert.equal(a.events[0].original_evaluation_key,null);assert.deepEqual(a.events[0].recorded_index_pins,[]);assert.deepEqual(a.events[1].recorded_code_pins,[]);
 assert.equal(a.events[1].diagnostic_pin_scope,'CURRENT_SUPPLIED_SOURCE_NOT_COMPLETE_ORIGINAL_RUNTIME_CLOSURE');
 assert.deepEqual(a.preserved_groups.map(g=>g.repair_spent),[1,1,2,1]);assert.equal(a.stable_configuration_allowance_remaining,null);assert.equal(a.semantic_evaluations,0);assert.equal(a.source_packet_reads,0);assert.equal(a.independent_generation_credit,0);assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');
 assert.throws(()=>assertDevelopmentCompetition({},a),/historical accounting unreconciled/);
});
test('receipt linkage, original keys and partial code pins cannot be replaced or silently completed',async()=>{
 const {args}=await fixture();for(const [change,error] of [
  [x=>x.records[1].aggregate.initial_result_sha256='a'.repeat(64),/prior receipt/],
  [x=>x.records[1].aggregate.cohort_sha256='a'.repeat(64),/repair lineage/],
  [x=>x.records[6].prior_path=x.records[4].aggregate_path,/repair lineage/],
  [x=>x.records[3].aggregate.evaluation_status='FRESH_GATE',/promoted to fresh/],
  [x=>x.records[7].aggregate.configs.min_score=.1,/key reconstruction/],
  [x=>x.records[7].aggregate.evaluation_key='a'.repeat(64),/key reconstruction/],
  [x=>x.records[0].aggregate.evaluation_key='a'.repeat(64),/recipe unsupported/],
  [x=>x.records[0].sources['packages/zero_model_refoundation/h1_recall_initial.mjs']+='changed',/module receipt/],
  [x=>x.records[4].code_bindings=[],/binding coverage/],
  [x=>x.records[5].code_bindings.push({...x.records[5].code_bindings[0]}),/duplicate or unsafe/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>auditLaterDiagnostics(m),error);}
});
test('retired aliases, spent repairs and missing event allocations never refund historical budget',async()=>{
 const {args}=await fixture();for(const [change,error] of [
  [x=>x.groups[0].repair_spent=0,/repair counter/],
  [x=>x.status.rounds['ZMR-04'].h1_r1_repair_spent=0,/repair counter/],
  [x=>x.groups[0].candidate_id='NEW_ALIAS',/repair counter/],
  [x=>x.status.rounds['ZMR-04'].h1_component_disposition='ACTIVE',/retirement/],
  [x=>x.groups[2].disposition='ACTIVE',/retirement/],
  [x=>x.records.pop(),/event coverage/],
  [x=>x.records.push({...x.records[0]}),/duplicate later aggregate/],
  [x=>x.groups.push({...x.groups[0]}),/duplicate later group/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>auditLaterDiagnostics(m),error);}
});
test('full144 and evidence limits apply even to metadata with no original index or module digest',async()=>{
 const {args}=await fixture();for(const [change,error] of [
  [x=>x.records[0].aggregate.topic_universe=143,/evidence boundary/],
  [x=>x.records[1].aggregate.independent_rows=1,/evidence boundary/],
  [x=>x.records[0].aggregate.as_consumed=1,/evidence boundary/],
  [x=>x.records[0].aggregate.resource_verdict='PASS',/evidence boundary/],
  [x=>x.records[7].aggregate.builds.balanced.resource_verdict='PASS',/resource promotion/],
  [x=>x.records[7].aggregate.builds.balanced.catalog_sha256='a'.repeat(64),/source identities/],
  [x=>x.records[7].aggregate.builds.balanced.index_bytes=NaN,/build metadata/],
  [x=>x.records[4].aggregate.a3_index_sha256='invalid',/index digest/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>auditLaterDiagnostics(m),error);}
});
