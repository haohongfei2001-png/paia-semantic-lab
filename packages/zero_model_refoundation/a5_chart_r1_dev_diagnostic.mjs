/** Once-written reused public chart DEV repair diagnosis, never a fresh gate. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA3} from './a3_compile.mjs';
import {buildA2} from './a2_compile.mjs';
import {routeA3} from './a3.mjs';
import {explicitA5NoRequest} from './a5_evidence_chart.mjs';
import {routeA5ChartR1} from './a5_evidence_chart_r1.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const cohortPath='data/zero_model_refoundation/development/provisional_a5_chart_dev_v0.1.json';
const initialPath='docs/zero-model-refoundation-v1/ZMR-04_A5_CHART_DEV_V01_RESULT.json';
const resultPath='docs/zero-model-refoundation-v1/ZMR-04_A5_CHART_R1_DEV_V01_RESULT.json';
const read=p=>readFile(resolve(ROOT,p));
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(x,message)=>{if(!x)throw Error(message);};
const exact=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
try{await lstat(resolve(ROOT,resultPath));throw Error('A5 chart R1 public DEV already consumed');}
catch(error){if(error.code!=='ENOENT')throw error;}
const cohortBytes=await read(cohortPath),cohort=JSON.parse(cohortBytes);
const initialBytes=await read(initialPath),initial=JSON.parse(initialBytes);
must(cohort.rows?.length===24&&initial.cohort_sha256===sha(cohortBytes)&&
  initial.capability_verdict==='UNTESTED'&&initial.independent_rows===0,
  'initial chart diagnosis mismatch');
const dir=await mkdtemp(join(tmpdir(),'zmr-a5-chart-r1-'));
let result;
try{
  const a3Build=await buildA3({mode:'char',output:join(dir,'a3.json')});
  const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
  const a3=JSON.parse(await readFile(a3Build.output));
  const a2=JSON.parse(await readFile(a2Build.output));
  must(a3.catalog_sha256===a2.catalog_sha256&&
    a3.train_sha256===a2.train_sha256&&
    a3.topic_ids.join('\n')===a2.topic_ids.join('\n')&&
    a3.topic_ids.length===144,'index closure mismatch');
  const byRole=Object.fromEntries(['ROLE_SWAP','CONTEXT_REQUIRED','MULTI','CONTROL']
    .map(role=>[role,{rows:0,assigned:0,exact:0}]));
  const paired={exact_gained:0,exact_lost:0,wrong_avoided_by_defer:0,
    wrong_added:0,controls_false_avoided:0,controls_false_added:0,
    topic_set_switches:0};
  const scope=x=>explicitA5NoRequest(x.current)?
    {state:'DEFER',topics:[],reason:'A5_CHART_EXPLICIT_NO_REQUEST'}:
    routeA3(a3,x,{catalog_sha256:a3.catalog_sha256,
      min_score:.02,min_margin:.02});
  const repaired=x=>routeA5ChartR1(a3,a2,x,
    {catalog_sha256:a3.catalog_sha256});
  let assignedRows=0,exactRows=0,controlsFalse=0,contextChanges=0,
    repeatDifferences=0;
  for(const row of cohort.rows){
    const input={current:row.current,title:row.title,recent:row.recent};
    const anchor=scope(input),out=repaired(input),again=repaired(input);
    must(out&&['ASSIGNED','DEFER'].includes(out.state)&&
      Array.isArray(out.topics)&&out.topics.length<=2&&
      out.topics.every(id=>a3.topic_ids.includes(id))&&
      ((out.state==='DEFER')===(out.topics.length===0)),
      'invalid repaired chart output');
    if(JSON.stringify(out)!==JSON.stringify(again))repeatDifferences++;
    const metric=byRole[row.role];must(metric,'unknown role');metric.rows++;
    if(out.topics.length)metric.assigned++;
    const correct=row.role!=='CONTROL'&&exact(out.topics,row.provisional_gold_topics);
    const anchorCorrect=row.role!=='CONTROL'&&
      exact(anchor.topics,row.provisional_gold_topics);
    if(correct){metric.exact++;exactRows++;}
    if(row.role==='CONTROL'){
      if(out.topics.length)controlsFalse++;
      if(anchor.topics.length&&!out.topics.length)paired.controls_false_avoided++;
      if(!anchor.topics.length&&out.topics.length)paired.controls_false_added++;
    }else{
      if(out.topics.length)assignedRows++;
      if(!anchorCorrect&&correct)paired.exact_gained++;
      if(anchorCorrect&&!correct)paired.exact_lost++;
      if(anchor.topics.length&&!anchorCorrect&&!out.topics.length)
        paired.wrong_avoided_by_defer++;
      if((!anchor.topics.length||anchorCorrect)&&out.topics.length&&!correct)
        paired.wrong_added++;
      if(anchor.topics.length&&out.topics.length&&
        !exact(anchor.topics,out.topics))paired.topic_set_switches++;
    }
    if(row.role==='CONTEXT_REQUIRED'&&JSON.stringify(out)!==
      JSON.stringify(repaired({...input,recent:[]})))contextChanges++;
  }
  const runtime=await Promise.all(['a1.mjs','a2.mjs','a3.mjs',
    'a6_complement_scope.mjs','a6_complement_r1.mjs',
    'a6_complement_r2.mjs','a5_evidence_chart.mjs',
    'a5_evidence_chart_r1.mjs'].map(n=>read('packages/zero_model_refoundation/'+n)));
  const total=a3Build.index_bytes+a2Build.index_bytes+
    runtime.reduce((n,b)=>n+b.length,0);
  must(a3Build.index_bytes+a2Build.index_bytes<=1048576&&
    total<=2097152,'static byte budget exceeded');
  result={schema:'ZMR-A5-CHART-R1-REUSED-DEV-DIAGNOSTIC-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_status:'REUSED_PUBLIC_DEV_INNER_LOOP_NOT_FRESH_GATE',
    cohort:cohortPath,cohort_sha256:sha(cohortBytes),
    initial_result_sha256:sha(initialBytes),
    r1_module_sha256:sha(await read('packages/zero_model_refoundation/a5_evidence_chart_r1.mjs')),
    a3_index_sha256:a3Build.index_sha256,a2_index_sha256:a2Build.index_sha256,
    topic_universe:144,labeled_rows:18,control_rows:6,
    independent_rows:0,as_consumed:0,capability_verdict:'UNTESTED',
    resource_verdict:'NOT_QUALIFIED',by_role:byRole,
    labeled_assigned:assignedRows,labeled_exact:exactRows,
    provisional_exact_set_precision:assignedRows?exactRows/assignedRows:null,
    control_false_assignments:controlsFalse,
    context_removal_output_changes:contextChanges,
    deterministic_repeat_differences:repeatDifferences,
    paired_vs_A3_SCOPE:paired,
    static_bytes:{a3_index:a3Build.index_bytes,a2_index:a2Build.index_bytes,
      runtime_plus_indexes:total},
    limitations:['reused exposed candidate-writer DEV is neither fresh nor independent',
      'static bytes do not certify browser latency or memory']};
}finally{await rm(dir,{recursive:true,force:true});}
await writeFile(resolve(ROOT,resultPath),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({by_role:result.by_role,paired:result.paired_vs_A3_SCOPE,
  static_bytes:result.static_bytes}));
