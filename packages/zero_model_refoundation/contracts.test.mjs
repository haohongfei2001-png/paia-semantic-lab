import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, validateUniverse, assertBudget, assertAllowedFile, validateLineage,
  canonicalJSON, evaluationKey, singlePointMetrics } from './contracts.mjs';

// Opaque fabricated IDs/counts only: not TRAIN, DEV, AS or TEST language content.
const ids = Array.from({length:144}, (_, i) => 'T' + String(i).padStart(3, '0'));
const assigned = id => ({state:'ASSIGNED', topics:[id]});
const defer = () => ({state:'DEFER', topics:[]});
const rows = prediction => ids.map(id => ({gold:id, prediction:prediction(id)}));
const meta = (id, split) => ({id, split, generation_id:'G1', lineage:Object.fromEntries(
  ['writer','source','scenario','template','paraphrase','translation','contrast'].map(k => [k,[id + ':' + k]]))});
const identity = () => ({package_id:'ZMR', generation_id:'G1', protocol_version:'1', resource_profile:'r', environment:'e',
  ...Object.fromEntries(['candidate_closure','catalog','compiler','train','calibration','cohort','scorer'].map(k => [k + '_sha256','a'.repeat(64)]))});

test('universe requires all144 unique nonempty IDs', () => {
  assert.equal(validateUniverse(ids).size,144);
  assert.throws(() => validateUniverse(ids.slice(1)));
  assert.throws(() => validateUniverse([...ids.slice(1),ids[1]]));
  assert.throws(() => validateUniverse([...ids.slice(1),' ']));
});
test('budget inclusive upper boundaries, never resource certification', () => {
  assert.equal(assertBudget({...LIMITS}).within_limits,true);
  assert.match(assertBudget({...LIMITS}).classification,/NOT_MEASUREMENT/);
});
test('every resource overrun, missing value, negative and nonfinite fails', () => {
  for (const key of Object.keys(LIMITS)) {
    for (const v of [LIMITS[key]+1,-1,NaN,Infinity,undefined]) assert.throws(() => assertBudget({...LIMITS,[key]:v}));
  }
  assert.throws(() => assertBudget({...LIMITS,router_plus_index_bytes:1}));
});
test('explicit allowlist rejects traversal, URLs, symlink and non-allowlisted paths', () => {
  const p = 'packages/zero_model_refoundation/contracts.mjs';
  const allowed = new Set([p]);
  assert.equal(assertAllowedFile({path:p,mode:'100644',type:'blob'},allowed),p);
  for (const path of ['../x','/tmp/x','a//b','a/./b','a\\b','a%2fb','https://x','fixtures/cig_v1/x']) {
    const paths = path.startsWith('fixtures') ? allowed : new Set([path]);
    assert.throws(() => assertAllowedFile({path,mode:'100644',type:'blob'},paths));
  }
  assert.throws(() => assertAllowedFile({path:p,mode:'120000',type:'blob'},allowed));
});
test('empty metadata cannot mean data ready', () => {
  assert.equal(validateLineage([]).readiness,'DATA_INSUFFICIENT');
  assert.match(validateLineage([meta('a','TRAIN')]).readiness,/REQUIRES/);
});
test('every lineage family is isolated across development splits', () => {
  const a = meta('a','TRAIN'), b = meta('b','DEV_TUNE');
  validateLineage([a,b]);
  for (const key of Object.keys(a.lineage)) {
    const copy = structuredClone(b); copy.lineage[key] = a.lineage[key];
    assert.throws(() => validateLineage([a,copy]),/cross-split/);
  }
});
test('calibration separation, duplicate metadata and final TEST admission rejected', () => {
  const a=meta('a','DEV_TUNE'), b=meta('b','DEV_CAL'); b.lineage.writer=a.lineage.writer;
  assert.throws(() => validateLineage([a,b]));
  assert.throws(() => validateLineage([a,a]));
  assert.throws(() => validateLineage([meta('x','FINAL_TEST')]));
  const c=meta('c','TRAIN'); delete c.lineage.source; assert.throws(() => validateLineage([c]));
});
test('canonical serialization is deterministic and rejects invalid JSON', () => {
  assert.equal(canonicalJSON({b:2,a:{d:4,c:3}}),canonicalJSON({a:{c:3,d:4},b:2}));
  for (const v of [NaN,Infinity,undefined,new Date(),[undefined],Array(2)]) assert.throws(() => canonicalJSON(v));
  const cycle={}; cycle.x=cycle; assert.throws(() => canonicalJSON(cycle));
});
test('evaluation key includes closed dependencies and ignores object insertion order', () => {
  const x=identity(); assert.equal(evaluationKey(x),evaluationKey(Object.fromEntries(Object.entries(x).reverse())));
  for (const key of Object.keys(x)) {
    const y={...x}; delete y[key]; assert.throws(() => evaluationKey(y));
    y[key]=key.endsWith('_sha256')?'b'.repeat(64):'different'; assert.notEqual(evaluationKey(x),evaluationKey(y));
  }
  assert.throws(() => evaluationKey({...x,extra:'ignored would be unsafe'}));
});
test('perfect single counts are only point evidence, never full certification', () => {
  const r=singlePointMetrics(rows(assigned),ids);
  assert.equal(r.full144_macro_recall,1); assert.equal(r.single_point_gates,true);
  assert.equal(r.certification_allowed,false);
});
test('allDEFER fails rather than perfect empty precision', () => {
  const r=singlePointMetrics(rows(defer),ids);
  assert.equal(r.assigned_precision,null); assert.equal(r.single_coverage,0);
  assert.equal(r.full144_macro_recall,0); assert.equal(r.single_point_gates,false);
});
test('missing Topics keep denominator144 and block qualification', () => {
  const r=singlePointMetrics([{gold:ids[0],prediction:assigned(ids[0])}],ids);
  assert.equal(r.full144_macro_recall,1/144); assert.equal(r.missing_topics.length,143);
  assert.equal(r.single_point_gates,false); assert.equal(r.data_status,'DATA_INSUFFICIENT');
});
test('empty population is not success', () => {
  const r=singlePointMetrics([],ids); assert.equal(r.single_point_gates,false);
  assert.equal(r.data_status,'DATA_INSUFFICIENT'); assert.equal(r.full144_macro_recall,0);
});
test('guessing every Topic cannot boost usable coverage or correct counts', () => {
  const r=singlePointMetrics(rows(() => ({state:'ASSIGNED',topics:ids})),ids);
  assert.equal(r.any_assignment_coverage,1); assert.equal(r.single_coverage,0);
  assert.equal(r.correct,0); assert.equal(r.unsupported_labels,144*143); assert.equal(r.single_point_gates,false);
});
test('wrong single predictions count toward coverage but fail precision', () => {
  const r=singlePointMetrics(rows(id => assigned(ids[(ids.indexOf(id)+1)%144])),ids);
  assert.equal(r.single_coverage,1); assert.equal(r.assigned_precision,0); assert.equal(r.full144_macro_recall,0);
});
test('prediction schema, unknown and duplicate labels fail closed', () => {
  for (const prediction of [{state:'DEFER',topics:[ids[0]]},{state:'ASSIGNED',topics:[]},
    {state:'ASSIGNED',topics:['unknown']},{state:'ASSIGNED',topics:[ids[0],ids[0]]}]) {
    assert.throws(() => singlePointMetrics([{gold:ids[0],prediction}],ids));
  }
  assert.throws(() => singlePointMetrics([{gold:'unknown',prediction:defer()}],ids));
});

test('mixed correct singles and mass over-assignment cannot hide in precision denominator', () => {
  const mixed = ids.flatMap(id => [0,1,2,3].map(i => ({gold:id, prediction:{state:'ASSIGNED',topics:i<3?[id]:ids}})));
  const r=singlePointMetrics(mixed,ids);
  assert.equal(r.strict_single_precision,1); assert.equal(r.assigned_precision,0.75);
  assert.equal(r.single_coverage,0.75); assert.equal(r.full144_macro_recall,0.75);
  assert.equal(r.any_assigned,576); assert.equal(r.single_point_gates,false);
  assert.equal(r.certification_allowed,false);
});
