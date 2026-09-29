/** One registered A3/A5/A5-R1 public paired diagnostic, aggregate outputs only. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA3} from './a3.mjs';
import {routeA5Composition} from './a5_composition.mjs';
import {routeA5CompositionR1} from './a5_composition_r1.mjs';
import {canonicalJSON,evaluationKey} from './contracts.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const CHALLENGE='data/zero_model_refoundation/development/provisional_a5_r1_challenge_v0.1.json';
const REG='data/zero_model_refoundation/development/a5_r1_fresh_v01_registration.json';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A5_R1_FRESH_V01_RESULT.json';
const CLOSURE=['packages/zero_model_refoundation/a5_r1_fresh_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs',
  'packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a3.mjs',
  'packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/a5_scope.mjs',
  'packages/zero_model_refoundation/a5_composition.mjs',
  'packages/zero_model_refoundation/a5_composition_r1.mjs',
  'packages/zero_model_refoundation/contracts.mjs'];
const CONFIGS=[
  {id:'A3_char_deletion_ablation',family:'A3',min_score:.02,min_margin:.02},
  {id:'A5_original',family:'A5',full_min_score:.02,full_min_margin:.02,
    segment_min_score:.08,segment_min_margin:.05},
  {id:'A5_R1_no_request_guard',family:'A5_R1',full_min_score:.02,
    full_min_margin:.02,segment_min_score:.08,segment_min_margin:.05}
];
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
async function read(path){const p=resolve(ROOT,path),s=await lstat(p);
  must(s.isFile()&&!s.isSymbolicLink(),'regular fixed-path input required: '+path);
  return readFile(p);}
async function digest(paths){const list=[];
  for(const path of paths)list.push({path,sha256:sha(await read(path))});
  return sha(canonicalJSON(list));}
async function identity(){return {
  package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',
  generation_id:'G0_DEV_PUBLIC_A5_R1_FRESH_V01',
  protocol_version:'ZMR-EVAL-1.0.1',
  resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
  environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
  candidate_closure_sha256:await digest(CLOSURE),
  catalog_sha256:sha(await read(CATALOG)),
  compiler_sha256:await digest(['packages/zero_model_refoundation/a3_compile.mjs']),
  train_sha256:sha(await read(TRAIN)),
  calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
  cohort_sha256:sha(await read(CHALLENGE)),
  scorer_sha256:await digest(['packages/zero_model_refoundation/a5_r1_fresh_compare.mjs',
    'packages/zero_model_refoundation/contracts.mjs'])};}
async function register(){const id=await identity(),value={
  schema:'ZMR-A5-R1-FRESH-COMPARISON-REGISTRATION-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  purpose:'ONE_FIXED_A3_A5_A5_R1_PUBLIC_PAIRED_DIAGNOSTIC',
  identity:id,evaluation_key:evaluationKey(id),configs:CONFIGS,
  cohort:CHALLENGE,topic_universe:144,control_rows:8,request_rows:8,
  multi_rows:4,correction_rows:4,quote_rows:4,
  ambiguous_unscored_rows:4,independent_rows:0,as_consumed:0,
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
  no_calibration:true};
  await writeFile(resolve(ROOT,REG),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({registration:REG,evaluation_key:value.evaluation_key}));}
const input=r=>({current:r.current,title:r.title,recent:r.recent});
function predict(config,index,row,catalogSha){const x=input(row);
  if(config.family==='A3')return routeA3(index,x,{catalog_sha256:catalogSha,
    min_score:config.min_score,min_margin:config.min_margin});
  const opts={catalog_sha256:catalogSha,full_min_score:config.full_min_score,
    full_min_margin:config.full_min_margin,segment_min_score:config.segment_min_score,
    segment_min_margin:config.segment_min_margin};
  return config.family==='A5'?routeA5Composition(index,x,opts):
    routeA5CompositionR1(index,x,opts);}
const exactSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
function score(config,index,rows,ids,catalogSha){
  const by_role=Object.fromEntries(['CONTROL','REQUEST','MULTI','CORRECTION','QUOTE','AMBIGUOUS']
    .map(role=>[role,{rows:0,assigned:0,exact:0}]));
  const local=[];let repeat=0,labeled_assigned=0,labeled_exact=0,labeled_wrong=0;
  for(const row of rows){
    const p=predict(config,index,row,catalogSha),again=predict(config,index,row,catalogSha);
    if(canonicalJSON(p)!==canonicalJSON(again))repeat++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      p.topics.length<=2&&new Set(p.topics).size===p.topics.length&&
      p.topics.every(x=>ids.includes(x))&&
      (p.state==='DEFER')===(p.topics.length===0),'invalid Router output');
    const assigned=p.topics.length>0,role=by_role[row.role];
    must(role,'unregistered role');role.rows++;
    if(assigned)role.assigned++;
    if(row.role==='CONTROL'||row.role==='AMBIGUOUS'){
      local.push({kind:row.role,assigned});
    }else{
      const exact=exactSet(p.topics,row.provisional_gold_topics);
      if(exact){role.exact++;labeled_exact++;}
      if(assigned){labeled_assigned++;if(!exact)labeled_wrong++;}
      local.push({kind:row.role,assigned,exact,wrong:assigned&&!exact});
    }
  }
  return {counts:{by_role,labeled_rows:20,labeled_assigned,labeled_exact,
    labeled_wrong,provisional_exact_set_precision:labeled_assigned?
      labeled_exact/labeled_assigned:null,deterministic_repeat_differences:repeat},local};
}
function pair(a,b){const delta={labeled_exact_gained:0,labeled_exact_lost:0,
  wrong_avoided_by_defer:0,wrong_added:0,assigned_gained:0,assigned_lost:0,
  multi_exact_gained:0,multi_exact_lost:0,
  controls_false_avoided:0,controls_false_added:0,
  positive_request_correct_lost:0,positive_request_assignments_lost:0,
  ambiguous_assignments_removed_unscored:0,
  ambiguous_assignments_added_unscored:0};
  for(let i=0;i<a.length;i++){
    const x=a[i],y=b[i];must(x.kind===y.kind,'paired row mismatch');
    if(x.kind==='CONTROL'){
      if(x.assigned&&!y.assigned)delta.controls_false_avoided++;
      if(!x.assigned&&y.assigned)delta.controls_false_added++;
    }else if(x.kind==='AMBIGUOUS'){
      if(x.assigned&&!y.assigned)delta.ambiguous_assignments_removed_unscored++;
      if(!x.assigned&&y.assigned)delta.ambiguous_assignments_added_unscored++;
    }else{
      if(!x.exact&&y.exact){delta.labeled_exact_gained++;
        if(x.kind==='MULTI')delta.multi_exact_gained++;}
      if(x.exact&&!y.exact){delta.labeled_exact_lost++;
        if(x.kind==='MULTI')delta.multi_exact_lost++;
        if(x.kind==='REQUEST')delta.positive_request_correct_lost++;}
      if(x.wrong&&!y.assigned)delta.wrong_avoided_by_defer++;
      if(!x.wrong&&y.wrong)delta.wrong_added++;
      if(!x.assigned&&y.assigned)delta.assigned_gained++;
      if(x.assigned&&!y.assigned){delta.assigned_lost++;
        if(x.kind==='REQUEST')delta.positive_request_assignments_lost++;}
    }
  }
  return delta;}
async function evaluate(){
  try{await lstat(resolve(ROOT,RESULT));throw Error('evaluation key already consumed');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const reg=JSON.parse(await read(REG)),id=await identity();
  must(reg.schema==='ZMR-A5-R1-FRESH-COMPARISON-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.identity)===canonicalJSON(id)&&
    reg.evaluation_key===evaluationKey(id)&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS),'registration mismatch');
  const catalog=await read(CATALOG),ids=parsePinnedCatalog(catalog).map(x=>x.id);
  const cohort=JSON.parse(await read(CHALLENGE));
  must(cohort.schema==='ZMR-A5-R1-FRESH-PUBLIC-CHALLENGE-1'&&
    cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    cohort.catalog_sha256===id.catalog_sha256&&
    cohort.intake_status==='PUBLIC_CHALLENGE_FROZEN_UNRUN'&&
    cohort.evaluation_status==='UNRUN'&&cohort.qualification_credit_rows===0&&
    cohort.row_count===32&&cohort.control_rows===8&&cohort.request_rows===8&&
    cohort.multi_rows===4&&cohort.correction_rows===4&&
    cohort.quote_rows===4&&cohort.ambiguous_unscored_rows===4&&
    cohort.rows.length===32,'unfrozen A5-R1 challenge');
  for(const row of cohort.rows){
    must(row.writer_id==='candidate-writer'&&
      row.review_status==='UNREVIEWED_PROVISIONAL','invalid row provenance');
    if(row.role==='CONTROL'||row.role==='AMBIGUOUS')
      must(row.provisional_gold_topics.length===0,'unscored/control row has gold');
    else must(row.provisional_gold_topics.length===(row.role==='MULTI'?2:1)&&
      row.provisional_gold_topics.every(x=>ids.includes(x)),'invalid provisional gold');
  }
  const temp=await mkdtemp(join(tmpdir(),'zmr-a5-r1-fresh-'));
  let build,baseline,original,repaired;
  try{
    build=await buildA3({mode:'char',output:join(temp,'a3.json')});
    const index=JSON.parse(await readFile(join(temp,'a3.json')));
    baseline=score(CONFIGS[0],index,cohort.rows,ids,id.catalog_sha256);
    original=score(CONFIGS[1],index,cohort.rows,ids,id.catalog_sha256);
    repaired=score(CONFIGS[2],index,cohort.rows,ids,id.catalog_sha256);
  }finally{await rm(temp,{recursive:true,force:true});}
  const report={schema:'ZMR-A5-R1-FRESH-COMPARISON-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:reg.evaluation_key,registration_path:REG,identity:id,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    data_qualification:'NOT_QUALIFIED',independent_rows:0,as_consumed:0,
    challenge_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,labeled_rows:20,ambiguous_unscored_rows:4,
    control_rows:8,fixed_config_count:3,
    build:{...build,output:'EPHEMERAL_DEVELOPMENT_INDEX'},
    results:{A3_char_deletion_ablation:baseline.counts,
      A5_original:original.counts,A5_R1_no_request_guard:repaired.counts},
    paired:{A5_R1_vs_A5:pair(original.local,repaired.local),
      A5_R1_vs_A3:pair(baseline.local,repaired.local)},
    limitations:['same candidate writer and unreviewed provisional labels',
      'four ambiguous rows have no gold and are unscored',
      'focused data cannot qualify full144 capability or global safety',
      'static bytes do not measure browser memory or latency']};
  await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,
    results:report.results,paired:report.paired}));
}
const command=process.argv[2];
if(command==='register')await register();
else if(command==='evaluate')await evaluate();
else throw Error('expected register or evaluate');
