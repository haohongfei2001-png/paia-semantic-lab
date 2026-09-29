/** Fixed public repair DEV diagnostic. Never run a consumed challenge/AS/TEST here. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA2} from './a2_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {routeA2} from './a2.mjs';
import {routeA3} from './a3.mjs';
import {routeA6ComplementScope} from './a6_complement_scope.mjs';
import {routeA6R1} from './a6_complement_r1.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const COHORT='data/zero_model_refoundation/development/provisional_a6_r1_repair_dev_v0.1.json';
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A6_R1_REPAIR_DEV_V01_RESULT.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const must=(condition,message)=>{if(!condition)throw Error(message);};
const input=row=>({current:row.current,title:row.title,recent:row.recent});
const exact=(topics,gold)=>topics.length===gold.length&&topics.every(x=>gold.includes(x));
const stable=value=>JSON.stringify(value);
async function read(path){
  const full=resolve(ROOT,path),stat=await lstat(full);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular fixed-path input required: '+path);
  return readFile(full);
}
function route(name,a3,a2,row,catalogSha,removeContext=false){
  const x=input(row);if(removeContext)x.recent=[];
  if(name==='A3')return routeA3(a3,x,{catalog_sha256:catalogSha,min_score:.02,min_margin:.02});
  if(name==='A2')return routeA2(a2,x,{catalog_sha256:catalogSha,
    alpha:.5,min_score:0,min_margin:.5});
  if(name==='A6')return routeA6ComplementScope(a3,a2,x,{catalog_sha256:catalogSha,
    a3_min_score:.02,a3_min_margin:.02,a2_alpha:.5,a2_min_score:0,
    a2_min_margin:.5,rescue_min_score:2,rescue_min_margin:2});
  return routeA6R1(a3,a2,x,{catalog_sha256:catalogSha,
    a2_alpha:.5,a2_min_score:0,a2_min_margin:.5,
    a3_min_score:.02,a3_min_margin:.02});
}
function score(name,a3,a2,rows,topicIds,catalogSha){
  const by_role=Object.fromEntries(['SINGLE','CONTROL','LATER_REQUEST',
    'CONTEXT_REQUIRED','MULTI','AMBIGUOUS'].map(role=>[role,{rows:0,assigned:0,exact:0}]));
  let labeled_assigned=0,labeled_exact=0,labeled_wrong=0,
    context_removal_output_changes=0,deterministic_repeat_differences=0;
  const paired=[];
  for(const row of rows){
    const p=route(name,a3,a2,row,catalogSha);
    const q=route(name,a3,a2,row,catalogSha);
    if(stable(p)!==stable(q))deterministic_repeat_differences++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      (p.state==='DEFER')===(p.topics.length===0)&&p.topics.length<=2&&
      new Set(p.topics).size===p.topics.length&&
      p.topics.every(x=>topicIds.includes(x)),'invalid Router output');
    const role=by_role[row.role];must(role,'unregistered role');role.rows++;
    const assigned=p.topics.length>0;
    if(assigned)role.assigned++;
    if(row.role==='CONTEXT_REQUIRED'&&
      stable(p)!==stable(route(name,a3,a2,row,catalogSha,true)))
      context_removal_output_changes++;
    if(['CONTROL','AMBIGUOUS'].includes(row.role)){
      paired.push({role:row.role,assigned});continue;
    }
    const correct=exact(p.topics,row.provisional_gold_topics);
    if(correct){role.exact++;labeled_exact++;}
    if(assigned){labeled_assigned++;if(!correct)labeled_wrong++;}
    paired.push({role:row.role,assigned,correct,wrong:assigned&&!correct});
  }
  return {counts:{by_role,labeled_rows:20,labeled_assigned,labeled_exact,
    labeled_wrong,provisional_exact_set_precision:labeled_assigned?
      labeled_exact/labeled_assigned:null,context_removal_output_changes,
    deterministic_repeat_differences},paired};
}
function compare(left,right){
  const delta={labeled_exact_gained:0,labeled_exact_lost:0,
    wrong_avoided_by_defer:0,wrong_added:0,
    controls_false_avoided:0,controls_false_added:0,
    context_exact_gained:0,multi_exact_gained:0};
  for(let i=0;i<left.length;i++){
    const a=left[i],b=right[i];must(a.role===b.role,'paired role mismatch');
    if(a.role==='CONTROL'){
      if(a.assigned&&!b.assigned)delta.controls_false_avoided++;
      if(!a.assigned&&b.assigned)delta.controls_false_added++;
    }else if(a.role!=='AMBIGUOUS'){
      if(!a.correct&&b.correct){delta.labeled_exact_gained++;
        if(a.role==='CONTEXT_REQUIRED')delta.context_exact_gained++;
        if(a.role==='MULTI')delta.multi_exact_gained++;}
      if(a.correct&&!b.correct)delta.labeled_exact_lost++;
      if(a.wrong&&!b.assigned)delta.wrong_avoided_by_defer++;
      if(!a.wrong&&b.wrong)delta.wrong_added++;
    }
  }
  return delta;
}
try{await lstat(resolve(ROOT,RESULT));throw Error('public repair DEV diagnostic already consumed');}
catch(error){if(error.code!=='ENOENT')throw error;}
const cohortBytes=await read(COHORT),cohort=JSON.parse(cohortBytes);
const catalogBytes=await read(CATALOG),catalogSha=sha(catalogBytes);
const topicIds=parsePinnedCatalog(catalogBytes).map(x=>x.id);
must(topicIds.length===144&&cohort.schema==='ZMR-A6-R1-REPAIR-DEV-1'&&
  cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
  cohort.catalog_sha256===catalogSha&&cohort.row_count===36&&
  cohort.rows.length===36&&cohort.qualification_credit_rows===0&&
  cohort.independent_source_cohorts===0&&
  cohort.intake_status==='PUBLIC_REPAIR_DEV_FROZEN_UNRUN'&&
  cohort.evaluation_status==='UNRUN','invalid frozen repair DEV');
const dir=await mkdtemp(join(tmpdir(),'zmr-a6-r1-repair-dev-'));
let builds,results;
try{
  const a3Build=await buildA3({mode:'char',output:join(dir,'a3.json')});
  const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
  const a3=JSON.parse(await readFile(a3Build.output));
  const a2=JSON.parse(await readFile(a2Build.output));
  must(a3.catalog_sha256===catalogSha&&a2.catalog_sha256===catalogSha&&
    a3.train_sha256===a2.train_sha256,'TRAIN closure mismatch');
  builds={a3_index_bytes:a3Build.index_bytes,a2_index_bytes:a2Build.index_bytes};
  results=Object.fromEntries(['A3','A2','A6','A6_R1'].map(name=>
    [name,score(name,a3,a2,cohort.rows,topicIds,catalogSha)]));
}finally{await rm(dir,{recursive:true,force:true});}
const report={schema:'ZMR-A6-R1-REPAIR-DEV-DIAGNOSTIC-1',
  classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  cohort:COHORT,cohort_sha256:sha(cohortBytes),catalog_sha256:catalogSha,
  train_sha256:sha(await read(TRAIN)),
  a6_r1_module_sha256:sha(await read('packages/zero_model_refoundation/a6_complement_r1.mjs')),
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
  independent_rows:0,as_consumed:0,topic_universe:144,
  fixed_config_count:4,labeled_rows:20,control_rows:12,
  ambiguous_unscored_rows:4,builds,
  results:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.counts])),
  paired:{A6_R1_vs_A2:compare(results.A2.paired,results.A6_R1.paired),
    A6_R1_vs_A6:compare(results.A6.paired,results.A6_R1.paired),
    A6_R1_vs_A3:compare(results.A3.paired,results.A6_R1.paired)},
  limitations:['same-writer unreviewed provisional labels',
    '36 focused public rows are not a full144 capability or safety gate',
    'static index size is not browser resource qualification']};
await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({results:report.results,paired:report.paired}));
