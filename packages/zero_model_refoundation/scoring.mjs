/** Fixed ZMR point arithmetic. Inputs are supplied counts/opaque IDs, never Router inputs. */
import { canonicalJSON, validateUniverse } from './contracts.mjs';

const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const LANGUAGES = ['zh', 'en', 'mixed'];
const ratio = (a, b) => b ? a / b : null;

function labels(value, universe) {
  requireValue(Array.isArray(value) && new Set(value).size === value.length &&
    value.every(id => universe.has(id)), 'invalid label set');
  return value;
}

function prediction(value, universe) {
  requireValue(value && ['ASSIGNED', 'DEFER'].includes(value.state), 'invalid prediction state');
  const topics = labels(value.topics, universe);
  requireValue((value.state === 'DEFER') === (topics.length === 0), 'state/topic mismatch');
  return topics;
}

function expected(value, universe) {
  const topics = labels(value, universe);
  return topics;
}

function same(a, b) {
  return a.length === b.length && a.every(id => b.includes(id));
}

function macro(counts, ids) {
  const missing = ids.filter(id => counts.get(id).gold === 0);
  return {value: ids.reduce((sum, id) => {
    const c = counts.get(id);
    return sum + (c.gold ? c.correct / c.gold : 0);
  }, 0) / 144, missing};
}

/** Point gates deliberately cannot issue a capability verdict. All five layers are mandatory. */
export function scorePointLayers(layers, ids) {
  const universe = validateUniverse(ids);
  requireValue(layers && typeof layers === 'object', 'layers required');
  const single = layers.single, controls = layers.controls, multi = layers.multi;
  const required = layers.context_required, invariant = layers.context_invariance, repeats = layers.repeats;
  requireValue([single, controls, multi, required, invariant, repeats].every(Array.isArray), 'all layers required');
  const byTopic = new Map(ids.map(id => [id, {gold: 0, correct: 0}]));
  const byLanguage = new Map(LANGUAGES.map(lang => [lang, new Map(ids.map(id => [id, {gold: 0, correct: 0}]))]));
  const multiTopic = new Map(ids.map(id => [id, {gold: 0, found: 0}]));
  const idsSeen = new Set();
  let singleOne = 0, singleAny = 0, singleCorrect = 0;
  let controlFalse = 0, multiExact = 0, multiTP = 0, multiLabels = 0, multiGold = 0;
  let requiredExact = 0, requiredWithoutCorrect = 0, requiredSwapCorrect = 0;
  let invariantHarm = 0, invariantBaseCorrect = 0;
  let repeatDifferences = 0;
  let globalTP = 0, globalLabels = 0, unsupportedRows = 0;
  const register = row => {
    requireValue(row && typeof row.id === 'string' && row.id.length > 0 && !idsSeen.has(row.id), 'invalid/duplicate row id');
    idsSeen.add(row.id);
    requireValue(LANGUAGES.includes(row.language), 'invalid language');
    return prediction(row.prediction, universe);
  };
  const addGlobal = (p, gold) => {
    globalLabels += p.length;
    globalTP += p.filter(id => gold.includes(id)).length;
    if (p.some(id => !gold.includes(id))) unsupportedRows++;
  };
  for (const row of single) {
    const p = register(row);
    requireValue(universe.has(row.gold), 'invalid single gold');
    const all = byTopic.get(row.gold), language = byLanguage.get(row.language).get(row.gold);
    all.gold++; language.gold++;
    if (p.length) singleAny++;
    if (p.length === 1) singleOne++;
    if (p.length === 1 && p[0] === row.gold) {
      singleCorrect++; all.correct++; language.correct++;
    }
    addGlobal(p, [row.gold]);
  }
  for (const row of controls) {
    const p = register(row);
    requireValue(row.expected_state === 'DEFER', 'control gold must DEFER');
    if (p.length) controlFalse++;
    addGlobal(p, []);
  }
  for (const row of multi) {
    const p = register(row);
    const gold = expected(row.gold, universe);
    requireValue(gold.length >= 2, 'multi gold must contain at least two labels');
    if (same(p, gold)) multiExact++;
    for (const id of gold) {
      multiTopic.get(id).gold++;
      if (p.includes(id)) multiTopic.get(id).found++;
    }
    multiTP += p.filter(id => gold.includes(id)).length;
    multiLabels += p.length; multiGold += gold.length;
    addGlobal(p, gold);
  }
  for (const row of required) {
    const p = register(row);
    const gold = expected(row.gold, universe);
    requireValue(gold.length > 0, 'context-required gold must assign');
    const withoutGold = expected(row.without_gold, universe);
    const swapGold = expected(row.swapped_gold, universe);
    requireValue(!same(gold, withoutGold), 'context is not required by gold');
    const without = prediction(row.without_prediction, universe);
    const swapped = prediction(row.swapped_prediction, universe);
    if (same(p, gold)) requiredExact++;
    if (same(without, withoutGold)) requiredWithoutCorrect++;
    if (same(swapped, swapGold)) requiredSwapCorrect++;
    addGlobal(p, gold); // Derived variants do not inflate the headline label denominator.
  }
  for (const row of invariant) {
    const p = register(row);
    const gold = expected(row.gold, universe);
    requireValue(gold.length > 0, 'invariance gold must assign');
    const variant = prediction(row.variant_prediction, universe);
    if (canonicalJSON(row.prediction) !== canonicalJSON(row.variant_prediction)) invariantHarm++;
    if (same(p, gold)) invariantBaseCorrect++;
  }
  for (const row of repeats) {
    requireValue(row && typeof row.id === 'string' && row.id && !idsSeen.has(row.id), 'invalid/duplicate repeat id');
    idsSeen.add(row.id);
    prediction(row.first, universe); prediction(row.repeat, universe);
    if (canonicalJSON(row.first) !== canonicalJSON(row.repeat)) repeatDifferences++;
  }
  const overallMacro = macro(byTopic, ids);
  const languageMacro = Object.fromEntries(LANGUAGES.map(lang => [lang, macro(byLanguage.get(lang), ids)]));
  const assignedPrecision = ratio(singleCorrect, singleAny);
  const coverage = ratio(singleOne, single.length);
  const controlRate = ratio(controlFalse, controls.length);
  const multiPrecision = ratio(multiTP, multiLabels);
  const requiredRecall = ratio(requiredExact, required.length);
  const globalPrecision = ratio(globalTP, globalLabels);
  const populationReady = single.length > 0 && controls.length > 0 && multi.length > 0 &&
    required.length > 0 && invariant.length > 0 && repeats.length > 0 && !overallMacro.missing.length &&
    Object.values(languageMacro).every(x => !x.missing.length);
  const pointGates = populationReady && assignedPrecision !== null && assignedPrecision >= .95 &&
    coverage >= .70 && overallMacro.value >= .70 && controlRate <= .02 && invariantHarm === 0 &&
    repeatDifferences === 0 &&
    requiredRecall >= .70 && ratio(requiredWithoutCorrect, required.length) >= .70 &&
    ratio(requiredSwapCorrect, required.length) >= .70 &&
    ratio(multiExact, multi.length) >= .70 && multiPrecision !== null &&
    multiPrecision >= .95 && globalPrecision !== null && globalPrecision >= .95 &&
    Object.values(languageMacro).every(x => x.value >= .70);
  return {
    classification: 'POINT_ONLY_NOT_CAPABILITY', certification_allowed: false,
    data_status: populationReady ? 'COUNT_POPULATION_PRESENT_ONLY' : 'DATA_INSUFFICIENT',
    single: {n: single.length, one: singleOne, any: singleAny, correct: singleCorrect,
      assigned_precision: assignedPrecision, strict_single_precision: ratio(singleCorrect, singleOne),
      single_coverage: coverage, any_coverage: ratio(singleAny, single.length),
      exact_recall: ratio(singleCorrect, single.length), full144_macro_recall: overallMacro.value,
      missing_topics: overallMacro.missing, language_macro: languageMacro},
    controls: {n: controls.length, false_assignments: controlFalse, false_assignment_rate: controlRate},
    multi: {n: multi.length, exact: multiExact, exact_set_recall: ratio(multiExact, multi.length),
      true_labels: multiTP, predicted_labels: multiLabels, gold_labels: multiGold,
      set_precision: multiPrecision, set_recall: ratio(multiTP, multiGold),
      topic_recall: Object.fromEntries(ids.map(id => [id, ratio(multiTopic.get(id).found, multiTopic.get(id).gold)]))},
    context: {required_n: required.length, required_exact: requiredExact,
      required_exact_recall: requiredRecall, without_correct: requiredWithoutCorrect,
      swapped_correct: requiredSwapCorrect, invariant_n: invariant.length,
      invariant_harm: invariantHarm, invariant_base_correct: invariantBaseCorrect},
    repeats: {n: repeats.length, differences: repeatDifferences},
    global_labels: {correct: globalTP, predicted: globalLabels, precision: globalPrecision,
      unsupported: globalLabels - globalTP, unsupported_rate: ratio(globalLabels - globalTP, globalLabels),
      rows_with_unsupported: unsupportedRows,
      unsupported_row_rate: ratio(unsupportedRows, single.length + controls.length + multi.length + required.length)},
    point_gates: pointGates
  };
}
