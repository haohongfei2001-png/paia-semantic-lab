/** ZMR-03 A2 development-only complement log-likelihood Router; no neural assets. */
import { features } from './a1.mjs';

const must=(ok,message)=>{if(!ok) throw new Error(message);};
const digest=value=>typeof value==='string' && /^[a-f0-9]{64}$/u.test(value);
const defer=reason=>({state:'DEFER',topics:[],reason});
const cache=new WeakMap();

function valid(index) {
  must(index && index.schema==='ZMR-A2-DEV-1' &&
    index.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE' &&
    digest(index.catalog_sha256) && digest(index.train_sha256) &&
    Array.isArray(index.topic_ids) && index.topic_ids.length===144 &&
    index.topic_ids.every(id=>typeof id==='string' && id) &&
    new Set(index.topic_ids).size===144 &&
    ['char','word'].includes(index.mode) &&
    Number.isInteger(index.vocab_size) && index.vocab_size>0 &&
    Array.isArray(index.class_lengths) && index.class_lengths.length===144 &&
    index.class_lengths.every(n=>Number.isInteger(n) && n>=0) &&
    Number.isInteger(index.total_length) && index.total_length>=0 &&
    Array.isArray(index.postings) && index.postings.length===index.vocab_size,
    'invalid A2 index');
  return index;
}

/** Bounded finite statistics derived from each full144 TRAIN document. */
export function compileA2({topic_ids,documents,catalog_sha256,train_sha256,
  mode='char',max_features=5000}) {
  must(Array.isArray(topic_ids) && topic_ids.length===144 &&
    topic_ids.every(id=>typeof id==='string' && id) && new Set(topic_ids).size===144,
    'full144 Topic universe required');
  must(documents && typeof documents==='object' && Object.keys(documents).length===144 &&
    topic_ids.every(id=>typeof documents[id]==='string'),
    'one document per Topic required');
  must(digest(catalog_sha256) && digest(train_sha256) &&
    ['char','word'].includes(mode) && Number.isInteger(max_features) &&
    max_features>0 && max_features<=10000,'invalid compiler inputs');
  const counts=topic_ids.map(id=>features(documents[id],mode));
  const df=new Map();
  for(const row of counts) for(const term of row.keys()) df.set(term,(df.get(term)??0)+1);
  // Mid-frequency terms win; exact ties are ordered by Unicode code points.
  const chosen=[...df].sort((a,b)=>{
    const aw=a[1]*Math.log(145/(a[1]+1)),bw=b[1]*Math.log(145/(b[1]+1));
    return bw-aw || (a[0]<b[0]?-1:a[0]>b[0]?1:0);
  }).slice(0,max_features).map(([term])=>term).sort();
  must(chosen.length>0,'empty A2 vocabulary');
  const class_lengths=Array(144).fill(0);
  const postings=chosen.map(term=>{
    const hits=[];
    let total=0;
    for(let i=0;i<144;i++) {
      const tf=counts[i].get(term)??0;
      if(tf) { hits.push([i,tf]); class_lengths[i]+=tf; total+=tf; }
    }
    return [term,total,hits];
  });
  const index={schema:'ZMR-A2-DEV-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    topic_ids:[...topic_ids],catalog_sha256,train_sha256,mode,max_features,
    vocab_size:postings.length,class_lengths,
    total_length:class_lengths.reduce((a,b)=>a+b,0),postings};
  return valid(index);
}

/** Scores full144 class-vs-complement evidence; thresholds are uncalibrated DEV knobs. */
export function routeA2(index,input,{catalog_sha256,alpha=.5,min_score=0,min_margin=.5}={}) {
  try {
    valid(index);
    if(!digest(catalog_sha256) || catalog_sha256!==index.catalog_sha256)
      return defer('CATALOG_MISMATCH');
    if(!input || typeof input.current!=='string' || typeof input.title!=='string' ||
      !Array.isArray(input.recent) || !input.recent.every(x=>typeof x==='string'))
      return defer('BAD_INPUT');
    if(!Number.isFinite(alpha) || alpha<=0 || !Number.isFinite(min_score) ||
      !Number.isFinite(min_margin) || min_margin<0) return defer('BAD_CONFIG');
    let table=cache.get(index);
    if(!table) { table=new Map(index.postings.map(([term,total,hits])=>[term,{total,hits}])); cache.set(index,table); }
    const query=features(input.current,index.mode);
    const scores=Array(144).fill(0);
    let matched=0;
    for(const [term,qtf] of query) {
      const posting=table.get(term);
      if(!posting) continue;
      matched++;
      const byClass=new Map(posting.hits);
      for(let i=0;i<144;i++) {
        const tf=byClass.get(i)??0;
        const own=Math.log((tf+alpha)/(index.class_lengths[i]+alpha*index.vocab_size));
        const other=Math.log((posting.total-tf+alpha)/
          (index.total_length-index.class_lengths[i]+alpha*index.vocab_size));
        scores[i]+=Math.min(qtf,3)*(own-other);
      }
    }
    if(!matched) return defer('OOV');
    const order=Array.from({length:144},(_,i)=>i).sort((a,b)=>scores[b]-scores[a] ||
      (index.topic_ids[a]<index.topic_ids[b]?-1:index.topic_ids[a]>index.topic_ids[b]?1:0));
    const first=order[0],second=order[1],top=scores[first],margin=top-scores[second];
    if(!(top>=min_score && margin>=min_margin)) return defer('LOW_OR_AMBIGUOUS_EVIDENCE');
    return {state:'ASSIGNED',topics:[index.topic_ids[first]],reason:'A2_DEV_LIKELIHOOD',
      score:top,margin,matched_features:matched};
  } catch { return defer('INVALID_INDEX'); }
}
