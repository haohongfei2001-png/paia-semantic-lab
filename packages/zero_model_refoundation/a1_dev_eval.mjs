/** Public same-writer DEV diagnostic; never sealed AS, certification, or resource proof. */
import { readFile, lstat, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { parsePinnedCatalog, parseProvisionalTrain, buildA1 } from './a1_compile.mjs';
import { routeA0Defer, routeA0NameOnly, routeA1 } from './a1.mjs';
import { singlePointMetrics } from './contracts.mjs';
import { fingerprintBundle } from './fingerprints.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const path=relative=>resolve(ROOT,relative);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const must=(ok,message)=>{if(!ok) throw new Error(message);};
async function safeRead(relative) {
  const file=path(relative), stat=await lstat(file);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular explicit-path input required');
  return readFile(file);
}

export async function evaluateProvisionalA1() {
  const catalog=await safeRead('catalog/system_topic_catalog_v0.2.yaml');
  const topics=parsePinnedCatalog(catalog), ids=topics.map(t=>t.id);
  const catalogSha=sha256(catalog);
  const train=await safeRead('data/zero_model_refoundation/development/provisional_train_v0.2.json');
  const trainRows=parseProvisionalTrain(train,catalogSha,ids);
  const challenge=await safeRead('data/zero_model_refoundation/development/provisional_challenge_v0.1.json');
  const value=JSON.parse(challenge.toString('utf8'));
  must(value.schema==='ZMR-PROVISIONAL-CHALLENGE-1' &&
    value.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE' &&
    value.catalog_sha256===catalogSha && Array.isArray(value.rows),'invalid provisional challenge');
  const fingerprints=new Set(trainRows.map(row=>fingerprintBundle({current:row.current,title:'',recent:[]}).bundle_sha256));
  const seen=new Set();
  for (const row of value.rows) {
    must(row && typeof row.id==='string' && row.id && !seen.has(row.id) &&
      row.split==='CHALLENGE_PROVISIONAL' && ids.includes(row.topic_id) &&
      typeof row.current==='string' && row.current &&
      typeof row.writer_id==='string' && row.writer_id &&
      typeof row.source_id==='string' && row.source_id &&
      typeof row.scenario_id==='string' && row.scenario_id &&
      typeof row.mechanism==='string' && row.mechanism,'invalid challenge row');
    seen.add(row.id);
    must(!fingerprints.has(fingerprintBundle({current:row.current,title:'',recent:[]}).bundle_sha256),
      'exact TRAIN/challenge duplicate');
  }
  const names=topics.map(t=>({id:t.id,aliases:[t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en]}));
  const score=predict=>{
    const rows=value.rows.map(row=>({gold:row.topic_id,prediction:predict(row.current)}));
    const m=singlePointMetrics(rows,ids);
    return {n:m.total,assigned:m.any_assigned,correct:m.correct,
      assigned_precision:m.assigned_precision,single_coverage:m.single_coverage,
      full144_macro_recall:m.full144_macro_recall,missing_topics:m.missing_topics.length,
      point_gates:m.single_point_gates,certification_allowed:m.certification_allowed};
  };
  const results={A0_all_defer:score(()=>routeA0Defer()),
    A0_name_only:score(current=>routeA0NameOnly(names,{current}))};
  const builds={};
  const tempDir=await mkdtemp(join(tmpdir(),'zmr-a1-dev-'));
  try {
    for (const mode of ['char','word']) {
      const output=join(tempDir,'a1-'+mode+'-dev-index.json');
      const built=await buildA1({mode,output});
      builds[mode]={...built,output:'EPHEMERAL_DEVELOPMENT_INDEX'};
      const index=JSON.parse((await readFile(output)).toString('utf8'));
      for (const method of ['tfidf','bm25']) {
        const threshold=method==='bm25'?1:.15;
        results['A1_'+mode+'_'+method]=score(current=>routeA1(index,
          {current,title:'',recent:[]},
          {catalog_sha256:catalogSha,method,min_score:threshold,min_margin:.02}));
      }
    }
  } finally {
    await rm(tempDir,{recursive:true,force:true});
  }
  return {classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    capability_verdict:'UNTESTED',data_qualification:'NOT_QUALIFIED',
    resource_verdict:'NOT_QUALIFIED',topic_universe:144,
    train_rows:trainRows.length,challenge_rows:value.rows.length,
    train_sha256:sha256(train),challenge_sha256:sha256(challenge),
    same_writer:true,builds,results};
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await evaluateProvisionalA1()));
