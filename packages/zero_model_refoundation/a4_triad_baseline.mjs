/** One registered A4 triad baseline; ambiguous rows never receive invented gold. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog,buildA1} from './a1_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA0Defer,routeA1} from './a1.mjs';
import {routeA3} from './a3.mjs';
import {canonicalJSON,evaluationKey} from './contracts.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const GRAPH='data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json';
const TRIADS='data/zero_model_refoundation/development/provisional_a4_triads_v0.1.json';
const REG='data/zero_model_refoundation/development/a4_triad_v01_registration.json';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A4_TRIADS_V01_BASELINE_RESULT.json';
const CLOSURE=['packages/zero_model_refoundation/a4_triad_baseline.mjs',
  'packages/zero_model_refoundation/a1.mjs','packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a3.mjs','packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/contracts.mjs'];
const CONFIGS=[
  {id:'A0_defer',family:'A0'},
  {id:'A1_char_fixed',family:'A1',mode:'char',method:'tfidf',min_score:.15,min_margin:.02},
  {id:'A3_char_fixed',family:'A3',mode:'char',min_score:.02,min_margin:.02},
  {id:'A1_word_fixed',family:'A1',mode:'word',method:'tfidf',min_score:.15,min_margin:.02},
  {id:'A3_word_fixed',family:'A3',mode:'word',min_score:.02,min_margin:.02}
];
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
async function read(p){const f=resolve(ROOT,p),s=await lstat(f);
  must(s.isFile()&&!s.isSymbolicLink(),'regular fixed-path input required: '+p);
  return readFile(f);}
async function digest(paths){const list=[];
  for(const path of paths)list.push({path,sha256:sha(await read(path))});
  return sha(canonicalJSON(list));}
async function identity(){return{
  package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',
  generation_id:'G0_DEV_PUBLIC_A4_BOUNDARY_TRIADS_V01',
  protocol_version:'ZMR-EVAL-1.0.1',
  resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
  environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
  candidate_closure_sha256:await digest(CLOSURE),catalog_sha256:sha(await read(CATALOG)),
  compiler_sha256:await digest(['packages/zero_model_refoundation/a1_compile.mjs',
    'packages/zero_model_refoundation/a3_compile.mjs']),
  train_sha256:sha(await read(TRAIN)),calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
  cohort_sha256:await digest([GRAPH,TRIADS]),
  scorer_sha256:await digest(['packages/zero_model_refoundation/a4_triad_baseline.mjs',
    'packages/zero_model_refoundation/contracts.mjs'])};}
async function register(){const id=await identity(),value={
  schema:'ZMR-A4-TRIAD-BASELINE-REGISTRATION-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  purpose:'ONE_PUBLIC_BOUNDARY_BASELINE_DIAGNOSTIC_ONLY',
  identity:id,evaluation_key:evaluationKey(id),configs:CONFIGS,
  triad_path:TRIADS,graph_path:GRAPH,topic_universe:144,
  provisional_labeled_rows:8,ambiguous_unscored_rows:4,
  independent_rows:0,as_consumed:0,capability_verdict:'UNTESTED',
  resource_verdict:'NOT_QUALIFIED',no_calibration:true};
  await writeFile(resolve(ROOT,REG),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({registration:REG,evaluation_key:value.evaluation_key}));}
const input=r=>({current:r.current,title:r.title,recent:r.recent});
function predict(config,index,row,catalogSha){
  if(config.family==='A0')return routeA0Defer();
  const settings={catalog_sha256:catalogSha,...Object.fromEntries(
    Object.entries(config).filter(([k])=>!['id','family','mode'].includes(k)))};
  return config.family==='A1'?routeA1(index,input(row),settings):routeA3(index,input(row),settings);
}
function score(config,index,rows,ids,catalogSha){
  const counts={labeled_rows:8,labeled_assigned:0,labeled_correct:0,
    left_correct:0,right_correct:0,pairs_both_correct:0,
    ambiguous_unscored_rows:4,ambiguous_assigned:0,
    deterministic_repeat_differences:0};
  for(let i=0;i<rows.length;i+=3){
    const outcomes=[];
    for(let j=0;j<3;j++){
      const row=rows[i+j],p=predict(config,index,row,catalogSha),again=predict(config,index,row,catalogSha);
      if(canonicalJSON(p)!==canonicalJSON(again))counts.deterministic_repeat_differences++;
      must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
        new Set(p.topics).size===p.topics.length&&p.topics.every(x=>ids.includes(x))&&
        (p.state==='DEFER')===(p.topics.length===0),'invalid Router output');
      if(j===2){if(p.topics.length)counts.ambiguous_assigned++;continue;}
      if(p.topics.length)counts.labeled_assigned++;
      const correct=p.topics.length===1&&p.topics[0]===row.provisional_topic_id;
      outcomes.push(correct);
      if(correct){counts.labeled_correct++;
        if(j===0)counts.left_correct++;else counts.right_correct++;}
    }
    if(outcomes.every(Boolean))counts.pairs_both_correct++;
  }
  counts.provisional_assigned_precision=counts.labeled_assigned?
    counts.labeled_correct/counts.labeled_assigned:null;
  return counts;
}
async function evaluate(){
  try{await lstat(resolve(ROOT,RESULT));throw Error('evaluation key already consumed');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const reg=JSON.parse(await read(REG)),id=await identity();
  must(reg.schema==='ZMR-A4-TRIAD-BASELINE-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.identity)===canonicalJSON(id)&&
    reg.evaluation_key===evaluationKey(id)&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS),'registration mismatch');
  const catalog=await read(CATALOG),ids=parsePinnedCatalog(catalog).map(x=>x.id);
  const graphBytes=await read(GRAPH),graph=JSON.parse(graphBytes);
  const triads=JSON.parse(await read(TRIADS));
  must(graph.topic_count===144&&graph.no_resolver_activated===true&&
    triads.schema==='ZMR-A4-PROVISIONAL-TRIADS-1'&&
    triads.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    triads.intake_status==='PUBLIC_TRIADS_FROZEN_UNRUN'&&
    triads.qualification_credit_rows===0&&triads.resolver_activated===false&&
    triads.boundary_graph_sha256===sha(graphBytes)&&
    triads.row_count===12&&triads.pair_count===4&&
    canonicalJSON(triads.edge_ranks)===canonicalJSON([1,3,5,8]),
    'invalid or unfrozen A4 triads');
  for(let i=0;i<triads.rows.length;i++){
    const row=triads.rows[i],edge=graph.edges[triads.edge_ranks[Math.floor(i/3)]-1];
    must(row.left_topic_id===edge.left_topic_id&&row.right_topic_id===edge.right_topic_id&&
      row.review_status==='UNREVIEWED_PROVISIONAL','invalid triad linkage');
    if(i%3===2)must(row.triad_role==='AMBIGUOUS_UNRESOLVED'&&
      row.provisional_gold_topics.length===0&&row.provisional_topic_id===null,
      'ambiguous member must remain unscored');
    else must(row.triad_role===(i%3===0?'LEFT_POSITIVE':'RIGHT_NEGATIVE')&&
      row.provisional_gold_topics.length===1&&
      row.provisional_gold_topics[0]===row.provisional_topic_id,
      'missing provisional labeled member');
  }
  const temp=await mkdtemp(join(tmpdir(),'zmr-a4-triad-')),
    results={},builds={};
  try{
    results.A0_defer=score(CONFIGS[0],null,triads.rows,ids,id.catalog_sha256);
    for(const mode of ['char','word'])for(const family of ['A1','A3']){
      const output=join(temp,`${family}-${mode}.json`),
        build=await (family==='A1'?buildA1:buildA3)({mode,output});
      builds[`${family}_${mode}`]={...build,output:'EPHEMERAL_DEVELOPMENT_INDEX'};
      const index=JSON.parse(await readFile(output));
      const config=CONFIGS.find(c=>c.family===family&&c.mode===mode);
      results[config.id]=score(config,index,triads.rows,ids,id.catalog_sha256);
    }
  }finally{await rm(temp,{recursive:true,force:true});}
  const report={schema:'ZMR-A4-TRIAD-BASELINE-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:reg.evaluation_key,registration_path:REG,identity:id,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    data_qualification:'NOT_QUALIFIED',independent_rows:0,as_consumed:0,
    triad_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,pair_count:4,provisional_labeled_rows:8,
    ambiguous_unscored_rows:4,fixed_config_count:CONFIGS.length,builds,results,
    limitations:['candidate-writer provisional labels only','four ambiguous rows have no gold',
      'four graph pairs cannot qualify full144 or pairwise resolver safety']};
  await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,results}));
}
const command=process.argv[2];
if(command==='register')await register();
else if(command==='evaluate')await evaluate();
else throw Error('expected register or evaluate');
