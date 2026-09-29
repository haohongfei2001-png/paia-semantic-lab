/** Final R2 same-writer repair DEV check; reused public DEV is never a fresh gate. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {buildA2} from './a2_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {routeA6R2} from './a6_complement_r2.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const COHORT='data/zero_model_refoundation/development/provisional_a6_r1_repair_dev_v0.1.json';
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const RESULT='docs/zero-model-refoundation-v1/ZMR-05_A6_R2_REPAIR_DEV_V01_RESULT.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
const exact=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
async function read(path){const full=resolve(ROOT,path),stat=await lstat(full);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular fixed input required: '+path);
  return readFile(full);}
try{await lstat(resolve(ROOT,RESULT));throw Error('R2 repair DEV check already consumed');}
catch(error){if(error.code!=='ENOENT')throw error;}
const cohortBytes=await read(COHORT),cohort=JSON.parse(cohortBytes);
const catalogBytes=await read(CATALOG),catalogSha=sha(catalogBytes);
const ids=parsePinnedCatalog(catalogBytes).map(x=>x.id);
must(ids.length===144&&cohort.schema==='ZMR-A6-R1-REPAIR-DEV-1'&&
  cohort.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
  cohort.catalog_sha256===catalogSha&&cohort.rows.length===36&&
  cohort.qualification_credit_rows===0,'invalid public repair DEV');
const dir=await mkdtemp(join(tmpdir(),'zmr-a6-r2-dev-'));
let counts;
try{
  const a3Build=await buildA3({mode:'char',output:join(dir,'a3.json')});
  const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
  const a3=JSON.parse(await readFile(a3Build.output));
  const a2=JSON.parse(await readFile(a2Build.output));
  must(a3.catalog_sha256===catalogSha&&a2.catalog_sha256===catalogSha&&
    a3.train_sha256===a2.train_sha256,'TRAIN closure mismatch');
  const by_role=Object.fromEntries(['SINGLE','CONTROL','LATER_REQUEST',
    'CONTEXT_REQUIRED','MULTI','AMBIGUOUS']
    .map(role=>[role,{rows:0,assigned:0,exact:0}]));
  counts={by_role,labeled_rows:20,labeled_assigned:0,labeled_exact:0,
    labeled_wrong:0,context_removal_output_changes:0,
    deterministic_repeat_differences:0};
  for(const row of cohort.rows){
    const x={current:row.current,title:row.title,recent:row.recent};
    const p=routeA6R2(a3,a2,x,{catalog_sha256:catalogSha});
    const again=routeA6R2(a3,a2,x,{catalog_sha256:catalogSha});
    if(JSON.stringify(p)!==JSON.stringify(again))counts.deterministic_repeat_differences++;
    must(p&&['ASSIGNED','DEFER'].includes(p.state)&&Array.isArray(p.topics)&&
      (p.state==='DEFER')===(p.topics.length===0)&&p.topics.length<=2&&
      new Set(p.topics).size===p.topics.length&&p.topics.every(x=>ids.includes(x)),
      'invalid Router output');
    const role=by_role[row.role];must(role,'invalid role');role.rows++;
    if(p.topics.length)role.assigned++;
    if(row.role==='CONTEXT_REQUIRED'){
      const removed=routeA6R2(a3,a2,{...x,recent:[]},{catalog_sha256:catalogSha});
      if(JSON.stringify(p)!==JSON.stringify(removed))counts.context_removal_output_changes++;
    }
    if(['CONTROL','AMBIGUOUS'].includes(row.role))continue;
    const correct=exact(p.topics,row.provisional_gold_topics);
    if(correct){role.exact++;counts.labeled_exact++;}
    if(p.topics.length){counts.labeled_assigned++;if(!correct)counts.labeled_wrong++;}
  }
  counts.provisional_exact_set_precision=counts.labeled_assigned?
    counts.labeled_exact/counts.labeled_assigned:null;
}finally{await rm(dir,{recursive:true,force:true});}
const report={schema:'ZMR-A6-R2-REPAIR-DEV-DIAGNOSTIC-1',
  classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  public_dev_reused_for_inner_loop:true,fresh_gate:false,
  cohort:COHORT,cohort_sha256:sha(cohortBytes),catalog_sha256:catalogSha,
  a6_r2_module_sha256:sha(await read('packages/zero_model_refoundation/a6_complement_r2.mjs')),
  capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
  independent_rows:0,as_consumed:0,topic_universe:144,
  labeled_rows:20,control_rows:12,ambiguous_unscored_rows:4,
  results:{A6_R2:counts},
  limitations:['same-writer reused public repair DEV is not a fresh gate',
    'unreviewed provisional labels and only 36 focused rows',
    'no browser resource qualification']};
await writeFile(resolve(ROOT,RESULT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report.results));
