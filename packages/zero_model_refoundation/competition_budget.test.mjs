import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assessHistoricalAccounting,assertDevelopmentCompetition,rawParameterSignatures} from './competition_budget.mjs';
import {canonicalJSON} from './contracts.mjs';
const digest='a'.repeat(64);
const candidate=(n)=>({candidate_id:'toy-c'+n,mechanism_id:'toy-m'+n,family_id:'toy-family'+n,dependency_sha256:digest,repair_spent:0});
const config=(n,c='toy-c1')=>({config_id:'toy-config'+n,candidate_id:c,parameters_sha256:String(n).padStart(64,'0')});
const plan=()=>({generation_number:1,candidates:[candidate(1)],configs:[config(1)],as_batches_consumed:0,evaluation_key:digest});
const history=()=>({reconciled:true,complete:true,allocations:[],retired_mechanisms:[],repair_ledger:[],consumed_evaluation_keys:[]});

test('historical metadata pins exact sources and preserves unresolved spending without a false zero allowance',async()=>{
 const inventory=JSON.parse(await readFile(new URL('../../data/zero_model_refoundation/development/development_competition_inventory_v0.1.json',import.meta.url),'utf8'));
 assert.equal(inventory.registrations.length,13);assert.equal(inventory.raw_non_A0_parameter_signature_count,25);
 const paths=new Set();
 for(const source of inventory.registrations){
  assert(source.path.startsWith('data/zero_model_refoundation/development/')&&source.path.endsWith('_registration.json')&&!source.path.includes('..'));
  assert(!paths.has(source.path));paths.add(source.path);
  const bytes=await readFile(new URL('../../'+source.path,import.meta.url));
  const blob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  assert.equal(blob,source.git_blob);assert.equal(canonicalJSON(JSON.parse(bytes)),canonicalJSON(source.metadata));
  assert.equal(source.metadata.independent_rows,0);assert.equal(source.metadata.as_consumed,0);
 }
 const assessment=assessHistoricalAccounting(inventory);
 assert.equal(assessment.new_stable_competition,'HOLD_PENDING_ACCOUNTING_RECONCILIATION');
 assert.equal(assessment.stable_configuration_allowance_remaining,null);
 assert(assessment.allowed_tracks.includes('PROVISIONAL_DATA_INTAKE'));
 assert.equal(inventory.carried_repairs.find(x=>x.source_field==='rounds.ZMR-05.a6_complement_repair_spent').spent,2);
 const status=JSON.parse(await readFile(new URL('../../status/ZERO_MODEL_REFOUNDATION_STATUS.json',import.meta.url),'utf8'));
 assert.equal(inventory.carried_repairs.length,11);
 for(const r of inventory.carried_repairs)assert.equal(r.spent,r.source_field.split('.').reduce((v,k)=>v[k],status));
 const bad=structuredClone(inventory);bad.stable_configuration_allowance_remaining=12;assert.throws(()=>assessHistoricalAccounting(bad),/conservative/);
 assert.equal(rawParameterSignatures([{configs:[{id:'first',family:'toy',mode:'char'},{id:'alias',mode:'char',family:'toy'}]}]).length,1);
});

test('limits count previous allocations; failed or retired candidates remain spent',()=>{
 let p=plan(),h=history();assert.equal(assertDevelopmentCompetition(p,h).stable_configs,1);
 h.allocations=[{generation_number:1,candidates:[candidate(2)],configs:[config(2,'toy-c2')],as_batches_consumed:0}];h.retired_mechanisms=['toy-m2'];assert.equal(assertDevelopmentCompetition(p,h).candidates,2);
 h.allocations=[{generation_number:1,candidates:Array.from({length:6},(_,i)=>candidate(i+2)),configs:Array.from({length:6},(_,i)=>config(i+2,'toy-c'+(i+2))),as_batches_consumed:0}];
 assert.throws(()=>assertDevelopmentCompetition(p,h),/candidate budget/);
 h=history();h.allocations=[{generation_number:1,candidates:[candidate(2)],configs:Array.from({length:12},(_,i)=>config(i+2,'toy-c2')),as_batches_consumed:0}];
 assert.throws(()=>assertDevelopmentCompetition(p,h),/configuration budget/);
 h=history();h.allocations=[{generation_number:1,candidates:[candidate(2)],configs:[config(2,'toy-c2')],as_batches_consumed:1}];p.as_batches_consumed=1;assert.throws(()=>assertDevelopmentCompetition(p,h),/AS batch/);
});

test('unreconciled history, repair reset, retired aliases and unchanged consumption reject',()=>{
 let p=plan(),h=history();h.reconciled=false;assert.throws(()=>assertDevelopmentCompetition(p,h),/unreconciled/);
 h=history();h.repair_ledger=[{mechanism_id:'toy-m1',spent:2}];assert.throws(()=>assertDevelopmentCompetition(p,h),/reset/);
 p.candidates[0].repair_spent=2;assert.equal(assertDevelopmentCompetition(p,h).classification,'DEVELOPMENT_ACCOUNTING_METADATA_ONLY');
 h.retired_mechanisms=['toy-m1'];p.candidates[0].candidate_id='renamed';p.configs[0].candidate_id='renamed';assert.throws(()=>assertDevelopmentCompetition(p,h),/retired/);
 h=history();p=plan();p.generation_number=7;assert.throws(()=>assertDevelopmentCompetition(p,h),/generation budget/);
 p=plan();h.consumed_evaluation_keys=[digest];assert.throws(()=>assertDevelopmentCompetition(p,h),/already consumed/);
 h=history();h.allocations=[{generation_number:7}];assert.throws(()=>assertDevelopmentCompetition(p,h),/historical generation/);
 h=history();p.configs.push({...p.configs[0],config_id:'renamed'});assert.throws(()=>assertDevelopmentCompetition(p,h),/same config renamed/);
});
