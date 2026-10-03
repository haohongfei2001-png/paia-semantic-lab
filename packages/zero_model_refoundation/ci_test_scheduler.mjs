/** Engineering test scheduling only. No data reads, Router or qualification. */
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

/** Prior exact-head engineering durations;not candidate resource measurements. */
export const CI_TIMING_REFERENCE=Object.freeze({
 "evidence_class": "ENGINEERING_SCHEDULING_HINTS_ONLY",
 "head": "2f6d05ef4bf9bf0ade8a8ff189ae32109d3d6add",
 "run_id": 37116129462,
 "attempt": 1,
 "jobs": [
  111183188830,
  111183188749
 ],
 "run_verdict": "CANCELLED_WITH_ASSERTION_FAILURE_NOT_PASS",
 "units": 127
 ,unit_ms:Object.freeze({
 "packages/zero_model_refoundation/a1_balanced_r1.test.mjs": 631,
 "packages/zero_model_refoundation/a1_balanced.test.mjs": 199,
 "packages/zero_model_refoundation/a1_v04_compact.test.mjs": 176,
 "packages/zero_model_refoundation/a1.test.mjs": 420,
 "packages/zero_model_refoundation/a2.test.mjs": 234,
 "packages/zero_model_refoundation/a3.test.mjs": 657,
 "packages/zero_model_refoundation/a4_boundary_graph.test.mjs": 209,
 "packages/zero_model_refoundation/a4_pair_positive.test.mjs": 557,
 "packages/zero_model_refoundation/a4_pairwise.test.mjs": 439,
 "packages/zero_model_refoundation/a4_role_contrast.test.mjs": 136,
 "packages/zero_model_refoundation/a4_role_repairs.test.mjs": 127,
 "packages/zero_model_refoundation/a5_composition_r1.test.mjs": 116,
 "packages/zero_model_refoundation/a5_composition.test.mjs": 92,
 "packages/zero_model_refoundation/a5_evidence_chart_r1.test.mjs": 146,
 "packages/zero_model_refoundation/a5_evidence_chart.test.mjs": 106,
 "packages/zero_model_refoundation/a5_scope.test.mjs": 104,
 "packages/zero_model_refoundation/a6_complement_r1.test.mjs": 343,
 "packages/zero_model_refoundation/a6_complement_r2.test.mjs": 429,
 "packages/zero_model_refoundation/a6_complement_scope.test.mjs": 317,
 "packages/zero_model_refoundation/a6.test.mjs": 114,
 "packages/zero_model_refoundation/a7_case_memory.test.mjs": 194,
 "packages/zero_model_refoundation/a7_compile.test.mjs": 583,
 "packages/zero_model_refoundation/c1_context_multi.test.mjs": 82,
 "packages/zero_model_refoundation/c1_r1_context_multi.test.mjs": 122,
 "packages/zero_model_refoundation/ci_test_scheduler.test.mjs": 213,
 "packages/zero_model_refoundation/ci_test_shards.test.mjs": 607,
 "packages/zero_model_refoundation/competition_budget.test.mjs": 86,
 "packages/zero_model_refoundation/contracts.test.mjs": 163,
 "packages/zero_model_refoundation/development_mechanism_audit.test.mjs": 1431,
 "packages/zero_model_refoundation/development_review_cal_rest_part1.test.mjs": 399,
 "packages/zero_model_refoundation/development_review_cal_rest_part2.test.mjs": 333,
 "packages/zero_model_refoundation/development_review_cal_rest_part3.test.mjs": 478,
 "packages/zero_model_refoundation/development_review_cal_slice1.test.mjs": 249,
 "packages/zero_model_refoundation/development_review_extension.test.mjs": 129,
 "packages/zero_model_refoundation/development_review_journal.test.mjs": 103,
 "packages/zero_model_refoundation/development_review_receipt.test.mjs": 114,
 "packages/zero_model_refoundation/development_review_safety_rest_cal.test.mjs": 276,
 "packages/zero_model_refoundation/development_review_safety_rest_tune.test.mjs": 361,
 "packages/zero_model_refoundation/development_review_safety_seed.test.mjs": 233,
 "packages/zero_model_refoundation/development_review_slice2.test.mjs": 155,
 "packages/zero_model_refoundation/development_review_slice3.test.mjs": 137,
 "packages/zero_model_refoundation/development_review_slice4.test.mjs": 219,
 "packages/zero_model_refoundation/development_review_slice5.test.mjs": 215,
 "packages/zero_model_refoundation/development_source_audit.test.mjs": 986,
 "packages/zero_model_refoundation/foundation.test.mjs": 290,
 "packages/zero_model_refoundation/h1_recall_safe.test.mjs": 487,
 "packages/zero_model_refoundation/historical_defaults_audit.test.mjs": 141,
 "packages/zero_model_refoundation/historical_identity_audit.test.mjs": 270,
 "packages/zero_model_refoundation/historical_registration_join.test.mjs": 110,
 "packages/zero_model_refoundation/later_diagnostic_audit.test.mjs": 192,
 "packages/zero_model_refoundation/mechanism_matrix_expansion1_review.test.mjs": 12831,
 "packages/zero_model_refoundation/mechanism_matrix_expansion10_review.test.mjs": 59770,
 "packages/zero_model_refoundation/mechanism_matrix_expansion11_review.test.mjs": 69298,
 "packages/zero_model_refoundation/mechanism_matrix_expansion2_review.test.mjs": 14184,
 "packages/zero_model_refoundation/mechanism_matrix_expansion3_review.test.mjs": 19428,
 "packages/zero_model_refoundation/mechanism_matrix_expansion4_review.test.mjs": 18019,
 "packages/zero_model_refoundation/mechanism_matrix_expansion5_review.test.mjs": 20046,
 "packages/zero_model_refoundation/mechanism_matrix_expansion6_review.test.mjs": 27995,
 "packages/zero_model_refoundation/mechanism_matrix_expansion7_review.test.mjs": 24591,
 "packages/zero_model_refoundation/mechanism_matrix_expansion8_review.test.mjs": 34280,
 "packages/zero_model_refoundation/mechanism_matrix_expansion9_review.test.mjs": 37379,
 "packages/zero_model_refoundation/mechanism_matrix_part2_review.test.mjs": 1924,
 "packages/zero_model_refoundation/mechanism_matrix_part3_review.test.mjs": 3151,
 "packages/zero_model_refoundation/mechanism_matrix_part4_review.test.mjs": 3526,
 "packages/zero_model_refoundation/mechanism_matrix_part5_review.test.mjs": 4707,
 "packages/zero_model_refoundation/mechanism_matrix_part6_review.test.mjs": 8091,
 "packages/zero_model_refoundation/mechanism_matrix_part7_review.test.mjs": 8027,
 "packages/zero_model_refoundation/mechanism_matrix_part8_review.test.mjs": 10496,
 "packages/zero_model_refoundation/mechanism_matrix_plan.test.mjs": 130,
 "packages/zero_model_refoundation/mechanism_matrix_review.test.mjs": 1494,
 "packages/zero_model_refoundation/mechanism_matrix_seed.test.mjs": 395,
 "packages/zero_model_refoundation/mechanism_matrix_source_deficits.test.mjs": 2979,
 "packages/zero_model_refoundation/mechanism_matrix_train_batch.test.mjs": 1134,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion1.test.mjs": 14284,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion10.test.mjs": 68802,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion11.test.mjs": 85548,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion2.test.mjs": 22646,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion3.test.mjs": 26800,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion4.test.mjs": 30902,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion5.test.mjs": 28478,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion6.test.mjs": 40733,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion7.test.mjs": 36835,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion8.test.mjs": 52598,
 "packages/zero_model_refoundation/mechanism_matrix_train_expansion9.test.mjs": 67643,
 "packages/zero_model_refoundation/mechanism_matrix_train_part3.test.mjs": 1951,
 "packages/zero_model_refoundation/mechanism_matrix_train_part4.test.mjs": 3750,
 "packages/zero_model_refoundation/mechanism_matrix_train_part5.test.mjs": 5149,
 "packages/zero_model_refoundation/mechanism_matrix_train_part6.test.mjs": 7433,
 "packages/zero_model_refoundation/mechanism_matrix_train_part7.test.mjs": 7771,
 "packages/zero_model_refoundation/mechanism_matrix_train_part8.test.mjs": 13287,
 "packages/zero_model_refoundation/pinned_public_prefetch.test.mjs": 126,
 "packages/zero_model_refoundation/pinned_public_reader.test.mjs": 94,
 "packages/zero_model_refoundation/provisional_a1_balanced_dev.test.mjs": 438,
 "packages/zero_model_refoundation/provisional_a4_challenge.test.mjs": 249,
 "packages/zero_model_refoundation/provisional_a4_positive_challenge.test.mjs": 345,
 "packages/zero_model_refoundation/provisional_a4_role_dev.test.mjs": 249,
 "packages/zero_model_refoundation/provisional_a4_train.test.mjs": 243,
 "packages/zero_model_refoundation/provisional_a4_triads.test.mjs": 185,
 "packages/zero_model_refoundation/provisional_a5_challenge.test.mjs": 400,
 "packages/zero_model_refoundation/provisional_a5_chart_dev.test.mjs": 268,
 "packages/zero_model_refoundation/provisional_a5_r1_challenge.test.mjs": 350,
 "packages/zero_model_refoundation/provisional_a5_repair_dev.test.mjs": 313,
 "packages/zero_model_refoundation/provisional_a6_complement_challenge.test.mjs": 388,
 "packages/zero_model_refoundation/provisional_a6_r1_repair_dev.test.mjs": 288,
 "packages/zero_model_refoundation/provisional_a6_r2_challenge.test.mjs": 379,
 "packages/zero_model_refoundation/provisional_a7_dev.test.mjs": 267,
 "packages/zero_model_refoundation/provisional_challenge_v03.test.mjs": 718,
 "packages/zero_model_refoundation/provisional_challenge_v04.test.mjs": 234,
 "packages/zero_model_refoundation/provisional_challenge_v05.test.mjs": 356,
 "packages/zero_model_refoundation/provisional_challenge_v06.test.mjs": 371,
 "packages/zero_model_refoundation/provisional_data.test.mjs": 180,
 "packages/zero_model_refoundation/provisional_dev_v04_safety_remaining.test.mjs": 12128,
 "packages/zero_model_refoundation/provisional_dev_v04_safety_seed.test.mjs": 13418,
 "packages/zero_model_refoundation/provisional_h1_recall_dev.test.mjs": 431,
 "packages/zero_model_refoundation/provisional_ordinary_dev_v04.test.mjs": 7994,
 "packages/zero_model_refoundation/provisional_role_challenge.test.mjs": 81,
 "packages/zero_model_refoundation/provisional_safety_v02.test.mjs": 192,
 "packages/zero_model_refoundation/provisional_safety_v03.test.mjs": 174,
 "packages/zero_model_refoundation/provisional_safety_v04.test.mjs": 264,
 "packages/zero_model_refoundation/provisional_safety.test.mjs": 89,
 "packages/zero_model_refoundation/provisional_train_v04_slice1.test.mjs": 454,
 "packages/zero_model_refoundation/provisional_train_v04_slice2.test.mjs": 427,
 "packages/zero_model_refoundation/provisional_train_v04_slice3.test.mjs": 942,
 "packages/zero_model_refoundation/provisional_train_v04_slice4.test.mjs": 680,
 "packages/zero_model_refoundation/provisional_train_v04_slice5.test.mjs": 956,
 "packages/zero_model_refoundation/train_v04_compile.test.mjs": 1225,
 "packages/zero_model_refoundation/train_v04.test.mjs": 244
})
});

export function estimatedUnitCost(path){
 if(Object.hasOwn(CI_TIMING_REFERENCE.unit_ms,path))return CI_TIMING_REFERENCE.unit_ms[path];
 const intake=path.match(/\/mechanism_matrix_train_expansion(\d+)\.test\.mjs$/);
 const review=path.match(/\/mechanism_matrix_expansion(\d+)_review\.test\.mjs$/);
 const part=path.match(/\/mechanism_matrix_(?:train_part|part)(\d+)(?:_review)?\.test\.mjs$/);
 // Conservative ordering hints from the growing recursive audit chain,not timing gates.
 if(intake)return 5000+800*Number(intake[1])**2;
 if(review)return 3000+450*Number(review[1])**2;
 if(part)return 500+200*Number(part[1])**2;
 return 1000;
}
export function planTestLanes(paths){
 if(!Array.isArray(paths)||!paths.length||new Set(paths).size!==paths.length||paths.some(p=>typeof p!=='string'||!/^packages\/zero_model_refoundation\/[a-z0-9_]+\.test\.mjs$/.test(p)))throw Error('explicit unique engineering units required');
 const lanes=Array.from({length:4},()=>({estimated_ms:0,paths:[]}));
 for(const path of [...paths].sort((a,b)=>estimatedUnitCost(b)-estimatedUnitCost(a)||a.localeCompare(b,'en'))){
  let index=0;for(let i=1;i<4;i++)if(lanes[i].estimated_ms<lanes[index].estimated_ms)index=i;
  lanes[index].paths.push(path);lanes[index].estimated_ms+=estimatedUnitCost(path);
 }
 return [lanes.slice(0,2),lanes.slice(2,4)];
}
export function selectTestLanes(paths,shard){
 if(!['1/2','2/2'].includes(shard))throw Error('exactly two serial CI shards required');
 return planTestLanes(paths)[Number(shard[0])-1];
}
export async function executeTestLanes(lanes,runUnit){
 if(!Array.isArray(lanes)||lanes.length!==2||typeof runUnit!=='function')throw Error('exactly two workers required');
 const flat=lanes.flatMap(l=>l.paths);if(new Set(flat).size!==flat.length)throw Error('duplicate lane unit');
 const outcomes=await Promise.all(lanes.map(async lane=>{
  const results=[];for(const path of lane.paths){try{const result=await runUnit(path);results.push({path,passed:result===0});}catch{results.push({path,passed:false});}}
  return results;
 }));
 const results=outcomes.flat();return {results,exit_code:results.every(r=>r.passed)?0:1};
}
export function runNodeUnit(path){
 return new Promise((done,reject)=>{
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  console.log('ZMR_UNIT_START '+path);const started=performance.now();
  // Each child admits one explicit file and one test worker;two lane children maximum.
  const child=spawn(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',path],{env,stdio:'inherit'});
  child.once('error',reject);child.once('close',(code,signal)=>{
   console.log('ZMR_UNIT_END '+JSON.stringify({path,code,signal,duration_ms:performance.now()-started}));done(code===0&&signal===null?0:1);
  });
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [shardArg,workersArg,...paths]=process.argv.slice(2);
 if(!shardArg?.startsWith('--shard=')||workersArg!=='--test-concurrency=2')throw Error('bounded explicit scheduler arguments required');
 const lanes=selectTestLanes(paths,shardArg.slice(8));
 console.log('ZMR_TEST_SCHEDULE '+JSON.stringify({shard:shardArg.slice(8),workers:2,units:lanes.reduce((n,l)=>n+l.paths.length,0),estimated_lane_ms:lanes.map(l=>l.estimated_ms),estimates_are_resource_pass:false}));
 const outcome=await executeTestLanes(lanes,runNodeUnit);console.log('ZMR_TEST_SCHEDULE_RESULT '+JSON.stringify(outcome));process.exitCode=outcome.exit_code;
}
