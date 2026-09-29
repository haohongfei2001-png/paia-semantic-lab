/** ZMR-03 A3: bounded sparse multiclass hinge weights, never neural inference. */
import { features } from './a1.mjs';

const must=(ok,message)=>{if(!ok) throw new Error(message);};
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
const defer=reason=>({state:'DEFER',topics:[],reason});
const cache=new WeakMap();

function valid(index) {
  must(index&&index.schema==='ZMR-A3-DEV-1'&&
    index.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    digest(index.catalog_sha256)&&digest(index.train_sha256)&&
    ['char','word'].includes(index.mode)&&
    Array.isArray(index.topic_ids)&&index.topic_ids.length===144&&
    index.topic_ids.every(x=>typeof x==='string'&&x)&&
    new Set(index.topic_ids).size===144&&
    Number.isFinite(index.quant_scale)&&index.quant_scale>0&&
    Array.isArray(index.postings)&&index.postings.length>0&&
    index.postings.length<=5000&&
    index.postings.every(row=>Array.isArray(row)&&row.length===2&&
      typeof row[0]==='string'&&row[0]&&Array.isArray(row[1])&&
      row[1].length>0&&row[1].every(hit=>Array.isArray(hit)&&hit.length===2&&
        Number.isInteger(hit[0])&&hit[0]>=0&&hit[0]<144&&
        Number.isInteger(hit[1])&&hit[1]!==0&&hit[1]>=-32767&&hit[1]<=32767))&&
    index.postings.every((row,i)=>i===0||index.postings[i-1][0]<row[0])&&
    index.postings.every(row=>row[1].every((hit,i)=>i===0||row[1][i-1][0]<hit[0])),
    'invalid A3 index');
  return index;
}

/** Deterministic full144 multiclass hinge training with sparse coefficient retention. */
export function compileA3({topic_ids,documents,catalog_sha256,train_sha256,
  mode='char',max_features=4000,keep_per_topic=48,epochs=5}={}) {
  must(Array.isArray(topic_ids)&&topic_ids.length===144&&
    topic_ids.every(x=>typeof x==='string'&&x)&&new Set(topic_ids).size===144,
    'full144 Topic universe required');
  must(documents&&typeof documents==='object'&&Object.keys(documents).length===144&&
    topic_ids.every(id=>typeof documents[id]==='string'&&documents[id]),
    'one nonempty document per Topic required');
  must(digest(catalog_sha256)&&digest(train_sha256)&&['char','word'].includes(mode)&&
    Number.isInteger(max_features)&&max_features>0&&max_features<=5000&&
    Number.isInteger(keep_per_topic)&&keep_per_topic>0&&keep_per_topic<=64&&
    Number.isInteger(epochs)&&epochs>0&&epochs<=8,'invalid bounded training plan');
  const raw=topic_ids.map(id=>features(documents[id],mode));
  const df=new Map();
  for(const row of raw) for(const term of row.keys()) df.set(term,(df.get(term)??0)+1);
  const vocabulary=[...df].sort((a,b)=>a[1]-b[1]||
    (a[0]<b[0]?-1:a[0]>b[0]?1:0)).slice(0,max_features)
    .map(([term])=>term).sort();
  must(vocabulary.length>0,'empty feature vocabulary');
  const lookup=new Map(vocabulary.map((term,i)=>[term,i]));
  const samples=raw.map(row=>{
    const active=[];
    for(const [term,tf] of row) {
      const feature=lookup.get(term);
      if(feature!==undefined) active.push([feature,Math.min(tf,3)]);
    }
    active.sort((a,b)=>a[0]-b[0]);
    const norm=Math.sqrt(active.reduce((sum,[,tf])=>sum+tf*tf,0));
    return active.map(([feature,tf])=>[feature,tf/(norm||1)]);
  });
  const width=vocabulary.length,weights=Array.from({length:144},()=>new Float32Array(width));
  for(let epoch=0;epoch<epochs;epoch++) for(let offset=0;offset<144;offset++) {
    const gold=(offset+epoch*37)%144,sample=samples[gold];
    if(!sample.length) continue;
    const scores=weights.map(row=>sample.reduce((sum,[feature,value])=>sum+row[feature]*value,0));
    let rival=-1;
    for(let i=0;i<144;i++) if(i!==gold&&
      (rival<0||scores[i]>scores[rival]||
        (scores[i]===scores[rival]&&topic_ids[i]<topic_ids[rival]))) rival=i;
    if(scores[gold]-scores[rival]>=1) continue;
    const rate=.4/(1+epoch*.25);
    for(const [feature,value] of sample) {
      weights[gold][feature]+=rate*value;
      weights[rival][feature]-=rate*value;
    }
  }
  const retained=weights.map(row=>Array.from(row,(value,feature)=>({feature,value}))
    .filter(x=>x.value!==0)
    .sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)||a.feature-b.feature)
    .slice(0,keep_per_topic));
  const peak=Math.max(...retained.flat().map(x=>Math.abs(x.value)));
  must(peak>0&&Number.isFinite(peak),'no discriminative coefficients');
  const quant_scale=peak/32767;
  const postings=[];
  for(let feature=0;feature<width;feature++) {
    const hits=[];
    for(let topic=0;topic<144;topic++) {
      const item=retained[topic].find(x=>x.feature===feature);
      if(item) {
        const q=Math.round(item.value/quant_scale);
        if(q) hits.push([topic,q]);
      }
    }
    if(hits.length) postings.push([vocabulary[feature],hits]);
  }
  return valid({schema:'ZMR-A3-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    topic_ids:[...topic_ids],catalog_sha256,train_sha256,mode,max_features,
    keep_per_topic,epochs,objective:'MULTICLASS_HINGE',quantization:'GLOBAL_INT16',
    quant_scale,postings});
}

/** Scores all 144 Topics and abstains on unsupported or ambiguous input. */
export function routeA3(index,input,{catalog_sha256,min_score=.02,min_margin=.02}={}) {
  try {
    valid(index);
    if(!digest(catalog_sha256)||catalog_sha256!==index.catalog_sha256)
      return defer('CATALOG_MISMATCH');
    if(!input||typeof input.current!=='string'||typeof input.title!=='string'||
      !Array.isArray(input.recent)||!input.recent.every(x=>typeof x==='string'))
      return defer('BAD_INPUT');
    if(!Number.isFinite(min_score)||min_score<0||
      !Number.isFinite(min_margin)||min_margin<0) return defer('BAD_CONFIG');
    let table=cache.get(index);
    if(!table) { table=new Map(index.postings);cache.set(index,table); }
    const query=features(input.current,index.mode);
    const active=[];
    for(const [term,tf] of query) if(table.has(term)) active.push([term,Math.min(tf,3)]);
    if(!active.length) return defer('OOV');
    const norm=Math.sqrt(active.reduce((sum,[,tf])=>sum+tf*tf,0));
    const scores=Array(144).fill(0);
    for(const [term,tf] of active) for(const [topic,qweight] of table.get(term))
      scores[topic]+=(tf/norm)*qweight*index.quant_scale;
    const order=Array.from({length:144},(_,i)=>i).sort((a,b)=>scores[b]-scores[a]||
      (index.topic_ids[a]<index.topic_ids[b]?-1:index.topic_ids[a]>index.topic_ids[b]?1:0));
    const top=order[0],runner=order[1],margin=scores[top]-scores[runner];
    if(!(scores[top]>=min_score&&margin>=min_margin)) return defer('LOW_OR_AMBIGUOUS_EVIDENCE');
    return {state:'ASSIGNED',topics:[index.topic_ids[top]],reason:'A3_DEV_HINGE',
      score:scores[top],margin,matched_features:active.length};
  } catch { return defer('INVALID_INDEX'); }
}
