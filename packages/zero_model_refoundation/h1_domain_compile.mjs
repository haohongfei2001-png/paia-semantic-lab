/** Fixed TRAIN-only H1 repair compiler: 18 domain prototypes, no neural assets. */
import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {features} from './a1.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG=resolve(ROOT,'catalog/system_topic_catalog_v0.2.yaml');
const TRAIN=resolve(ROOT,'data/zero_model_refoundation/development/provisional_train_v0.2.json');
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
async function regular(path){const stat=await lstat(path);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular fixed input required');
  return readFile(path);}

export async function buildH1Domain({output=resolve(ROOT,'artifacts/zmr-v1/h1-domain-index.json')}={}){
  const catalogBytes=await regular(CATALOG),catalog_sha256=sha(catalogBytes);
  const topics=parsePinnedCatalog(catalogBytes),topic_ids=topics.map(x=>x.id);
  must(topic_ids.length===144,'full144 Catalog required');
  const trainBytes=await regular(TRAIN),train_sha256=sha(trainBytes);
  const train=parseProvisionalTrain(trainBytes,catalog_sha256,topic_ids);
  const docs=new Map(topics.map(t=>[t.id,
    [...new Set([t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en])].join(' ')]));
  for(const row of train)docs.set(row.topic_id,docs.get(row.topic_id)+' '+row.current);
  const domain_ids=[...new Set(topic_ids.map(id=>id.split('.')[1]))].sort();
  must(domain_ids.length===18&&domain_ids.every(domain=>
    topic_ids.filter(id=>id.split('.')[1]===domain).length===8),'18x8 domain closure required');
  const counts=domain_ids.map(domain=>features(topic_ids
    .filter(id=>id.split('.')[1]===domain).map(id=>docs.get(id)).join(' '),'char'));
  const df=new Map();
  for(const row of counts)for(const term of row.keys())df.set(term,(df.get(term)??0)+1);
  const max_features=3500;
  const chosen=[...df].sort((a,b)=>{
    const aw=a[1]*Math.log(19/(a[1]+1)),bw=b[1]*Math.log(19/(b[1]+1));
    return bw-aw||(a[0]<b[0]?-1:a[0]>b[0]?1:0);
  }).slice(0,max_features).map(([term])=>term).sort();
  must(chosen.length>0,'empty domain vocabulary');
  const class_lengths=Array(18).fill(0);
  const postings=chosen.map(term=>{
    const hits=[];let total=0;
    for(let i=0;i<18;i++){
      const tf=counts[i].get(term)??0;
      if(tf){hits.push([i,tf]);class_lengths[i]+=tf;total+=tf;}
    }
    return [term,total,hits];
  });
  const index={schema:'ZMR-H1-DOMAIN-DEV-1',
    evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    catalog_sha256,train_sha256,topic_ids,domain_ids,mode:'char',
    max_features,vocab_size:postings.length,class_lengths,
    total_length:class_lengths.reduce((a,b)=>a+b,0),postings};
  const bytes=Buffer.from(JSON.stringify(index)+'\n');
  must(bytes.length<=1048576,'domain index exceeds 1 MiB');
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,bytes);
  return {classification:'DEV_ONLY_NOT_RESOURCE_QUALIFIED',
    evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    domain_count:18,topic_count:144,train_rows:train.length,
    catalog_sha256,train_sha256,index_sha256:sha(bytes),
    index_bytes:bytes.length,output};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await buildH1Domain({output:process.argv[2]?resolve(process.argv[2]):undefined})));
