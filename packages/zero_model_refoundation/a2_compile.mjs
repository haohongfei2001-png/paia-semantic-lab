/** Fixed-path offline A2 compiler: pinned Catalog and provisional TRAIN v0.2 only. */
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePinnedCatalog, parseProvisionalTrain } from './a1_compile.mjs';
import { compileA2 } from './a2.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG=resolve(ROOT,'catalog/system_topic_catalog_v0.2.yaml');
const TRAIN=resolve(ROOT,'data/zero_model_refoundation/development/provisional_train_v0.2.json');
const sha256=value=>createHash('sha256').update(value).digest('hex');
async function regular(path) {
  const stat=await lstat(path);
  if(!stat.isFile() || stat.isSymbolicLink()) throw new Error('regular explicit-path input required');
  return readFile(path);
}

export async function buildA2({mode='char',output=resolve(ROOT,'artifacts/zmr-v1/a2-index.json')}={}) {
  const catalogBytes=await regular(CATALOG),catalogSha=sha256(catalogBytes);
  const topics=parsePinnedCatalog(catalogBytes);
  const trainBytes=await regular(TRAIN),trainSha=sha256(trainBytes);
  const rows=parseProvisionalTrain(trainBytes,catalogSha,topics.map(t=>t.id));
  const documents=Object.fromEntries(topics.map(t=>[t.id,
    [...new Set([t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en])].join(' ')]));
  for(const row of rows) documents[row.topic_id]+=' '+row.current;
  const index=compileA2({topic_ids:topics.map(t=>t.id),documents,
    catalog_sha256:catalogSha,train_sha256:trainSha,mode,
    max_features:mode==='char'?5000:8000});
  const bytes=Buffer.from(JSON.stringify(index)+'\n');
  const runtimeBytes=(await regular(resolve(ROOT,'packages/zero_model_refoundation/a1.mjs'))).length+
    (await regular(resolve(ROOT,'packages/zero_model_refoundation/a2.mjs'))).length;
  if(bytes.length>1048576) throw new Error('A2 index exceeds 1 MiB');
  if(bytes.length+runtimeBytes>2097152) throw new Error('A2 runtime+index exceeds 2 MiB');
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,bytes);
  return {classification:'DEV_ONLY_NOT_RESOURCE_QUALIFIED',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    topic_count:144,train_rows:rows.length,catalog_sha256:catalogSha,train_sha256:trainSha,
    index_sha256:sha256(bytes),index_bytes:bytes.length,runtime_plus_index_bytes:runtimeBytes+bytes.length,
    mode,output};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2]??'char';
  const output=process.argv[3]?resolve(process.argv[3]):undefined;
  console.log(JSON.stringify(await buildA2({mode,output})));
}
