/** ZMR-02 A0/A1 development-only, browser-compatible sparse baselines. */
const must = (condition, message) => { if (!condition) throw new Error(message); };
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const clean = value => value.normalize('NFC').toLowerCase();

export function features(value, mode = 'char') {
  must(typeof value === 'string' && ['char', 'word', 'hybrid'].includes(mode), 'invalid feature input');
  const result = new Map();
  const add = key => result.set(key, (result.get(key) ?? 0) + 1);
  const chars = Array.from(clean(value));
  if (mode !== 'word') for (const n of [2, 3, 4]) {
    for (let i = 0; i + n <= chars.length; i++) {
      const span = chars.slice(i, i+n).join('');
      if (span.trim()) add('c' + n + ':' + span);
    }
  }
  if (mode !== 'char') {
    const words = clean(value).match(/[\p{L}\p{N}]+/gu) ?? [];
    for (let i = 0; i < words.length; i++) {
      add('w1:' + words[i]);
      if (i + 1 < words.length) add('w2:' + words[i] + '\u001f' + words[i+1]);
    }
  }
  return result;
}

function validateIndex(index) {
  must(index && index.schema === 'ZMR-A1-DEV-1' && digest(index.catalog_sha256) &&
    digest(index.train_sha256) && Array.isArray(index.topic_ids) && index.topic_ids.length === 144 &&
    index.topic_ids.every(x => typeof x === 'string' && x) && new Set(index.topic_ids).size === 144 &&
    ['char','word','hybrid'].includes(index.mode) && Array.isArray(index.postings) &&
    Array.isArray(index.topic_norms) && index.topic_norms.length === 144 &&
    Array.isArray(index.topic_lengths) && index.topic_lengths.length === 144 &&
    Number.isFinite(index.average_length) && index.average_length >= 0,
    'invalid A1 index');
  return index;
}

/** Compiles bounded, interpretable term statistics from Catalog and/or provisional TRAIN only. */
export function compileA1({topic_ids, documents, catalog_sha256, train_sha256,
  mode = 'char', max_features = 12000}) {
  must(Array.isArray(topic_ids) && topic_ids.length === 144 &&
    topic_ids.every(x => typeof x === 'string' && x) && new Set(topic_ids).size === 144,
    'full144 Topic universe required');
  must(documents && typeof documents === 'object' && Object.keys(documents).length === 144 &&
    topic_ids.every(id => typeof documents[id] === 'string'), 'one document per Topic required');
  must(digest(catalog_sha256) && digest(train_sha256), 'source digests required');
  must(Number.isInteger(max_features) && max_features > 0 && max_features <= 20000, 'invalid feature budget');
  const topicCounts = topic_ids.map(id => features(documents[id], mode));
  const df = new Map();
  for (const counts of topicCounts) for (const term of counts.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  // Deterministic TRAIN-only pruning; frequency ties are broken by code-point order.
  const selected = [...df].sort((a,b) => b[1]-a[1] || (a[0]<b[0]?-1:a[0]>b[0]?1:0))
    .slice(0,max_features).map(([term])=>term).sort();
  const topic_lengths = topicCounts.map(counts => selected.reduce((sum,term)=>sum+(counts.get(term)??0),0));
  const average_length = topic_lengths.reduce((a,b)=>a+b,0)/144;
  const topic_norms = Array(144).fill(0);
  const postings = selected.map(term => {
    const documentFrequency=df.get(term);
    const idf=Math.log(1+(144-documentFrequency+.5)/(documentFrequency+.5));
    const hits=[];
    for (let i=0;i<144;i++) {
      const tf=topicCounts[i].get(term)??0;
      if (!tf) continue;
      const tfidf=(1+Math.log(tf))*idf;
      const lengthRatio=average_length ? topic_lengths[i]/average_length : 0;
      const bm25=idf * (tf*2.2)/(tf+1.2*(.25+.75*lengthRatio));
      topic_norms[i]+=tfidf*tfidf;
      hits.push([i,tfidf,bm25]);
    }
    return [term,idf,hits];
  });
  const index={schema:'ZMR-A1-DEV-1', evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    topic_ids:[...topic_ids],catalog_sha256,train_sha256,mode,max_features,
    topic_lengths,average_length,topic_norms:topic_norms.map(Math.sqrt),postings};
  return validateIndex(index);
}

const defer = reason => ({state:'DEFER',topics:[],reason});

/** Scores all 144 Topics. Thresholds are development knobs, not calibrated confidence. */
export function routeA1(index, input, {catalog_sha256, method = 'tfidf', min_score = .15,
  min_margin = .02} = {}) {
  try {
    validateIndex(index);
    if (!digest(catalog_sha256) || catalog_sha256 !== index.catalog_sha256) return defer('CATALOG_MISMATCH');
    if (!input || typeof input.current !== 'string' || typeof input.title !== 'string' ||
      !Array.isArray(input.recent) || !input.recent.every(x => typeof x === 'string')) return defer('BAD_INPUT');
    if (!['tfidf','bm25'].includes(method) || !Number.isFinite(min_score) || min_score < 0 ||
      !Number.isFinite(min_margin) || min_margin < 0) return defer('BAD_CONFIG');
    const query=features(input.current,index.mode);
    if (!query.size) return defer('NO_FEATURES');
    const table=new Map(index.postings.map(([term,idf,hits])=>[term,{idf,hits}]));
    const scores=Array(144).fill(0);
    let queryNorm=0, matched=0;
    for (const [term,tf] of query) {
      const posting=table.get(term);
      if (!posting) continue;
      matched++;
      const weight=(1+Math.log(tf))*posting.idf;
      queryNorm+=weight*weight;
      for (const [topic,tfidf,bm25] of posting.hits)
        scores[topic]+=method==='tfidf'?weight*tfidf:bm25;
    }
    if (!matched) return defer('OOV');
    if (method==='tfidf') scores.forEach((value,i)=>{
      scores[i]=index.topic_norms[i] && queryNorm ? value/(index.topic_norms[i]*Math.sqrt(queryNorm)):0;
    });
    const order=Array.from({length:144},(_,i)=>i).sort((a,b)=>scores[b]-scores[a] ||
      (index.topic_ids[a]<index.topic_ids[b]?-1:index.topic_ids[a]>index.topic_ids[b]?1:0));
    const first=order[0], second=order[1], top=scores[first];
    if (!(top>=min_score && top-scores[second]>=min_margin)) return defer('LOW_OR_AMBIGUOUS_EVIDENCE');
    return {state:'ASSIGNED',topics:[index.topic_ids[first]],reason:'A1_DEV_SCORE',
      score:top,margin:top-scores[second],matched_features:matched};
  } catch { return defer('INVALID_INDEX'); }
}

export function routeA0Defer() { return defer('A0_ALL_DEFER'); }

export function routeA0NameOnly(names, input) {
  if (!Array.isArray(names) || names.length !== 144 || !input || typeof input.current !== 'string')
    return defer('BAD_INPUT');
  const current=clean(input.current), hits=[];
  for (const row of names) {
    if (!row || typeof row.id !== 'string' || !Array.isArray(row.aliases)) return defer('BAD_NAMES');
    if (row.aliases.some(alias => typeof alias === 'string' && alias.length >= 2 &&
      current.includes(clean(alias)))) hits.push(row.id);
  }
  return hits.length===1 ? {state:'ASSIGNED',topics:hits,reason:'A0_FORMAL_NAME_ONLY'} :
    defer(hits.length?'A0_MULTIPLE_NAMES':'A0_NO_NAME');
}
