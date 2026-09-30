/** A1 selector variant: fixed bilingual Topic reservation; Catalog/TRAIN only. */
import {readFile,writeFile,lstat,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {features} from './a1.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const must=(x,m)=>{if(!x)throw Error(m);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const regular=async path=>{const s=await lstat(path);must(s.isFile()&&!s.isSymbolicLink(),'regular explicit-path input required');return readFile(path);};
export function compileA1BalancedR1({topics,documents,catalog_sha256,train_sha256}){
  must(Array.isArray(topics)&&topics.length===144&&new Set(topics.map(t=>t.id)).size===144&&
    topics.every(t=>typeof t.id==='string'&&t.id&&['zh','en'].every(l=>typeof t['name_'+l]==='string'&&Array.isArray(t['aliases_'+l])&&t['aliases_'+l].every(a=>typeof a==='string'))),'full144 bilingual Catalog required');
  must(digest(catalog_sha256)&&digest(train_sha256),'source digests required');
  must(documents&&Object.keys(documents).length===144&&topics.every(t=>typeof documents[t.id]==='string'),'full144 documents required');
  const counts=topics.map(t=>features(documents[t.id],'char')),df=new Map();
  for(const c of counts)for(const f of c.keys())df.set(f,(df.get(f)??0)+1);
  const global=[...df].sort((a,b)=>b[1]-a[1]||cmp(a[0],b[0])).map(x=>x[0]);
  const queues=topics.flatMap(t=>['zh','en'].map(l=>[...features([t['name_'+l],...t['aliases_'+l]].join(' '),'char').keys()]
    .filter(f=>df.has(f)).sort((a,b)=>df.get(a)-df.get(b)||cmp(a,b))));
  const chosen=new Set(global.slice(0,4000));
  for(let rank=0;rank<20;rank++)for(const q of queues)if(q[rank]&&chosen.size<6000)chosen.add(q[rank]);
  must(chosen.size<=6000,'reservation exceeds fixed feature cap');
  for(const f of global){if(chosen.size===6000)break;chosen.add(f);}
  const selected=[...chosen].sort(),lens=counts.map(c=>selected.reduce((n,f)=>n+(c.get(f)??0),0));
  const avg=lens.reduce((a,b)=>a+b,0)/144,norms=Array(144).fill(0);
  const postings=selected.map(f=>{const idf=Math.log(1+(144-df.get(f)+.5)/(df.get(f)+.5)),hits=[];
    for(let i=0;i<144;i++){const tf=counts[i].get(f)??0;if(!tf)continue;
      const w=(1+Math.log(tf))*idf,ratio=avg?lens[i]/avg:0;norms[i]+=w*w;
      hits.push([i,w,idf*(tf*2.2)/(tf+1.2*(.25+.75*ratio))]);}
    return [f,idf,hits];});
  return {schema:'ZMR-A1-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',topic_ids:topics.map(t=>t.id),catalog_sha256,train_sha256,mode:'char',max_features:6000,topic_lengths:lens,average_length:avg,topic_norms:norms.map(Math.sqrt),postings,
    selector:{id:'A1_TOPIC_LANGUAGE_FEATURE_RESERVATION_R1',per_topic_language:20,feature_cap:6000,frequency_backbone:4000}};
}
export async function buildA1BalancedR1({output=resolve(ROOT,'artifacts/zmr-v1/a1-balanced-r1-index.json')}={}){
  const cb=await regular(resolve(ROOT,'catalog/system_topic_catalog_v0.2.yaml'));
  const tb=await regular(resolve(ROOT,'data/zero_model_refoundation/development/provisional_train_v0.2.json'));
  const topics=parsePinnedCatalog(cb),catalog_sha256=sha(cb),train_sha256=sha(tb);
  const rows=parseProvisionalTrain(tb,catalog_sha256,topics.map(t=>t.id));
  const documents=Object.fromEntries(topics.map(t=>[t.id,[...new Set([t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en])].join(' ')]));
  for(const r of rows)documents[r.topic_id]+=' '+r.current;
  const index=compileA1BalancedR1({topics,documents,catalog_sha256,train_sha256});
  const bytes=Buffer.from(JSON.stringify(index)+'\n');
  const runtime=await Promise.all(['a1.mjs','a1_balanced_r1.mjs'].map(n=>regular(resolve(ROOT,'packages/zero_model_refoundation',n))));
  const combined=bytes.length+runtime.reduce((n,b)=>n+b.length,0);
  must(bytes.length<=1048576&&combined<=2097152,'fixed static budget exceeded');
  await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);
  return {classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',topic_universe:144,train_rows:144,catalog_sha256,train_sha256,index_sha256:sha(bytes),index_bytes:bytes.length,runtime_plus_index_bytes:combined,output};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildA1BalancedR1({output:process.argv[2]?resolve(process.argv[2]):undefined})));
