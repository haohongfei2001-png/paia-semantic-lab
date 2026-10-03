/** Standalone synthetic development storage view. No candidate fitting or routing. */
const must = (ok, message) => {if (!ok) throw Error(message);};
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
function immutableDataTree(x, seen = new WeakSet()) {
  if (x === null || ['string', 'boolean'].includes(typeof x) || (typeof x === 'number' && Number.isFinite(x))) return;
  must(typeof x === 'object' && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === Array.prototype) && Object.isFrozen(x) && !seen.has(x), 'immutable JSON data tree required');
  seen.add(x);
  for (const key of Reflect.ownKeys(x)) {
    const d = Object.getOwnPropertyDescriptor(x, key);
    must(typeof key === 'string' && Object.hasOwn(d, 'value'), 'immutable data properties only; no accessors');
    immutableDataTree(d.value, seen);
  }
}
export function createLosslessPostingView(x) {
  immutableDataTree(x);
  must(x?.schema === 'ZMR-A1-V04-INT16-DEV-1' && x.evidence_class === 'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE' && digest(x.catalog_sha256) && digest(x.train_sha256), 'encoded identity required');
  must(x.mode === 'char' && x.max_features === 1500 && Array.isArray(x.topic_ids) && x.topic_ids.length === 144 && new Set(x.topic_ids).size === 144 && x.topic_ids.every(v => typeof v === 'string' && v), 'full144 encoded universe required');
  must(Array.isArray(x.topic_lengths) && x.topic_lengths.length === 144 && x.topic_lengths.every(v => Number.isSafeInteger(v) && v >= 0) && Number.isFinite(x.average_length) && x.average_length > 0, 'encoded lengths required');
  must(['tfidf_scale', 'bm25_scale'].every(k => Number.isFinite(x[k]) && x[k] > 0), 'positive finite scales required');
  must(Array.isArray(x.postings) && x.postings.length > 0 && x.postings.length <= 1500, 'bounded encoded postings required');
  must(Object.isFrozen(x) && Object.isFrozen(x.topic_ids) && Object.isFrozen(x.topic_lengths) && Object.isFrozen(x.postings), 'immutable borrowed input required');
  const terms = new Map(), norms = new Float64Array(144);
  for (let n = 0; n < x.postings.length; n++) {
    const row = x.postings[n];
    must(Array.isArray(row) && row.length === 3 && Object.isFrozen(row) && typeof row[0] === 'string' && row[0] && (n === 0 || x.postings[n-1][0] < row[0]) && Number.isFinite(row[1]) && row[1] > 0 && Array.isArray(row[2]) && row[2].length > 0 && row[2].length <= 144 && Object.isFrozen(row[2]), 'encoded term/order/idf required');
    for (let j = 0; j < row[2].length; j++) {
      const h = row[2][j];
      must(Array.isArray(h) && h.length === 3 && Object.isFrozen(h) && Number.isInteger(h[0]) && h[0] >= 0 && h[0] < 144 && (j === 0 || row[2][j-1][0] < h[0]) && h.slice(1).every(v => Number.isInteger(v) && v >= 0 && v <= 32767), 'encoded hit/order/range required');
      const t = h[1] * x.tfidf_scale, b = h[2] * x.bm25_scale;
      must(Number.isFinite(t) && Number.isFinite(b) && Number.isFinite(norms[h[0]] + t*t), 'decoded numeric overflow');
      norms[h[0]] += t*t;
    }
    terms.set(row[0], n);
  }
  for (let i = 0; i < 144; i++) norms[i] = Math.sqrt(norms[i]);
  const topicNorm = i => {must(Number.isInteger(i) && i >= 0 && i < 144, 'valid Topic offset required'); return norms[i];};
  function* posting(term) {
    must(typeof term === 'string', 'term string required');
    const n = terms.get(term); if (n === undefined) return;
    for (const [i, t, b] of x.postings[n][2]) yield [i, t * x.tfidf_scale, b * x.bm25_scale];
  }
  return Object.freeze({topicCount:144, termCount:terms.size, retainedNormBytes:norms.byteLength, expandedPostingArraysRetained:0,
    topicNorm, posting, idf:term => {must(typeof term === 'string', 'term string required'); const n = terms.get(term); return n === undefined ? undefined : x.postings[n][1];}});
}
