import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {joinHistoricalRegistrations} from './historical_registration_join.mjs';
import {assertDevelopmentCompetition} from './competition_budget.mjs';
import {canonicalJSON} from './contracts.mjs';
const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
const json=async p=>JSON.parse(await read(p));
const hash=(algorithm,b)=>createHash(algorithm).update(b).digest('hex');
const blob=b=>hash('sha1',Buffer.concat([Buffer.from('blob '+b.length+'\0'),b]));
async function fixture(){
 const receipt=await json('docs/zero-model-refoundation-v1/ZMR-06_HISTORICAL_REGISTRATION_JOIN_RESULT.json');
 const bytes=await read(receipt.inventory_path);assert.equal(blob(bytes),receipt.inventory_git_blob);assert.equal(hash('sha256',bytes),receipt.inventory_sha256);
 const inventory=JSON.parse(bytes),status=await json('status/ZERO_MODEL_REFOUNDATION_STATUS.json');
 return {receipt,args:{inventory,status,report_links:receipt.report_links}};
}

test('actual public metadata joins61 configuration mentions and11 repair reports without allocating stable credit',async()=>{
 const {receipt,args}=await fixture(),audit=joinHistoricalRegistrations(args);
 assert.equal(canonicalJSON(audit),canonicalJSON(receipt.audit));assert.equal(canonicalJSON(audit),canonicalJSON(joinHistoricalRegistrations(args)));
 for(const r of args.inventory.registrations){const b=await read(r.path);assert.equal(blob(b),r.git_blob);assert.equal(canonicalJSON(JSON.parse(b)),canonicalJSON(r.metadata));}
 for(const r of receipt.report_links){const b=await read(r.report_path);assert.equal(blob(b),r.report_git_blob);assert.equal(hash('sha256',b),r.report_sha256);}
 for(const dep of receipt.engineering_dependencies)assert.equal(hash('sha256',await read(dep.path)),dep.sha256);
 assert.equal(audit.registration_count,13);assert.equal(audit.configuration_mentions,61);assert.equal(audit.non_A0_configuration_mentions,53);assert.equal(audit.raw_non_A0_parameter_signature_count,25);
 assert.equal(audit.recorded_public_evaluation_keys.length,13);assert.equal(audit.repair_field_count,11);assert.equal(audit.stable_configuration_allowance_remaining,null);assert.equal(audit.independent_generation_credit,0);assert.equal(audit.semantic_evaluations,0);
 assert(audit.registration_events.every(r=>!r.explicit_candidate_allocations_recorded&&!r.explicit_stable_selection_event_recorded));
 assert(audit.repair_report_links.every(r=>r.retirement_preserved));assert.equal(audit.capability_verdict,'UNTESTED');assert.equal(audit.resource_verdict,'NOT_QUALIFIED');assert.equal(audit.new_stable_competition,'HOLD_PENDING_ACCOUNTING_RECONCILIATION');
 assert.throws(()=>assertDevelopmentCompetition({},audit),/historical accounting unreconciled/);
});

test('metadata joins reject duplicate consumption identities and forged source or qualification fields',async()=>{
 const {args}=await fixture();
 for(const [change,error] of [
  [x=>x.inventory.registrations[1].path=x.inventory.registrations[0].path,/duplicate registration/],
  [x=>x.inventory.registrations[1].metadata.evaluation_key=x.inventory.registrations[0].metadata.evaluation_key,/historical evaluation key/],
  [x=>x.inventory.registrations[0].metadata.independent_rows=1,/evidence boundary/],
  [x=>x.inventory.registrations[0].metadata.identity.generation_id='GEN1',/public packet identity/],
  [x=>x.inventory.registrations[0].metadata.identity.compiler_sha256=null,/closure digest missing/],
  [x=>x.inventory.registrations[0].git_blob='bad',/registration pin/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>joinHistoricalRegistrations(m),error);}
});

test('metadata joins reject retirement erasure, repair reset and disconnected canonical report pointers',async()=>{
 const {args}=await fixture();
 for(const [change,error] of [
  [x=>x.report_links.pop(),/coverage incomplete/],
  [x=>x.report_links[1].source_field=x.report_links[0].source_field,/duplicate repair report/],
  [x=>x.status.rounds['ZMR-04'].a4_role_repair_spent=0,/repair spending changed/],
  [x=>x.inventory.carried_repairs[0].retirement_preserved=false,/retirement erased/],
  [x=>x.report_links[0].report_source_field='rounds.ZMR-04.h1_report',/canonical status/],
  [x=>x.report_links[0].report_path='../private.json',/report pin/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>joinHistoricalRegistrations(m),error);}
});
