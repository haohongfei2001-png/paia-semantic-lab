import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSyntheticAllocationReceipt} from './allocation_lifecycle_receipt.mjs';
const read=n=>JSON.parse(readFileSync(new URL(n==='REGISTRATION_PREPARATION.json'?'../../docs/zero-model-refoundation-v1/ZMR-06_SYNTHETIC_ALLOCATION_LIFECYCLE_RESULT.json':'../../data/zero_model_refoundation/development/'+n,import.meta.url),'utf8'));
const original=()=>[read('synthetic_allocation_lifecycle_initial_v0.1.json'),read('synthetic_allocation_lifecycle_final_v0.1.json'),read('REGISTRATION_PREPARATION.json')];
test('both original six-observation sets preserve confound, fixed paired arithmetic and all qualification limits without rerunning child measurements',()=>{
 const args=original(),before=JSON.stringify(args),r=validateSyntheticAllocationReceipt(...args);
 assert.equal(r.initial_observations,6);assert.equal(r.final_observations,6);assert.equal(r.original_measurements_reexecuted,0);assert.equal(r.resource_verdict,'NOT_QUALIFIED');assert.equal(r.capability_verdict,'UNTESTED');assert.equal(r.stable_allocations,0);assert.equal(r.semantic_judgment_certified,false);assert(Object.isFrozen(r));assert.equal(JSON.stringify(args),before);
});
test('altered phases, arithmetic, input pairing, source provenance, full144 or fabricated resource/capability claims fail closed',()=>{
 for(const alter of [a=>a[1].deltas[0].decoded_minus_encoded.heapUsed++,a=>a[1].raw_observations[0].stages.pop(),a=>a[1].raw_observations[1].summaries.normSum++,a=>a[1].raw_observations[0].summaries.full_structure_topics=143,a=>a[1].raw_observations[0].profile.terms=4,a=>a[1].source_pins[0].sha256='0'.repeat(64),a=>a[1].resource_verdict='PASS',a=>a[1].capability_verdict='PASS',a=>a[1].router_calls=1,a=>a[1].stable_allocations=1,a=>a[1].raw_observations[0].stages[2].collection='PEAK',a=>a[1].synthetic_asset_scope.largest_structure_within_published_index_budget=true]){
  const a=original();alter(a);assert.throws(()=>validateSyntheticAllocationReceipt(...a));
 }
});
test('initial inconclusive evidence, original links, methodology repair count and missing timestamp cannot be silently removed or invented',()=>{
 for(const alter of [a=>a[0].measurement_validity='PASS',a=>a[1].failure_records=[],a=>a[1].failure_records[0].initial_result_sha256='f'.repeat(64),a=>a[1].failure_records[0].methodology_repairs=0,a=>a[1].total_preparation_child_runs=6,a=>a[2].measurement_timestamp='invented',a=>a[2].timestamp_recoverable=true,a=>a[2].allowance=12,a=>a[2].true_peak_or_latency_measured=true]){
  const a=original();alter(a);assert.throws(()=>validateSyntheticAllocationReceipt(...a));
 }
});
