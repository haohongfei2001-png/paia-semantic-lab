/** One registered public same-writer A0/A1/A2/A3 diagnostic, never qualification. */
import {readFile,writeFile,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog,parseProvisionalTrain,buildA1} from './a1_compile.mjs';
import {buildA2} from './a2_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {routeA0Defer,routeA1} from './a1.mjs';
import {routeA2} from './a2.mjs';
import {routeA3} from './a3.mjs';
import {canonicalJSON,evaluationKey,singlePointMetrics} from './contracts.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const REG='data/zero_model_refoundation/development/a123_challenge_v03_registration.json';
const REPORT='docs/zero-model-refoundation-v1/ZMR-03_A123_CHALLENGE_V03_RESULT.json';
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const CHALLENGE='data/zero_model_refoundation/development/provisional_challenge_v0.3.json';
export const CLOSURE=['packages/zero_model_refoundation/a123_challenge_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs','packages/zero_model_refoundation/a2.mjs',
  'packages/zero_model_refoundation/a3.mjs','packages/zero_model_refoundation/a1_compile.mjs',
  'packages/zero_model_refoundation/a2_compile.mjs','packages/zero_model_refoundation/a3_compile.mjs',
  'packages/zero_model_refoundation/contracts.mjs','packages/zero_model_refoundation/fingerprints.mjs'];
export const CONFIGS=[
  {id:'A0_all_defer',family:'A0'},
  {id:'A1_char_tfidf',family:'A1',mode:'char',method:'tfidf',min_score:.15,min_margin:.02},
  {id:'A1_char_bm25',family:'A1',mode:'char',method:'bm25',min_score:1,min_margin:.02},
  {id:'A2_char',family:'A2',mode:'char',alpha:.5,min_score:0,min_margin:.5},
  {id:'A3_char',family:'A3',mode:'char',min_score:.02,min_margin:.02},
  {id:'A3_word',family:'A3',mode:'word',min_score:.02,min_margin:.02}
];
const sha=value=>createHash('sha256').update(value).digest('hex');
const must=(ok,message)=>{if(!ok) throw Error(message);};
async function safeRead(path) {
  const target=resolve(ROOT,path),stat=await lstat(target);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular explicit-path input required: '+path);
  return readFile(target);
}
export async function digestPaths(paths) {
  const rows=[];
  for(const path of paths) rows.push({path,sha256:sha(await safeRead(path))});
  return sha(canonicalJSON(rows));
}
function summary(rows,ids) {
  const m=singlePointMetrics(rows.map(({gold,prediction})=>({gold,prediction})),ids);
  const by_language={};
  for(const language of ['zh','en','mixed']) {
    const subset=rows.filter(row=>row.language===language);
    by_language[language]={n:subset.length,
      assigned:subset.filter(row=>row.prediction.topics.length===1).length,
      correct:subset.filter(row=>row.prediction.topics.length===1&&row.prediction.topics[0]===row.gold).length};
  }
  const defer_reasons={};
  for(const row of rows) if(row.prediction.state==='DEFER')
    defer_reasons[row.prediction.reason]=(defer_reasons[row.prediction.reason]??0)+1;
  return {n:m.total,any_assigned:m.any_assigned,assigned:m.assigned,correct:m.correct,
    assigned_precision:m.assigned_precision,single_coverage:m.single_coverage,
    full144_macro_recall:m.full144_macro_recall,missing_topics:m.missing_topics.length,
    unsupported_labels:m.unsupported_labels,by_language,defer_reasons};
}
async function main() {
  try {await lstat(resolve(ROOT,REPORT));throw Error('registered comparison already recorded; no unchanged-closure rerun');}
  catch(error) {if(error.code!=='ENOENT') throw error;}
  const reg=JSON.parse((await safeRead(REG)).toString('utf8'));
  must(reg.schema==='ZMR-A123-CHALLENGE-REGISTRATION-1'&&
    reg.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(reg.configs)===canonicalJSON(CONFIGS),'registration/config mismatch');
  const catalog=await safeRead(CATALOG),train=await safeRead(TRAIN),challenge=await safeRead(CHALLENGE);
  const catalogSha=sha(catalog),trainSha=sha(train),challengeSha=sha(challenge);
  const identity={package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',
    generation_id:'G0_DEV_PUBLIC_CHALLENGE_V03',protocol_version:'ZMR-EVAL-1.0.1',
    resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
    environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
    candidate_closure_sha256:await digestPaths(CLOSURE),catalog_sha256:catalogSha,
    compiler_sha256:await digestPaths(CLOSURE.filter(p=>p.endsWith('_compile.mjs'))),
    train_sha256:trainSha,calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
    cohort_sha256:challengeSha,
    scorer_sha256:await digestPaths(['packages/zero_model_refoundation/contracts.mjs'])};
  must(canonicalJSON(identity)===canonicalJSON(reg.identity)&&
    evaluationKey(identity)===reg.evaluation_key,'changed closure or registered input');
  const topics=parsePinnedCatalog(catalog),ids=topics.map(t=>t.id),idset=new Set(ids);
  const trainRows=parseProvisionalTrain(train,catalogSha,ids);
  const value=JSON.parse(challenge.toString('utf8'));
  must(value.schema==='ZMR-PROVISIONAL-CHALLENGE-3'&&
    value.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    value.catalog_sha256===catalogSha&&value.qualification_credit_rows===0&&
    value.intake_status==='FULL144_PUBLIC_DEV_FROZEN_UNRUN'&&
    value.exposure==='PUBLIC_EXPOSED_CHALLENGE'&&value.evaluation_status==='UNRUN'&&
    Array.isArray(value.rows)&&value.rows.length===144,'unqualified challenge');
  const seen=new Set(),topicSeen=new Set();
  const trainFingerprints=new Set(trainRows.map(row=>fingerprintBundle({current:row.current,title:'',recent:[]}).bundle_sha256));
  for(const [i,row] of value.rows.entries()) {
    const part=Math.floor(i/48)+1;
    must(row&&typeof row.id==='string'&&row.id&&!seen.has(row.id)&&
      idset.has(row.topic_id)&&!topicSeen.has(row.topic_id)&&
      row.topic_id===ids[i]&&row.split==='CHALLENGE_PROVISIONAL'&&
      row.catalog_sha256===catalogSha&&row.expected_state==='ASSIGNED'&&
      Array.isArray(row.gold_topics)&&row.gold_topics.length===1&&
      row.gold_topics[0]===row.topic_id&&
      row.source_id===`writer-challenge-v03-p${part}-20260929`&&
      row.writer_id==='candidate-writer'&&row.writer_cohort==='candidate-writer-G0'&&
      row.source_family==='candidate-writer-G0'&&
      row.gold_origin==='CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED'&&
      row.review_status==='UNREVIEWED_PROVISIONAL'&&
      row.exposure==='PUBLIC_EXPOSED_CHALLENGE'&&
      typeof row.current==='string'&&row.current&&row.title===''&&
      Array.isArray(row.recent)&&row.recent.length===0&&
      ['zh','en','mixed'].includes(row.language),'invalid provisional row');
    seen.add(row.id);topicSeen.add(row.topic_id);
    must(!trainFingerprints.has(fingerprintBundle(row).bundle_sha256),'exact TRAIN/challenge duplicate');
  }
  const predictions={},results={},builds={};
  const score=(id,predict)=>{
    const rows=value.rows.map(row=>({gold:row.topic_id,language:row.language,prediction:predict(row)}));
    predictions[id]=rows.map(row=>row.prediction.topics.length===1&&row.prediction.topics[0]===row.gold);
    results[id]=summary(rows,ids);
  };
  score('A0_all_defer',()=>routeA0Defer());
  const temp=await mkdtemp(join(tmpdir(),'zmr-a123-v03-'));
  try {
    for(const family of ['A1','A2','A3']) for(const mode of (family==='A3'?['char','word']:['char'])) {
      const output=join(temp,`${family}-${mode}.json`);
      const build=family==='A1'?await buildA1({mode,output}):
        family==='A2'?await buildA2({mode,output}):await buildA3({mode,output});
      builds[`${family}_${mode}`]={...build,output:'EPHEMERAL_DEVELOPMENT_INDEX'};
      const index=JSON.parse((await readFile(output)).toString('utf8'));
      for(const config of CONFIGS.filter(c=>c.family===family&&c.mode===mode))
        score(config.id,row=>{
          const input={current:row.current,title:row.title,recent:row.recent};
          return family==='A1'?routeA1(index,input,
            {catalog_sha256:catalogSha,method:config.method,min_score:config.min_score,min_margin:config.min_margin}):
            family==='A2'?routeA2(index,input,
              {catalog_sha256:catalogSha,alpha:config.alpha,min_score:config.min_score,min_margin:config.min_margin}):
              routeA3(index,input,{catalog_sha256:catalogSha,min_score:config.min_score,min_margin:config.min_margin});
        });
    }
  } finally {await rm(temp,{recursive:true,force:true});}
  const paired={};
  for(const anchor of ['A1_char_tfidf','A1_char_bm25','A2_char']) {
    const a=predictions.A3_char,b=predictions[anchor];
    paired[`A3_char_vs_${anchor}`]={both_correct:a.filter((v,i)=>v&&b[i]).length,
      a3_only:a.filter((v,i)=>v&&!b[i]).length,
      anchor_only:b.filter((v,i)=>v&&!a[i]).length,
      neither:a.filter((v,i)=>!v&&!b[i]).length};
  }
  const report={schema:'ZMR-A123-CHALLENGE-RESULT-1',
    classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:reg.evaluation_key,registration_path:REG,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    data_qualification:'NOT_QUALIFIED',independent_rows:0,as_consumed:0,
    challenge_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,train_rows:trainRows.length,challenge_rows:value.rows.length,
    fixed_config_count:CONFIGS.length,identity,builds,results,paired,
    limitations:['same candidate writer authored all inputs and unreviewed labels',
      'one single-intent case per Topic; no independent language quotas or safety layers',
      'point counts and static index bytes do not qualify capability or resources']};
  await writeFile(resolve(ROOT,REPORT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,report:REPORT,
    results:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,
      {assigned:v.assigned,correct:v.correct,precision:v.assigned_precision,
        coverage:v.single_coverage,macro:v.full144_macro_recall}])),paired}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
