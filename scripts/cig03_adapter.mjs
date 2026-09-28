import crypto from "node:crypto";
import assert from "node:assert/strict";

// Lossless digest is used for full-output context and repeat checks; the scorer
// receives only the decision projection needed by the fixed precision metrics.
export function projectDecision(output) {
  assert.ok(output && typeof output === "object", "invalid router output");
  assert.ok(output.state === "ASSIGNED" || output.state === "DEFER", "unknown router state");
  assert.ok(Array.isArray(output.topics), "missing router topics");
  assert.ok(output.topics.every(t => typeof t === "string"), "invalid Topic ID");
  assert.equal(new Set(output.topics).size, output.topics.length, "duplicate Topic ID");
  if (output.state === "DEFER") assert.equal(output.topics.length, 0, "DEFER must have no Topics");
  if (output.state === "ASSIGNED") assert.ok(output.topics.length > 0, "assignment has no Topics");
  return {
    state: output.state === "ASSIGNED" ? "ASSIGN" : "DEFER",
    topics: [...output.topics],
    raw_output_digest: crypto.createHash("sha256").update(JSON.stringify(output)).digest("hex")
  };
}

export function buildPredictions(packet, classify) {
  assert.equal(typeof classify, "function", "missing fixed candidate classifier");
  const predictions = { single_label: [], context: [], controls: [], repeats: [] };
  function twice(id, input) {
    const first = projectDecision(classify(input));
    const second = projectDecision(classify(input));
    predictions.repeats.push({ id, first, second });
    return first;
  }
  // The adapter never inspects gold, rationale or provenance.
  for (const row of packet.single_label) {
    predictions.single_label.push({ id: row.id, ...twice(row.id, { current: row.current }) });
  }
  for (const row of packet.context) {
    const base = twice(row.id + "-base", { current: row.current });
    const perturbed = twice(row.id + "-perturbed", { current: row.current, context: row.context });
    predictions.context.push({ id: row.id, base, perturbed });
  }
  for (const row of packet.controls) {
    predictions.controls.push({ id: row.id, ...twice(row.id, { current: row.current }) });
  }
  return predictions;
}
