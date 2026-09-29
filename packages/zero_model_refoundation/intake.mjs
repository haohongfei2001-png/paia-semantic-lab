/** ZMR metadata-only intake audit. It cannot authenticate people or inspect sealed content. */
import { validateLineage, validateUniverse } from './contracts.mjs';

const SPLITS = ['TRAIN', 'DEV_TUNE', 'DEV_CAL', 'CHALLENGE_DEV', 'AS'];
const LANGUAGES = ['zh', 'en', 'mixed'];
const LAYERS = ['SINGLE', 'CONTROL', 'CONTEXT_REQUIRED', 'CONTEXT_INVARIANCE', 'MULTI'];
const DIGEST = /^[a-f0-9]{64}$/u;
const isToken = v => typeof v === 'string' && v.length > 0 && v.trim() === v;
const add = (issues, code, detail) => issues.push({code, detail});
const unique = values => new Set(values).size === values.length;
const minimum = {TRAIN: [12, 8, 4], DEV_TUNE: [3, 2, 1], DEV_CAL: [3, 2, 1],
  CHALLENGE_DEV: [6, 4, 2], AS: [4, 2, 2]};
const safetyMinimum = {TRAIN: 144, CHALLENGE_DEV: 144, AS: 144};

/** A TUNE/CAL split must add to the ordinary DEV 6/4/2 quota for every Topic. */
export function auditIntake(rows, ids, {catalog_sha256, approved_licenses = [],
  candidate_first_evaluated_at = null} = {}) {
  const universe = validateUniverse(ids);
  if (!Array.isArray(rows)) throw new Error('metadata rows required');
  if (!DIGEST.test(catalog_sha256 ?? '')) throw new Error('catalog digest required');
  if (candidate_first_evaluated_at && !Number.isFinite(Date.parse(candidate_first_evaluated_at)))
    throw new Error('invalid candidate evaluation time');
  const issues = [];
  try { validateLineage(rows); } catch (error) { add(issues, 'LINEAGE_CONFLICT', error.message); }
  const counts = Object.fromEntries(SPLITS.map(split => [split, {
    single: new Map(ids.map(id => [id, {zh: 0, en: 0, mixed: 0, mechanisms: new Set()}])),
    safety: Object.fromEntries(LAYERS.slice(1).map(layer => [layer, 0])),
    writers: new Set(), sources: new Set(), single_total: 0, name_echoes: 0,
    scenarios: new Set(),
    reviewer_agreements: 0, reviewed: 0
  }]));
  const fingerprints = new Map();
  const seenIds = new Set();
  const asGenerations = new Map();
  for (const row of rows) {
    if (!row || !isToken(row.id) || seenIds.has(row.id) || !SPLITS.includes(row.split)) {
      add(issues, 'SCHEMA', 'invalid/duplicate row id or split'); continue;
    }
    seenIds.add(row.id);
    const bucket = counts[row.split];
    if (row.catalog_sha256 !== catalog_sha256 || !isToken(row.generation_id) ||
      !LAYERS.includes(row.layer) || !LANGUAGES.includes(row.language) ||
      !Number.isFinite(Date.parse(row.gold_frozen_at))) {
      add(issues, 'SCHEMA', row.id); continue;
    }
    if (candidate_first_evaluated_at && Date.parse(row.gold_frozen_at) >= Date.parse(candidate_first_evaluated_at))
      add(issues, 'GOLD_AFTER_PREDICTION', row.id);
    const writer = row.lineage?.writer?.[0], source = row.lineage?.source?.[0];
    if (!isToken(writer) || !isToken(source)) add(issues, 'PROVENANCE_MISSING', row.id);
    else { bucket.writers.add(writer); bucket.sources.add(source); }
    const origin = row.source_review;
    if (!origin || origin.source_id !== source || !approved_licenses.includes(origin.license) ||
      origin.decision !== 'ACCEPT' || !isToken(origin.reviewer_id) || origin.reviewer_id === writer ||
      !isToken(origin.evidence_ref) || !Number.isFinite(Date.parse(origin.reviewed_at)) ||
      Date.parse(origin.reviewed_at) > Date.parse(row.gold_frozen_at))
      add(issues, 'SOURCE_REVIEW_MISSING', row.id);
    if (row.split === 'AS') for (const kind of ['writer','source','scenario','template','paraphrase','translation','contrast']) {
      for (const value of row.lineage?.[kind] ?? []) {
        const key=kind+':'+value, prior=asGenerations.get(key);
        if (prior && prior !== row.generation_id) add(issues, 'AS_GENERATION_REUSE', key);
        asGenerations.set(key,row.generation_id);
      }
    }
    if (!Array.isArray(row.mechanisms) || !row.mechanisms.length || !row.mechanisms.every(isToken) ||
      !unique(row.mechanisms)) add(issues, 'MECHANISM_MISSING', row.id);
    const gold = row.gold;
    if (!gold || !['ASSIGNED', 'DEFER'].includes(gold.state) || !Array.isArray(gold.topics) ||
      !unique(gold.topics) || !gold.topics.every(x => universe.has(x)) ||
      (gold.state === 'DEFER') !== (gold.topics.length === 0) ||
      (row.layer === 'SINGLE' && gold.topics.length !== 1) ||
      (row.layer === 'MULTI' && gold.topics.length < 2) ||
      (row.layer === 'CONTROL' && gold.topics.length !== 0) ||
      (['CONTEXT_REQUIRED','CONTEXT_INVARIANCE'].includes(row.layer) && gold.topics.length === 0)) {
      add(issues, 'GOLD_SCHEMA', row.id); continue;
    }
    const reviews = row.reviews;
    if (!Array.isArray(reviews) || reviews.length !== 2 ||
      !reviews.every(r => isToken(r.reviewer_id) && r.reviewer_id !== writer &&
        Array.isArray(r.topics) && unique(r.topics) && r.topics.every(x => universe.has(x)) &&
        Number.isFinite(Date.parse(r.reviewed_at)) && Date.parse(r.reviewed_at) <= Date.parse(row.gold_frozen_at)) ||
      reviews[0].reviewer_id === reviews[1].reviewer_id) {
      add(issues, 'INDEPENDENT_REVIEW_MISSING', row.id);
    } else {
      bucket.reviewed++;
      const agree = reviews[0].state === reviews[1].state &&
        reviews[0].topics.length === reviews[1].topics.length &&
        reviews[0].topics.every(id => reviews[1].topics.includes(id));
      if (agree) {
        bucket.reviewer_agreements++;
        if (reviews[0].state !== gold.state || reviews[0].topics.length !== gold.topics.length ||
          !reviews[0].topics.every(id => gold.topics.includes(id)))
          add(issues, 'GOLD_DIFFERS_FROM_REVIEW', row.id);
      }
      else if (!row.adjudication || !isToken(row.adjudication.reviewer_id) ||
        [writer, reviews[0].reviewer_id, reviews[1].reviewer_id].includes(row.adjudication.reviewer_id) ||
        !isToken(row.adjudication.reason) ||
        Date.parse(row.adjudication.at) > Date.parse(row.gold_frozen_at))
        add(issues, 'ADJUDICATION_MISSING', row.id);
    }
    if (row.layer === 'SINGLE') {
      const counter = bucket.single.get(gold.topics[0]);
      counter[row.language]++; bucket.single_total++;
      if (row.name_echo === true) bucket.name_echoes++;
      const scenario = row.lineage?.scenario?.[0];
      const scenarioKey = gold.topics[0] + ':' + scenario;
      if (!isToken(scenario) || bucket.scenarios.has(scenarioKey)) add(issues, 'BASE_SCENARIO_DUPLICATE', row.id);
      else bucket.scenarios.add(scenarioKey);
      if (Array.isArray(row.mechanisms)) for (const mechanism of row.mechanisms) counter.mechanisms.add(mechanism);
    } else bucket.safety[row.layer]++;
    if (!row.fingerprints || !['current_sha256', 'nfc_sha256', 'nfkc_sha256', 'bundle_sha256'].every(
      key => DIGEST.test(row.fingerprints[key] ?? ''))) add(issues, 'FINGERPRINT_MISSING', row.id);
    else for (const key of ['nfc_sha256', 'nfkc_sha256', 'bundle_sha256']) {
      const value = key + ':' + row.fingerprints[key];
      const prior = fingerprints.get(value);
      if (prior && prior.split !== row.split) add(issues, 'CROSS_SPLIT_DUPLICATE', key + ':' + prior.id + ':' + row.id);
      if (prior && prior.split === row.split && prior.scenario !== row.lineage?.scenario?.[0])
        add(issues, 'UNEXPLAINED_DUPLICATE', key + ':' + prior.id + ':' + row.id);
      fingerprints.set(value, {id: row.id, split: row.split, scenario: row.lineage?.scenario?.[0]});
    }
    if (!row.near_duplicate_screen || row.near_duplicate_screen.status !== 'REVIEWED' ||
      !isToken(row.near_duplicate_screen.reviewer_id) ||
      row.near_duplicate_screen.reviewer_id === writer ||
      !isToken(row.near_duplicate_screen.method_version) ||
      !Number.isFinite(Date.parse(row.near_duplicate_screen.reviewed_at)) ||
      Date.parse(row.near_duplicate_screen.reviewed_at) > Date.parse(row.gold_frozen_at))
      add(issues, 'NEAR_DUPLICATE_REVIEW_MISSING', row.id);
  }
  const neededCohorts = {TRAIN: 3, DEV_TUNE: 1, DEV_CAL: 1, CHALLENGE_DEV: 2, AS: 3};
  for (const split of SPLITS) {
    const b = counts[split];
    if (b.writers.size < neededCohorts[split] || b.sources.size < neededCohorts[split])
      add(issues, 'COHORT_QUOTA', split);
    if (!b.reviewed || b.reviewer_agreements / b.reviewed < .90) add(issues, 'REVIEW_AGREEMENT', split);
    const langMin = minimum[split];
    for (const id of ids) {
      const c = b.single.get(id);
      if (LANGUAGES.some((lang, i) => c[lang] < langMin[i])) add(issues, 'TOPIC_LANGUAGE_QUOTA', split + ':' + id);
      if (split === 'TRAIN' && c.mechanisms.size < 8) add(issues, 'MECHANISM_QUOTA', split + ':' + id);
    }
    if (split !== 'TRAIN' && b.single_total && b.name_echoes / b.single_total > .10)
      add(issues, 'NAME_ECHO_QUOTA', split);
    for (const [layer, n] of Object.entries(b.safety)) {
      const target = safetyMinimum[split] ?? 72;
      const min = layer === 'CONTROL' && split !== 'TRAIN' ?
        (split === 'DEV_TUNE' || split === 'DEV_CAL' ? 150 : 300) : target;
      if (n < min) add(issues, 'SAFETY_QUOTA', split + ':' + layer);
    }
  }
  if (new Set([...counts.DEV_TUNE.writers, ...counts.DEV_CAL.writers]).size < 2 ||
    new Set([...counts.DEV_TUNE.sources, ...counts.DEV_CAL.sources]).size < 2)
    add(issues, 'ORDINARY_DEV_COHORT_QUOTA', 'DEV_TUNE+DEV_CAL');
  for (const id of ids) {
    for (const lang of LANGUAGES) {
      const ordinary = counts.DEV_TUNE.single.get(id)[lang] + counts.DEV_CAL.single.get(id)[lang];
      const target = {zh: 6, en: 4, mixed: 2}[lang];
      if (ordinary < target) add(issues, 'ORDINARY_DEV_QUOTA', id + ':' + lang);
    }
    const heldOut = new Set([...counts.DEV_TUNE.single.get(id).mechanisms,
      ...counts.DEV_CAL.single.get(id).mechanisms,
      ...counts.CHALLENGE_DEV.single.get(id).mechanisms].filter(
        mechanism => !counts.TRAIN.single.get(id).mechanisms.has(mechanism)));
    if (heldOut.size < 2) add(issues, 'HELD_OUT_MECHANISM_QUOTA', id);
  }
  return {
    classification: 'METADATA_AUDIT_ONLY_NOT_DATA_QUALIFICATION',
    metadata_gate: issues.length === 0, data_qualification: 'NOT_QUALIFIED',
    independent_curator_signoff_required: true,
    counts: Object.fromEntries(SPLITS.map(split => [split, {
      single: counts[split].single_total, safety: counts[split].safety,
      writers: counts[split].writers.size, sources: counts[split].sources.size,
      reviewer_agreement: counts[split].reviewed ? counts[split].reviewer_agreements / counts[split].reviewed : null
    }])), issues
  };
}
