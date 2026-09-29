/** Fixed-path offline compiler for ZMR-02 A1 development. No DEV or sealed reads. */
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileA1 } from './a1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CATALOG = resolve(ROOT, 'catalog/system_topic_catalog_v0.2.yaml');
const TRAIN = resolve(ROOT, 'data/zero_model_refoundation/development/provisional_train_v0.2.json');
const CATALOG_BLOB = '6bcdd2af66879d7ac098cf237b5586c3c9818aad';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const must = (ok, message) => { if (!ok) throw new Error(message); };

async function regular(path) {
  const stat = await lstat(path);
  must(stat.isFile() && !stat.isSymbolicLink(), 'regular explicit-path input required');
  return readFile(path);
}

/** Strictly parses the pinned Catalog fields this candidate consumes. */
export function parsePinnedCatalog(bytes) {
  const blob = createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  must(blob === CATALOG_BLOB, 'Catalog Git blob mismatch');
  const topics=[];
  for (const line of bytes.toString('utf8').split(/\r?\n/u)) {
    const id=line.match(/^  - topic_id: (\S+)$/u);
    if (id) { topics.push({id:id[1]}); continue; }
    const current=topics.at(-1);
    if (!current) continue;
    const name=line.match(/^    name: \{ zh: ("(?:\\.|[^"])*"), en: ("(?:\\.|[^"])*") \}$/u);
    if (name) { current.name_zh=JSON.parse(name[1]); current.name_en=JSON.parse(name[2]); continue; }
    const aliases=line.match(/^    aliases: \{ zh: (\[[^\]]*\]), en: (\[[^\]]*\]) \}$/u);
    if (aliases) { current.aliases_zh=JSON.parse(aliases[1]); current.aliases_en=JSON.parse(aliases[2]); continue; }
    const domain=line.match(/^    internal_domain: (D\d{2})$/u);
    if (domain) current.domain=domain[1];
  }
  must(topics.length === 144 && new Set(topics.map(t=>t.id)).size===144 &&
    topics.every(t=>t.name_zh && t.name_en && Array.isArray(t.aliases_zh) &&
      Array.isArray(t.aliases_en) && t.domain), 'incomplete pinned Catalog');
  return topics;
}

export function parseProvisionalTrain(bytes, catalogSha, ids) {
  const value=JSON.parse(bytes.toString('utf8'));
  must(value && value.schema==='ZMR-PROVISIONAL-TRAIN-2' &&
    value.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE' &&
    value.catalog_sha256===catalogSha && value.qualification_credit_rows===0 &&
    value.exposure==='PUBLIC_TRAIN' && Array.isArray(value.rows), 'invalid provisional TRAIN');
  const seen=new Set(), universe=new Set(ids);
  for (const row of value.rows) {
    must(row && typeof row.id==='string' && row.id && !seen.has(row.id) &&
      row.split==='TRAIN_PROVISIONAL' && universe.has(row.topic_id) &&
      typeof row.current==='string' && row.current &&
      typeof row.writer_id==='string' && row.writer_id &&
      typeof row.source_id==='string' && row.source_id &&
      row.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL' &&
      typeof row.scenario_id==='string' && row.scenario_id &&
      typeof row.scenario_family==='string' && row.scenario_family &&
      typeof row.template_family==='string' && row.template_family &&
      row.exposure==='PUBLIC_TRAIN' && row.generation_id==='G0_DEV' &&
      ['zh','en','mixed'].includes(row.language) &&
      typeof row.mechanism==='string' && row.mechanism, 'invalid provisional row');
    seen.add(row.id);
  }
  must(value.rows.length===144 &&
    new Set(value.rows.map(row=>row.topic_id)).size===144,
    'one provisional TRAIN row per full144 Topic required');
  return value.rows;
}

export async function buildA1({mode='char', output=resolve(ROOT,'artifacts/zmr-v1/a1-index.json')}={}) {
  const catalogBytes=await regular(CATALOG);
  const catalogSha=sha256(catalogBytes);
  const topics=parsePinnedCatalog(catalogBytes);
  const trainBytes=await regular(TRAIN);
  const rows=parseProvisionalTrain(trainBytes,catalogSha,topics.map(t=>t.id));
  const documents=Object.fromEntries(topics.map(t=>[t.id,
    [...new Set([t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en])].join(' ')]));
  for (const row of rows) documents[row.topic_id]+=' '+row.current;
  const index=compileA1({topic_ids:topics.map(t=>t.id),documents,
    catalog_sha256:catalogSha,train_sha256:sha256(trainBytes),mode,
    max_features:mode==='char'?6000:12000});
  const bytes=Buffer.from(JSON.stringify(index)+'\n');
  const runtimeBytes=(await regular(resolve(ROOT,'packages/zero_model_refoundation/a1.mjs'))).length;
  must(bytes.length<=1048576, 'A1 index exceeds 1 MiB');
  must(bytes.length+runtimeBytes<=2097152, 'A1 runtime+index exceeds 2 MiB');
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,bytes);
  return {classification:'DEV_ONLY_NOT_RESOURCE_QUALIFIED',topic_count:144,
    evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',train_rows:rows.length,
    catalog_sha256:catalogSha,train_sha256:sha256(trainBytes),index_sha256:sha256(bytes),
    index_bytes:bytes.length,runtime_plus_index_bytes:runtimeBytes+bytes.length,
    mode,output};
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2]??'char';
  const output=process.argv[3] ? resolve(process.argv[3]) : undefined;
  console.log(JSON.stringify(await buildA1({mode,output})));
}
