/** TRAIN-only authoring-cohort holdout; never reads public DEV, AS or TEST. */
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {features} from './a1.mjs';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {parseAdditiveTrain} from './a7_compile.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const A='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const B='data/zero_model_refoundation/development/provisional_train_v0.3.json';
const REPORT='docs/zero-model-refoundation-v1/ZMR-05_A7_TRAIN_FOLD_RESULT.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
async function read(p){const f=resolve(ROOT,p),s=await lstat(f);
  if(!s.isFile()||s.isSymbolicLink())throw Error('regular fixed-path input required');
  return readFile(f);}
function fold(docs,queries,mode,restrictToRetainedVocabulary){
  const vectors=docs.map(r=>features(r.current,mode)),df=new Map();
  for(const v of vectors)for(const term of v.keys())df.set(term,(df.get(term)??0)+1);
  const idf=n=>Math.log(1+(docs.length-n+.5)/(n+.5));
  const prototypes=vectors.map(v=>{
    const weighted=[...v].map(([term,tf])=>[term,(1+Math.log(tf))*idf(df.get(term))])
      .sort((x,y)=>y[1]-x[1]||x[0].localeCompare(y[0])).slice(0,48);
    return {weighted,norm:Math.hypot(...weighted.map(x=>x[1]))};
  });
  const vocab=new Set(prototypes.flatMap(p=>p.weighted.map(x=>x[0])));
  const count={queries:queries.length,top1_positive:0,score_at_least_025:0,
    score_and_margin_pass:0,correct_strict:0,mean_true_score:0,mean_best_rival:0};
  for(let i=0;i<queries.length;i++){
    const terms=features(queries[i].current,mode),weights=new Map();
    for(const [term,tf] of terms){
      if(restrictToRetainedVocabulary&&!vocab.has(term))continue;
      weights.set(term,(1+Math.log(tf))*idf(df.get(term)??0));
    }
    const queryNorm=Math.hypot(...weights.values());
    const scores=prototypes.map(p=>{
      let dot=0,matched=0;
      for(const [term,weight] of p.weighted){const q=weights.get(term);
        if(q){dot+=q*weight;matched++;}}
      return matched>=2&&queryNorm>0?dot/(queryNorm*p.norm):0;
    });
    const order=Array.from(scores.keys()).sort((x,y)=>scores[y]-scores[x]||x-y);
    const top=order[0],second=order[1],positive=scores[top]>0;
    if(positive&&top===i)count.top1_positive++;
    if(scores[top]>=.25)count.score_at_least_025++;
    if(scores[top]>=.25&&scores[top]-scores[second]>=.05){
      count.score_and_margin_pass++;if(top===i)count.correct_strict++;}
    count.mean_true_score+=scores[i]/queries.length;
    count.mean_best_rival+=Math.max(...scores.filter((_,j)=>j!==i))/queries.length;
  }
  count.mean_true_score=Number(count.mean_true_score.toFixed(6));
  count.mean_best_rival=Number(count.mean_best_rival.toFixed(6));
  return count;
}
const catalog=await read(CATALOG),ids=parsePinnedCatalog(catalog).map(x=>x.id);
const oldBytes=await read(A),newBytes=await read(B);
const old=parseProvisionalTrain(oldBytes,sha(catalog),ids);
const next=parseAdditiveTrain(newBytes,sha(catalog),ids);
if(old.length!==144||next.length!==144||old.some((r,i)=>r.topic_id!==ids[i]))
  throw Error('unaligned TRAIN authoring cohorts');
const result={schema:'ZMR-A7-TRAIN-FOLD-DIAGNOSTIC-1',
  classification:'TRAIN_INTERNAL_NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256:sha(catalog),train_v02_sha256:sha(oldBytes),train_v03_sha256:sha(newBytes),
  candidate:'A7_BOUNDED_PER_SCENARIO_CASE_MEMORY',
  folds:'TWO_AUTHORING_BATCH_HOLDOUTS_SAME_CANDIDATE_WRITER',
  methods:{baseline:'ALL_QUERY_FEATURES_IN_COSINE_NORM',
    bounded_probe:'QUERY_NORM_RESTRICTED_TO_RETAINED_TRAIN_FEATURES'},
  fixed_settings:{prototypes_per_topic:1,features_per_prototype:48,min_matched_features:2,
    min_score:.25,min_margin:.05},results:{}};
for(const mode of ['char','word'])for(const [name,docs,queries] of [
  ['v02_to_v03',old,next],['v03_to_v02',next,old]]){
  result.results[`${mode}_${name}`]={baseline:fold(docs,queries,mode,false),
    bounded_probe:fold(docs,queries,mode,true)};
}
await writeFile(resolve(ROOT,REPORT),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:REPORT,results:result.results}));
