import fs from "node:fs";
import { createRepairedRouter } from "../runtime/compiled_semantic_v1/router_v2.mjs";

const index = JSON.parse(fs.readFileSync(new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-01_INDEX.json", import.meta.url)));
const lines = fs.readFileSync(new URL("../fixtures/compiled_semantic_v1/public_dev.tsv", import.meta.url), "utf8").trim().split("\n");
const router = createRepairedRouter(index);
let assigned = 0, correct = 0, targets = 0, covered = 0, deferTotal = 0, falseDefer = 0, contextHarm = 0, deterministic = true;
const topics = new Map();
for (const line of lines) {
  const [kind, expected, current, title, recent] = line.split("\t");
  const input = { current, title, recent_user_inputs: recent ? [recent] : [] };
  const a = router.classify(input), b = router.classify(input);
  if (JSON.stringify(a) !== JSON.stringify(b)) deterministic = false;
  assigned += a.topics.length;
  if (kind === "defer") {
    deferTotal++;
    if (a.topics.length) falseDefer++;
    continue;
  }
  targets++;
  if (a.topics.length) covered++;
  const hit = a.topics.length === 1 && a.topics[0] === expected;
  if (hit) correct++;
  if (kind === "context" && a.topics.length && !hit) contextHarm++;
  const values = topics.get(expected) ?? [];
  values.push(hit ? 1 : 0);
  topics.set(expected, values);
}
const macro = [...topics.values()].reduce((sum, values) => sum + values.reduce((a, b) => a + b, 0) / values.length, 0) / topics.size;
console.log(JSON.stringify({
  format: "csl04-public-dev-diagnostic-v1",
  cases: lines.length,
  assigned_precision: assigned ? correct / assigned : 0,
  auto_assignment_coverage: covered / targets,
  represented_topic_macro_recall: macro,
  insufficient_evidence_false_assignment: falseDefer / deferTotal,
  context_harm_events: contextHarm,
  deterministic_repeat: deterministic,
  assigned_labels: assigned,
  correct_labels: correct,
  target_cases: targets,
  defer_cases: deferTotal
}));
