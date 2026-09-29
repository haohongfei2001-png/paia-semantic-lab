/** One registered A3/A4-veto/A4-positive public paired diagnostic. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {buildA4Pairs} from './a4_pair_compile.mjs';
import {routeA3} from './a3.mjs';
import {routeA4Pairs} from './a4_pairwise.mjs';
import {routeA4PairPositive} from './a4_pair_positive.mjs';
import {canonicalJSON,evaluationKey} from './contracts.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const BASE_TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const PAIR_TRAIN='data/zero_model_refoundation/development/provisional_a4_train_v0.1.json';
const GRAPH='data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json';
const CHALLENGE='data/zero_model_refoundation/development/provisional_a4_positive_challenge_v0.1.json';
const REG='data/zero_model_refoundation/development/a4_positive_fresh_v01_registration.json';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A4_POSITIVE_FRESH_V01_RESULT.json';
const CLOSURE=['packages/zero_model_refoundation/a4_positive_fresh_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs','packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a3.mjs','packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/a4_pairwise.mjs',
  'packages/zero_model_refoundation/a4_pair_positive.mjs',
  'packages/zero_model_refoundation/a4_pair_compile.mjs',
  'packages/zero_model_refoundation/contracts.mjs'];
const CONFIGS=[
  {id:'A3_char_deletion_ablation',family:'A3',min_score:.02,min_margin:.02},
  {id:'A4_char_pair_veto',family:'A4',base_min_score:.02,base_min_margin:.02,
    min_pair_support:2},
  {id:'A4_positive_pair_evidence',family:'A4_POSITIVE',base_min_score:.02,
    base_min_margin:.02,min_positive_support:3,min_positive_margin:2}
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
  generation_id:'G0_DEV_PUBLIC_A4_POSITIVE_FRESH_V01',
  protocol_version:'ZMR-EVAL-1.0.1',
  resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
  environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
  candidate_closure_sha256:await digest(CLOSURE),
  catalog_sha256:sha(await read(CATALOG)),
  compiler_sha256:await digest(['packages/zero_model_refoundation/a3_compile.mjs',
    'packages/zero_model_refoundation/a4_pair_compile.mjs']),
  train_sha256:await digest([BASE_TRAIN,PAIR_TRAIN,GRAPH]),
  calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
  cohort_sha256:sha(await read(CHALLENGE)),
  scorer_sha256:await digest(['packages/zero_model_refoundation/a4_positive_fresh_compare.mjs',
    'packages/zero_model_refoundation/contracts.mjs'])};}
async function register(){const id=await identity(),value={
  schema:'ZMR-A4-POSITIVE-FRESH-COMPARISON-REGISTRATION-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  purpose:'ONE_FIXED_A3_A4_VETO_A4_POSITIVE_PUBLIC_PAIRED_DIAGNOSTIC',
  identity:id,evaluation_key:evaluationKey(id),configs:CONFIGS,
  cohort:CHALLENGE,topic_universe:144,provisional_labeled_pair_rows:16,
  ambiguous_unscored_rows:4,control_rows:8,
  independent_rows:0,as_consumed:0,capability_verdict:'UNTESTED',
  resource_verdict:'NOT_QUALIFIED',no_calibration:true};
  await writeFile(resolve(ROOT,REG),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({registration:REG,evaluation_key:value.evaluation_key}));}
const input=r=>({current:r.current,title:r.title,recent:r.recent});
function predict(config,base,pair,row,catalogSha){
  if(config.family==='A3')return routeA3(base,input(row),{catalog_sha256:catalogSha,
    min_score:config.min_score,min_margin:config.min_margin});
  if(config.family==='A4')return routeA4Pairs(base,pair,input(row),{catalog_sha256:catalogSha,
      base_min_score:config.base_min_score,base_min_margin:config.base_min_margin,
      min_pair_support:config.min_pair_support});
  return routeA4PairPositive(base,pair,input(row),{catalog_sha256:catalogSha,
    base_min_score:config.base_min_score,base_min_margin:config.base_min_margin,
    min_positive_support:config.min_positive_support,
    min_positive_margin:config.min_positive_margin});
}
function score(config,base,pair,rows,ids,catalogSha){
  const counts={provisional_labeled_pair_rows:16,labeled_assigned:0,
    labeled_correct:0,labeled_wrong:0,left_correct:0,right_correct:0,
    pairs_all_four_correct:0,ambiguous_unscored_rows:4,ambiguous_assigned:0,
    controls:8,control_false_assignments:0,deterministic_repeat_differences:0};
  const local=[];
  for(let i=0;i<rows.length;i++){
    const row=rows[i],p=predict(config,base,pair,row,catalogSha),
      again=predict(config,base,pair,row,catalogSha);
    if(canonicalJSON(p)!==canonicalJSON(again))counts.deterministic_repeat_differences++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      p.topics.length<=1&&new Set(p.topics).size===p.topics.length&&
      p.topics.every(x=>ids.includes(x))&&
      (p.state==='DEFER')===(p.topics.length===0),'invalid Router output');
    if(row.layer==='CONTROL'){
      if(p.topics.length)counts.control_false_assignments++;
      local.push({kind:'control',assigned:p.topics.length>0});
    }else if(row.role==='AMBIGUOUS'){
      if(p.topics.length)counts.ambiguous_assigned++;
      local.push({kind:'ambiguous',assigned:p.topics.length>0});
    }else{
      const assigned=p.topics.length>0,
        correct=p.topics.length===1&&p.topics[0]===row.provisional_topic_id;
      if(assigned)counts.labeled_assigned++;
      if(correct){counts.labeled_correct++;
        if(row.role==='LEFT')counts.left_correct++;else counts.right_correct++;}
      else if(assigned)counts.labeled_wrong++;
      local.push({kind:'labeled',assigned,correct,wrong:assigned&&!correct,
        topic:p.topics[0]??null});
    }
  }
  for(let i=0;i<20;i+=5)if(local.slice(i,i+5).filter(x=>x.kind==='labeled')
    .every(x=>x.correct))counts.pairs_all_four_correct++;
  counts.provisional_assigned_precision=counts.labeled_assigned?
    counts.labeled_correct/counts.labeled_assigned:null;
  return {counts,local};
}
function pair(before,after){
  const delta={labeled_correct_gained:0,labeled_correct_lost:0,
    wrong_avoided_by_defer:0,wrong_added:0,wrong_to_correct_switches:0,
    correct_to_wrong_switches:0,wrong_to_other_wrong_switches:0,
    assigned_gained:0,assigned_lost:0,controls_false_avoided:0,
    controls_false_added:0,ambiguous_assignments_removed_unscored:0,
    ambiguous_assignments_added_unscored:0};
  for(let i=0;i<before.length;i++){
    const a=before[i],b=after[i];must(a.kind===b.kind,'paired row mismatch');
    if(a.kind==='control'){
      if(a.assigned&&!b.assigned)delta.controls_false_avoided++;
      if(!a.assigned&&b.assigned)delta.controls_false_added++;
    }else if(a.kind==='ambiguous'){
      if(a.assigned&&!b.assigned)delta.ambiguous_assignments_removed_unscored++;
      if(!a.assigned&&b.assigned)delta.ambiguous_assignments_added_unscored++;
    }else{
      if(!a.correct&&b.correct)delta.labeled_correct_gained++;
      if(a.correct&&!b.correct)delta.labeled_correct_lost++;
      if(a.wrong&&!b.assigned)delta.wrong_avoided_by_defer++;
      if(!a.wrong&&b.wrong)delta.wrong_added++;
      if(!a.assigned&&b.assigned)delta.assigned_gained++;
      if(a.assigned&&!b.assigned)delta.assigned_lost++;
      if(a.assigned&&b.assigned&&a.topic!==b.topic){
        if(a.wrong&&b.correct)delta.wrong_to_correct_switches++;
        else if(a.correct&&b.wrong)delta.correct_to_wrong_switches++;
        else if(a.wrong&&b.wrong)delta.wrong_to_other_wrong_switches++;
      }
    }
  }
  return delta;
}
async function evaluate(){
  try{await lstat(resolve(ROOT,RESULT));throw Error('evaluation key already consumed');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const reg=JSON.parse(await read(REG)),id=await identity();
  must(reg.schema==='ZMR-A4-POSITIVE-FRESH-COMPARISON-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.identity)===canonicalJSON(id)&&
    reg.evaluation_key===evaluationKey(id)&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS),'registration mismatch');
  const catalog=await read(CATALOG),ids=parsePinnedCatalog(catalog).map(x=>x.id);
  const cohort=JSON.parse(await read(CHALLENGE));
  must(cohort.schema==='ZMR-A4-POSITIVE-PUBLIC-CHALLENGE-1'&&
    cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    cohort.catalog_sha256===id.catalog_sha256&&
    cohort.intake_status==='PUBLIC_CHALLENGE_FROZEN_UNRUN'&&
    cohort.evaluation_status==='UNRUN'&&cohort.qualification_credit_rows===0&&
    cohort.row_count===28&&cohort.provisional_labeled_pair_rows===16&&
    cohort.ambiguous_unscored_rows===4&&cohort.control_rows===8&&
    cohort.rows.length===28,'unfrozen A4 challenge');
  for(const row of cohort.rows){
    must(row.writer_id==='candidate-writer'&&
      row.review_status==='UNREVIEWED_PROVISIONAL','invalid row provenance');
    if(row.role==='AMBIGUOUS')must(row.provisional_gold_topics.length===0&&
      row.provisional_topic_id===null,'ambiguous row cannot have gold');
    if(row.layer==='PAIR'&&row.role!=='AMBIGUOUS')must(
      row.provisional_gold_topics.length===1&&
      row.provisional_gold_topics[0]===row.provisional_topic_id&&
      ids.includes(row.provisional_topic_id),'invalid pair provisional gold');
  }
  const temp=await mkdtemp(join(tmpdir(),'zmr-a4-positive-fresh-'));
  let baseBuild,pairBuild,baseline,veto,positive;
  try{
    baseBuild=await buildA3({mode:'char',output:join(temp,'a3.json')});
    pairBuild=await buildA4Pairs({output:join(temp,'a4.json')});
    const base=JSON.parse(await readFile(join(temp,'a3.json'))),
      pair=JSON.parse(await readFile(join(temp,'a4.json')));
    baseline=score(CONFIGS[0],base,pair,cohort.rows,ids,id.catalog_sha256);
    veto=score(CONFIGS[1],base,pair,cohort.rows,ids,id.catalog_sha256);
    positive=score(CONFIGS[2],base,pair,cohort.rows,ids,id.catalog_sha256);
  }finally{await rm(temp,{recursive:true,force:true});}
  const paired={A4_positive_vs_A3:pair(baseline.local,positive.local),
    A4_positive_vs_A4_veto:pair(veto.local,positive.local),
    A4_veto_vs_A3:pair(baseline.local,veto.local)};
  const report={schema:'ZMR-A4-POSITIVE-FRESH-COMPARISON-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:reg.evaluation_key,registration_path:REG,identity:id,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    data_qualification:'NOT_QUALIFIED',independent_rows:0,as_consumed:0,
    challenge_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,provisional_labeled_pair_rows:16,
    ambiguous_unscored_rows:4,control_rows:8,fixed_config_count:3,
    builds:{base:{...baseBuild,output:'EPHEMERAL_DEVELOPMENT_INDEX'},
      pair:{...pairBuild,output:'EPHEMERAL_DEVELOPMENT_INDEX'}},
    results:{A3_char_deletion_ablation:baseline.counts,
      A4_char_pair_veto:veto.counts,A4_positive_pair_evidence:positive.counts},
    paired,limitations:['same candidate writer and unreviewed provisional labels',
      'four ambiguous members have no gold and are unscored',
      'focused 16-label/8-control data cannot qualify full144 capability or global safety',
      'static bytes do not measure browser memory or latency']};
  await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,
    results:report.results,paired}));
}
const command=process.argv[2];
if(command==='register')await register();
else if(command==='evaluate')await evaluate();
else throw Error('expected register or evaluate');
