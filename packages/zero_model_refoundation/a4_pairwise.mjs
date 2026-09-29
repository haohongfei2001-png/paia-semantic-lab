/** A4 development-only bounded contrastive pair evidence over a full144 A3 fallback. */
import {features} from './a1.mjs';
import {routeA3} from './a3.mjs';

const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const must=(ok,message)=>{if(!ok)throw Error(message);};
const defer=reason=>({state:'DEFER',topics:[],reason});
const cmp=(a,b)=>a<b?-1:a>b?1:0;

function valid(index){
  must(index&&index.schema==='ZMR-A4-PAIRWISE-DEV-1'&&
    index.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    digest(index.catalog_sha256)&&digest(index.graph_sha256)&&
    digest(index.pair_train_sha256)&&digest(index.base_train_sha256)&&
    Array.isArray(index.topic_ids)&&index.topic_ids.length===144&&
    index.topic_ids.every(x=>typeof x==='string'&&x)&&
    new Set(index.topic_ids).size===144&&
    Array.isArray(index.rules)&&index.rules.length===4,
    'invalid A4 pair index');
  const ranks=new Set(),usedTopics=new Set();
  for(const rule of index.rules){
    must([1,3,5,8].includes(rule.rank)&&!ranks.has(rule.rank)&&
      typeof rule.left_topic_id==='string'&&typeof rule.right_topic_id==='string'&&
      rule.left_topic_id!==rule.right_topic_id&&
      index.topic_ids.includes(rule.left_topic_id)&&
      index.topic_ids.includes(rule.right_topic_id)&&
      !usedTopics.has(rule.left_topic_id)&&!usedTopics.has(rule.right_topic_id)&&
      Array.isArray(rule.left_features)&&rule.left_features.length>=2&&
      rule.left_features.length<=24&&
      Array.isArray(rule.right_features)&&rule.right_features.length>=2&&
      rule.right_features.length<=24&&
      [...rule.left_features,...rule.right_features].every(x=>typeof x==='string'&&x)&&
      new Set([...rule.left_features,...rule.right_features]).size===
        rule.left_features.length+rule.right_features.length&&
      rule.left_features.every((x,i)=>i===0||cmp(rule.left_features[i-1],x)<0)&&
      rule.right_features.every((x,i)=>i===0||cmp(rule.right_features[i-1],x)<0),
      'invalid A4 pair rule');
    ranks.add(rule.rank);usedTopics.add(rule.left_topic_id);usedTopics.add(rule.right_topic_id);
  }
  return index;
}

/** Contrasts only designated TRAIN examples; ambiguous TRAIN cases suppress shared features. */
export function compileA4Pairs({topic_ids,pairs,catalog_sha256,graph_sha256,
  pair_train_sha256,base_train_sha256}={}){
  must(Array.isArray(topic_ids)&&topic_ids.length===144&&
    topic_ids.every(x=>typeof x==='string'&&x)&&new Set(topic_ids).size===144&&
    Array.isArray(pairs)&&pairs.length===4&&
    [catalog_sha256,graph_sha256,pair_train_sha256,base_train_sha256].every(digest),
    'invalid A4 compilation plan');
  const rules=pairs.map(pair=>{
    must([1,3,5,8].includes(pair.rank)&&
      Array.isArray(pair.cases)&&pair.cases.length===5&&
      pair.cases.filter(x=>x.role==='LEFT').length===2&&
      pair.cases.filter(x=>x.role==='RIGHT').length===2&&
      pair.cases.filter(x=>x.role==='AMBIGUOUS').length===1&&
      pair.cases.every(x=>typeof x.current==='string'&&x.current.trim()&&
        typeof x.scenario_family==='string'&&x.scenario_family),
      'invalid A4 pair TRAIN');
    const side=role=>pair.cases.filter(x=>x.role===role).map(x=>features(x.current,'char'));
    const left=side('LEFT'),right=side('RIGHT'),ambiguous=side('AMBIGUOUS');
    const union=rows=>new Set(rows.flatMap(v=>[...v.keys()]));
    const leftTerms=union(left),rightTerms=union(right),ambiguousTerms=union(ambiguous);
    const retain=(own,otherTerms)=>[...new Set(own.flatMap(v=>[...v.keys()]
      .filter(x=>!otherTerms.has(x)&&!ambiguousTerms.has(x))
      .sort((a,b)=>b.length-a.length||cmp(a,b)).slice(0,12)))].sort(cmp);
    return {rank:pair.rank,left_topic_id:pair.left_topic_id,
      right_topic_id:pair.right_topic_id,
      left_features:retain(left,rightTerms),
      right_features:retain(right,leftTerms)};
  }).sort((a,b)=>a.rank-b.rank);
  const index=valid({schema:'ZMR-A4-PAIRWISE-DEV-1',
    evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    catalog_sha256,graph_sha256,pair_train_sha256,base_train_sha256,
    topic_ids:[...topic_ids],rules});
  must(new TextEncoder().encode(JSON.stringify(index)+'\n').length<=1048576,
    'A4 pair index exceeds 1 MiB');
  return index;
}

/** Pair evidence can only veto an A3 assignment already inside that pair. */
export function routeA4Pairs(baseIndex,pairIndex,input,{catalog_sha256,
  base_min_score=.02,base_min_margin=.02,min_pair_support=2}={}){
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
      !Number.isInteger(min_pair_support)||min_pair_support<1||min_pair_support>24)
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
    if(left>0&&right>0)return {state:'DEFER',topics:[],
      reason:'PAIR_EVIDENCE_CONFLICT',graph_rank:rule.rank,
      base_topic:base.topics[0],left_support:left,right_support:right};
    const opposite=base.topics[0]===rule.left_topic_id?right:left;
    if(opposite>=min_pair_support)return {state:'DEFER',topics:[],
      reason:'PAIR_NEGATIVE_EVIDENCE',
      evidence_source:'DESIGNATED_PUBLIC_TRAIN_PAIR',graph_rank:rule.rank,
      base_topic:base.topics[0],left_support:left,right_support:right};
    return base;
  }catch{return defer('INVALID_PAIR_INDEX');}
}
