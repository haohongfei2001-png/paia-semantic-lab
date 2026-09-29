/** ZMR-01A engineering primitives. No Router, semantic data or certification. */
import { createHash } from 'node:crypto';

const must = (condition, message) => { if (!condition) throw new Error(message); };
const token = value => typeof value === 'string' && value.length > 0 && value.trim() === value;
export const LIMITS = Object.freeze({
  index_bytes: 1048576, router_plus_index_bytes: 2097152,
  incremental_memory_bytes: 33554432, warm_p95_ms: 20, cold_init_ms: 100,
  neural_assets_bytes: 0, semantic_network_calls: 0
});

export function validateUniverse(ids) {
  must(Array.isArray(ids) && ids.length === 144, 'full144 universe required');
  must(ids.every(token) && new Set(ids).size === 144, 'invalid or duplicate Topic ID');
  return new Set(ids);
}

export function assertBudget(observation) {
  must(observation && typeof observation === 'object', 'resource observations required');
  for (const [key, max] of Object.entries(LIMITS)) {
    const value = observation[key];
    must(Number.isFinite(value) && value >= 0, 'missing/invalid resource: ' + key);
    must(value <= max, 'resource limit exceeded: ' + key);
  }
  must(observation.router_plus_index_bytes >= observation.index_bytes, 'inconsistent dependency closure');
  return { classification: 'BUDGET_NUMERIC_CHECK_ONLY_NOT_MEASUREMENT', within_limits: true };
}

export function assertAllowedFile(entry, allowedPaths) {
  must(entry && token(entry.path) && allowedPaths instanceof Set, 'invalid file manifest');
  const p = entry.path;
  must(!/[\\%:\x00-\x1f]/u.test(p) && !p.startsWith('/') &&
    !p.split('/').some(s => s === '.' || s === '..' || s === ''), 'unsafe path');
  must(allowedPaths.has(p), 'path not allowlisted');
  must(entry.mode === '100644' && entry.type === 'blob', 'regular file required');
  return p;
}

/** Validates supplied provenance, not whether claimed independent people really exist. */
export function validateLineage(rows) {
  must(Array.isArray(rows), 'metadata rows required');
  const splits = new Set(['TRAIN', 'DEV_TUNE', 'DEV_CAL', 'CHALLENGE_DEV', 'AS']);
  const kinds = ['writer', 'source', 'scenario', 'template', 'paraphrase', 'translation', 'contrast'];
  const seen = new Map(), ids = new Set();
  for (const row of rows) {
    must(row && token(row.id) && !ids.has(row.id), 'invalid/duplicate row ID');
    ids.add(row.id);
    must(splits.has(row.split) && token(row.generation_id), 'invalid split/generation');
    for (const kind of kinds) {
      const values = row.lineage?.[kind];
      must(Array.isArray(values) && values.length > 0 && values.every(token), 'missing lineage: ' + kind);
      for (const value of values) {
        const key = JSON.stringify([kind, value]);
        const previous = seen.get(key);
        must(!previous || previous === row.split, 'cross-split lineage: ' + kind);
        seen.set(key, row.split);
      }
    }
  }
  return { rows: rows.length, classification: 'METADATA_ONLY_NOT_DATA_QUALIFICATION',
    readiness: rows.length ? 'REQUIRES_QUOTAS_AND_INDEPENDENT_REVIEW' : 'DATA_INSUFFICIENT' };
}

export function canonicalJSON(value) {
  const active = new Set();
  function normalize(v) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') { must(Number.isFinite(v), 'non-finite JSON'); return v; }
    must(v && typeof v === 'object', 'unsupported JSON value');
    must(!active.has(v), 'cyclic JSON'); active.add(v);
    let result;
    if (Array.isArray(v)) {
      must(Object.keys(v).length === v.length, 'sparse or extended array');
      result = v.map(normalize);
    } else {
      must(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, 'plain JSON object required');
      result = Object.fromEntries(Object.keys(v).sort().map(k => [k, normalize(v[k])]));
    }
    active.delete(v); return result;
  }
  return JSON.stringify(normalize(value));
}

export function evaluationKey(identity) {
  const fields = ['package_id', 'generation_id', 'protocol_version', 'resource_profile', 'environment',
    'candidate_closure_sha256', 'catalog_sha256', 'compiler_sha256', 'train_sha256',
    'calibration_sha256', 'cohort_sha256', 'scorer_sha256'];
  must(identity && typeof identity === 'object', 'identity required');
  for (const field of fields) {
    must(token(identity[field]), 'missing identity: ' + field);
    if (field.endsWith('_sha256')) must(/^[a-f0-9]{64}$/u.test(identity[field]), 'invalid digest: ' + field);
  }
  must(Object.keys(identity).length === fields.length, 'unexpected identity field');
  return createHash('sha256').update(canonicalJSON(identity)).digest('hex');
}

/** Point metrics for single-label engineering only. Always refuses certification. */
export function singlePointMetrics(rows, ids) {
  const universe = validateUniverse(ids);
  must(Array.isArray(rows), 'rows required');
  const counts = new Map(ids.map(id => [id, {gold: 0, correct: 0}]));
  let assigned = 0, anyAssigned = 0, correct = 0, labels = 0, unsupported = 0;
  for (const row of rows) {
    must(row && universe.has(row.gold), 'unknown single gold Topic');
    const p = row.prediction;
    must(p && Array.isArray(p.topics) && ['ASSIGNED', 'DEFER'].includes(p.state), 'invalid prediction');
    must(new Set(p.topics).size === p.topics.length && p.topics.every(t => universe.has(t)), 'invalid/duplicate prediction Topic');
    must((p.state === 'DEFER') === (p.topics.length === 0), 'state/topic mismatch');
    counts.get(row.gold).gold++;
    labels += p.topics.length;
    unsupported += p.topics.filter(t => t !== row.gold).length;
    if (p.topics.length) anyAssigned++;
    if (p.topics.length === 1) {
      assigned++;
      if (p.topics[0] === row.gold) { correct++; counts.get(row.gold).correct++; }
    }
  }
  const missing = ids.filter(id => counts.get(id).gold === 0);
  const precision = assigned ? correct / assigned : null;
  const coverage = rows.length ? assigned / rows.length : 0;
  const macro = [...counts.values()].reduce((s, c) => s + (c.gold ? c.correct / c.gold : 0), 0) / 144;
  return {
    classification: 'POINT_METRICS_ONLY_NOT_CAPABILITY', certification_allowed: false,
    data_status: rows.length && !missing.length ? 'SINGLE_UNIVERSE_PRESENT_ONLY' : 'DATA_INSUFFICIENT',
    total: rows.length, assigned, correct, deferred: rows.length - anyAssigned,
    missing_topics: missing, assigned_precision: precision, single_coverage: coverage,
    any_assignment_coverage: rows.length ? anyAssigned / rows.length : 0,
    full144_macro_recall: macro, unsupported_labels: unsupported,
    unsupported_label_rate: labels ? unsupported / labels : null,
    single_point_gates: !missing.length && rows.length > 0 && precision !== null &&
      precision >= 0.95 && coverage >= 0.70 && macro >= 0.70
  };
}
