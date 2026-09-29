/** One registered, partial public DEV diagnosis; never AS, TEST or capability evidence. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {buildA1} from './a1_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {buildA7} from './a7_compile.mjs';
import {routeA0Defer,routeA1} from './a1.mjs';
import {routeA3} from './a3.mjs';
import {routeA7} from './a7_case_memory.mjs';
import {canonicalJSON,evaluationKey,singlePointMetrics} from './contracts.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN_A='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const TRAIN_B='data/zero_model_refoundation/development/provisional_train_v0.3.json';
const DEV='data/zero_model_refoundation/development/provisional_a7_dev_v0.1.json';
const REG='data/zero_model_refoundation/development/a7_dev_v01_registration.json';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A7_DEV_V01_RESULT.json';
const CLOSURE=['packages/zero_model_refoundation/a7_dev_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs','packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a3.mjs','packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/a7_case_memory.mjs',
  'packages/zero_model_refoundation/a7_compile.mjs',
  'packages/zero_model_refoundation/contracts.mjs'];
const CONFIGS=[
  {id:'A0_defer',family:'A0'},
  {id:'A1_char_fixed',family:'A1',mode:'char',method:'tfidf',min_score:.15,min_margin:.02},
  {id:'A3_char_fixed',family:'A3',mode:'char',min_score:.02,min_margin:.02},
  {id:'A7_char_default',family:'A7',mode:'char',min_score:.25,min_margin:.05,min_matched_features:2},
  {id:'A1_word_fixed',family:'A1',mode:'word',method:'tfidf',min_score:.15,min_margin:.02},
  {id:'A3_word_fixed',family:'A3',mode:'word',min_score:.02,min_margin:.02},
  {id:'A7_word_default',family:'A7',mode:'word',min_score:.25,min_margin:.05,min_matched_features:2}
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
const input=r=>({current:r.current,title:r.title,recent:r.recent});
async function safeRead(p){const target=resolve(ROOT,p),s=await lstat(target);
  must(s.isFile()&&!s.isSymbolicLink(),'regular fixed-path input required: '+p);
  return readFile(target);}
async function digest(paths){const items=[];
  for(const path of paths)items.push({path,sha256:sha(await safeRead(path))});
  return sha(canonicalJSON(items));}
async function identity(){return {
  package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',
  generation_id:'G0_DEV_PUBLIC_A7_PARTIAL_DIAGNOSTIC_V01',
  protocol_version:'ZMR-EVAL-1.0.1',
  resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
  environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
  candidate_closure_sha256:await digest(CLOSURE),
  catalog_sha256:sha(await safeRead(CATALOG)),
  compiler_sha256:await digest(['packages/zero_model_refoundation/a1_compile.mjs',
    'packages/zero_model_refoundation/a3_compile.mjs',
    'packages/zero_model_refoundation/a7_compile.mjs']),
  train_sha256:await digest([TRAIN_A,TRAIN_B]),
  calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
  cohort_sha256:sha(await safeRead(DEV)),
  scorer_sha256:await digest(['packages/zero_model_refoundation/a7_dev_compare.mjs',
    'packages/zero_model_refoundation/contracts.mjs'])};}
async function register(){const id=await identity(),value={
  schema:'ZMR-A7-PARTIAL-DEV-REGISTRATION-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  purpose:'ONE_LIGHT_FIXED_CONFIG_MECHANISM_DIAGNOSTIC_ONLY',
  identity:id,evaluation_key:evaluationKey(id),configs:CONFIGS,cohort:DEV,
  topic_universe:144,single_rows:48,control_rows:12,
  independent_rows:0,as_consumed:0,capability_verdict:'UNTESTED',
  resource_verdict:'NOT_QUALIFIED',no_calibration:true};
  await writeFile(resolve(ROOT,REG),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({registration:REG,evaluation_key:value.evaluation_key}));}
function predict(config,index,row,catalogSha){
  if(config.family==='A0')return routeA0Defer();
  const settings={catalog_sha256:catalogSha,...Object.fromEntries(
    Object.entries(config).filter(([k])=>!['id','family','mode'].includes(k)))};
  if(config.family==='A1')return routeA1(index,input(row),settings);
  if(config.family==='A3')return routeA3(index,input(row),settings);
  return routeA7(index,input(row),settings);
}
function score(config,index,rows,ids,catalogSha){
  let repeatDifferences=0;const predictions=[];
  for(const row of rows){
    const p=predict(config,index,row,catalogSha),again=predict(config,index,row,catalogSha);
    if(canonicalJSON(p)!==canonicalJSON(again))repeatDifferences++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      new Set(p.topics).size===p.topics.length&&p.topics.every(x=>ids.includes(x))&&
      (p.state==='DEFER')===(p.topics.length===0),'invalid Router output');
    predictions.push(p);
  }
  const singles=rows.slice(0,48),points=predictions.slice(0,48);
  const single=singlePointMetrics(singles.map((row,i)=>({gold:row.topic_id,
    language:row.language,prediction:points[i]})),ids);
  const controls=predictions.slice(48),correct=points.map((p,i)=>
    p.state==='ASSIGNED'&&p.topics.length===1&&p.topics[0]===singles[i].topic_id);
  return {summary:{single_rows:48,assigned:single.assigned,correct:single.correct,
    assigned_precision:single.assigned_precision,single_coverage:single.single_coverage,
    full144_macro_recall:single.full144_macro_recall,missing_topics:single.missing_topics.length,
    controls:12,control_false_assignments:controls.filter(p=>p.topics.length).length,
    deterministic_repeat_differences:repeatDifferences},correct};
}
async function evaluate(){
  try{await lstat(resolve(ROOT,RESULT));throw Error('evaluation key already consumed');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const reg=JSON.parse(await safeRead(REG)),id=await identity();
  must(reg.schema==='ZMR-A7-PARTIAL-DEV-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.identity)===canonicalJSON(id)&&
    reg.evaluation_key===evaluationKey(id)&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS),'registration mismatch');
  const cat=await safeRead(CATALOG),ids=parsePinnedCatalog(cat).map(x=>x.id);
  const dev=JSON.parse(await safeRead(DEV));
  must(dev.schema==='ZMR-A7-PROVISIONAL-DEV-1'&&
    dev.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    dev.intake_status==='PUBLIC_DEV_FROZEN_UNRUN'&&dev.evaluation_status==='UNRUN'&&
    dev.qualification_credit_rows===0&&dev.catalog_sha256===id.catalog_sha256&&
    dev.rows.length===60&&dev.rows.slice(0,48).every((r,i)=>
      r.topic_id===ids[i*3]&&r.expected_state==='ASSIGNED'&&
      r.gold_topics.length===1&&r.gold_topics[0]===r.topic_id)&&
    dev.rows.slice(48).every(r=>r.expected_state==='DEFER'&&
      r.gold_topics.length===0),'unfrozen or invalid DEV cohort');
  const temp=await mkdtemp(join(tmpdir(),'zmr-a7-dev-'));
  const results={},builds={};
  try{
    results.A0_defer=score(CONFIGS[0],null,dev.rows,ids,id.catalog_sha256);
    for(const mode of ['char','word']){
      for(const family of ['A1','A3','A7']){
        const output=join(temp,`${family}-${mode}.json`);
        const build=await ({A1:buildA1,A3:buildA3,A7:buildA7}[family])({mode,output});
        builds[`${family}_${mode}`]={...build,output:'EPHEMERAL_DEVELOPMENT_INDEX'};
        const index=JSON.parse(await readFile(output));
        const cfg=CONFIGS.find(c=>c.family===family&&c.mode===mode);
        results[cfg.id]=score(cfg,index,dev.rows,ids,id.catalog_sha256);
      }
    }
  }finally{await rm(temp,{recursive:true,force:true});}
  const paired={};
  for(const mode of ['char','word']){
    const a=results[`A7_${mode}_default`];
    for(const family of ['A1','A3']){
      const b=results[`${family}_${mode}_fixed`];
      paired[`A7_vs_${family}_${mode}`]={
        both_correct:a.correct.filter((x,i)=>x&&b.correct[i]).length,
        a7_only_correct:a.correct.filter((x,i)=>x&&!b.correct[i]).length,
        anchor_only_correct:a.correct.filter((x,i)=>!x&&b.correct[i]).length,
        control_false_delta:a.summary.control_false_assignments-b.summary.control_false_assignments};
    }
  }
  const summaries={};for(const [name,value] of Object.entries(results))
    summaries[name]=value.summary;
  const report={schema:'ZMR-A7-PARTIAL-DEV-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:reg.evaluation_key,registration_path:REG,identity:id,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    data_qualification:'NOT_QUALIFIED',independent_rows:0,as_consumed:0,
    dev_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,covered_dev_topics:48,control_rows:12,
    fixed_config_count:CONFIGS.length,builds,results:summaries,paired,
    limitations:['one candidate writer and unreviewed gold','96 Topic strata absent in this diagnostic',
      '12 controls and local static bytes do not qualify safety or browser resources',
      'no context, multi-intent, independent AS or final TEST evidence']};
  await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,results:summaries,paired}));
}
const command=process.argv[2];
if(command==='register')await register();
else if(command==='evaluate')await evaluate();
else throw Error('expected register or evaluate');
