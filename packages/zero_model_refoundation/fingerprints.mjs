/** Candidate-independent duplicate screening. Curator runs this on sealed cohorts. */
import { createHash } from 'node:crypto';

const must = (ok, message) => { if (!ok) throw new Error(message); };
const hash = text => createHash('sha256').update(text, 'utf8').digest('hex');
const bundle = value => {
  must(value && typeof value.current === 'string' && typeof value.title === 'string' &&
    Array.isArray(value.recent) && value.recent.every(x => typeof x === 'string'), 'invalid input bundle');
  return JSON.stringify([value.current, value.title, value.recent]);
};

export function fingerprintBundle(value) {
  const raw = bundle(value);
  return {
    current_sha256: hash(value.current),
    nfc_sha256: hash(raw.normalize('NFC')),
    nfkc_sha256: hash(raw.normalize('NFKC')),
    bundle_sha256: hash(raw)
  };
}

function grams(value, n) {
  const chars = Array.from(value.normalize('NFKC'));
  if (chars.length < n) return new Set([chars.join('')]);
  return new Set(Array.from({length: chars.length - n + 1}, (_, i) => chars.slice(i, i+n).join('')));
}

/** Emits review flags only. Similarity cannot decide semantic equivalence or eligibility. */
export function screenNearDuplicates(rows, {threshold = .85, gram_size = 3} = {}) {
  must(Array.isArray(rows) && threshold > 0 && threshold <= 1 && Number.isInteger(gram_size) &&
    gram_size >= 2 && gram_size <= 5, 'invalid screening plan');
  const prepared = rows.map(row => {
    must(row && typeof row.id === 'string' && row.id && typeof row.split === 'string' && row.split,
      'invalid row identity');
    const raw = bundle(row.input);
    return {id: row.id, split: row.split, scenario: row.scenario,
      fingerprints: fingerprintBundle(row.input), features: grams(raw, gram_size)};
  });
  must(new Set(prepared.map(x => x.id)).size === prepared.length, 'duplicate row id');
  const flags = [];
  for (let i = 0; i < prepared.length; i++) for (let j = i+1; j < prepared.length; j++) {
    const a = prepared[i], b = prepared[j];
    const exact = ['bundle_sha256','nfc_sha256','nfkc_sha256'].find(k => a.fingerprints[k] === b.fingerprints[k]);
    const overlap = [...a.features].filter(x => b.features.has(x)).length;
    const similarity = overlap / (a.features.size + b.features.size - overlap);
    if (exact || similarity >= threshold) flags.push({left:a.id, right:b.id, cross_split:a.split !== b.split,
      same_scenario: a.scenario === b.scenario, exact_form: exact ?? null, similarity});
  }
  return {classification:'REVIEW_FLAGS_ONLY', plan:{threshold, gram_size}, rows:prepared.length, flags};
}
