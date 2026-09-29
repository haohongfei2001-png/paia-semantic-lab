/** Once-written same-writer A5 chart public DEV diagnostic. No fresh gate claim. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA3} from './a3_compile.mjs';
import {routeA3} from './a3.mjs';
import {explicitA5NoRequest,routeA5EvidenceChart} from './a5_evidence_chart.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const cohortPath='data/zero_model_refoundation/development/provisional_a5_chart_dev_v0.1.json';
const resultPath='docs/zero-model-refoundation-v1/ZMR-04_A5_CHART_DEV_V01_RESULT.json';
const read=p=>readFile(resolve(ROOT,p));
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(x,message)=>{if(!x)throw Error(message);};
const exact=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
try{await lstat(resolve(ROOT,resultPath));throw Error('A5 chart public DEV already consumed');}
catch(error){if(error.code!=='ENOENT')throw error;}
const cohortBytes=await read(cohortPath),cohort=JSON.parse(cohortBytes);
must(cohort.schema==='ZMR-A5-CHART-DEV-1'&&cohort.rows?.length===24&&
  cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
  cohort.intake_status==='PUBLIC_A5_CHART_DEV_FROZEN_UNRUN'&&
  cohort.evaluation_status==='UNRUN'&&cohort.qualification_credit_rows===0,
  'public chart cohort is not frozen');
const dir=await mkdtemp(join(tmpdir(),'zmr-a5-chart-'));
let result;
try{
  const build=await buildA3({mode:'char',output:join(dir,'a3.json')});
  const index=JSON.parse(await readFile(build.output));
  must(index.topic_ids.length===144&&index.catalog_sha256===cohort.catalog_sha256,
    'A3 full144 Catalog mismatch');
  const names=['A3_FLAT','A3_SCOPE','A5_CHART'];
  const roleNames=['ROLE_SWAP','CONTEXT_REQUIRED','MULTI','CONTROL'];
  const metrics=Object.fromEntries(names.map(name=>[name,{
    by_role:Object.fromEntries(roleNames.map(role=>[role,{rows:0,assigned:0,exact:0}])),
    labeled_rows:18,labeled_assigned:0,labeled_exact:0,
    control_false_assignments:0,context_removal_output_changes:0,
    deterministic_repeat_differences:0}]));
  const flat=x=>routeA3(index,x,{catalog_sha256:index.catalog_sha256,
    min_score:.02,min_margin:.02});
  const scope=x=>explicitA5NoRequest(x.current)?
    {state:'DEFER',topics:[],reason:'A5_CHART_EXPLICIT_NO_REQUEST'}:flat(x);
  const chart=x=>routeA5EvidenceChart(index,x,{catalog_sha256:index.catalog_sha256});
  const routes={A3_FLAT:flat,A3_SCOPE:scope,A5_CHART:chart};
  const paired={exact_gained:0,exact_lost:0,wrong_avoided_by_defer:0,
    wrong_added:0,controls_false_avoided:0,controls_false_added:0,
    topic_set_switches:0};
  for(const row of cohort.rows){
    const input={current:row.current,title:row.title,recent:row.recent};
    const outputs={};
    for(const name of names){
      const output=routes[name](input),repeat=routes[name](input);
      const metric=metrics[name],role=metric.by_role[row.role];
      must(role&&output&&['ASSIGNED','DEFER'].includes(output.state)&&
        Array.isArray(output.topics)&&output.topics.length<=2&&
        output.topics.every(id=>index.topic_ids.includes(id))&&
        ((output.state==='DEFER')===(output.topics.length===0)),
        'invalid Router output');
      if(JSON.stringify(output)!==JSON.stringify(repeat))
        metric.deterministic_repeat_differences++;
      role.rows++;
      const assigned=output.topics.length>0;
      if(assigned)role.assigned++;
      const correct=row.role!=='CONTROL'&&
        exact(output.topics,row.provisional_gold_topics);
      if(correct){role.exact++;metric.labeled_exact++;}
      if(row.role==='CONTROL'){
        if(assigned)metric.control_false_assignments++;
      }else if(assigned)metric.labeled_assigned++;
      if(row.role==='CONTEXT_REQUIRED'&&JSON.stringify(output)!==
        JSON.stringify(routes[name]({...input,recent:[]})))
        metric.context_removal_output_changes++;
      outputs[name]={assigned,correct,wrong:assigned&&!correct,
        topics:output.topics};
    }
    const a=outputs.A3_SCOPE,b=outputs.A5_CHART;
    if(row.role==='CONTROL'){
      if(a.assigned&&!b.assigned)paired.controls_false_avoided++;
      if(!a.assigned&&b.assigned)paired.controls_false_added++;
    }else{
      if(!a.correct&&b.correct)paired.exact_gained++;
      if(a.correct&&!b.correct)paired.exact_lost++;
      if(a.wrong&&!b.assigned)paired.wrong_avoided_by_defer++;
      if(!a.wrong&&b.wrong)paired.wrong_added++;
      if(a.assigned&&b.assigned&&!exact(a.topics,b.topics))
        paired.topic_set_switches++;
    }
  }
  for(const name of names){
    const metric=metrics[name];
    metric.provisional_exact_set_precision=metric.labeled_assigned?
      metric.labeled_exact/metric.labeled_assigned:null;
  }
  const runtime=await Promise.all(['a1.mjs','a3.mjs',
    'a6_complement_scope.mjs','a6_complement_r1.mjs',
    'a6_complement_r2.mjs','a5_evidence_chart.mjs']
    .map(n=>read('packages/zero_model_refoundation/'+n)));
  const staticBytes=build.index_bytes+runtime.reduce((n,b)=>n+b.length,0);
  must(build.index_bytes<=1048576&&staticBytes<=2097152,
    'static byte budget exceeded');
  result={schema:'ZMR-A5-CHART-PUBLIC-DEV-DIAGNOSTIC-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    cohort:cohortPath,cohort_sha256:sha(cohortBytes),
    chart_module_sha256:sha(await read('packages/zero_model_refoundation/a5_evidence_chart.mjs')),
    a3_index_sha256:build.index_sha256,
    fixed_config_count:3,topic_universe:144,independent_rows:0,as_consumed:0,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    results:metrics,paired_A5_CHART_vs_A3_SCOPE:paired,
    static_bytes:{a3_index:build.index_bytes,runtime_plus_index:staticBytes},
    limitations:['same-writer public DEV is not independent evidence or a fresh gate',
      'static bytes do not measure browser latency or memory']};
}finally{await rm(dir,{recursive:true,force:true});}
await writeFile(resolve(ROOT,resultPath),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({results:result.results,
  paired:result.paired_A5_CHART_vs_A3_SCOPE,static_bytes:result.static_bytes}));
