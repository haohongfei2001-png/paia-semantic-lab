/** H1 development candidate: finite domain evidence with recoverable full144 A2 fallback. */
import {features} from './a1.mjs';
import {routeA2} from './a2.mjs';
import {explicitNoRequest} from './a6_complement_scope.mjs';
import {explicitRecordOnly} from './a6_complement_r2.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const DOMAIN_K=3,DOMAIN_BOOST=.25;
const cache=new WeakMap();
const domainOf=id=>id.split('.')[1];

function closure(index,catalog_sha256){
  if(!digest(catalog_sha256)||!index||index.schema!=='ZMR-A2-DEV-1'||
    index.catalog_sha256!==catalog_sha256||index.mode!=='char'||
    !Array.isArray(index.topic_ids)||index.topic_ids.length!==144||
    new Set(index.topic_ids).size!==144||!Array.isArray(index.postings)||
    !Array.isArray(index.class_lengths)||index.class_lengths.length!==144||
    !Number.isInteger(index.vocab_size)||index.vocab_size<=0||
    !Number.isInteger(index.total_length))return false;
  const domains=new Map();
  for(const id of index.topic_ids){
    const domain=domainOf(id);
    if(!/^sys\.[a-z_]+\.[a-z_]+$/u.test(id)||!domain)return false;
    domains.set(domain,(domains.get(domain)??0)+1);
  }
  return domains.size===18&&[...domains.values()].every(n=>n===8);
}
function validInput(input){
  return input&&typeof input.current==='string'&&typeof input.title==='string'&&
    Array.isArray(input.recent)&&input.recent.every(x=>typeof x==='string')&&
    input.recent.length<=32&&
    [input.current,input.title,...input.recent].reduce((n,x)=>n+Array.from(x).length,0)<=8192;
}
function table(index){
  let value=cache.get(index);
  if(!value){value=new Map(index.postings.map(([term,total,hits])=>
    [term,{total,byClass:new Map(hits)}]));cache.set(index,value);}
  return value;
}

/** A2 class-vs-complement scores over all 144 Topics, before any domain prior. */
export function scoreH1Flat(index,current,{catalog_sha256,alpha=.5}={}){
  if(!closure(index,catalog_sha256)||typeof current!=='string'||
    !Number.isFinite(alpha)||alpha<=0)return null;
  const query=features(current,'char'),lookup=table(index);
  const scores=Array(144).fill(0);let matched=0;
  for(const [term,qtf] of query){
    const posting=lookup.get(term);if(!posting)continue;
    matched++;
    for(let i=0;i<144;i++){
      const tf=posting.byClass.get(i)??0;
      const own=Math.log((tf+alpha)/(index.class_lengths[i]+alpha*index.vocab_size));
      const other=Math.log((posting.total-tf+alpha)/
        (index.total_length-index.class_lengths[i]+alpha*index.vocab_size));
      scores[i]+=Math.min(qtf,3)*(own-other);
    }
  }
  return matched?{scores,matched_features:matched}:null;
}

/** Top-two evidence per domain avoids a hard top-1 Topic deciding the coarse route. */
export function rankH1Domains(index,scores){
  if(!Array.isArray(scores)||scores.length!==144||
    scores.some(x=>!Number.isFinite(x))||!Array.isArray(index?.topic_ids)||
    index.topic_ids.length!==144)return null;
  const groups=new Map();
  for(let i=0;i<144;i++){
    const domain=domainOf(index.topic_ids[i]);
    if(!groups.has(domain))groups.set(domain,[]);
    groups.get(domain).push(scores[i]);
  }
  if(groups.size!==18||[...groups.values()].some(x=>x.length!==8))return null;
  const domainScores=new Map([...groups].map(([domain,values])=>{
    values.sort((a,b)=>b-a);
    return [domain,(values[0]+values[1])/2];
  }));
  const ranked=[...domainScores.keys()].sort((a,b)=>
    domainScores.get(b)-domainScores.get(a)||(a<b?-1:a>b?1:0));
  return {ranked,domainScores};
}

/** Scope-only A2 ablation separates hierarchy gain from no-request guard gain. */
export function routeH1FlatScope(index,input,{catalog_sha256}={}){
  if(!closure(index,catalog_sha256))return defer('INDEX_CLOSURE_MISMATCH');
  if(!validInput(input))return defer('BAD_INPUT_OR_PROFILE_OVERFLOW');
  if(explicitNoRequest(input.current)||explicitRecordOnly(input.current))
    return defer('H1_EXPLICIT_NO_REQUEST');
  return routeA2(index,input,{catalog_sha256,alpha:.5,min_score:0,min_margin:.5});
}

export function routeH1RecallSafe(index,input,{catalog_sha256}={}){
  const flat=routeH1FlatScope(index,input,{catalog_sha256});
  if(flat.state!=='ASSIGNED')return flat;
  const raw=scoreH1Flat(index,input.current,{catalog_sha256});
  if(!raw)return defer('H1_NO_DOMAIN_EVIDENCE');
  const coarse=rankH1Domains(index,raw.scores);
  if(!coarse)return defer('H1_BAD_DOMAIN_CLOSURE');
  const flatTopic=flat.topics[0],flatDomain=domainOf(flatTopic);
  if(!coarse.ranked.slice(0,DOMAIN_K).includes(flatDomain))
    return {...flat,reason:'H1_FULL144_FLAT_RECOVERY',
      evidence_source:'FLAT144_OUTSIDE_DOMAIN_TOPK'};
  const combined=raw.scores.map((score,i)=>score+
    DOMAIN_BOOST*coarse.domainScores.get(domainOf(index.topic_ids[i])));
  const order=Array.from({length:144},(_,i)=>i).sort((a,b)=>
    combined[b]-combined[a]||
    (index.topic_ids[a]<index.topic_ids[b]?-1:index.topic_ids[a]>index.topic_ids[b]?1:0));
  const first=order[0],topic=index.topic_ids[first],margin=combined[first]-combined[order[1]];
  if(topic===flatTopic)return {...flat,reason:'H1_DOMAIN_AGREEMENT'};
  if(!coarse.ranked.slice(0,DOMAIN_K).includes(domainOf(topic))||margin<.5)
    return {...flat,reason:'H1_FULL144_FLAT_FALLBACK'};
  return {state:'ASSIGNED',topics:[topic],reason:'H1_DOMAIN_RERANK',
    evidence_source:'TRAIN_DOMAIN_TOP2_AND_FULL144_A2',
    score:combined[first],margin,matched_features:raw.matched_features};
}
