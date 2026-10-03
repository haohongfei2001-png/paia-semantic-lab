import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ADMISSION_INPUT_PINS} from './train_review_admission.mjs';
import {prepareDevelopmentCompilePlan, dispatchDevelopmentCompilePlan} from './development_compile_plan.mjs';
const root = new URL('../../', import.meta.url);
async function supplied() {
  const manifest = JSON.parse(await readFile(new URL('data/zero_model_refoundation/development/mechanism_matrix_train_review_admission_v0.1.json', root), 'utf8'));
  return {manifest, inputUtf8: Object.fromEntries(await Promise.all(ADMISSION_INPUT_PINS.map(async p => [p.path, await readFile(new URL(p.path, root), 'utf8')]))),
    request: {schema: 'ZMR-FINITE41-PLAN-REQUEST-1', row_ids: manifest.records.map(r => r.id), topic_ids: manifest.full_catalog_topic_ids}};
}

test('registered full144 finite41 plan stays nonexecutable at real dispatch and never reaches fitting', async () => {
  const base = await supplied(), plan = prepareDevelopmentCompilePlan(base); let calls = 0;
  const receipt = JSON.parse(await readFile(new URL('docs/zero-model-refoundation-v1/ZMR-03_TRAIN_COMPILE_PLAN_RESULT.json', root), 'utf8'));
  for (const pin of [...receipt.input_pins, ...receipt.code_pins]) assert.equal(createHash('sha256').update(await readFile(new URL(pin.path, root))).digest('hex'), pin.sha256, pin.path);
  const packetBytes = await readFile(new URL(receipt.manifest_path, root));
  assert.equal(createHash('sha256').update(packetBytes).digest('hex'), receipt.manifest_sha256);
  const packet = JSON.parse(packetBytes); assert.deepEqual(packet.request, base.request); assert.deepEqual(packet.plan, plan);
  assert.equal(packet.schema, 'ZMR-FINITE41-COMPILE-PLAN-PACKET-0.1');
  assert.equal(packet.source_main, receipt.source_main); assert.equal(packet.source_tree, receipt.source_tree);
  assert.equal(receipt.dependency_actual_main_ci, 'SUCCESS_ATTEMPT1_SEMANTIC37143155367_ZMR37143155357');
  assert.equal(receipt.accepted, 0); assert.equal(receipt.semantic_judgment_certified, false);
  const outcome = dispatchDevelopmentCompilePlan({...base, plan, executeCompiler: () => {calls++; throw Error('fitting must not execute');}});
  assert.equal(calls, 0); assert.equal(plan.executable, false); assert.equal(plan.topic_ids.length, 144); assert.equal(plan.rows.length, 41);
  assert(plan.rows.every(r => r.source_packet_sha256 && r.original_context_sha256 && r.original_spans_sha256 && Array.isArray(r.original_role_spans) && r.lineage && r.development_compilation_blockers.length));
  assert.equal(outcome.status, 'HOLD_NO_EXECUTABLE_PLAN'); assert.equal(outcome.fitted_features, 0);
  assert.equal(plan.remaining_allowance, null); assert.equal(plan.capability_verdict, 'UNTESTED'); assert.equal(plan.independent_quota_credit, 0);
});

test('caller plan execution flag, source/review/lineage tampering and Topic masks cannot reach compiler', async () => {
  const base = await supplied(), original = prepareDevelopmentCompilePlan(base); let calls = 0;
  for (const mutate of [p => p.executable = true, p => p.rows[0].development_compilation_blockers = [], p => p.closure_sha256 = '0'.repeat(64), p => p.rows[0].lineage.writer = 'independent', p => p.rows[0].review_references.labels.journal_sha256 = '0'.repeat(64), p => p.topic_ids.pop()]) {
    const plan = structuredClone(original); mutate(plan);
    assert.throws(() => dispatchDevelopmentCompilePlan({...base, plan, executeCompiler: () => {calls++;}}), /must derive/); assert.equal(calls, 0);
  }
});

test('unknown rows, additional configuration fields or unregistered source fail before any execution', async () => {
  const base = await supplied(); let calls = 0;
  for (const request of [{...base.request, row_ids: [...base.request.row_ids, 'unknown']}, {...base.request, topic_ids: base.request.topic_ids.slice(0, 143)}, {...base.request, stable_candidate_id: 'invented'}]) assert.throws(() => prepareDevelopmentCompilePlan({...base, request}), /exact finite41/);
  const plan = prepareDevelopmentCompilePlan(base);
  assert.throws(() => dispatchDevelopmentCompilePlan({...base, plan, inputUtf8: {...base.inputUtf8, 'data/unregistered.json': '{}'}, executeCompiler: () => {calls++;}}));
  assert.throws(() => dispatchDevelopmentCompilePlan({...base, plan, executeCompiler: null}), /explicit compiler/); assert.equal(calls, 0);
});
