import test from "node:test";
import assert from "node:assert/strict";
import { projectDecision, buildPredictions } from "../scripts/cig03_adapter.mjs";

test("adapter projects ASSIGNED and preserves full native-output differences", () => {
  const a = { state: "ASSIGNED", topics: ["stub.topic"], evidence: { rule: "STUB_A" } };
  const b = { state: "ASSIGNED", topics: ["stub.topic"], evidence: { rule: "STUB_B" } };
  assert.equal(projectDecision(a).state, "ASSIGN");
  assert.deepEqual(projectDecision(a).topics, ["stub.topic"]);
  assert.notEqual(projectDecision(a).raw_output_digest, projectDecision(b).raw_output_digest);
  assert.deepEqual(projectDecision(a), projectDecision(structuredClone(a)));
});
test("invalid decisions cannot silently become DEFER", () => {
  for (const value of [
    null, { state: "UNKNOWN", topics: [] },
    { state: "ASSIGNED", topics: [] },
    { state: "ASSIGNED", topics: ["stub.topic", "stub.topic"] },
    { state: "DEFER", topics: ["stub.topic"] }
  ]) assert.throws(() => projectDecision(value));
  assert.equal(projectDecision({ state: "DEFER", topics: [], reason: "STUB" }).state, "DEFER");
});

test("each category and context perturbation receives a complete repeat pair", () => {
  const packet = {
    single_label: [{ id: "s-stub", current: "stub single" }],
    context: [{ id: "c-stub", current: "stub context current", context: { recent_inputs: ["stub prior"] } }],
    controls: [{ id: "x-stub", current: "stub control" }]
  };
  const calls = [];
  const classify = input => {
    calls.push(input);
    return { state: "DEFER", topics: [], reason: input.context ? "STUB_CONTEXT" : "STUB_BASE" };
  };
  const p = buildPredictions(packet, classify);
  assert.equal(calls.length, 8);
  assert.deepEqual(p.repeats.map(r => r.id), ["s-stub", "c-stub-base", "c-stub-perturbed", "x-stub"]);
  assert.ok(p.repeats.every(r => r.first.raw_output_digest === r.second.raw_output_digest));
  assert.equal(p.context[0].id, "c-stub");
  assert.notEqual(p.context[0].base.raw_output_digest, p.context[0].perturbed.raw_output_digest);
  assert.equal(calls[2].current, calls[4].current);
  assert.equal(calls[2].context, undefined);
  assert.deepEqual(calls[4].context, packet.context[0].context);
});
