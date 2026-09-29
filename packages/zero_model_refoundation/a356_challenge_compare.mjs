/** One registered same-writer public A3/A5/A6 diagnostic; never qualification. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA0Defer} from './a1.mjs';
import {routeA3} from './a3.mjs';
import {routeA6} from './a6.mjs';
import {canonicalJSON,evaluationKey,singlePointMetrics} from './contracts.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const REG='data/zero_model_refoundation/development/a356_challenge_v04_registration.json';
const REPORT='docs/zero-model-refoundation-v1/ZMR-04_A356_CHALLENGE_V04_RESULT.json';
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const CHALLENGE='data/zero_model_refoundation/development/provisional_challenge_v0.4.json';
const SAFETY='data/zero_model_refoundation/development/provisional_safety_seed_v0.2.json';
const ROLE='data/zero_model_refoundation/development/provisional_role_challenge_v0.1.json';
const CLOSURE=['packages/zero_model_refoundation/a356_challenge_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs','packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a3.mjs','packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/a5_scope.mjs','packages/zero_model_refoundation/a6.mjs',
  'packages/zero_model_refoundation/contracts.mjs'];
const CONFIGS=[
  {id:'A0_all_defer',family:'A0'},
  {id:'A3_char_fixed',family:'A3',mode:'char',min_score:.02,min_margin:.02},
  {id:'A3_word_fixed',family:'A3',mode:'word',min_score:.02,min_margin:.02},
  {id:'A6_char_fixed',family:'A6',mode:'char',full_min_score:.02,full_min_margin:.02,goal_min_score:.08,goal_min_margin:.05},
  {id:'A6_word_fixed',family:'A6',mode:'word',full_min_score:.02,full_min_margin:.02,goal_min_score:.08,goal_min_margin:.05}
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const must=(condition,message)=>{if(!condition)throw Error(message);};
const same=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
const input=row=>({current:row.current,title:row.title??'',recent:row.recent??[]});
async function safeRead(path){const target=resolve(ROOT,path),s=await lstat(target);
  must(s.isFile()&&!s.isSymbolicLink(),'regular explicit-path input required: '+path);return readFile(target);}
async function digestPaths(paths){const rows=[];for(const path of paths)rows.push({path,sha256:sha(await safeRead(path))});return sha(canonicalJSON(rows));}
async function identity(){
  const catalog=await safeRead(CATALOG),train=await safeRead(TRAIN);
  const cohorts=[];for(const path of [CHALLENGE,SAFETY,ROLE])cohorts.push({path,sha256:sha(await safeRead(path))});
  return {package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',
    generation_id:'G0_DEV_PUBLIC_A356_CHALLENGE_V04',protocol_version:'ZMR-EVAL-1.0.1',
    resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
    environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
    candidate_closure_sha256:await digestPaths(CLOSURE),catalog_sha256:sha(catalog),
    compiler_sha256:await digestPaths(['packages/zero_model_refoundation/a1_compile.mjs',
      'packages/zero_model_refoundation/a3_compile.mjs']),train_sha256:sha(train),
    calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),cohort_sha256:sha(canonicalJSON(cohorts)),
    scorer_sha256:await digestPaths(['packages/zero_model_refoundation/a356_challenge_compare.mjs',
      'packages/zero_model_refoundation/contracts.mjs'])};
}
async function register(){
  const id=await identity();
  const value={schema:'ZMR-A356-CHALLENGE-REGISTRATION-1',
    evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    purpose:'ONE_CHANGED_CLOSURE_PUBLIC_DEVELOPMENT_DIAGNOSTIC_ONLY',identity:id,
    evaluation_key:evaluationKey(id),configs:CONFIGS,
    cohorts:[CHALLENGE,SAFETY,ROLE],
    limits:{topic_count:144,single_precision_min:.95,single_coverage_min:.70,
      full144_macro_recall_min:.70,control_false_assignment_max:.02,context_harm_max:0},
    no_calibration:true,independent_rows:0,capability_verdict:'UNTESTED',
    resource_verdict:'NOT_QUALIFIED',as_consumed:0};
  await writeFile(resolve(ROOT,REG),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({registration:REG,evaluation_key:value.evaluation_key}));
}
function predict(config,index,row,catalogSha){
  if(config.family==='A0')return routeA0Defer();
  if(config.family==='A3')return routeA3(index,input(row),{catalog_sha256:catalogSha,
    min_score:config.min_score,min_margin:config.min_margin});
  return routeA6(index,input(row),{catalog_sha256:catalogSha,
    full_min_score:config.full_min_score,full_min_margin:config.full_min_margin,
    goal_min_score:config.goal_min_score,goal_min_margin:config.goal_min_margin});
}
function score(config,index,challenge,safety,role,ids,catalogSha){
  let repeatDifferences=0;
  const route=row=>{
    const p=predict(config,index,row,catalogSha),again=predict(config,index,row,catalogSha);
    if(canonicalJSON(p)!==canonicalJSON(again))repeatDifferences++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      new Set(p.topics).size===p.topics.length&&p.topics.every(id=>ids.includes(id))&&
      (p.state==='DEFER')===(p.topics.length===0),'bad Router output');
    return p;
  };
  const singleRows=challenge.map(row=>({gold:row.topic_id,language:row.language,prediction:route(row)}));
  const single=singlePointMetrics(singleRows,ids);
  const byLanguage=Object.fromEntries(['zh','en','mixed'].map(lang=>{
    const rows=singleRows.filter((_,i)=>challenge[i].language===lang);
    return [lang,{n:rows.length,assigned:rows.filter(x=>x.prediction.topics.length>0).length,
      correct:rows.filter(x=>same(x.prediction.topics,[x.gold])).length}];
  }));
  const safetyCounts={controls:{n:0,false_assignments:0},
    context_required:{n:0,base_exact:0,without_correct:0},
    context_invariance:{n:0,base_exact:0,complete_output_harm:0},
    multi_intent:{n:0,exact:0,true_labels:0,predicted_labels:0}};
  let globalTP=0,globalLabels=0;
  for(const row of singleRows){globalLabels+=row.prediction.topics.length;
    globalTP+=row.prediction.topics.filter(id=>id===row.gold).length;}
  for(const row of safety){
    const p=route(row),gold=row.gold_topics;
    if(row.layer==='CONTROL'){
      safetyCounts.controls.n++;if(p.topics.length)safetyCounts.controls.false_assignments++;
    }else if(row.layer==='CONTEXT_REQUIRED'){
      const c=safetyCounts.context_required;c.n++;if(same(p.topics,gold))c.base_exact++;
      const without=route(row.variant);if(same(without.topics,row.variant.gold_topics))c.without_correct++;
    }else if(row.layer==='CONTEXT_INVARIANCE'){
      const c=safetyCounts.context_invariance;c.n++;if(same(p.topics,gold))c.base_exact++;
      if(canonicalJSON(p)!==canonicalJSON(route(row.variant)))c.complete_output_harm++;
    }else if(row.layer==='MULTI_INTENT'){
      const c=safetyCounts.multi_intent;c.n++;if(same(p.topics,gold))c.exact++;
      c.true_labels+=p.topics.filter(id=>gold.includes(id)).length;
      c.predicted_labels+=p.topics.length;
    }else throw Error('unknown safety layer');
    if(row.layer!=='CONTEXT_INVARIANCE'){
      globalLabels+=p.topics.length;globalTP+=p.topics.filter(id=>gold.includes(id)).length;
    }
  }
  const roleMetrics={n:role.length,exact:0,forbidden_labels:0,by_variant:{}};
  for(const row of role){const p=route(row),key=row.variant;
    if(!roleMetrics.by_variant[key])roleMetrics.by_variant[key]={n:0,exact:0,forbidden_labels:0};
    const m=roleMetrics.by_variant[key];m.n++;
    if(same(p.topics,row.gold_topics)){roleMetrics.exact++;m.exact++;}
    const forbidden=p.topics.filter(id=>row.forbidden_topics.includes(id)).length;
    roleMetrics.forbidden_labels+=forbidden;m.forbidden_labels+=forbidden;
  }
  return {single:{n:single.total,assigned:single.assigned,any_assigned:single.any_assigned,
      correct:single.correct,assigned_precision:single.assigned_precision,
      single_coverage:single.single_coverage,full144_macro_recall:single.full144_macro_recall,
      missing_topics:single.missing_topics.length,by_language:byLanguage},
    safety:safetyCounts,global_labels:{correct:globalTP,predicted:globalLabels,
      precision:globalLabels?globalTP/globalLabels:null},role:roleMetrics,
    deterministic_repeat_differences:repeatDifferences,
    classification:'PUBLIC_POINT_DIAGNOSTIC_ONLY_NOT_CAPABILITY'};
}
async function evaluate(){
  try{await lstat(resolve(ROOT,REPORT));throw Error('registered comparison already recorded; no unchanged-key rerun');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const reg=JSON.parse(await safeRead(REG)),id=await identity();
  must(reg.schema==='ZMR-A356-CHALLENGE-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS)&&
    canonicalJSON(reg.identity)===canonicalJSON(id)&&reg.evaluation_key===evaluationKey(id),
    'registration/closure mismatch');
  const catalog=await safeRead(CATALOG),topics=parsePinnedCatalog(catalog),ids=topics.map(t=>t.id);
  const train=parseProvisionalTrain(await safeRead(TRAIN),id.catalog_sha256,ids);
  const challenge=JSON.parse(await safeRead(CHALLENGE));
  const safety=JSON.parse(await safeRead(SAFETY));
  const role=JSON.parse(await safeRead(ROLE));
  must(train.length===144&&challenge.schema==='ZMR-PROVISIONAL-CHALLENGE-4'&&
    challenge.intake_status==='FULL144_PUBLIC_DEV_FROZEN_UNRUN'&&
    challenge.evaluation_status==='UNRUN'&&challenge.rows.length===144&&
    challenge.qualification_credit_rows===0&&
    challenge.rows.every((row,i)=>row.topic_id===ids[i]),'challenge not frozen full144');
  must(safety.schema==='ZMR-PROVISIONAL-SAFETY-SEED-2'&&
    safety.evaluation_status==='UNRUN'&&safety.rows.length===48&&
    safety.qualification_credit_rows===0,'safety not frozen');
  must(role.schema==='ZMR-PROVISIONAL-ROLE-CHALLENGE-1'&&
    role.evaluation_status==='UNRUN'&&role.rows.length===18&&
    role.qualification_credit_rows===0,'role not frozen');
  const builds={},results={};
  results.A0_all_defer=score(CONFIGS[0],null,challenge.rows,safety.rows,role.rows,ids,id.catalog_sha256);
  const temp=await mkdtemp(join(tmpdir(),'zmr-a356-v04-'));
  try{
    for(const mode of ['char','word']){
      const output=join(temp,`A3-${mode}.json`),build=await buildA3({mode,output});
      builds[mode]={...build,output:'EPHEMERAL_DEVELOPMENT_INDEX'};
      const index=JSON.parse(await readFile(output));
      for(const config of CONFIGS.filter(c=>c.mode===mode))
        results[config.id]=score(config,index,challenge.rows,safety.rows,role.rows,ids,id.catalog_sha256);
    }
  }finally{await rm(temp,{recursive:true,force:true});}
  const paired={};
  for(const mode of ['char','word']){
    const a=results[`A3_${mode}_fixed`],b=results[`A6_${mode}_fixed`];
    paired[mode]={single_correct_delta:b.single.correct-a.single.correct,
      role_exact_delta:b.role.exact-a.role.exact,
      safety_control_false_delta:b.safety.controls.false_assignments-a.safety.controls.false_assignments,
      context_harm_delta:b.safety.context_invariance.complete_output_harm-a.safety.context_invariance.complete_output_harm};
  }
  const report={schema:'ZMR-A356-CHALLENGE-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',evaluation_key:reg.evaluation_key,
    registration_path:REG,identity:id,capability_verdict:'UNTESTED',
    resource_verdict:'NOT_QUALIFIED',data_qualification:'NOT_QUALIFIED',
    independent_rows:0,as_consumed:0,challenge_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,train_rows:train.length,challenge_rows:challenge.rows.length,
    safety_rows:safety.rows.length,role_rows:role.rows.length,
    fixed_config_count:CONFIGS.length,builds,results,paired,
    limitations:['same candidate writer authored all cohorts and unreviewed labels',
      'one single-intent case per Topic and incomplete language/topic/safety quotas',
      'public point counts and static index bytes do not qualify capability or resources']};
  await writeFile(resolve(ROOT,REPORT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,report:REPORT,
    results:Object.fromEntries(Object.entries(results).map(([name,x])=>[name,{single:x.single,
      safety:x.safety,global_labels:x.global_labels,role:x.role,
      deterministic_repeat_differences:x.deterministic_repeat_differences}])),paired}));
}
const command=process.argv[2];
if(command==='register')await register();
else if(command==='evaluate')await evaluate();
else throw Error('expected register or evaluate');
