/** One registered, public, same-writer development diagnostic. Never a qualification gate. */
import { readFile, writeFile, lstat, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { parsePinnedCatalog, parseProvisionalTrain, buildA1 } from './a1_compile.mjs';
import { buildA2 } from './a2_compile.mjs';
import { routeA0Defer, routeA0NameOnly, routeA1 } from './a1.mjs';
import { routeA2 } from './a2.mjs';
import { canonicalJSON, evaluationKey, singlePointMetrics } from './contracts.mjs';
import { fingerprintBundle } from './fingerprints.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const REG='data/zero_model_refoundation/development/a12_challenge_v02_registration.json';
const REPORT='docs/zero-model-refoundation-v1/ZMR-03_A1A2_CHALLENGE_V02_RESULT.json';
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const CHALLENGE='data/zero_model_refoundation/development/provisional_challenge_v0.2.json';
export const CLOSURE=['packages/zero_model_refoundation/a12_challenge_compare.mjs',
  'packages/zero_model_refoundation/a1.mjs','packages/zero_model_refoundation/a2.mjs',
  'packages/zero_model_refoundation/a1_compile.mjs','packages/zero_model_refoundation/a2_compile.mjs',
  'packages/zero_model_refoundation/contracts.mjs','packages/zero_model_refoundation/fingerprints.mjs'];
export const CONFIGS=[
  {id:'A0_all_defer',family:'A0'}, {id:'A0_name_only',family:'A0'},
  ...['char','word'].flatMap(mode=>['tfidf','bm25'].map(method=>({
    id:`A1_${mode}_${method}`,family:'A1',mode,method,
    min_score:method==='bm25'?1:.15,min_margin:.02}))),
  ...['char','word'].map(mode=>({id:`A2_${mode}`,family:'A2',mode,
    alpha:.5,min_score:0,min_margin:.5}))
];
const sha=value=>createHash('sha256').update(value).digest('hex');
const must=(ok,message)=>{if(!ok) throw new Error(message);};
async function safeRead(relative) {
  const path=resolve(ROOT,relative),stat=await lstat(path);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular explicit-path input required: '+relative);
  return readFile(path);
}
export async function digestPaths(paths) {
  const rows=[];
  for(const path of paths) rows.push({path,sha256:sha(await safeRead(path))});
  return sha(canonicalJSON(rows));
}
function summarize(rows,ids) {
  const m=singlePointMetrics(rows.map(({gold,prediction})=>({gold,prediction})),ids);
  const counts={};
  for(const language of ['zh','en','mixed']) {
    const subset=rows.filter(row=>row.language===language);
    counts[language]={n:subset.length,assigned:subset.filter(row=>row.prediction.topics.length===1).length,
      correct:subset.filter(row=>row.prediction.topics.length===1&&row.prediction.topics[0]===row.gold).length};
  }
  const reasons={};
  for(const row of rows) if(row.prediction.state==='DEFER')
    reasons[row.prediction.reason]=(reasons[row.prediction.reason]??0)+1;
  return {n:m.total,any_assigned:m.any_assigned,assigned:m.assigned,correct:m.correct,
    assigned_precision:m.assigned_precision,single_coverage:m.single_coverage,
    full144_macro_recall:m.full144_macro_recall,missing_topics:m.missing_topics.length,
    unsupported_labels:m.unsupported_labels,by_language:counts,defer_reasons:reasons};
}

async function main() {
  try { await lstat(resolve(ROOT,REPORT)); throw new Error('registered comparison already recorded; no unchanged-closure rerun'); }
  catch(error) { if(error.code!=='ENOENT') throw error; }
  const registration=JSON.parse((await safeRead(REG)).toString('utf8'));
  must(registration.schema==='ZMR-A12-CHALLENGE-REGISTRATION-1'&&
    registration.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    canonicalJSON(registration.configs)===canonicalJSON(CONFIGS), 'registration/config mismatch');
  const catalog=await safeRead(CATALOG),train=await safeRead(TRAIN),challenge=await safeRead(CHALLENGE);
  const catalogSha=sha(catalog),trainSha=sha(train),challengeSha=sha(challenge);
  const identity={package_id:'PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1',
    generation_id:'G0_DEV_PUBLIC_CHALLENGE_V02',protocol_version:'ZMR-EVAL-1.0.1',
    resource_profile:'UNQUALIFIED_DEV_LOCAL_NODE_NO_BROWSER',
    environment:`node-${process.versions.node}-${process.platform}-${process.arch}`,
    candidate_closure_sha256:await digestPaths(CLOSURE),catalog_sha256:catalogSha,
    compiler_sha256:await digestPaths(CLOSURE.filter(p=>p.endsWith('_compile.mjs'))),
    train_sha256:trainSha,calibration_sha256:sha('UNFITTED_NO_CALIBRATION'),
    cohort_sha256:challengeSha,
    scorer_sha256:await digestPaths(['packages/zero_model_refoundation/contracts.mjs'])};
  must(canonicalJSON(identity)===canonicalJSON(registration.identity)&&
    evaluationKey(identity)===registration.evaluation_key,'changed closure or registered input');
  const topics=parsePinnedCatalog(catalog),ids=topics.map(t=>t.id);
  const trainRows=parseProvisionalTrain(train,catalogSha,ids);
  const value=JSON.parse(challenge.toString('utf8'));
  must(value.schema==='ZMR-PROVISIONAL-CHALLENGE-2'&&
    value.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    value.catalog_sha256===catalogSha&&value.qualification_credit_rows===0&&
    value.exposure==='PUBLIC_EXPOSED_CHALLENGE'&&value.evaluation_status==='UNRUN'&&
    Array.isArray(value.rows)&&value.rows.length===144,'unqualified challenge');
  const universe=new Set(ids),seen=new Set(),topicSeen=new Set();
  const trainFingerprints=new Set(trainRows.map(row=>fingerprintBundle({current:row.current,title:'',recent:[]}).bundle_sha256));
  for(const row of value.rows) {
    must(row&&typeof row.id==='string'&&!seen.has(row.id)&&universe.has(row.topic_id)&&
      !topicSeen.has(row.topic_id)&&row.split==='CHALLENGE_PROVISIONAL'&&
      row.generation_id==='G0_DEV'&&row.catalog_sha256===catalogSha&&
      row.expected_state==='ASSIGNED'&&Array.isArray(row.gold_topics)&&
      row.gold_topics.length===1&&row.gold_topics[0]===row.topic_id,
      'invalid provisional row');
    seen.add(row.id);topicSeen.add(row.topic_id);
    must(typeof row.current==='string'&&row.current&&row.title===''&&
      Array.isArray(row.recent)&&row.recent.length===0&&
      ['zh','en','mixed'].includes(row.language)&&
      row.writer_id==='candidate-writer'&&
      row.gold_origin==='CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED'&&
      row.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL'&&
      row.exposure==='PUBLIC_EXPOSED_CHALLENGE'&&
      row.review_status==='UNREVIEWED_PROVISIONAL','invalid challenge provenance');
    must(!trainFingerprints.has(fingerprintBundle(row).bundle_sha256),'exact TRAIN/challenge duplicate');
  }
  const names=topics.map(t=>({id:t.id,aliases:[t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en]}));
  const results={},builds={};
  const score=(id,predict)=>{
    const rows=value.rows.map(row=>({gold:row.topic_id,language:row.language,prediction:predict(row)}));
    results[id]=summarize(rows,ids);
  };
  score('A0_all_defer',()=>routeA0Defer());
  score('A0_name_only',row=>routeA0NameOnly(names,{current:row.current}));
  const temp=await mkdtemp(join(tmpdir(),'zmr-a12-v02-'));
  try {
    for(const family of ['A1','A2']) for(const mode of ['char','word']) {
      const output=join(temp,`${family}-${mode}.json`);
      const build=family==='A1'?await buildA1({mode,output}):await buildA2({mode,output});
      builds[`${family}_${mode}`]={...build,output:'EPHEMERAL_DEVELOPMENT_INDEX'};
      const index=JSON.parse((await readFile(output)).toString('utf8'));
      for(const config of CONFIGS.filter(c=>c.family===family&&c.mode===mode))
        score(config.id,row=>family==='A1'
          ?routeA1(index,{current:row.current,title:row.title,recent:row.recent},
            {catalog_sha256:catalogSha,method:config.method,min_score:config.min_score,min_margin:config.min_margin})
          :routeA2(index,{current:row.current,title:row.title,recent:row.recent},
            {catalog_sha256:catalogSha,alpha:config.alpha,min_score:config.min_score,min_margin:config.min_margin}));
    }
  } finally { await rm(temp,{recursive:true,force:true}); }
  const report={schema:'ZMR-A12-CHALLENGE-RESULT-1',classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    evaluation_key:registration.evaluation_key,registration_path:REG,
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',data_qualification:'NOT_QUALIFIED',
    independent_rows:0,as_consumed:0,challenge_status:'CONSUMED_FOR_PUBLIC_DEVELOPMENT_DIAGNOSTIC',
    topic_universe:144,train_rows:trainRows.length,challenge_rows:value.rows.length,
    fixed_config_count:CONFIGS.length,identity,builds,results,
    limitations:['same candidate writer authored all inputs and unreviewed labels',
      'single-intent only; no controls, context, multi or independent language quotas',
      'point counts and index bytes are not capability or resource qualification']};
  await writeFile(resolve(ROOT,REPORT),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({evaluation_key:report.evaluation_key,report:REPORT,
    results:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,
      {assigned:v.assigned,correct:v.correct,precision:v.assigned_precision,
        coverage:v.single_coverage,macro:v.full144_macro_recall}]))}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
