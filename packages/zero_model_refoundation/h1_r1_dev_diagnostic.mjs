/** One-shot reused public H1 DEV repair diagnostic. Never a fresh gate. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA2} from './a2_compile.mjs';
import {buildH1Domain} from './h1_domain_compile.mjs';
import {routeH1FlatScope,routeH1R1,rankH1CompiledDomains} from './h1_recall_safe.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const cohortPath='data/zero_model_refoundation/development/provisional_h1_recall_dev_v0.1.json';
const resultPath='docs/zero-model-refoundation-v1/ZMR-04_H1_R1_RECALL_DEV_V01_RESULT.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(x,message)=>{if(!x)throw Error(message);};
const read=path=>readFile(resolve(ROOT,path));
try{await lstat(resolve(ROOT,resultPath));throw Error('H1-R1 public DEV already consumed');}
catch(error){if(error.code!=='ENOENT')throw error;}
const cohortBytes=await read(cohortPath),cohort=JSON.parse(cohortBytes);
const baseline=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-04_H1_RECALL_DEV_V01_RESULT.json'));
must(cohort.rows?.length===60&&cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
  baseline.cohort_sha256===sha(cohortBytes)&&baseline.capability_verdict==='UNTESTED',
  'frozen public DEV or initial result mismatch');
const dir=await mkdtemp(join(tmpdir(),'zmr-h1-r1-'));
let result;
try{
  const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
  const domainBuild=await buildH1Domain({output:join(dir,'domain.json')});
  const a2=JSON.parse(await readFile(a2Build.output));
  const domain=JSON.parse(await readFile(domainBuild.output));
  must(a2.topic_ids.join('\n')===domain.topic_ids.join('\n')&&
    a2.catalog_sha256===domain.catalog_sha256&&
    a2.train_sha256===domain.train_sha256,'index source mismatch');
  const byRole=Object.fromEntries(['SINGLE','CONTROL','CONTEXT_REQUIRED','MULTI']
    .map(role=>[role,{rows:0,assigned:0,exact:0}]));
  const domainRecall={single_rows:36,top1:0,top3:0,ranking_missing:0,
    flat_assigned_outside_top3:0};
  const paired={exact_gained:0,exact_lost:0,wrong_avoided_by_defer:0,
    wrong_added:0,controls_false_avoided:0,controls_false_added:0,
    topic_switches:0};
  let labeledAssigned=0,labeledExact=0,contextChanges=0,repeatDifferences=0;
  for(const row of cohort.rows){
    const input={current:row.current,title:row.title,recent:row.recent};
    const flat=routeH1FlatScope(a2,input,{catalog_sha256:a2.catalog_sha256});
    const h1=routeH1R1(a2,domain,input,{catalog_sha256:a2.catalog_sha256});
    const again=routeH1R1(a2,domain,input,{catalog_sha256:a2.catalog_sha256});
    if(JSON.stringify(h1)!==JSON.stringify(again))repeatDifferences++;
    must(h1&&['ASSIGNED','DEFER'].includes(h1.state)&&
      Array.isArray(h1.topics)&&h1.topics.length<=2&&
      h1.topics.every(id=>a2.topic_ids.includes(id)),
      'invalid H1-R1 output');
    const count=byRole[row.role];must(count,'unknown role');count.rows++;
    const assigned=h1.topics.length>0;
    if(assigned)count.assigned++;
    const correct=row.role!=='CONTROL'&&
      h1.topics.length===row.provisional_gold_topics.length&&
      h1.topics.every(id=>row.provisional_gold_topics.includes(id));
    const flatCorrect=row.role!=='CONTROL'&&
      flat.topics.length===row.provisional_gold_topics.length&&
      flat.topics.every(id=>row.provisional_gold_topics.includes(id));
    if(correct){count.exact++;labeledExact++;}
    if(row.role!=='CONTROL'&&assigned)labeledAssigned++;
    if(row.role==='CONTEXT_REQUIRED'&&
      JSON.stringify(h1)!==JSON.stringify(routeH1R1(a2,domain,
        {...input,recent:[]},{catalog_sha256:a2.catalog_sha256})))contextChanges++;
    if(row.role==='CONTROL'){
      if(flat.topics.length&&!assigned)paired.controls_false_avoided++;
      if(!flat.topics.length&&assigned)paired.controls_false_added++;
    }else{
      if(!flatCorrect&&correct)paired.exact_gained++;
      if(flatCorrect&&!correct)paired.exact_lost++;
      if(flat.topics.length&&!flatCorrect&&!assigned)paired.wrong_avoided_by_defer++;
      if((!flat.topics.length||flatCorrect)&&assigned&&!correct)paired.wrong_added++;
      if(flat.topics.length===1&&h1.topics.length===1&&
        flat.topics[0]!==h1.topics[0])paired.topic_switches++;
    }
    if(row.role==='SINGLE'){
      const ranking=rankH1CompiledDomains(domain,row.current,
        {catalog_sha256:a2.catalog_sha256,train_sha256:a2.train_sha256});
      if(!ranking)domainRecall.ranking_missing++;
      else{
        if(ranking.ranked[0]===row.provisional_domain)domainRecall.top1++;
        if(ranking.ranked.slice(0,3).includes(row.provisional_domain))domainRecall.top3++;
        if(flat.topics.length===1&&
          !ranking.ranked.slice(0,3).includes(flat.topics[0].split('.')[1]))
          domainRecall.flat_assigned_outside_top3++;
      }
    }
  }
  const runtime=await Promise.all(['a1.mjs','a2.mjs','a6_complement_scope.mjs',
    'a6_complement_r1.mjs','a6_complement_r2.mjs','h1_recall_safe.mjs']
    .map(n=>read('packages/zero_model_refoundation/'+n)));
  const totalBytes=a2Build.index_bytes+domainBuild.index_bytes+
    runtime.reduce((n,b)=>n+b.length,0);
  must(a2Build.index_bytes+domainBuild.index_bytes<=1048576&&
    totalBytes<=2097152,'static budget exceeded');
  result={schema:'ZMR-H1-R1-REUSED-DEV-DIAGNOSTIC-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_status:'REUSED_PUBLIC_DEV_INNER_LOOP_NOT_FRESH_GATE',
    cohort:cohortPath,cohort_sha256:sha(cohortBytes),
    initial_result_sha256:sha(await read('docs/zero-model-refoundation-v1/ZMR-04_H1_RECALL_DEV_V01_RESULT.json')),
    domain_index_sha256:domainBuild.index_sha256,
    a2_index_sha256:a2Build.index_sha256,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    independent_rows:0,as_consumed:0,topic_universe:144,domain_universe:18,
    domain_recall:domainRecall,by_role:byRole,labeled_rows:48,
    labeled_assigned:labeledAssigned,labeled_exact:labeledExact,
    provisional_exact_set_precision:labeledAssigned?labeledExact/labeledAssigned:null,
    context_removal_output_changes:contextChanges,
    deterministic_repeat_differences:repeatDifferences,
    paired_vs_A2_SCOPE:paired,
    static_bytes:{a2_index:a2Build.index_bytes,domain_index:domainBuild.index_bytes,
      runtime_plus_both_indexes:totalBytes},
    limitations:['reused same-writer public DEV is exposed repair evidence, not a fresh gate',
      'static bytes do not certify browser latency or memory']};
}finally{await rm(dir,{recursive:true,force:true});}
await writeFile(resolve(ROOT,resultPath),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({domain_recall:result.domain_recall,by_role:result.by_role,
  paired:result.paired_vs_A2_SCOPE,static_bytes:result.static_bytes}));
