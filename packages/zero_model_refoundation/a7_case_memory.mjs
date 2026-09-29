/** A7 development hypothesis: bounded per-scenario lexical memory, never a model or semantic API. */
import {features} from './a1.mjs';

const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const must=(ok,message)=>{if(!ok)throw Error(message);};
const defer=reason=>({state:'DEFER',topics:[],reason});
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const scalarLength=s=>Array.from(s).length;

function valid(index){
  must(index&&index.schema==='ZMR-A7-CASE-MEMORY-DEV-1'&&
    index.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    digest(index.catalog_sha256)&&digest(index.train_sha256)&&
    ['char','word'].includes(index.mode)&&
    Number.isInteger(index.keep_per_case)&&index.keep_per_case>=8&&
    index.keep_per_case<=48&&
    Array.isArray(index.topic_ids)&&index.topic_ids.length===144&&
    index.topic_ids.every(x=>typeof x==='string'&&x)&&
    new Set(index.topic_ids).size===144&&
    Array.isArray(index.prototypes)&&index.prototypes.length>=288&&
    index.prototypes.length<=1152&&
    Array.isArray(index.df)&&index.df.length>0&&
    index.df.every(([term,count],i)=>typeof term==='string'&&term&&
      Number.isInteger(count)&&count>0&&count<=index.prototypes.length&&
      (i===0||index.df[i-1][0]<term)),'invalid A7 index');
  const counts=Array(144).fill(0),scenarios=new Set(),sources=new Set();
  const dictionary=new Set(index.df.map(([term])=>term));
  for(const p of index.prototypes){
    must(Number.isInteger(p.topic)&&p.topic>=0&&p.topic<144&&
      typeof p.source_id==='string'&&p.source_id&&
      typeof p.scenario_family==='string'&&p.scenario_family&&
      !sources.has(p.source_id)&&!scenarios.has(p.scenario_family)&&
      Array.isArray(p.vector)&&p.vector.length>0&&
      p.vector.length<=index.keep_per_case&&
      p.vector.every(([term,weight],i)=>typeof term==='string'&&term&&
        dictionary.has(term)&&Number.isFinite(weight)&&weight>0&&
        (i===0||p.vector[i-1][0]<term))&&
      Number.isFinite(p.norm)&&p.norm>0&&
      Math.abs(p.norm-Math.sqrt(p.vector.reduce((sum,[,weight])=>
        sum+weight*weight,0)))<=1e-8,'invalid A7 prototype');
    counts[p.topic]++;sources.add(p.source_id);scenarios.add(p.scenario_family);
  }
  must(counts.every(n=>n>=2&&n<=8),'two to eight TRAIN scenarios per Topic required');
  return index;
}

/** Every prototype is a separate TRAIN scenario; A1 instead collapses each Topic to one document. */
export function compileA7({topic_ids,cases,catalog_sha256,train_sha256,
  mode='char',keep_per_case=48}={}){
  must(Array.isArray(topic_ids)&&topic_ids.length===144&&
    topic_ids.every(x=>typeof x==='string'&&x)&&new Set(topic_ids).size===144&&
    Array.isArray(cases)&&cases.length>=288&&cases.length<=1152&&
    digest(catalog_sha256)&&digest(train_sha256)&&
    ['char','word'].includes(mode)&&Number.isInteger(keep_per_case)&&
    keep_per_case>=8&&keep_per_case<=48,'invalid A7 training plan');
  const positions=new Map(topic_ids.map((id,i)=>[id,i]));
  const ordered=[...cases].sort((a,b)=>cmp(a.topic_id,b.topic_id)||
    cmp(a.scenario_family,b.scenario_family)||cmp(a.source_id,b.source_id));
  const counts=Array(144).fill(0),seenSources=new Set(),seenScenarios=new Set();
  for(const row of ordered){
    const topic=positions.get(row.topic_id);
    must(topic!==undefined&&typeof row.current==='string'&&row.current.trim()&&
      scalarLength(row.current)<=8192&&typeof row.source_id==='string'&&row.source_id&&
      typeof row.scenario_family==='string'&&row.scenario_family&&
      !seenSources.has(row.source_id)&&!seenScenarios.has(row.scenario_family),
      'invalid or reused TRAIN case lineage');
    counts[topic]++;seenSources.add(row.source_id);seenScenarios.add(row.scenario_family);
  }
  must(counts.every(n=>n>=2&&n<=8),'two to eight TRAIN scenarios per Topic required');
  const vectors=ordered.map(row=>features(row.current,mode));
  const df=new Map();for(const vector of vectors)for(const term of vector.keys())
    df.set(term,(df.get(term)??0)+1);
  const size=vectors.length;
  const idf=count=>Math.log(1+(size-count+.5)/(count+.5));
  const prototypes=vectors.map((vector,i)=>{
    const weighted=[...vector].map(([term,tf])=>[term,
      Number(((1+Math.log(tf))*idf(df.get(term))).toFixed(6))])
      .filter(([,weight])=>weight>0)
      .sort((a,b)=>b[1]-a[1]||cmp(a[0],b[0]))
      .slice(0,keep_per_case).sort((a,b)=>cmp(a[0],b[0]));
    must(weighted.length>0,'empty TRAIN case features');
    const norm=Math.sqrt(weighted.reduce((sum,[,weight])=>sum+weight*weight,0));
    return {topic:positions.get(ordered[i].topic_id),source_id:ordered[i].source_id,
      scenario_family:ordered[i].scenario_family,vector:weighted,norm};
  });
  const used=new Set(prototypes.flatMap(p=>p.vector.map(([term])=>term)));
  const index=valid({schema:'ZMR-A7-CASE-MEMORY-DEV-1',
    evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    catalog_sha256,train_sha256,mode,keep_per_case,topic_ids:[...topic_ids],
    aggregation:'MAX_PER_SCENARIO_COSINE',df:[...df].filter(([term])=>used.has(term))
      .sort((a,b)=>cmp(a[0],b[0])),prototypes});
  must(new TextEncoder().encode(JSON.stringify(index)+'\n').length<=1048576,
    'A7 index exceeds unchanged 1 MiB static cap');
  return index;
}

/** Current-only base candidate; title/recent require a separately qualified composition mechanism. */
export function routeA7(index,input,{catalog_sha256,min_score=.25,min_margin=.05,
  min_matched_features=2}={}){
  try{
    valid(index);
    if(!digest(catalog_sha256)||catalog_sha256!==index.catalog_sha256)
      return defer('CATALOG_MISMATCH');
    if(!input||typeof input.current!=='string'||typeof input.title!=='string'||
      !Array.isArray(input.recent)||!input.recent.every(x=>typeof x==='string'))
      return defer('BAD_INPUT');
    if(input.recent.length>32||
      [input.current,input.title,...input.recent].reduce((n,s)=>n+scalarLength(s),0)>8192)
      return defer('PROFILE_OVERFLOW');
    if(!Number.isFinite(min_score)||min_score<0||!Number.isFinite(min_margin)||
      min_margin<0||!Number.isInteger(min_matched_features)||
      min_matched_features<1||min_matched_features>48)return defer('BAD_CONFIG');
    const query=features(input.current,index.mode);
    if(!query.size)return defer('NO_FEATURES');
    const df=new Map(index.df),size=index.prototypes.length;
    const unseen=Math.log(1+(size+.5)/.5),weights=new Map();
    for(const [term,tf] of query)weights.set(term,(1+Math.log(tf))*
      (df.has(term)?Math.log(1+(size-df.get(term)+.5)/(df.get(term)+.5)):unseen));
    const qnorm=Math.sqrt([...weights.values()].reduce((sum,x)=>sum+x*x,0));
    if(!qnorm)return defer('NO_FEATURES');
    const scores=Array(144).fill(0),supports=Array(144).fill(0),sources=Array(144).fill(null);
    for(const p of index.prototypes){
      let dot=0,matched=0;
      for(const [term,weight] of p.vector){const q=weights.get(term);if(q){dot+=q*weight;matched++;}}
      if(matched<min_matched_features)continue;
      const score=dot/(qnorm*p.norm);
      if(score>scores[p.topic]||(score===scores[p.topic]&&
        (!sources[p.topic]||cmp(p.source_id,sources[p.topic])<0))){
        scores[p.topic]=score;supports[p.topic]=matched;sources[p.topic]=p.source_id;
      }
    }
    const order=Array.from({length:144},(_,i)=>i).sort((a,b)=>scores[b]-scores[a]||
      cmp(index.topic_ids[a],index.topic_ids[b]));
    const top=order[0],runner=order[1],margin=scores[top]-scores[runner];
    if(!(scores[top]>=min_score&&margin>=min_margin))return defer('LOW_OR_AMBIGUOUS_EVIDENCE');
    return {state:'ASSIGNED',topics:[index.topic_ids[top]],reason:'A7_DEV_CASE_MEMORY',
      score:scores[top],margin,matched_features:supports[top],evidence_source:'TRAIN_PROTOTYPE'};
  }catch{return defer('INVALID_INDEX');}
}
