/** One registered A3/A2/A6 public development comparison; aggregate outputs only. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {buildA2} from './a2_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA2} from './a2.mjs';
import {routeA3} from './a3.mjs';
import {routeA6ComplementScope} from './a6_complement_scope.mjs';
import {canonicalJSON,evaluationKey} from './contracts.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const GRAPH='data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json';
const CHALLENGE='data/zero_model_refoundation/development/provisional_a6_complement_challenge_v0.1.json';
const REG='data/zero_model_refoundation/development/a6_complement_fresh_v01_registration.json';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A6_COMPLEMENT_FRESH_V01_RESULT.json';
const CLOSURE=['packages/zero_model_refoundation/a6_complement_fresh_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs',
  'packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a2.mjs',
  'packages/zero_model_refoundation/a2_compile.mjs',
  'packages/zero_model_refoundation/a3.mjs',
  'packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/a6_complement_scope.mjs',
  'packages/zero_model_refoundation/contracts.mjs'];
const CONFIGS=[
  {id:'A3_char_deletion_ablation',family:'A3',min_score:.02,min_margin:.02},
  {id:'A2_char_complement_likelihood',family:'A2',alpha:.5,min_score:0,min_margin:.5},
  {id:'A6_complement_scope',family:'A6',a3_min_score:.02,a3_min_margin:.02,
    a2_alpha:.5,a2_min_score:0,a2_min_margin:.5,
    rescue_min_score:2,rescue_min_margin:2}
];
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
async function read(p){const f=resolve(ROOT,p),s=await lstat(f);
  must(s.isFile()&&!s.isSymbolicLink(),'regular fixed-path input required: '+p);
  return readFile(f);}
async function digest(paths){const list=[];
  for(const path of paths)list.push({path,sha256:sha(await read(path))});
  return sha(canonicalJSON(list));}
async function identity(){return {
  package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',
  generation_id:'G0_DEV_PUBLIC_A6_COMPLEMENT_FRESH_V01',
  protocol_version:'ZMR-EVAL-1.0.1',
  resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
  environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
  candidate_closure_sha256:await digest(CLOSURE),
  catalog_sha256:sha(await read(CATALOG)),
  compiler_sha256:await digest(['packages/zero_model_refoundation/a2_compile.mjs',
    'packages/zero_model_refoundation/a3_compile.mjs']),
  train_sha256:await digest([TRAIN,GRAPH]),
  calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
  cohort_sha256:sha(await read(CHALLENGE)),
  scorer_sha256:await digest(['packages/zero_model_refoundation/a6_complement_fresh_compare.mjs',
    'packages/zero_model_refoundation/contracts.mjs'])};}
async function register(){const id=await identity(),value={
  schema:'ZMR-A6-COMPLEMENT-FRESH-COMPARISON-REGISTRATION-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  purpose:'ONE_FIXED_A3_A2_A6_PUBLIC_PAIRED_DIAGNOSTIC',
  identity:id,evaluation_key:evaluationKey(id),configs:CONFIGS,
  cohort:CHALLENGE,topic_universe:144,single_rows:8,control_rows:8,
  later_request_rows:4,context_required_rows:4,multi_rows:4,
  ambiguous_unscored_rows:4,independent_rows:0,as_consumed:0,
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
  no_calibration:true};
  await writeFile(resolve(ROOT,REG),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({registration:REG,evaluation_key:value.evaluation_key}));}
const input=r=>({current:r.current,title:r.title,recent:r.recent});
function predict(config,a3,a2,row,catalogSha,removeContext=false){
  const x=input(row);if(removeContext)x.recent=[];
  if(config.family==='A3')return routeA3(a3,x,{catalog_sha256:catalogSha,
    min_score:config.min_score,min_margin:config.min_margin});
  if(config.family==='A2')return routeA2(a2,x,{catalog_sha256:catalogSha,
    alpha:config.alpha,min_score:config.min_score,min_margin:config.min_margin});
  return routeA6ComplementScope(a3,a2,x,{catalog_sha256:catalogSha,
    a3_min_score:config.a3_min_score,a3_min_margin:config.a3_min_margin,
    a2_alpha:config.a2_alpha,a2_min_score:config.a2_min_score,
    a2_min_margin:config.a2_min_margin,rescue_min_score:config.rescue_min_score,
    rescue_min_margin:config.rescue_min_margin});
}
const exactSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
function score(config,a3,a2,rows,ids,catalogSha){
  const by_role=Object.fromEntries(['SINGLE','CONTROL','LATER_REQUEST',
    'CONTEXT_REQUIRED','MULTI','AMBIGUOUS']
    .map(role=>[role,{rows:0,assigned:0,exact:0}]));
  const local=[];let repeat=0,labeled_assigned=0,labeled_exact=0,labeled_wrong=0;
  let context_removal_output_changes=0;
  for(const row of rows){
    const p=predict(config,a3,a2,row,catalogSha);
    const again=predict(config,a3,a2,row,catalogSha);
    if(canonicalJSON(p)!==canonicalJSON(again))repeat++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      p.topics.length<=2&&new Set(p.topics).size===p.topics.length&&
      p.topics.every(x=>ids.includes(x))&&
      (p.state==='DEFER')===(p.topics.length===0),'invalid Router output');
    const assigned=p.topics.length>0,role=by_role[row.role];
    must(role,'unregistered role');role.rows++;
    if(assigned)role.assigned++;
    if(row.role==='CONTEXT_REQUIRED'){
      const removed=predict(config,a3,a2,row,catalogSha,true);
      if(canonicalJSON(p)!==canonicalJSON(removed))context_removal_output_changes++;
    }
    if(['CONTROL','AMBIGUOUS'].includes(row.role)){
      local.push({kind:row.role,assigned});
    }else{
      const exact=exactSet(p.topics,row.provisional_gold_topics);
      if(exact){role.exact++;labeled_exact++;}
      if(assigned){labeled_assigned++;if(!exact)labeled_wrong++;}
      local.push({kind:row.role,assigned,exact,wrong:assigned&&!exact,
        topic:p.topics.length===1?p.topics[0]:null});
    }
  }
  return {counts:{by_role,labeled_rows:20,labeled_assigned,labeled_exact,
    labeled_wrong,provisional_exact_set_precision:labeled_assigned?
      labeled_exact/labeled_assigned:null,
    context_removal_output_changes,deterministic_repeat_differences:repeat},local};
}
function pair(before,after){const delta={labeled_exact_gained:0,labeled_exact_lost:0,
  wrong_avoided_by_defer:0,wrong_added:0,assigned_gained:0,assigned_lost:0,
  wrong_to_correct_switches:0,correct_to_wrong_switches:0,
  controls_false_avoided:0,controls_false_added:0,
  context_exact_gained:0,context_exact_lost:0,
  multi_exact_gained:0,multi_exact_lost:0,
  ambiguous_assignments_removed_unscored:0,
  ambiguous_assignments_added_unscored:0};
  for(let i=0;i<before.length;i++){
    const x=before[i],y=after[i];must(x.kind===y.kind,'paired row mismatch');
    if(x.kind==='CONTROL'){
      if(x.assigned&&!y.assigned)delta.controls_false_avoided++;
      if(!x.assigned&&y.assigned)delta.controls_false_added++;
    }else if(x.kind==='AMBIGUOUS'){
      if(x.assigned&&!y.assigned)delta.ambiguous_assignments_removed_unscored++;
      if(!x.assigned&&y.assigned)delta.ambiguous_assignments_added_unscored++;
    }else{
      if(!x.exact&&y.exact){delta.labeled_exact_gained++;
        if(x.kind==='CONTEXT_REQUIRED')delta.context_exact_gained++;
        if(x.kind==='MULTI')delta.multi_exact_gained++;}
      if(x.exact&&!y.exact){delta.labeled_exact_lost++;
        if(x.kind==='CONTEXT_REQUIRED')delta.context_exact_lost++;
        if(x.kind==='MULTI')delta.multi_exact_lost++;}
      if(x.wrong&&!y.assigned)delta.wrong_avoided_by_defer++;
      if(!x.wrong&&y.wrong)delta.wrong_added++;
      if(!x.assigned&&y.assigned)delta.assigned_gained++;
      if(x.assigned&&!y.assigned)delta.assigned_lost++;
      if(x.topic&&y.topic&&x.topic!==y.topic){
        if(x.wrong&&y.exact)delta.wrong_to_correct_switches++;
        if(x.exact&&y.wrong)delta.correct_to_wrong_switches++;
      }
    }
  }
  return delta;}
async function evaluate(){
  try{await lstat(resolve(ROOT,RESULT));throw Error('evaluation key already consumed');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const reg=JSON.parse(await read(REG)),id=await identity();
  must(reg.schema==='ZMR-A6-COMPLEMENT-FRESH-COMPARISON-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.identity)===canonicalJSON(id)&&
    reg.evaluation_key===evaluationKey(id)&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS),'registration mismatch');
  const catalog=await read(CATALOG),ids=parsePinnedCatalog(catalog).map(x=>x.id);
  const cohort=JSON.parse(await read(CHALLENGE));
  must(cohort.schema==='ZMR-A6-COMPLEMENT-PUBLIC-CHALLENGE-1'&&
    cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    cohort.catalog_sha256===id.catalog_sha256&&
    cohort.intake_status==='PUBLIC_CHALLENGE_FROZEN_UNRUN'&&
    cohort.evaluation_status==='UNRUN'&&cohort.qualification_credit_rows===0&&
    cohort.row_count===32&&cohort.single_rows===8&&cohort.control_rows===8&&
    cohort.later_request_rows===4&&cohort.context_required_rows===4&&
    cohort.multi_rows===4&&cohort.ambiguous_unscored_rows===4&&
    cohort.rows.length===32,'unfrozen A6 challenge');
  for(const row of cohort.rows){
    must(row.writer_id==='candidate-writer'&&
      row.review_status==='UNREVIEWED_PROVISIONAL','invalid row provenance');
    if(['CONTROL','AMBIGUOUS'].includes(row.role))
      must(row.provisional_gold_topics.length===0,'unscored/control row has gold');
    else must(row.provisional_gold_topics.length===(row.role==='MULTI'?2:1)&&
      row.provisional_gold_topics.every(x=>ids.includes(x)),'invalid provisional gold');
  }
  const temp=await mkdtemp(join(tmpdir(),'zmr-a6-complement-fresh-'));
  let a3Build,a2Build,baseline,complement,hybrid;
  try{
    a3Build=await buildA3({mode:'char',output:join(temp,'a3.json')});
    a2Build=await buildA2({mode:'char',output:join(temp,'a2.json')});
    const a3=JSON.parse(await readFile(join(temp,'a3.json'))),
      a2=JSON.parse(await readFile(join(temp,'a2.json')));
    baseline=score(CONFIGS[0],a3,a2,cohort.rows,ids,id.catalog_sha256);
    complement=score(CONFIGS[1],a3,a2,cohort.rows,ids,id.catalog_sha256);
    hybrid=score(CONFIGS[2],a3,a2,cohort.rows,ids,id.catalog_sha256);
  }finally{await rm(temp,{recursive:true,force:true});}
  const report={schema:'ZMR-A6-COMPLEMENT-FRESH-COMPARISON-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:reg.evaluation_key,registration_path:REG,identity:id,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    data_qualification:'NOT_QUALIFIED',independent_rows:0,as_consumed:0,
    challenge_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,labeled_rows:20,control_rows:8,
    ambiguous_unscored_rows:4,fixed_config_count:3,
    builds:{a3:{...a3Build,output:'EPHEMERAL_DEVELOPMENT_INDEX'},
      a2:{...a2Build,output:'EPHEMERAL_DEVELOPMENT_INDEX'}},
    results:{A3_char_deletion_ablation:baseline.counts,
      A2_char_complement_likelihood:complement.counts,
      A6_complement_scope:hybrid.counts},
    paired:{A6_vs_A3:pair(baseline.local,hybrid.local),
      A6_vs_A2:pair(complement.local,hybrid.local),
      A2_vs_A3:pair(baseline.local,complement.local)},
    limitations:['same candidate writer and unreviewed provisional labels',
      'four ambiguous rows have no gold and are unscored',
      'focused public rows cannot qualify full144 capability or global safety',
      'current-only Routers cannot establish context-required or multi-intent capability',
      'static bytes do not measure browser memory or latency']};
  await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,
    results:report.results,paired:report.paired}));
}
const command=process.argv[2];
if(command==='register')await register();
else if(command==='evaluate')await evaluate();
else throw Error('expected register or evaluate');
