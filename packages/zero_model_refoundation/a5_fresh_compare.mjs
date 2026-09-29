/** One registered A3 deletion-ablation versus A5 public role/scope diagnostic. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA3} from './a3.mjs';
import {routeA5Composition} from './a5_composition.mjs';
import {canonicalJSON,evaluationKey} from './contracts.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const CHALLENGE='data/zero_model_refoundation/development/provisional_a5_challenge_v0.1.json';
const REG='data/zero_model_refoundation/development/a5_fresh_v01_registration.json';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A5_FRESH_V01_RESULT.json';
const CLOSURE=['packages/zero_model_refoundation/a5_fresh_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs',
  'packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a3.mjs',
  'packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/a5_scope.mjs',
  'packages/zero_model_refoundation/a5_composition.mjs',
  'packages/zero_model_refoundation/contracts.mjs'];
const CONFIGS=[
  {id:'A3_char_deletion_ablation',family:'A3',min_score:.02,min_margin:.02},
  {id:'A5_finite_state_composition',family:'A5',full_min_score:.02,
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
  generation_id:'G0_DEV_PUBLIC_A5_FRESH_COMPOSITION_V01',
  protocol_version:'ZMR-EVAL-1.0.1',
  resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
  environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
  candidate_closure_sha256:await digest(CLOSURE),
  catalog_sha256:sha(await read(CATALOG)),
  compiler_sha256:await digest(['packages/zero_model_refoundation/a3_compile.mjs']),
  train_sha256:sha(await read(TRAIN)),
  calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
  cohort_sha256:sha(await read(CHALLENGE)),
  scorer_sha256:await digest(['packages/zero_model_refoundation/a5_fresh_compare.mjs',
    'packages/zero_model_refoundation/contracts.mjs'])};}
async function register(){const id=await identity(),value={
  schema:'ZMR-A5-FRESH-COMPARISON-REGISTRATION-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  purpose:'ONE_FIXED_A3_DELETION_ABLATION_VERSUS_A5_PUBLIC_DIAGNOSTIC',
  identity:id,evaluation_key:evaluationKey(id),configs:CONFIGS,
  cohort:CHALLENGE,topic_universe:144,correction_rows:8,multi_rows:8,
  quote_rows:4,ambiguous_unscored_rows:4,control_rows:8,
  independent_rows:0,as_consumed:0,capability_verdict:'UNTESTED',
  resource_verdict:'NOT_QUALIFIED',no_calibration:true};
  await writeFile(resolve(ROOT,REG),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({registration:REG,evaluation_key:value.evaluation_key}));}
const input=r=>({current:r.current,title:r.title,recent:r.recent});
function predict(config,index,row,catalogSha){return config.family==='A3'?
  routeA3(index,input(row),{catalog_sha256:catalogSha,
    min_score:config.min_score,min_margin:config.min_margin}):
  routeA5Composition(index,input(row),{catalog_sha256:catalogSha,
    full_min_score:config.full_min_score,full_min_margin:config.full_min_margin,
    segment_min_score:config.segment_min_score,
    segment_min_margin:config.segment_min_margin});}
const equalSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
function score(config,index,rows,ids,catalogSha){
  const counts={correction_rows:8,correction_assigned:0,correction_correct:0,
    multi_rows:8,multi_assigned:0,multi_exact_sets:0,
    quote_rows:4,quote_assigned:0,quote_correct:0,
    labeled_rows:20,labeled_assigned:0,labeled_exact:0,labeled_wrong:0,
    ambiguous_unscored_rows:4,ambiguous_assigned:0,
    controls:8,control_false_assignments:0,
    deterministic_repeat_differences:0};
  const local=[];
  for(const row of rows){
    const p=predict(config,index,row,catalogSha),
      again=predict(config,index,row,catalogSha);
    if(canonicalJSON(p)!==canonicalJSON(again))counts.deterministic_repeat_differences++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      p.topics.length<=2&&new Set(p.topics).size===p.topics.length&&
      p.topics.every(x=>ids.includes(x))&&
      (p.state==='DEFER')===(p.topics.length===0),'invalid Router output');
    const assigned=p.topics.length>0;
    if(row.role==='NO_REQUEST'){
      if(assigned)counts.control_false_assignments++;
      local.push({kind:'control',assigned});
    }else if(row.role==='AMBIGUOUS'){
      if(assigned)counts.ambiguous_assigned++;
      local.push({kind:'ambiguous',assigned});
    }else{
      const exact=equalSet(p.topics,row.provisional_gold_topics);
      if(assigned)counts.labeled_assigned++;
      if(exact)counts.labeled_exact++;
      else if(assigned)counts.labeled_wrong++;
      if(row.role==='CORRECTION'){
        if(assigned)counts.correction_assigned++;
        if(exact)counts.correction_correct++;
      }else if(row.role==='MULTI'){
        if(assigned)counts.multi_assigned++;
        if(exact)counts.multi_exact_sets++;
      }else{
        if(assigned)counts.quote_assigned++;
        if(exact)counts.quote_correct++;
      }
      local.push({kind:'labeled',assigned,exact,wrong:assigned&&!exact,
        multi:row.role==='MULTI'});
    }
  }
  counts.provisional_exact_set_precision=counts.labeled_assigned?
    counts.labeled_exact/counts.labeled_assigned:null;
  return {counts,local};
}
async function evaluate(){
  try{await lstat(resolve(ROOT,RESULT));throw Error('evaluation key already consumed');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const reg=JSON.parse(await read(REG)),id=await identity();
  must(reg.schema==='ZMR-A5-FRESH-COMPARISON-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.identity)===canonicalJSON(id)&&
    reg.evaluation_key===evaluationKey(id)&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS),'registration mismatch');
  const catalog=await read(CATALOG),ids=parsePinnedCatalog(catalog).map(x=>x.id);
  const cohort=JSON.parse(await read(CHALLENGE));
  must(cohort.schema==='ZMR-A5-FRESH-PUBLIC-CHALLENGE-1'&&
    cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    cohort.catalog_sha256===id.catalog_sha256&&
    cohort.intake_status==='PUBLIC_CHALLENGE_FROZEN_UNRUN'&&
    cohort.evaluation_status==='UNRUN'&&cohort.qualification_credit_rows===0&&
    cohort.row_count===32&&cohort.correction_rows===8&&
    cohort.multi_rows===8&&cohort.quote_rows===4&&
    cohort.ambiguous_unscored_rows===4&&cohort.control_rows===8&&
    cohort.rows.length===32,'unfrozen A5 challenge');
  for(const row of cohort.rows){
    must(row.writer_id==='candidate-writer'&&
      row.review_status==='UNREVIEWED_PROVISIONAL','invalid row provenance');
    if(row.role==='AMBIGUOUS'||row.role==='NO_REQUEST')
      must(row.provisional_gold_topics.length===0,'unscored/control row has gold');
    else must(row.provisional_gold_topics.length===(row.role==='MULTI'?2:1)&&
      row.provisional_gold_topics.every(x=>ids.includes(x)),'invalid provisional gold');
  }
  const temp=await mkdtemp(join(tmpdir(),'zmr-a5-fresh-'));
  let build,baseline,candidate;
  try{
    build=await buildA3({mode:'char',output:join(temp,'a3.json')});
    const index=JSON.parse(await readFile(join(temp,'a3.json')));
    baseline=score(CONFIGS[0],index,cohort.rows,ids,id.catalog_sha256);
    candidate=score(CONFIGS[1],index,cohort.rows,ids,id.catalog_sha256);
  }finally{await rm(temp,{recursive:true,force:true});}
  const paired={labeled_exact_gained:0,labeled_exact_lost:0,
    labeled_wrong_avoided_by_defer:0,labeled_wrong_added:0,
    labeled_assignments_gained:0,labeled_assignments_lost:0,
    multi_exact_gained:0,multi_exact_lost:0,
    controls_false_avoided:0,controls_false_added:0,
    ambiguous_assignments_removed_unscored:0,
    ambiguous_assignments_added_unscored:0};
  for(let i=0;i<cohort.rows.length;i++){
    const a=baseline.local[i],b=candidate.local[i];
    if(a.kind==='labeled'){
      if(!a.exact&&b.exact){paired.labeled_exact_gained++;
        if(a.multi)paired.multi_exact_gained++;}
      if(a.exact&&!b.exact){paired.labeled_exact_lost++;
        if(a.multi)paired.multi_exact_lost++;}
      if(a.wrong&&!b.assigned)paired.labeled_wrong_avoided_by_defer++;
      if(!a.wrong&&b.wrong)paired.labeled_wrong_added++;
      if(!a.assigned&&b.assigned)paired.labeled_assignments_gained++;
      if(a.assigned&&!b.assigned)paired.labeled_assignments_lost++;
    }else if(a.kind==='control'){
      if(a.assigned&&!b.assigned)paired.controls_false_avoided++;
      if(!a.assigned&&b.assigned)paired.controls_false_added++;
    }else{
      if(a.assigned&&!b.assigned)paired.ambiguous_assignments_removed_unscored++;
      if(!a.assigned&&b.assigned)paired.ambiguous_assignments_added_unscored++;
    }
  }
  const report={schema:'ZMR-A5-FRESH-COMPARISON-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:reg.evaluation_key,registration_path:REG,identity:id,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    data_qualification:'NOT_QUALIFIED',independent_rows:0,as_consumed:0,
    challenge_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,labeled_rows:20,ambiguous_unscored_rows:4,
    control_rows:8,fixed_config_count:2,
    build:{...build,output:'EPHEMERAL_DEVELOPMENT_INDEX'},
    results:{A3_char_deletion_ablation:baseline.counts,
      A5_finite_state_composition:candidate.counts},paired,
    limitations:['same candidate writer and unreviewed provisional labels',
      'four ambiguous members have no gold and are unscored',
      'focused data cannot qualify full144 capability or global safety',
      'static bytes do not measure browser memory or latency']};
  await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,
    results:report.results,paired}));
}
const command=process.argv[2];
if(command==='register')await register();
else if(command==='evaluate')await evaluate();
else throw Error('expected register or evaluate');
