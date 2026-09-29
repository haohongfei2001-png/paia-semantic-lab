/** Provisional A4 lexical-neighbor hypotheses; no resolver or gold labels. */
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {features} from './a1.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const OUTPUT='data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const must=(ok,message)=>{if(!ok) throw Error(message);};
async function regular(path) {
  const file=resolve(ROOT,path),stat=await lstat(file);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular source file required: '+path);
  return readFile(file);
}
const cmp=(a,b)=>a<b?-1:a>b?1:0;

/** Ranks possible pairwise boundaries from fixed source text only. */
export function compileBoundaryGraph(topics,rows,{catalog_sha256,train_sha256}={}) {
  must(Array.isArray(topics)&&topics.length===144&&new Set(topics.map(t=>t.id)).size===144&&
    Array.isArray(rows)&&rows.length===144&&new Set(rows.map(r=>r.topic_id)).size===144&&
    /^[a-f0-9]{64}$/u.test(catalog_sha256)&&/^[a-f0-9]{64}$/u.test(train_sha256),
    'full144 fixed sources required');
  const byId=new Map(rows.map(row=>[row.topic_id,row]));
  const terms=topics.map(topic=>{
    const row=byId.get(topic.id);
    must(row&&typeof row.current==='string'&&row.current,'missing TRAIN text');
    const text=[topic.name_zh,topic.name_en,...topic.aliases_zh,...topic.aliases_en,row.current].join(' ');
    return new Set(features(text,'char').keys());
  });
  const df=new Map();
  for(const set of terms) for(const term of set) df.set(term,(df.get(term)??0)+1);
  // Keep neither singleton artifacts nor near-universal boilerplate.
  const useful=terms.map(set=>new Set([...set].filter(term=>df.get(term)>=2&&df.get(term)<=12)));
  const candidates=[];
  for(let i=0;i<144;i++) for(let j=i+1;j<144;j++) {
    const left=useful[i],right=useful[j];
    const shared=[...left].filter(term=>right.has(term));
    if(!shared.length) continue;
    const weighted=shared.reduce((sum,term)=>sum+Math.log((145)/(df.get(term)+1)),0);
    const denominator=Math.sqrt(left.size*right.size)||1;
    const score=weighted/denominator;
    candidates.push({i,j,score,shared});
  }
  candidates.sort((a,b)=>b.score-a.score||cmp(topics[a.i].id,topics[b.i].id)||
    cmp(topics[a.j].id,topics[b.j].id));
  const edges=candidates.slice(0,64).map((candidate,rank)=>{
    const {i,j,shared}=candidate;
    const unique=(from,other)=>[...from].filter(term=>!other.has(term))
      .sort((a,b)=>df.get(a)-df.get(b)||cmp(a,b)).slice(0,4);
    return {rank:rank+1,left_topic_id:topics[i].id,right_topic_id:topics[j].id,
      lexical_score:Number(candidate.score.toFixed(8)),
      shared_feature_examples:shared.sort((a,b)=>df.get(a)-df.get(b)||cmp(a,b)).slice(0,4),
      left_distinctive_feature_examples:unique(useful[i],useful[j]),
      right_distinctive_feature_examples:unique(useful[j],useful[i]),
      resolver_status:'UNACTIVATED_REQUIRES_POSITIVE_NEGATIVE_AMBIGUOUS_EVIDENCE',
      triad_evidence_count:0};
  });
  return {schema:'ZMR-A4-PROVISIONAL-BOUNDARY-GRAPH-1',
    evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    qualification_credit_edges:0,independent_source_cohorts:0,
    source_paths:[CATALOG,TRAIN],catalog_sha256,train_sha256,
    topic_count:144,edge_limit:64,edge_count:edges.length,
    method:'RARE_SHARED_CHAR_NGRAM_LEXICAL_HYPOTHESES_ONLY',
    no_resolver_activated:true,edges};
}

export async function buildBoundaryGraph(output=resolve(ROOT,OUTPUT)) {
  const catalog=await regular(CATALOG),train=await regular(TRAIN),catalogSha=sha(catalog);
  const topics=parsePinnedCatalog(catalog);
  const rows=parseProvisionalTrain(train,catalogSha,topics.map(t=>t.id));
  const graph=compileBoundaryGraph(topics,rows,{catalog_sha256:catalogSha,train_sha256:sha(train)});
  await writeFile(output,JSON.stringify(graph,null,2)+'\n');
  return graph;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const graph=await buildBoundaryGraph();
  console.log(JSON.stringify({edge_count:graph.edge_count,topic_count:graph.topic_count,
    evidence_class:graph.evidence_class,no_resolver_activated:graph.no_resolver_activated}));
}
