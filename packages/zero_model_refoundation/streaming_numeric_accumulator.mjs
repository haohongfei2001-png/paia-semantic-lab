/** Synthetic numeric engineering primitive; no fitting or Topic decision. */
const must = (ok, message) => { if (!ok) throw Error(message); };
export function accumulateSyntheticWeights(view, weights, method = 'tfidf') {
  must(view?.topicCount === 144 && typeof view.posting === 'function' && typeof view.idf === 'function' && typeof view.topicNorm === 'function', 'full144 posting view required');
  must(method === 'tfidf' || method === 'bm25', 'numeric method required');
  must(Array.isArray(weights) && weights.length <= 1500, 'bounded manual weights required');
  const seen = new Set();
  for (const row of weights) {
    must(Array.isArray(row) && row.length === 2 && typeof row[0] === 'string' && row[0] && !seen.has(row[0]) && Number.isFinite(row[1]) && row[1] > 0, 'unique finite positive manual weights required');
    seen.add(row[0]);
  }
  const values = new Float64Array(144);
  let squaredQueryNorm = 0, matchedTerms = 0;
  for (const [term, weight] of weights) {
    if (view.idf(term) === undefined) continue;
    matchedTerms++;
    squaredQueryNorm += weight * weight;
    must(Number.isFinite(squaredQueryNorm) && squaredQueryNorm > 0, 'manual norm overflow or underflow');
    for (const [offset, tfidf, bm25] of view.posting(term)) {
      must(Number.isInteger(offset) && offset >= 0 && offset < 144 && Number.isFinite(tfidf) && tfidf >= 0 && Number.isFinite(bm25) && bm25 >= 0, 'finite posting coefficients required');
      values[offset] += method === 'tfidf' ? weight * tfidf : bm25;
      must(Number.isFinite(values[offset]), 'numeric accumulation overflow');
    }
  }
  if (method === 'tfidf') for (let i = 0; i < 144; i++) {
    const norm = view.topicNorm(i);
    must(Number.isFinite(norm) && norm >= 0, 'finite structural norm required');
    const denominator = norm && squaredQueryNorm ? norm * Math.sqrt(squaredQueryNorm) : 0;
    must(Number.isFinite(denominator) && (!norm || !squaredQueryNorm || denominator > 0), 'numeric normalization overflow or underflow');
    values[i] = denominator ? values[i] / denominator : 0;
    must(Number.isFinite(values[i]), 'finite normalized accumulator required');
  }
  // The caller owns this fresh array; no module cache, ranking, threshold or routing state.
  return Object.freeze({values, matchedTerms, squaredQueryNorm, topicCount:144, accumulatorComponentBytes:values.byteLength, expandedPostingArraysRetained:0,
    evidenceClass:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE', capabilityVerdict:'UNTESTED', resourceVerdict:'NOT_QUALIFIED'});
}
