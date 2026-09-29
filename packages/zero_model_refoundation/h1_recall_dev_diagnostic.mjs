/** Once-written public H1 DEV diagnostic: aggregate domain recall and Topic routing only. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA2} from './a2_compile.mjs';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {routeA2} from './a2.mjs';
import {scoreH1Flat,rankH1Domains,routeH1FlatScope,
  routeH1RecallSafe} from './h1_recall_initial.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const COHORT='data/zero_model_refoundation/development/provisional_h1_recall_dev_v0.1.json';
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const RESULT='docs/zero-model-refoundation-v1/ZMR-04_H1_RECALL_DEV_V01_RESULT.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
const exact=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
async function read(path){const full=resolve(ROOT,path),stat=await lstat(full);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular fixed input required: '+path);
  return readFile(full);}
try{await lstat(resolve(ROOT,RESULT));throw Error('H1 public DEV diagnostic already consumed');}
catch(error){if(error.code!=='ENOENT')throw error;}
const cohortBytes=await read(COHORT),cohort=JSON.parse(cohortBytes);
const catalogBytes=await read(CATALOG),catalogSha=sha(catalogBytes);
const ids=parsePinnedCatalog(catalogBytes).map(x=>x.id);
must(ids.length===144&&cohort.schema==='ZMR-H1-RECALL-DEV-1'&&
  cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
  cohort.catalog_sha256===catalogSha&&cohort.rows.length===60&&
  cohort.single_rows===36&&cohort.control_rows===12&&
  cohort.context_required_rows===6&&cohort.multi_rows===6&&
  cohort.intake_status==='PUBLIC_H1_DEV_FROZEN_UNRUN'&&
  cohort.evaluation_status==='UNRUN'&&cohort.qualification_credit_rows===0,
  'invalid frozen H1 DEV');
const dir=await mkdtemp(join(tmpdir(),'zmr-h1-dev-'));
let builds,results,domainRecall,paired;
try{
  const build=await buildA2({mode:'char',output:join(dir,'a2.json')});
  const index=JSON.parse(await readFile(build.output));
  must(index.catalog_sha256===catalogSha&&index.topic_ids.length===144,
    'full144 TRAIN closure mismatch');
  builds={a2_index_bytes:build.index_bytes,
    h1_runtime_plus_a2_index_bytes:build.index_bytes+
      (await Promise.all(['a1.mjs','a2.mjs','a6_complement_scope.mjs',
        'a6_complement_r1.mjs','a6_complement_r2.mjs','h1_recall_safe.mjs']
        .map(n=>read(`packages/zero_model_refoundation/${n}`))))
        .reduce((n,b)=>n+b.length,0)};
  const names=['A2_FLAT','A2_SCOPE','H1_RECALL_SAFE'];
  const byName=Object.fromEntries(names.map(name=>[name,{
    by_role:Object.fromEntries(['SINGLE','CONTROL','CONTEXT_REQUIRED','MULTI']
      .map(role=>[role,{rows:0,assigned:0,exact:0}])),
    labeled_rows:48,labeled_assigned:0,labeled_exact:0,
    labeled_wrong:0,context_removal_output_changes:0,
    deterministic_repeat_differences:0}]));
  const rowSummaries=[];
  domainRecall={single_rows:36,top1:0,top3:0,
    flat_assigned_outside_top3:0,domain_ranking_missing:0};
  const route=(name,x)=>name==='A2_FLAT'?
    routeA2(index,x,{catalog_sha256:catalogSha,
      alpha:.5,min_score:0,min_margin:.5}):name==='A2_SCOPE'?
      routeH1FlatScope(index,x,{catalog_sha256:catalogSha}):
      routeH1RecallSafe(index,x,{catalog_sha256:catalogSha});
  for(const row of cohort.rows){
    const x={current:row.current,title:row.title,recent:row.recent};
    const summary={role:row.role};
    if(row.role==='SINGLE'){
      const raw=scoreH1Flat(index,row.current,{catalog_sha256:catalogSha});
      const rank=raw&&rankH1Domains(index,raw.scores);
      if(!rank)domainRecall.domain_ranking_missing++;
      else{
        if(rank.ranked[0]===row.provisional_domain)domainRecall.top1++;
        if(rank.ranked.slice(0,3).includes(row.provisional_domain))domainRecall.top3++;
        const flat=route('A2_FLAT',x);
        if(flat.state==='ASSIGNED'&&
          !rank.ranked.slice(0,3).includes(flat.topics[0].split('.')[1]))
          domainRecall.flat_assigned_outside_top3++;
      }
    }
    for(const name of names){
      const p=route(name,x),again=route(name,x);
      const result=byName[name],role=result.by_role[row.role];
      if(JSON.stringify(p)!==JSON.stringify(again))
        result.deterministic_repeat_differences++;
      must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
        (p.state==='DEFER')===(p.topics.length===0)&&p.topics.length<=2&&
        new Set(p.topics).size===p.topics.length&&
        p.topics.every(id=>ids.includes(id)),'invalid Router output');
      role.rows++;
      const assigned=p.topics.length>0;
      if(assigned)role.assigned++;
      if(row.role==='CONTEXT_REQUIRED'){
        const without=route(name,{...x,recent:[]});
        if(JSON.stringify(p)!==JSON.stringify(without))
          result.context_removal_output_changes++;
      }
      const correct=row.role==='CONTROL'?false:
        exact(p.topics,row.provisional_gold_topics);
      if(correct){role.exact++;result.labeled_exact++;}
      if(row.role!=='CONTROL'&&assigned){
        result.labeled_assigned++;
        if(!correct)result.labeled_wrong++;
      }
      summary[name]={assigned,correct,wrong:assigned&&!correct,
        topic:p.topics.length===1?p.topics[0]:null};
    }
    rowSummaries.push(summary);
  }
  results=Object.fromEntries(names.map(name=>{
    const x=byName[name];
    x.provisional_exact_set_precision=x.labeled_assigned?
      x.labeled_exact/x.labeled_assigned:null;
    return [name,x];
  }));
  paired={H1_vs_A2_SCOPE:{exact_gained:0,exact_lost:0,
    wrong_avoided_by_defer:0,wrong_added:0,
    controls_false_avoided:0,controls_false_added:0,
    topic_switches:0}};
  const delta=paired.H1_vs_A2_SCOPE;
  for(const row of rowSummaries){
    const a=row.A2_SCOPE,b=row.H1_RECALL_SAFE;
    if(row.role==='CONTROL'){
      if(a.assigned&&!b.assigned)delta.controls_false_avoided++;
      if(!a.assigned&&b.assigned)delta.controls_false_added++;
    }else{
      if(!a.correct&&b.correct)delta.exact_gained++;
      if(a.correct&&!b.correct)delta.exact_lost++;
      if(a.wrong&&!b.assigned)delta.wrong_avoided_by_defer++;
      if(!a.wrong&&b.wrong)delta.wrong_added++;
      if(a.topic&&b.topic&&a.topic!==b.topic)delta.topic_switches++;
    }
  }
}finally{await rm(dir,{recursive:true,force:true});}
const report={schema:'ZMR-H1-RECALL-DEV-DIAGNOSTIC-1',
  classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  cohort:COHORT,cohort_sha256:sha(cohortBytes),catalog_sha256:catalogSha,
  h1_module_sha256:sha(await read('packages/zero_model_refoundation/h1_recall_initial.mjs')),
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
  independent_rows:0,as_consumed:0,topic_universe:144,domain_universe:18,
  labeled_rows:48,control_rows:12,builds,domain_recall:domainRecall,
  results,paired,
  limitations:['same-writer unreviewed public DEV is not independent evidence',
    'domain recall is diagnostic and cannot certify end-to-end Topic capability',
    'static bytes do not measure browser latency or memory']};
await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({domain_recall:domainRecall,results,paired}));
