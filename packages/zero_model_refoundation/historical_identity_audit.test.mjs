import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {assertDevelopmentCompetition} from './competition_budget.mjs';
import {auditHistoricalIdentities,literalComparatorClosure} from './historical_identity_audit.mjs';
const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
const json=async p=>JSON.parse(await read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
async function fixture(){
 const receipt=await json('docs/zero-model-refoundation-v1/ZMR-06_HISTORICAL_IDENTITY_AUDIT_RESULT.json');
 const rb=await read(receipt.recipe_path);assert.equal(sha(rb),receipt.recipe_sha256);
 const recipe=JSON.parse(rb),ib=await read(recipe.inventory_path);
 assert.equal(blob(ib),recipe.inventory_git_blob);assert.equal(sha(ib),recipe.inventory_sha256);
 const inventory=JSON.parse(ib),sources={};
 for(const dep of recipe.code_dependencies){const b=await read(dep.path);assert.equal(blob(b),dep.git_blob);assert.equal(sha(b),dep.sha256);sources[dep.path]=b.toString('utf8');}
 const records=[];
 for(const r of recipe.records){
  assert(/^data\/zero_model_refoundation\/development\/[a-z0-9_]+_registration\.json$/.test(r.registration_path));
  assert(/^docs\/zero-model-refoundation-v1\/ZMR-0[345]_[A-Z0-9_]+_RESULT\.json$/.test(r.aggregate_path));
  const reg=await read(r.registration_path),ab=await read(r.aggregate_path);
  assert.equal(blob(reg),r.registration_git_blob);assert.equal(blob(ab),r.aggregate_git_blob);assert.equal(sha(ab),r.aggregate_sha256);
  assert.equal(canonicalJSON(JSON.parse(reg)),canonicalJSON(inventory.registrations.find(x=>x.path===r.registration_path).metadata));
  records.push({...r,aggregate:JSON.parse(ab),sources});
 }
 for(const d of receipt.engineering_dependencies)assert.equal(sha(await read(d.path)),d.sha256);
 return {receipt,recipe,args:{inventory,records}};
}

test('actual13 closures and61 original receipt mappings reconstruct9 index identities without replay or budget clearance',async()=>{
 const {receipt,args}=await fixture(),actual=auditHistoricalIdentities(args);
 assert.equal(canonicalJSON(actual),canonicalJSON(receipt.audit));assert.equal(canonicalJSON(actual),canonicalJSON(auditHistoricalIdentities(args)));
 assert.equal(actual.registration_count,13);assert.equal(actual.whole_registered_closures_matched,13);assert.equal(actual.configuration_mentions,61);assert.equal(actual.non_A0_configuration_mentions,53);
 assert.equal(actual.distinct_recorded_index_digests,9);assert.equal(actual.non_A0_route_index_parameter_identities,29);
 assert.equal(actual.semantic_evaluations,0);assert.equal(actual.source_packet_reads,0);assert.equal(actual.independent_generation_credit,0);assert.equal(actual.stable_configuration_allowance_remaining,null);
 assert.equal(actual.index_verification,'ORIGINAL_AGGREGATE_RECEIPT_IDENTITIES_ONLY_NO_INDEX_REBUILD_OR_BYTE_REHASH');
 assert.equal(actual.new_stable_competition,'HOLD_PENDING_ACCOUNTING_RECONCILIATION');assert.equal(actual.capability_verdict,'UNTESTED');assert.equal(actual.resource_verdict,'NOT_QUALIFIED');
 assert.throws(()=>assertDevelopmentCompetition({},actual),/historical accounting unreconciled/);
});

test('historical code and public consumption identity mutations are rejected before any execution',async()=>{
 const {args}=await fixture();
 for(const [change,error] of [
  [x=>x.records.pop(),/coverage incomplete/],
  [x=>x.records[1].registration_path=x.records[0].registration_path,/registration identity|duplicate/],
  [x=>x.records[0].aggregate.evaluation_key='a'.repeat(64),/registration identity/],
  [x=>x.records[0].aggregate.identity.compiler_sha256='b'.repeat(64),/registration identity/],
  [x=>x.records[0].sources['packages/zero_model_refoundation/a1.mjs']+='\n// changed historical source\n',/code closure mismatch/],
  [x=>delete x.records[0].sources['packages/zero_model_refoundation/a2.mjs'],/historical source missing/],
  [x=>x.records[0].aggregate.independent_rows=1,/evidence boundary/],
  [x=>x.records[0].aggregate.resource_verdict='PASS',/evidence boundary/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>auditHistoricalIdentities(m),error);}
});

test('binding completeness, route linkage and index provenance cannot be silently replaced by display IDs',async()=>{
 const {args}=await fixture();
 for(const [change,error] of [
  [x=>x.records[0].bindings.pop(),/binding coverage/],
  [x=>x.records[0].bindings[2].family='A3',/binding mismatch/],
  [x=>x.records[0].bindings[2].route_symbol='routeMissing',/export or callsite/],
  [x=>x.records[0].bindings[2].route_root='packages/zero_model_refoundation/a7_case_memory.mjs',/route binding/],
  [x=>x.records[0].bindings[2].index_selectors=[],/index binding missing/],
  [x=>x.records[0].bindings[2].index_selectors.push({...x.records[0].bindings[2].index_selectors[0]}),/duplicate index selector/],
  [x=>x.records[0].bindings[2].mode='word',/index mode mismatch/],
  [x=>x.records[0].aggregate.builds.A1_char.index_bytes=NaN,/recorded index receipt/],
  [x=>x.records[0].aggregate.builds.A1_char.topic_count=143,/recorded index receipt/],
  [x=>x.records[0].aggregate.builds.A1_char.catalog_sha256='a'.repeat(64),/recorded index receipt/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>auditHistoricalIdentities(m),error);}
});

test('literal closure parsing refuses dynamic source execution and unsafe paths',()=>{
 const p='packages/zero_model_refoundation/a1.mjs';
 assert.deepEqual(literalComparatorClosure("const CLOSURE=['"+p+"'];"),[p]);
 for(const source of ["const CLOSURE=[...other];","const CLOSURE=['../legacy.mjs'];","const CLOSURE=['"+p+"', '"+p+"'];","const CLOSURE=[doWork()];"]){
  assert.throws(()=>literalComparatorClosure(source),/nonliteral or unsafe/);
 }
});
