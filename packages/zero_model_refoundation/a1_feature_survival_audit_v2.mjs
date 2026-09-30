/** TRAIN/Catalog-only feature allocation audit; never calls any Router. */
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {features} from './a1.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const out='docs/zero-model-refoundation-v1/ZMR-02_A1_FEATURE_SURVIVAL_AUDIT_V2_RESULT.json';
const catPath='catalog/system_topic_catalog_v0.2.yaml';
const trainPath='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=async p=>{const path=resolve(ROOT,p),s=await lstat(path);
  if(!s.isFile()||s.isSymbolicLink())throw Error('regular fixed input required');
  return readFile(path);};
try{await lstat(resolve(ROOT,out));throw Error('audit receipt already exists');}
catch(e){if(e.code!=='ENOENT')throw e;}
const cat=await read(catPath),tb=await read(trainPath),topics=parsePinnedCatalog(cat);
const rows=parseProvisionalTrain(tb,sha(cat),topics.map(t=>t.id));
const documents=topics.map(t=>[...new Set([t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en])].join(' ')+' '+rows.find(r=>r.topic_id===t.id).current);
const counts=documents.map(d=>features(d,'char')),df=new Map();
for(const c of counts)for(const f of c.keys())df.set(f,(df.get(f)??0)+1);
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const global=[...df].sort((a,b)=>b[1]-a[1]||cmp(a[0],b[0])).map(x=>x[0]);
const balanced=new Set();
const queues=topics.flatMap(t=>['zh','en'].map(lang=>[...features([t['name_'+lang],...t['aliases_'+lang]].join(' '),'char').keys()].filter(f=>df.has(f)).sort((a,b)=>df.get(a)-df.get(b)||cmp(a,b))));
for(let rank=0;rank<20;rank++)for(const queue of queues)if(queue[rank])balanced.add(queue[rank]);
const reserved=balanced.size;
for(const f of global){if(balanced.size===6000)break;balanced.add(f);}
const frequency=new Set(global.slice(0,6000));
// Same bounded statistics and serialization as A1, with supplied selected features.
// This engineering reconstruction is not a candidate runtime or semantic evaluation.
const indexBytes=set=>{
 const selected=[...set].sort(),lens=counts.map(c=>selected.reduce((n,f)=>n+(c.get(f)??0),0)),avg=lens.reduce((a,b)=>a+b,0)/144,norms=Array(144).fill(0);
 const postings=selected.map(f=>{const idf=Math.log(1+(144-df.get(f)+.5)/(df.get(f)+.5)),hits=[];
 for(let i=0;i<144;i++){const tf=counts[i].get(f)??0;if(!tf)continue;
 if(!Number.isFinite(idf))throw Error('invalid feature document frequency');
 const w=(1+Math.log(tf))*idf,ratio=avg?lens[i]/avg:0;
 norms[i]+=w*w;hits.push([i,w,idf*(tf*2.2)/(tf+1.2*(.25+.75*ratio))]);}
 return [f,idf,hits];});
 return Buffer.byteLength(JSON.stringify({schema:'ZMR-A1-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',topic_ids:topics.map(t=>t.id),catalog_sha256:sha(cat),train_sha256:sha(tb),mode:'char',max_features:6000,topic_lengths:lens,average_length:avg,topic_norms:norms.map(Math.sqrt),postings})+'\n');
};
const quant=x=>{x.sort((a,b)=>a-b);return {min:x[0],median:x[72],max:x.at(-1)};};
const measure=set=>{const out={df1_kept:[...set].filter(f=>df.get(f)===1).length};
 for(const lang of ['en','zh'])out[lang+'_catalog_feature_retention']=quant(topics.map(t=>{const f=features([t['name_'+lang],...t['aliases_'+lang]].join(' '),'char');return [...f.keys()].filter(k=>set.has(k)).length/f.size;}));
 out.reconstructed_index_bytes=indexBytes(set);return out;};
const result={schema:'ZMR-TRAIN-FEATURE-SURVIVAL-AUDIT-2',classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',topic_universe:144,catalog_sha256:sha(cat),train_sha256:sha(tb),audit_module_sha256:sha(await read('packages/zero_model_refoundation/a1_feature_survival_audit_v2.mjs')),semantic_rows_scored:0,independent_rows:0,as_consumed:0,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',total_features:df.size,feature_cap:6000,proposed_alias_reserved:reserved,frequency_selector:measure(frequency),balanced_alias_selector:measure(balanced),limitations:['TRAIN/Catalog engineering audit only; no DEV, challenge, AS or TEST reads','reconstructed static bytes do not qualify latency/memory or a runnable candidate','fixed bilingual alias reservation 20 features per Topic/language, then global frequency fill; not fitted on DEV','catalog alias retention does not establish natural expression recall or safety']};
await writeFile(resolve(ROOT,out),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
