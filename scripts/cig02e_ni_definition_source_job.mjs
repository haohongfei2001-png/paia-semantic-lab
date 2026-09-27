import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateIntakePlan,rawSourceURL,consumeVerifiedResponse,acquireFixedTrainDefinitions} from './cig02e_verified_train_intake.mjs';
const PLAN='artifacts/compositional-intent-graph-v1/CIG-02E_PUBLIC_TRAIN_DEFINITION_FEASIBILITY_PLAN.json';
const REQUIRED=['selective-metadata-synthetic-tests','csl-public-pr-validation','cig02b-public-dev','fresh-public-train-dev','source-separated-public-train-dev','pinned-dialogue-source-triage'];
const fail=message=>{throw new Error('NI_SOURCE_GATE_REJECT: '+message);};
export function requirePassingHead(checks,sha) {
  if (checks.total_count>100) fail('unbounded check inventory');
  for(const name of REQUIRED){
    const matching=checks.check_runs.filter(c=>c.name===name);
    if(matching.length!==1 || matching[0].head_sha!==sha || matching[0].status!=='completed' || matching[0].conclusion!=='success')
      fail('exact-head CI gate');
  }
}
export function requireFirstRun(run,history) {
  if(run.run_attempt!==1 || history.total_count>100 || history.workflow_runs.some(r=>r.id!==run.id))
    fail('prior source attempt exists; preserve result and do bounded analysis');
}
export function selectPinnedDescriptors(plan,root,tasks) {
  validateIntakePlan(plan);
  if(root.truncated || tasks.truncated || !Array.isArray(root.tree) || !Array.isArray(tasks.tree))
    fail('truncated/missing tree');
  const select=(tree,path)=>{const rows=tree.filter(e=>e.path===path&&e.type==='blob');
    if(rows.length!==1 || !Number.isSafeInteger(rows[0].size) || rows[0].size<1 || !/^[0-9a-f]{40}$/.test(rows[0].sha))fail('source descriptor');return rows[0];};
  const license=select(root.tree,'LICENSE');
  if(license.sha!=='29f81d812f3e768fa89638d1f72920dbfd1413a8' || license.size!==11558)fail('license identity');
  const taskDescriptors=plan.source.selected_paths.map(path=>({...select(tasks.tree,path.slice(6)),path}));
  if(taskDescriptors.some(d=>d.size>plan.limits.max_task_download_bytes))fail('task size');
  const trainDescriptor={path:plan.source.train_list_path,sha:plan.source.train_list_blob,size:49842,type:'blob'};
  if(trainDescriptor.size+license.size+taskDescriptors.reduce((n,d)=>n+d.size,0)>plan.limits.max_total_download_bytes)fail('planned byte limit');
  return {license,trainDescriptor,taskDescriptors};
}
export async function fetchOnce(url,{fetchFn=fetch,token,api=false}={}) {
  const parsed=new URL(url);
  if(parsed.protocol!=='https:' || !['api.github.com','raw.githubusercontent.com'].includes(parsed.hostname))fail('non-GitHub origin');
  const response=await fetchFn(url,{redirect:'error',signal:AbortSignal.timeout(30000),
    headers:api?{Accept:'application/vnd.github+json',...(token?{Authorization:'Bearer '+token}:{})}:{}});
  if(!response.ok || response.status!==200 || response.redirected || response.url!==url){
    await response.body?.cancel?.();fail('HTTP/origin; no retry');
  }
  return response;
}
async function apiJSON(url,token,apiBudget) {
  const response=await fetchOnce(url,{token,api:true});
  const reader=response.body.getReader();let chunks=[],size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;
    size+=value.length;apiBudget.usedBytes+=value.length;if(size>2097152 || apiBudget.usedBytes>apiBudget.maxBytes)fail('API metadata byte limit');chunks.push(value);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {await reader.cancel();reader.releaseLock();}
}
export async function runDefinitionIntake() {
  const repository=process.env.GITHUB_REPOSITORY,sha=process.env.CANDIDATE_SHA;
  const runId=process.env.GITHUB_RUN_ID,token=process.env.GITHUB_TOKEN;
  if(repository!=='haohongfei2001-png/paia-semantic-lab' || !/^[0-9a-f]{40}$/.test(sha||'') || !/^\d+$/.test(runId||'') || !token)fail('execution identity');
  if(fs.readFileSync('.git/HEAD','utf8').trim()!==sha)fail('checkout identity');
  const plan=JSON.parse(fs.readFileSync(PLAN,'utf8'));validateIntakePlan(plan);
  const apiBudget={usedBytes:0,maxBytes:plan.limits.max_total_download_bytes};
  const own='https://api.github.com/repos/'+repository;
  requirePassingHead(await apiJSON(own+'/commits/'+sha+'/check-runs?per_page=100',token,apiBudget),sha);
  const run=await apiJSON(own+'/actions/runs/'+runId,token,apiBudget);
  requireFirstRun(run,await apiJSON(own+'/actions/workflows/'+run.workflow_id+'/runs?per_page=100',token,apiBudget));
  const upstream='https://api.github.com/repos/'+plan.source.repository;
  const commit=await apiJSON(upstream+'/git/commits/'+plan.source.commit,undefined,apiBudget);
  if(commit.sha!==plan.source.commit || !/^[0-9a-f]{40}$/.test(commit.tree?.sha||''))fail('pinned commit identity');
  const root=await apiJSON(upstream+'/git/trees/'+commit.tree.sha,undefined,apiBudget);
  if(root.sha!==commit.tree.sha)fail('root tree identity');
  const taskDirs=root.tree.filter(e=>e.path==='tasks'&&e.type==='tree');
  if(taskDirs.length!==1)fail('task directory');
  const tasks=await apiJSON(upstream+'/git/trees/'+taskDirs[0].sha,undefined,apiBudget);
  if(tasks.sha!==taskDirs[0].sha)fail('task tree identity');
  const {license,trainDescriptor,taskDescriptors}=selectPinnedDescriptors(plan,root,tasks);
  if(apiBudget.usedBytes+license.size+trainDescriptor.size+taskDescriptors.reduce((n,d)=>n+d.size,0)>plan.limits.max_total_download_bytes)fail('combined API/source byte budget');
  // License is verified before task definitions are materialized.
  const licenseURL=rawSourceURL(plan,'LICENSE');
  const licenseResult=await consumeVerifiedResponse(await fetchOnce(licenseURL),license,{
    url:licenseURL,budget:{maxBytes:11558,usedBytes:0},maxBytes:11558,
    consume:async chunks=>{let text='';for await(const chunk of chunks)text+=chunk;return text;}
  });
  fs.writeFileSync('source-intake/NI_LICENSE.txt',licenseResult.result);
  const source=await acquireFixedTrainDefinitions(plan,{
    trainDescriptor,trainResponse:await fetchOnce(rawSourceURL(plan,trainDescriptor.path)),
    taskDescriptors,fetchTask:url=>fetchOnce(url)});
  const result={...source,exactHead:sha,runId:Number(runId),sourceRepository:plan.source.repository,
    sourceCommit:plan.source.commit,licenseBlob:license.sha,
    attribution:'Natural Instructions community contributors; Apache-2.0 definitions/metadata. Original task sources and contributors retained. Instances/examples excluded.',
    sourceLimitations:'Definitions are excerpts lacking instance input; author and independent Catalog adjudication remain held.'};
  fs.writeFileSync('source-intake/NI_DEFINITION_RESULT.json',JSON.stringify(result,null,2)+'\n');
  console.log('CIG02E_NI_DEFINITION_INTAKE_RESULT_JSON='+JSON.stringify(result));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  fs.mkdirSync('source-intake',{recursive:true});
  runDefinitionIntake().catch(error=>{
    const result={classification:'FIXED_PUBLIC_TRAIN_SOURCE_INTAKE_FAIL_NOT_CAPABILITY',
      error:String(error.message).slice(0,500),exactHead:process.env.CANDIDATE_SHA,
      selectiveDiagnostic:error.selectiveDiagnostic??null,intakeProgress:error.intakeProgress??null,
      accepted_fixture_rows:0,gold_rows_created:0,candidate_predictions_read:0,dev_scores_computed:0,
      capability_test_rows_read:0,cig02_frozen:false,cig03_started:false};
    fs.writeFileSync('source-intake/NI_DEFINITION_FAILURE.json',JSON.stringify(result,null,2)+'\n');
    console.log('CIG02E_NI_DEFINITION_INTAKE_FAILURE_JSON='+JSON.stringify(result));process.exitCode=1;
  });
}
