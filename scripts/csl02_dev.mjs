import fs from "node:fs";
import crypto from "node:crypto";
import { createCompiledRouter } from "../runtime/compiled_semantic_v1/router.mjs";

const indexPath = new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-01_INDEX.json", import.meta.url);
const devPath = new URL("../fixtures/compiled_semantic_v1/public_dev.tsv", import.meta.url);
const outputPath = new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-02_DEV_RESULT.json", import.meta.url);
const indexBytes = fs.readFileSync(indexPath);
const devBytes = fs.readFileSync(devPath);
const index = JSON.parse(indexBytes.toString("utf8"));
const cases = devBytes.toString("utf8").trim().split("\n").map((line) => {
  const [kind, expected, current, title, recent] = line.split("\t");
  if (!["label", "defer", "context"].includes(kind)) throw new Error("Invalid public DEV case");
  return { kind, expected, input: { current, title, recent_user_inputs: recent ? [recent] : [] } };
});

const variants = [
  { id: "specific_only", minimumWeight: 3, margin: 0.25 },
  { id: "balanced", minimumWeight: 2, margin: 0.25 },
  { id: "wide_margin", minimumWeight: 2, margin: 0.60 },
];

function evaluate(policy) {
  const router = createCompiledRouter(index, policy);
  let assigned = 0, correct = 0, target = 0, targetCorrect = 0, falseDefer = 0, deferCount = 0, contextHarm = 0;
  const byTopic = new Map();
  for (const row of cases) {
    const result = router.classify(row.input);
    const topics = result.topics ?? [];
    assigned += topics.length;
    if (row.kind === "defer") {
      deferCount++;
      falseDefer += topics.length > 0 ? 1 : 0;
    } else {
      target++;
      const hit = topics.length === 1 && topics[0] === row.expected;
      if (hit) { correct++; targetCorrect++; }
      if (row.kind === "context" && topics.length && !hit) contextHarm++;
      const scores = byTopic.get(row.expected) ?? [];
      scores.push(hit ? 1 : 0);
      byTopic.set(row.expected, scores);
    }
  }
  const macroRecall = [...byTopic.values()].reduce((sum, values) => sum + values.reduce((a, b) => a + b, 0) / values.length, 0) / byTopic.size;
  return { policy, assigned_precision: assigned ? correct / assigned : 1,
    auto_assignment_coverage: targetCorrect / target, topic_macro_recall: macroRecall,
    insufficient_evidence_false_assignment: falseDefer / deferCount, context_harm_events: contextHarm,
    assigned_labels: assigned, correct_labels: correct, target_cases: target, defer_cases: deferCount };
}

const results = variants.map(evaluate);
const qualified = results.filter(row => row.assigned_precision >= 0.95 && row.context_harm_events === 0);
const pool = qualified.length ? qualified : results;
pool.sort((a, b) =>
  b.assigned_precision - a.assigned_precision ||
  b.auto_assignment_coverage - a.auto_assignment_coverage ||
  b.topic_macro_recall - a.topic_macro_recall ||
  a.insufficient_evidence_false_assignment - b.insufficient_evidence_false_assignment);
const selected = pool[0];
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const artifact = {
  format: "csl02-public-dev-v1", cases: cases.length, variants_compared: results.length,
  index_sha256: sha(indexBytes), dev_sha256: sha(devBytes), results,
  selected_policy: selected.policy, selected_reason: qualified.length ? "precision_and_context_qualified" : "no_precision_qualified_variant",
  blind_test_reads: 0, private_artifact_reads: 0,
};
const rendered = JSON.stringify(artifact, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(outputPath, "utf8") !== rendered) throw new Error("Non-deterministic CSL-02 DEV result");
} else {
  fs.writeFileSync(outputPath, rendered);
}
console.log(JSON.stringify({ selected: selected.policy, scores: results.map(x => [x.policy.id, x.assigned_precision, x.auto_assignment_coverage, x.topic_macro_recall, x.insufficient_evidence_false_assignment]) }));
