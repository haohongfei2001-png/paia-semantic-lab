/** Fixed input closure for provisional full144 A7 development; never reads DEV or sealed cohorts. */
import {readFile,lstat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {compileA7} from './a7_case_memory.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const path=p=>resolve(ROOT,p);
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN_A='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const TRAIN_B='data/zero_model_refoundation/development/provisional_train_v0.3.json';
const sha256=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
async function regular(p){const s=await lstat(path(p));must(s.isFile()&&!s.isSymbolicLink(),
  'regular fixed-path input required');return readFile(path(p));}

export function parseAdditiveTrain(bytes,catalogSha,topicIds){
  const data=JSON.parse(bytes.toString('utf8'));
  must(data.schema==='ZMR-PROVISIONAL-TRAIN-3'&&
    data.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    data.catalog_sha256===catalogSha&&data.exposure==='PUBLIC_TRAIN'&&
    data.qualification_credit_rows===0&&Array.isArray(data.rows)&&
    data.rows.length===144,'invalid additive TRAIN header');
  const seenId=new Set(),seenScenario=new Set(),seenTemplate=new Set();
  for(const [i,row] of data.rows.entries()){
    must(row.topic_id===topicIds[i]&&row.catalog_sha256===catalogSha&&
      row.split==='TRAIN_PROVISIONAL'&&row.expected_state==='ASSIGNED'&&
      Array.isArray(row.gold_topics)&&row.gold_topics.length===1&&
      row.gold_topics[0]===row.topic_id&&
      row.gold_origin==='CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED'&&
      row.review_status==='UNREVIEWED_PROVISIONAL'&&
      row.writer_id==='candidate-writer'&&
      row.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL'&&
      row.source_id==='writer-additive-train-20260929'&&
      row.exposure==='PUBLIC_TRAIN'&&row.generation_id==='G0_DEV'&&
      row.authoring_batch==='ZMR-05-A7-TRAIN-V03-20260929'&&
      ['zh','en','mixed'].includes(row.language)&&
      typeof row.current==='string'&&row.current.trim().length>=10&&
      row.title===''&&Array.isArray(row.recent)&&row.recent.length===0&&
      typeof row.id==='string'&&!seenId.has(row.id)&&
      typeof row.scenario_family==='string'&&!seenScenario.has(row.scenario_family)&&
      typeof row.template_family==='string'&&!seenTemplate.has(row.template_family)&&
      row.paraphrase_family===null&&row.translation_family===null&&
      row.contrast_family===null,'invalid additive TRAIN row');
    seenId.add(row.id);seenScenario.add(row.scenario_family);
    seenTemplate.add(row.template_family);
  }
  return data.rows;
}

export async function buildA7({mode='char',output=path(`artifacts/zmr-v1/a7-${mode}-index.json`)}={}){
  must(['char','word'].includes(mode),'invalid A7 mode');
  const catalog=await regular(CATALOG),catalogSha=sha256(catalog);
  const topicIds=parsePinnedCatalog(catalog).map(x=>x.id);
  const a=await regular(TRAIN_A),b=await regular(TRAIN_B);
  const old=parseProvisionalTrain(a,catalogSha,topicIds);
  const add=parseAdditiveTrain(b,catalogSha,topicIds);
  const unique=(name,values)=>must(new Set(values).size===values.length,
    `reused ${name} lineage across TRAIN cohorts`);
  unique('row', [...old,...add].map(x=>x.id));
  unique('scenario', [...old,...add].map(x=>x.scenario_family));
  unique('template', [...old,...add].map(x=>x.template_family));
  const trainSha=sha256(Buffer.concat([a,Buffer.from('\n'),b]));
  const index=compileA7({topic_ids:topicIds,cases:[...old,...add],
    catalog_sha256:catalogSha,train_sha256:trainSha,mode});
  const bytes=Buffer.from(JSON.stringify(index)+'\n');
  const runtime=(await regular('packages/zero_model_refoundation/a7_case_memory.mjs')).length+
    (await regular('packages/zero_model_refoundation/a1.mjs')).length;
  must(bytes.length<=1048576,'A7 index exceeds 1 MiB');
  must(bytes.length+runtime<=2097152,'A7 runtime plus index exceeds 2 MiB');
  await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);
  return {classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    resource_verdict:'NOT_QUALIFIED',capability_verdict:'UNTESTED',
    topic_count:topicIds.length,train_rows:old.length+add.length,
    catalog_sha256:catalogSha,train_a_sha256:sha256(a),train_b_sha256:sha256(b),
    train_sha256:trainSha,index_sha256:sha256(bytes),index_bytes:bytes.length,
    runtime_plus_index_bytes:bytes.length+runtime,mode,output};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await buildA7({mode:process.argv[2]??'char'})));
