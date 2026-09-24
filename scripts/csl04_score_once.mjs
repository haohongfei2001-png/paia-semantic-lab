import fs from "node:fs";
import crypto from "node:crypto";

const paths = {
  freeze: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-04_PRE_OPEN_FREEZE.json", import.meta.url),
  scorerFreeze: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-04_SCORER_FREEZE.json", import.meta.url),
  metric: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-02_PRE_BLIND_FREEZE.json", import.meta.url),
  manifest: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-00_EVALUATOR_MANIFEST.json", import.meta.url),
  fixture: new URL("../fixtures/compiled_semantic_v1/blind_v2.json", import.meta.url),
  index: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-01_INDEX.json", import.meta.url),
  runtime: new URL("../runtime/compiled_semantic_v1/router_v2.mjs", import.meta.url),
  result: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-04_TEST_V1_RESULT.json", import.meta.url),
};
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const bytes = key => fs.readFileSync(paths[key]);
const freeze = JSON.parse(bytes("freeze").toString("utf8"));

function verifyFrozenInputs() {
  const scorerFreeze = JSON.parse(bytes("scorerFreeze").toString("utf8"));
  if (scorerFreeze.pre_open_freeze_sha256 !== sha(bytes("freeze")) ||
      scorerFreeze.scorer_sha256 !== sha(fs.readFileSync(new URL(import.meta.url))) ||
      scorerFreeze.evaluation_invocations !== 0) throw new Error("Scorer freeze mismatch");
  for (const [key, field] of [
    ["fixture", "test_v2_fixture_sha256"],
    ["index", "candidate_index_sha256"],
    ["runtime", "candidate_runtime_sha256"],
    ["metric", "metric_freeze_sha256"],
    ["manifest", "evaluator_manifest_sha256"],
  ]) {
    if (sha(bytes(key)) !== freeze[field]) throw new Error("Frozen " + key + " hash mismatch");
  }
  if (freeze.test_v2_evaluation_invocations !== 0) throw new Error("TEST v2 already opened");
}

verifyFrozenInputs();
if (process.argv.includes("--verify-result")) {
  const result = JSON.parse(bytes("result").toString("utf8"));
  if (result.pre_open_freeze_sha256 !== sha(bytes("freeze")) ||
      result.fixture_sha256 !== freeze.test_v2_fixture_sha256 ||
      result.evaluation_invocations !== 1) throw new Error("Stored TEST result does not bind freeze");
  console.log(JSON.stringify({ verdict: result.verdict, verified: true }));
} else {
  if (fs.existsSync(paths.result)) throw new Error("TEST v2 was already consumed; refusing rerun");
  const { createRepairedRouter } = await import("../runtime/compiled_semantic_v1/router_v2.mjs");
  const router = createRepairedRouter(JSON.parse(bytes("index").toString("utf8")), freeze.selected_policy);
  const fixture = JSON.parse(bytes("fixture").toString("utf8"));
  if (fixture.counts.single_label !== 288 || fixture.counts.context !== 72 ||
      fixture.counts.multi_label !== 18 || fixture.counts.should_defer !== 18 ||
      fixture.cases.length !== 396) throw new Error("Frozen TEST v2 counts changed");
  const perTopic = new Map();
  let assignedLabels = 0, correctLabels = 0, singleAssigned = 0, contextHarm = 0;
  let falseDefer = 0, multiTruePositive = 0, multiAssigned = 0, multiGold = 0;
  let deterministic = true;
  const failureClasses = { single_no_assignment: 0, single_wrong_assignment: 0,
    context_no_assignment: 0, context_wrong_assignment: 0, defer_false_assignment: 0 };
  for (const row of fixture.cases) {
    const result = router.classify(row.input);
    const repeat = router.classify(row.input);
    if (JSON.stringify(result) !== JSON.stringify(repeat)) deterministic = false;
    const topics = result.topics ?? [];
    if (row.kind === "multi_label") {
      multiAssigned += topics.length;
      multiGold += row.gold_topics.length;
      multiTruePositive += topics.filter(topic => row.gold_topics.includes(topic)).length;
      continue;
    }
    assignedLabels += topics.length;
    correctLabels += topics.filter(topic => row.gold_topics.includes(topic)).length;
    if (row.kind === "single_label") {
      if (topics.length) singleAssigned++;
      const hit = topics.length === 1 && topics[0] === row.gold_topics[0];
      const values = perTopic.get(row.gold_topics[0]) ?? [];
      values.push(hit ? 1 : 0);
      perTopic.set(row.gold_topics[0], values);
      if (!topics.length) failureClasses.single_no_assignment++;
      else if (!hit) failureClasses.single_wrong_assignment++;
    } else if (row.kind === "context") {
      if (!topics.length) failureClasses.context_no_assignment++;
      if (topics.some(topic => !row.gold_topics.includes(topic))) {
        contextHarm++;
        failureClasses.context_wrong_assignment++;
      }
    } else if (row.kind === "should_defer" && topics.length) {
      falseDefer++;
      failureClasses.defer_false_assignment++;
    }
  }
  if (perTopic.size !== 144 || [...perTopic.values()].some(values => values.length !== 2)) {
    throw new Error("TEST single-label macro-recall denominator changed");
  }
  const macro = [...perTopic.values()].reduce((sum, values) => sum + values.reduce((a, b) => a + b, 0) / 2, 0) / 144;
  const metrics = {
    assigned_precision: assignedLabels ? correctLabels / assignedLabels : 0,
    auto_assignment_coverage: singleAssigned / 288,
    topic_macro_recall: macro,
    insufficient_evidence_false_assignment: falseDefer / 18,
    context_harm_events: contextHarm,
    deterministic_repeat: deterministic,
    multi_label_precision: multiAssigned ? multiTruePositive / multiAssigned : 0,
    multi_label_recall: multiTruePositive / multiGold,
    assigned_labels: assignedLabels, correct_labels: correctLabels, single_assigned: singleAssigned,
  };
  const gates = JSON.parse(bytes("metric").toString("utf8")).capability_gates;
  const pass = metrics.assigned_precision >= gates.assigned_precision_min &&
    metrics.auto_assignment_coverage >= gates.auto_assignment_coverage_min &&
    metrics.topic_macro_recall >= gates.topic_macro_recall_min &&
    metrics.insufficient_evidence_false_assignment <= gates.insufficient_evidence_false_assignment_max &&
    metrics.context_harm_events <= gates.context_harm_events_max && deterministic;
  const artifact = { format: "csl04-blind-result-v1", verdict: pass ? "PASS" : "FAIL",
    pre_open_freeze_sha256: sha(bytes("freeze")), fixture_sha256: sha(bytes("fixture")),
    candidate_head_sha: freeze.candidate_head_sha, evaluation_invocations: 1,
    counts: fixture.counts, metrics, failure_classes: failureClasses,
    private_artifact_reads: 0, evaluation_records_read: 0, consumed_lockbox_reads: 0 };
  fs.writeFileSync(paths.result, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ verdict: artifact.verdict, metrics, failure_classes: failureClasses }));
}
