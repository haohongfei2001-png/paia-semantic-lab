/** Once-written public DEV aggregate; no sealed reads, no capability gate. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA1} from './a1_compile.mjs';
import {buildA1BalancedR1} from './a1_balanced_r1_compile.mjs';
import {routeA1} from './a1.mjs';
import {routeA1BalancedR1} from './a1_balanced_r1.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const cohortPath='data/zero_model_refoundation/development/provisional_a1_balanced_dev_v0.1.json';
const resultPath='docs/zero-model-refoundation-v1/ZMR-02_A1_BALANCED_R1_DEV_V01_RESULT.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>readFile(resolve(ROOT,p));
const must=(x,m)=>{if(!x)throw Error(m);};
try{await lstat(resolve(ROOT,resultPath));throw Error('public balanced DEV already consumed');}
catch(e){if(e.code!=='ENOENT')throw e;}
const cohortBytes=await read(cohortPath),cohort=JSON.parse(cohortBytes);
must(cohort.schema==='ZMR-A1-BALANCED-DEV-1'&&cohort.rows.length===36&&cohort.qualification_credit_rows===0&&cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&cohort.intake_status==='PUBLIC_A1_BALANCED_DEV_FROZEN_UNRUN'&&cohort.evaluation_status==='UNRUN','frozen provisional DEV required');
const moduleNames=['a1.mjs','a1_compile.mjs','a1_balanced_r1.mjs','a1_balanced_r1_compile.mjs','a1_balanced_r1_dev_diagnostic.mjs'];
const dependency_hashes={};for(const n of moduleNames)dependency_hashes[n]=sha(await read('packages/zero_model_refoundation/'+n));
const dir=await mkdtemp(join(tmpdir(),'zmr-a1-balanced-'));let result;
try{
 const anchor=await buildA1({mode:'char',output:join(dir,'frequency.json')});
 const candidate=await buildA1BalancedR1({output:join(dir,'balanced.json')});
 const a=JSON.parse(await readFile(anchor.output)),b=JSON.parse(await readFile(candidate.output));
 must(a.catalog_sha256===cohort.catalog_sha256&&a.catalog_sha256===b.catalog_sha256&&a.train_sha256===b.train_sha256&&JSON.stringify(a.topic_ids)===JSON.stringify(b.topic_ids),'full144 closure mismatch');
 const rebuilt=await buildA1BalancedR1({output:join(dir,'balanced-repeat.json')});
 must(rebuilt.index_sha256===candidate.index_sha256,'non-deterministic compile');
 const configs={method:'tfidf',min_score:.15,min_margin:.02,current_only:true};
 const evaluation_key=sha(JSON.stringify({package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',scope:'PUBLIC_DEV_INNER_LOOP_ONLY',dependency_hashes,catalog_sha256:a.catalog_sha256,train_sha256:a.train_sha256,cohort_sha256:sha(cohortBytes),anchor_index:anchor.index_sha256,candidate_index:candidate.index_sha256,configs}));
 const roles=['SINGLE','CONTROL','CONTEXT_REQUIRED','MULTI','AMBIGUOUS_UNSCORED'];
 const names=['FREQUENCY','BALANCED'];
 const metrics=Object.fromEntries(names.map(n=>[n,{by_role:Object.fromEntries(roles.map(r=>[r,{rows:0,assigned:0,exact:0,supported_labels:0,output_labels:0}])),single_rows:18,single_assigned:0,single_exact:0,global_supported_labels:0,global_output_labels:0,ambiguous_assignments:0,deterministic_repeat_differences:0}]));
 const paired={single_exact_gained:0,single_exact_lost:0,single_wrong_added:0,single_wrong_avoided:0,control_false_added:0,control_false_avoided:0};
 const routes={FREQUENCY:x=>routeA1(a,x,{catalog_sha256:a.catalog_sha256,...configs}),BALANCED:x=>routeA1BalancedR1(b,x,{catalog_sha256:b.catalog_sha256})};
 for(const row of cohort.rows){
  const input={current:row.current,title:row.title,recent:row.recent},outputs={};
  for(const n of names){const out=routes[n](input),m=metrics[n],bucket=m.by_role[row.role];
   must(bucket&&['ASSIGNED','DEFER'].includes(out.state)&&Array.isArray(out.topics)&&out.topics.length<=1&&out.topics.every(t=>a.topic_ids.includes(t))&&((out.state==='DEFER')===(out.topics.length===0)),'invalid output');
   if(JSON.stringify(out)!==JSON.stringify(routes[n](input)))m.deterministic_repeat_differences++;
   const assigned=out.topics.length>0,scored=row.role!=='AMBIGUOUS_UNSCORED';
   const exact=scored&&row.provisional_gold_topics.length>0&&out.topics.length===row.provisional_gold_topics.length&&out.topics.every(t=>row.provisional_gold_topics.includes(t));
   const supported=scored?out.topics.filter(t=>row.provisional_gold_topics.includes(t)).length:0;
   bucket.rows++;bucket.assigned+=Number(assigned);bucket.exact+=Number(exact);bucket.output_labels+=out.topics.length;bucket.supported_labels+=supported;
   if(row.role==='SINGLE'){m.single_assigned+=Number(assigned);m.single_exact+=Number(exact);}
   if(scored){m.global_output_labels+=out.topics.length;m.global_supported_labels+=supported;}else m.ambiguous_assignments+=Number(assigned);
   outputs[n]={assigned,exact,wrong:assigned&&!exact};
  }
  const p=outputs.FREQUENCY,q=outputs.BALANCED;
  if(row.role==='SINGLE'){paired.single_exact_gained+=Number(!p.exact&&q.exact);paired.single_exact_lost+=Number(p.exact&&!q.exact);paired.single_wrong_added+=Number(!p.wrong&&q.wrong);paired.single_wrong_avoided+=Number(p.wrong&&!q.wrong);}
  if(row.role==='CONTROL'){paired.control_false_added+=Number(!p.assigned&&q.assigned);paired.control_false_avoided+=Number(p.assigned&&!q.assigned);}
 }
 for(const m of Object.values(metrics)){
  m.provisional_single_assigned_precision=m.single_assigned?m.single_exact/m.single_assigned:null;
  m.provisional_single_coverage=m.single_assigned/18;m.provisional_single_exact_recall=m.single_exact/18;
  m.global_label_micro_precision=m.global_output_labels?m.global_supported_labels/m.global_output_labels:null;
  m.full144_macro_recall_zero_contribution_diagnostic=m.single_exact/144;
  m.full144_qualification='DATA_INSUFFICIENT_126_SINGLE_TOPIC_GOLD_GAPS';
 }
 result={schema:'ZMR-A1-BALANCED-R1-PUBLIC-DEV-DIAGNOSTIC-1',classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',evaluation_status:'REUSED_PUBLIC_DEV_INNER_LOOP_NOT_FRESH_GATE',evaluation_key,cohort:cohortPath,cohort_sha256:sha(cohortBytes),initial_result_sha256:sha(await read('docs/zero-model-refoundation-v1/ZMR-02_A1_BALANCED_DEV_V01_RESULT.json')),dependency_hashes,configs,topic_universe:144,single_gold_topics:18,missing_single_gold_topics:126,independent_rows:0,as_consumed:0,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',results:metrics,paired_BALANCED_vs_FREQUENCY:paired,builds:{frequency:anchor,balanced:candidate},limitations:['same-writer unreviewed gold; no independent qualification credit','current-only top1 deliberately cannot qualify context or multi layers','ambiguous rows have no gold and are excluded from all precision denominators','static bytes and deterministic builds do not qualify memory/latency or capability']};
 delete result.builds.frequency.output;delete result.builds.balanced.output;
}finally{await rm(dir,{recursive:true,force:true});}
await writeFile(resolve(ROOT,resultPath),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({results:result.results,paired:result.paired_BALANCED_vs_FREQUENCY,builds:result.builds}));
