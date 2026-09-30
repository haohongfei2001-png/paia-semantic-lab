/** Once-written public A4 role DEV diagnostic; aggregate only, no fresh gate. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA1} from './a1_compile.mjs';
import {routeA4RoleContrastR1} from './a4_role_contrast_r1.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA3} from './a3.mjs';
import {explicitA4Scope,projectA4Output,
  routeA4RoleContrast} from './a4_role_contrast.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const cohortPath='data/zero_model_refoundation/development/provisional_a4_role_dev_v0.1.json';
const resultPath='docs/zero-model-refoundation-v1/ZMR-04_A4_ROLE_R1_DEV_V01_RESULT.json';
const read=p=>readFile(resolve(ROOT,p));
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(x,message)=>{if(!x)throw Error(message);};
try{await lstat(resolve(ROOT,resultPath));throw Error('A4 role DEV already consumed');}
catch(error){if(error.code!=='ENOENT')throw error;}
const cohortBytes=await read(cohortPath),cohort=JSON.parse(cohortBytes);
must(cohort.schema==='ZMR-A4-ROLE-CONTRAST-DEV-1'&&
  cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
  cohort.rows?.length===24&&
  cohort.intake_status==='PUBLIC_A4_ROLE_DEV_FROZEN_UNRUN'&&
  cohort.evaluation_status==='UNRUN'&&cohort.qualification_credit_rows===0,
  'A4 role public cohort not frozen');
const dir=await mkdtemp(join(tmpdir(),'zmr-a4-role-'));
let result;
try{
  const build=await buildA3({mode:'char',output:join(dir,'a3.json')});
  const index=JSON.parse(await readFile(build.output));
  must(index.topic_ids.length===144&&index.catalog_sha256===cohort.catalog_sha256,
    'full144 Catalog mismatch');
  const retrievalBuild=await buildA1({mode:'char',output:join(dir,'a1.json')});
  const retrievalIndex=JSON.parse(await readFile(retrievalBuild.output));
  const names=['A4_ROLE','A4_ROLE_R1'];
  const roles=['ROLE_CONTRAST','CONTROL','AMBIGUOUS_UNSCORED'];
  const metrics=Object.fromEntries(names.map(name=>[name,{
    by_role:Object.fromEntries(roles.map(role=>[role,{rows:0,assigned:0,exact:0}])),
    labeled_rows:16,labeled_assigned:0,labeled_exact:0,
    control_false_assignments:0,ambiguous_assignments:0,
    deterministic_repeat_differences:0}]));
  const flat=x=>routeA3(index,x,{catalog_sha256:index.catalog_sha256,
    min_score:.02,min_margin:.02});
  const scope=x=>{const reason=explicitA4Scope(x.current);
    return reason?{state:'DEFER',topics:[],reason}:flat(x);};
  const role=x=>routeA4RoleContrast(index,x,
    {catalog_sha256:index.catalog_sha256});
  const routes={A4_ROLE:role,A4_ROLE_R1:x=>routeA4RoleContrastR1(index,retrievalIndex,x,{catalog_sha256:index.catalog_sha256})};
  const paired={exact_gained:0,exact_lost:0,wrong_avoided_by_defer:0,
    wrong_added:0,topic_switches:0,controls_false_avoided:0,
    controls_false_added:0,ambiguous_assignments_avoided:0,
    ambiguous_assignments_added:0};
  let projectedLabeled=0;
  const pairResults=Object.fromEntries(names.map(name=>[name,new Map()]));
  for(const row of cohort.rows){
    const input={current:row.current,title:row.title,recent:row.recent};
    if(row.role==='ROLE_CONTRAST'&&projectA4Output(row.current))projectedLabeled++;
    const outputs={};
    for(const name of names){
      const output=routes[name](input),again=routes[name](input);
      const metric=metrics[name],bucket=metric.by_role[row.role];
      must(bucket&&output&&['ASSIGNED','DEFER'].includes(output.state)&&
        Array.isArray(output.topics)&&output.topics.length<=1&&
        output.topics.every(id=>index.topic_ids.includes(id))&&
        ((output.state==='DEFER')===(output.topics.length===0)),
        'invalid Router output');
      if(JSON.stringify(output)!==JSON.stringify(again))
        metric.deterministic_repeat_differences++;
      bucket.rows++;const assigned=output.topics.length===1;
      if(assigned)bucket.assigned++;
      const correct=row.role==='ROLE_CONTRAST'&&assigned&&
        output.topics[0]===row.provisional_gold_topics[0];
      if(correct){bucket.exact++;metric.labeled_exact++;}
      if(row.role==='ROLE_CONTRAST'){
        if(assigned)metric.labeled_assigned++;
        const pair=pairResults[name];
        pair.set(row.contrast_family,(pair.get(row.contrast_family)??0)+(correct?1:0));
      }else if(row.role==='CONTROL'&&assigned)metric.control_false_assignments++;
      else if(row.role==='AMBIGUOUS_UNSCORED'&&assigned)
        metric.ambiguous_assignments++;
      outputs[name]={assigned,correct,wrong:assigned&&!correct,
        topic:assigned?output.topics[0]:null};
    }
    const a=outputs.A4_ROLE,b=outputs.A4_ROLE_R1;
    if(row.role==='ROLE_CONTRAST'){
      if(!a.correct&&b.correct)paired.exact_gained++;
      if(a.correct&&!b.correct)paired.exact_lost++;
      if(a.wrong&&!b.assigned)paired.wrong_avoided_by_defer++;
      if(!a.wrong&&b.wrong)paired.wrong_added++;
      if(a.topic&&b.topic&&a.topic!==b.topic)paired.topic_switches++;
    }else if(row.role==='CONTROL'){
      if(a.assigned&&!b.assigned)paired.controls_false_avoided++;
      if(!a.assigned&&b.assigned)paired.controls_false_added++;
    }else{
      if(a.assigned&&!b.assigned)paired.ambiguous_assignments_avoided++;
      if(!a.assigned&&b.assigned)paired.ambiguous_assignments_added++;
    }
  }
  for(const name of names){
    const metric=metrics[name];
    metric.complete_contrast_pairs=[...pairResults[name].values()]
      .filter(n=>n===2).length;
    metric.provisional_assigned_precision=metric.labeled_assigned?
      metric.labeled_exact/metric.labeled_assigned:null;
  }
  const runtime=await Promise.all(['a1.mjs','a3.mjs',
    'a6_complement_scope.mjs','a6_complement_r1.mjs',
    'a6_complement_r2.mjs','a4_role_contrast.mjs','a4_role_contrast_r1.mjs']
    .map(n=>read('packages/zero_model_refoundation/'+n)));
  const totalIndex=build.index_bytes+retrievalBuild.index_bytes;
  const combined=totalIndex+runtime.reduce((n,b)=>n+b.length,0);
  must(totalIndex<=1048576&&combined<=2097152,
    'static byte budget exceeded');
  result={schema:'ZMR-A4-ROLE-R1-PUBLIC-DEV-DIAGNOSTIC-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_status:'REUSED_PUBLIC_DEV_INNER_LOOP_NOT_FRESH_GATE',
    cohort:cohortPath,cohort_sha256:sha(cohortBytes),
    prior_result_sha256:sha(await read('docs/zero-model-refoundation-v1/ZMR-04_A4_ROLE_DEV_V01_RESULT.json')),
    role_module_sha256:sha(await read('packages/zero_model_refoundation/a4_role_contrast.mjs')),
    r1_module_sha256:sha(await read('packages/zero_model_refoundation/a4_role_contrast_r1.mjs')),
    a1_index_sha256:retrievalBuild.index_sha256,
    a3_index_sha256:build.index_sha256,
    fixed_config_count:2,topic_universe:144,independent_rows:0,as_consumed:0,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    role_projection_coverage:{projected_labeled:projectedLabeled,labeled_total:16},
    results:metrics,paired_A4_ROLE_R1_vs_A4_ROLE:paired,
    static_bytes:{a3_index:build.index_bytes,a1_index:retrievalBuild.index_bytes,total_index:totalIndex,runtime_plus_index:combined},
    limitations:['same-writer public DEV is not independent evidence or a fresh gate',
      'ambiguous rows have no gold and are excluded from labeled precision',
      'static bytes do not measure browser latency or memory']};
}finally{await rm(dir,{recursive:true,force:true});}
await writeFile(resolve(ROOT,resultPath),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({projection:result.role_projection_coverage,
  results:result.results,paired:result.paired_A4_ROLE_R1_vs_A4_ROLE,
  static_bytes:result.static_bytes}));
