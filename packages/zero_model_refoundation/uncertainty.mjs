/** Pre-registered conservative cohort bound, with cluster bootstrap as diagnostic. */
const must = (ok, message) => { if (!ok) throw new Error(message); };

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * Target is the equal-cohort mean, not a row-weighted user-population estimate.
 * Cohort independence must be externally attested; this function never infers it.
 */
export function groupedRateBound(blocks, {seed = 105207, replicates = 2000,
  alpha = .05, simultaneous_tests = 1, independence_attested = false} = {}) {
  must(Array.isArray(blocks) && blocks.length > 0, 'cohort blocks required');
  must(Number.isInteger(seed) && seed > 0 && Number.isInteger(replicates) && replicates >= 2000,
    'fixed seed and at least 2000 replicates required');
  must(Number.isFinite(alpha) && alpha > 0 && alpha < 1 &&
    Number.isInteger(simultaneous_tests) && simultaneous_tests >= 1, 'invalid alpha plan');
  const ids = new Set();
  for (const block of blocks) {
    must(block && typeof block.cohort_id === 'string' && block.cohort_id && !ids.has(block.cohort_id),
      'duplicate/invalid independent cohort');
    ids.add(block.cohort_id);
    must(Number.isSafeInteger(block.successes) && Number.isSafeInteger(block.trials) &&
      block.trials > 0 && block.successes >= 0 && block.successes <= block.trials, 'invalid cohort counts');
  }
  const rates = blocks.map(b => b.successes / b.trials);
  const n = rates.length;
  const estimate = rates.reduce((a, b) => a + b, 0) / n;
  const sample = rng(seed), bootstrap = [];
  for (let i = 0; i < replicates; i++) {
    let total = 0;
    for (let j = 0; j < n; j++) total += rates[Math.floor(sample() * n)];
    bootstrap.push(total / n);
  }
  bootstrap.sort((a, b) => a - b);
  const adjustedAlpha = alpha / simultaneous_tests;
  const radius = Math.sqrt(Math.log(2 / adjustedAlpha) / (2 * n));
  const leaveOneOut = n > 1 ? rates.map((_, i) =>
    (rates.reduce((a, b) => a + b, 0) - rates[i]) / (n - 1)) : [];
  return {
    classification: 'CONSERVATIVE_COHORT_BOUND_NOT_AUTOMATIC_CERTIFICATION',
    uncertainty_status: independence_attested && n >= 3 ? 'BOUNDED_ASSUMING_INDEPENDENT_COHORTS' : 'INCONCLUSIVE',
    assumption: 'independent bounded cohort means; external attestation required',
    effective_cohorts: n, trials: blocks.reduce((a, b) => a + b.trials, 0),
    point_equal_cohort_mean: estimate, alpha_adjusted: adjustedAlpha,
    conservative_lower: Math.max(0, estimate - radius),
    conservative_upper: Math.min(1, estimate + radius),
    bootstrap_diagnostic: {
      lower: bootstrap[Math.floor(replicates * adjustedAlpha / 2)],
      upper: bootstrap[Math.min(replicates - 1, Math.ceil(replicates * (1 - adjustedAlpha / 2)) - 1)]
    },
    leave_one_cohort_out: leaveOneOut
  };
}

/** Equal Topic macro estimate with Topic strata preserved inside each independent cohort. */
export function full144MacroBound(rows, ids, options = {}) {
  must(Array.isArray(ids) && ids.length === 144 && new Set(ids).size === 144, 'full144 required');
  must(Array.isArray(rows), 'topic cohort counts required');
  const cohorts = new Map();
  for (const row of rows) {
    must(ids.includes(row.topic_id) && typeof row.cohort_id === 'string' && row.cohort_id,
      'invalid topic/cohort');
    if (!cohorts.has(row.cohort_id)) cohorts.set(row.cohort_id, new Map());
    const topics = cohorts.get(row.cohort_id);
    must(!topics.has(row.topic_id), 'duplicate topic/cohort');
    topics.set(row.topic_id, row);
  }
  must(cohorts.size > 0, 'cohorts required');
  const blocks = [];
  for (const [cohort_id, topics] of cohorts) {
    must(topics.size === 144, 'missing Topic stratum');
    let macro = 0;
    for (const id of ids) {
      const row = topics.get(id);
      must(Number.isSafeInteger(row.successes) && Number.isSafeInteger(row.trials) &&
        row.trials > 0 && row.successes >= 0 && row.successes <= row.trials, 'invalid stratum counts');
      macro += row.successes / row.trials / 144;
    }
    // Represent the per-cohort macro as a bounded proportion without row-level pseudo-independence.
    blocks.push({cohort_id, successes: macro, trials: 1});
  }
  return groupedRateBoundReal(blocks, options);
}

function groupedRateBoundReal(blocks, options) {
  const scale = 1_000_000_000;
  return groupedRateBound(blocks.map(b => ({cohort_id:b.cohort_id,
    successes:Math.round(b.successes * scale), trials:scale})), options);
}
