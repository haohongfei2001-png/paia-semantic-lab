/** Engineering test scheduling only. No data reads, Router or qualification. */
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export function estimatedUnitCost(path){
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
