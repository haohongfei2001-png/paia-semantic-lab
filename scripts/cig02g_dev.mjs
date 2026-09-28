import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { createAuthoredTopicRouter } from "../runtime/compositional_intent_graph_v1/authored_topic_router.mjs";
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const indexPath = ".cig02g-index.json", devPath = "fixtures/cig_v1/cig02g_dev_v1.json";
const indexBytes = fs.readFileSync(indexPath), devBytes = fs.readFileSync(devPath);
const index = JSON.parse(indexBytes), dev = JSON.parse(devBytes);
assert.equal(dev.format, "cig02g-authored-dev-v1");
assert.equal(dev.partition, "DEV");
assert.equal(dev.authorship, "SAME_WRITER_AS_TRAIN_NOT_INDEPENDENT_NOT_BLIND");
assert.equal(dev.use, "ITERATIVE_DEVELOPMENT_ONLY_NOT_CAPABILITY_TEST");
assert.equal(dev.single_label.length, 288);
assert.equal(dev.safety.length, 36);
assert.equal(dev.context_pairs.length, 72);
const byId = new Map(), topicCases = new Map(index.topics.map(x => [x.topic_id, { n: 0, correct: 0 }]));
const router = createAuthoredTopicRouter(index);
let assigned = 0, correct = 0, falseSafety = 0, contextHarm = 0, nondeterministic = 0;
let exactName = 0, typed = 0;
const failures = [], results = new Map();
const normalize = text => text.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
function evaluate(row) {
  assert.equal(row.partition, "DEV");
  assert.equal(typeof row.current, "string");
  assert.ok(!byId.has(row.id), "duplicate DEV ID");
  byId.set(row.id, row);
  const result = router.classify({ current: row.current });
  if (JSON.stringify(result) !== JSON.stringify(router.classify({ current: row.current }))) nondeterministic++;
  results.set(row.id, result);
  return result;
}
for (const row of dev.single_label) {
  assert.equal(row.gold.length, 1);
  const topic = topicCases.get(row.gold[0]); assert.ok(topic, "non-Catalog DEV gold");
  topic.n++;
  const result = evaluate(row);
  const match = result.state === "ASSIGNED" && result.topics.length === 1 && result.topics[0] === row.gold[0];
  if (result.state === "ASSIGNED") {
    assigned++;
    if (result.evidence.rule === "EXACT_FORMAL_NAME") exactName++;
    else if (result.evidence.rule === "UNIQUE_TYPED_FRAME_COMPOSITION") typed++;
  }
  if (match) { correct++; topic.correct++; }
  else failures.push({ id: row.id, gold: row.gold, predicted: result.topics, reason: result.reason ?? result.evidence?.rule });
}
for (const counts of topicCases.values()) assert.equal(counts.n, 2, "DEV must retain two cases per Topic");
for (const row of dev.safety) {
  assert.deepEqual(row.gold, []);
  const result = evaluate(row);
  if (result.state === "ASSIGNED") {
    falseSafety++;
    failures.push({ id: row.id, gold: [], predicted: result.topics, reason: result.evidence?.rule });
  }
}
for (const row of dev.context_pairs) {
  assert.ok(byId.has(row.base_id));
  const base = byId.get(row.base_id);
  const contextual = router.classify({ current: base.current, context: row.context });
  if (JSON.stringify(contextual) !== JSON.stringify(results.get(row.base_id))) contextHarm++;
}
const precision = assigned ? correct / assigned : 0;
const coverage = assigned / 288;
const macroRecall = [...topicCases.values()].reduce((sum, x) => sum + x.correct / x.n, 0) / 144;
const safetyRate = falseSafety / 36;
const gates = {
  assigned_precision: precision >= 0.95, auto_assignment_coverage: coverage >= 0.70,
  topic_macro_recall: macroRecall >= 0.70, insufficient_false_assignment: safetyRate <= 0.02,
  context_harm: contextHarm === 0, deterministic_repeat: nondeterministic === 0
};
const runtimePaths = ["authored_topic_router.mjs", "frame_grounder.mjs", "goal_parser.mjs", "current_goal_scope.mjs"]
  .map(name => "runtime/compositional_intent_graph_v1/" + name);
const hashes = Object.fromEntries(runtimePaths.map(path => [path, hash(fs.readFileSync(path))]));
const runtimeBytes = runtimePaths.reduce((sum, path) => sum + fs.statSync(path).size, 0);
assert.ok(indexBytes.length <= 1048576);
assert.ok(indexBytes.length + runtimeBytes <= 2097152);
const formalNamePresent = dev.single_label.filter(row => index.topics.some(topic =>
  Object.values(topic.names).some(name => normalize(row.current).includes(name)))).length;
const result = {
  format: "CIG02G_AUTHORED_DEV_RESULT_V1",
  classification: "SAME_WRITER_AUTHORED_DEV_NOT_INDEPENDENT_CAPABILITY",
  github_sha: process.env.GITHUB_SHA ?? null,
  topic_count: 144, single_label_cases: 288, safety_cases: 36, context_pairs: 72,
  authorship: dev.authorship, vocabulary_overlap_with_train: true,
  final_capability_test_started: false, capability_test_rows_read: 0,
  metrics: { assigned_precision: precision, auto_assignment_coverage: coverage, topic_macro_recall: macroRecall,
    insufficient_false_assignment: safetyRate, context_harm: contextHarm, nondeterministic_repeats: nondeterministic },
  evidence_rules: { exact_formal_name_assignments: exactName, typed_composition_assignments: typed,
    formal_name_present_cases: formalNamePresent },
  gates, dev_readiness: Object.values(gates).every(Boolean) ? "DEV_FLOOR_MET" : "DEV_UNQUALIFIED",
  full_capability_verdict: "NOT_EVALUATED",
  index_bytes: indexBytes.length, router_plus_index_bytes: indexBytes.length + runtimeBytes,
  source_sha256: { index: hash(indexBytes), dev: hash(devBytes), train: index.provenance.train_sha256, runtime: hashes },
  failures
};
fs.writeFileSync(".cig02g-dev-result.json", JSON.stringify(result, null, 2) + "\n");
console.log("CIG02G_DEV_RESULT_JSON=" + JSON.stringify(result));
// DEV misses are scientific evidence, not infrastructure failure. They must remain
// visible as DEV_UNQUALIFIED; unchanged capability gates decide later freeze.
