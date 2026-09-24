import fs from "node:fs";
import crypto from "node:crypto";
import { extractGoal } from "../runtime/compositional_intent_graph_v1/goal_parser.mjs";
import { createRepairedRouter } from "../runtime/compiled_semantic_v1/router_v2.mjs";

const paths = {
  fixture: new URL("../fixtures/cig_v1/public_dev_v2.json", import.meta.url),
  index: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-01_INDEX.json", import.meta.url),
  parser: new URL("../runtime/compositional_intent_graph_v1/goal_parser.mjs", import.meta.url),
  legacyControl: new URL("../runtime/compiled_semantic_v1/router_v2.mjs", import.meta.url),
};
const bytes = key => fs.readFileSync(paths[key]);
const sha = data => crypto.createHash("sha256").update(data).digest("hex");
const fixture = JSON.parse(bytes("fixture").toString("utf8"));
const index = JSON.parse(bytes("index").toString("utf8"));
if (fixture.role.length !== 18 || fixture.natural.length !== 18 || fixture.defer.length !== 18) {
  throw new Error("CIG-02 fresh DEV sizes changed");
}
const flat = createRepairedRouter(index);
const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase().trim().replace(/[。.!?？,，；;\s]+$/gu, "").trim();

function classifyRoleFirst(row) {
  const goal = extractGoal(row.current);
  if (!goal) return flat.classify({ current: row.current });
  return flat.classify({ current: goal.span });
}

function summarize(classifier) {
  const result = { assigned_labels: 0, correct_labels: 0, role_correct: 0, role_assigned: 0,
    natural_correct: 0, natural_assigned: 0, defer_false_assignment: 0, role_means_assignments: 0,
    errors: [] };
  for (const row of [...fixture.role, ...fixture.natural, ...fixture.defer]) {
    const topics = classifier(row).topics ?? [];
    result.assigned_labels += topics.length;
    if (row.kind === "defer") {
      if (topics.length) {
        result.defer_false_assignment++;
        result.errors.push({ id: row.id, kind: row.kind, predicted: topics });
      }
      continue;
    }
    const correct = topics.length === 1 && topics[0] === row.gold_topic;
    result.correct_labels += correct ? 1 : 0;
    if (row.kind === "role") {
      result.role_assigned += topics.length ? 1 : 0;
      result.role_correct += correct ? 1 : 0;
      if (topics.includes(row.means_topic)) result.role_means_assignments++;
    } else {
      result.natural_assigned += topics.length ? 1 : 0;
      result.natural_correct += correct ? 1 : 0;
    }
    if (topics.length && !correct) result.errors.push({ id: row.id, kind: row.kind, predicted: topics });
  }
  return {
    ...result,
    assigned_precision: result.assigned_labels ? result.correct_labels / result.assigned_labels : 0,
    role_coverage: result.role_assigned / 18, role_recall: result.role_correct / 18,
    natural_coverage: result.natural_assigned / 18, natural_recall: result.natural_correct / 18,
    defer_false_assignment_rate: result.defer_false_assignment / 18,
  };
}
let parserExact = 0, parserFound = 0;
for (const row of fixture.role) {
  const goal = extractGoal(row.current);
  if (goal) parserFound++;
  if (goal && normalize(goal.span) === normalize(row.goal_span)) parserExact++;
}
const baseline = summarize(row => flat.classify({ current: row.current }));
const roleFirst = summarize(classifyRoleFirst);
const artifact = {
  format: "cig02-fresh-public-dev-diagnostic-v1",
  cases: { role: 18, natural: 18, defer: 18 },
  source_sha256: { fixture: sha(bytes("fixture")), index: sha(bytes("index")),
    parser: sha(bytes("parser")), frozen_csl_control: sha(bytes("legacyControl")) },
  parser_role_found: parserFound, parser_role_exact: parserExact,
  baseline, role_first: roleFirst,
  interpretation_scope: "PUBLIC_DEV_DIAGNOSTIC_NOT_PROMOTION",
  consumed_cig01_case_reads: 0, consumed_lsr_csl_test_reads: 0, private_artifact_reads: 0,
};
console.log(JSON.stringify(artifact));
