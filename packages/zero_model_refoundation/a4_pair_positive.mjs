/** A4 positive pairwise development resolver over the full144 A3 fallback. */
import {features} from './a1.mjs';
import {routeA3} from './a3.mjs';

const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const defer=reason=>({state:'DEFER',topics:[],reason});
const must=(ok,message)=>{if(!ok)throw Error(message);};
const cmp=(a,b)=>a<b?-1:a>b?1:0;

function valid(index){
  must(index&&index.schema==='ZMR-A4-PAIRWISE-DEV-1'&&
    index.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    [index.catalog_sha256,index.graph_sha256,index.pair_train_sha256,
      index.base_train_sha256].every(digest)&&
    Array.isArray(index.topic_ids)&&index.topic_ids.length===144&&
    index.topic_ids.every(x=>typeof x==='string'&&x)&&
    new Set(index.topic_ids).size===144&&
    Array.isArray(index.rules)&&index.rules.length===4,
    'invalid A4 positive pair index');
  const ranks=new Set(),members=new Set();
  for(const rule of index.rules){
    must([1,3,5,8].includes(rule.rank)&&!ranks.has(rule.rank)&&
      index.topic_ids.includes(rule.left_topic_id)&&
      index.topic_ids.includes(rule.right_topic_id)&&
      rule.left_topic_id!==rule.right_topic_id&&
      !members.has(rule.left_topic_id)&&!members.has(rule.right_topic_id)&&
      Array.isArray(rule.left_features)&&rule.left_features.length>=2&&
      rule.left_features.length<=24&&
      Array.isArray(rule.right_features)&&rule.right_features.length>=2&&
      rule.right_features.length<=24&&
      [...rule.left_features,...rule.right_features].every(x=>typeof x==='string'&&x)&&
      new Set([...rule.left_features,...rule.right_features]).size===
        rule.left_features.length+rule.right_features.length&&
      rule.left_features.every((x,i)=>i===0||cmp(rule.left_features[i-1],x)<0)&&
      rule.right_features.every((x,i)=>i===0||cmp(rule.right_features[i-1],x)<0),
      'invalid A4 positive pair rule');
    ranks.add(rule.rank);members.add(rule.left_topic_id);members.add(rule.right_topic_id);
  }
  return index;
}

/** Positive switch requires three exclusive opposite-side TRAIN features. */
export function routeA4PairPositive(baseIndex,pairIndex,input,{catalog_sha256,
  base_min_score=.02,base_min_margin=.02,min_positive_support=3,
  min_positive_margin=2}={}){
  try{
    valid(pairIndex);
    if(!digest(catalog_sha256)||catalog_sha256!==pairIndex.catalog_sha256)
      return defer('CATALOG_MISMATCH');
    if(!baseIndex||baseIndex.catalog_sha256!==catalog_sha256||
      baseIndex.train_sha256!==pairIndex.base_train_sha256||
      JSON.stringify(baseIndex.topic_ids)!==JSON.stringify(pairIndex.topic_ids))
      return defer('BASE_INDEX_MISMATCH');
    if(!Number.isFinite(base_min_score)||base_min_score<0||
      !Number.isFinite(base_min_margin)||base_min_margin<0||
      !Number.isInteger(min_positive_support)||min_positive_support<2||
      min_positive_support>24||!Number.isInteger(min_positive_margin)||
      min_positive_margin<1||min_positive_margin>24)
      return defer('BAD_CONFIG');
    const base=routeA3(baseIndex,input,{catalog_sha256,
      min_score:base_min_score,min_margin:base_min_margin});
    if(base.state!=='ASSIGNED'||base.topics.length!==1)return base;
    const rule=pairIndex.rules.find(r=>r.left_topic_id===base.topics[0]||
      r.right_topic_id===base.topics[0]);
    if(!rule)return base;
    const active=features(input.current,'char');
    const left=rule.left_features.filter(x=>active.has(x)).length;
    const right=rule.right_features.filter(x=>active.has(x)).length;
    if(left>0&&right>0)return defer('A4_POSITIVE_PAIR_CONFLICT');
    const baseLeft=base.topics[0]===rule.left_topic_id;
    const own=baseLeft?left:right,opposite=baseLeft?right:left;
    if(own===0&&opposite>=min_positive_support&&
      opposite-own>=min_positive_margin)
      return {state:'ASSIGNED',
        topics:[baseLeft?rule.right_topic_id:rule.left_topic_id],
        reason:'A4_POSITIVE_CONTRASTIVE_SWITCH',
        evidence_source:'DESIGNATED_PUBLIC_TRAIN_PAIR',graph_rank:rule.rank,
        base_topic:base.topics[0],left_support:left,right_support:right};
    return base;
  }catch{return defer('INVALID_POSITIVE_PAIR_INDEX');}
}
