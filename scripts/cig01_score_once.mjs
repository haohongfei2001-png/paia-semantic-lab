import fs from "node:fs";
import crypto from "node:crypto";
import { extractGoal } from "../runtime/compositional_intent_graph_v1/goal_parser.mjs";

const paths = {
  parser: new URL("../runtime/compositional_intent_graph_v1/goal_parser.mjs", import.meta.url),
  fixture: new URL("../fixtures/cig_v1/public_synthetic_probe.json", import.meta.url),
  manifest: new URL("../artifacts/compiled-semantic-lexicon-v1/CSL-00_EVALUATOR_MANIFEST.json", import.meta.url),
  freeze: new URL("../artifacts/compositional-intent-graph-v1/CIG-01_PRE_EVIDENCE_FREEZE.json", import.meta.url),
  result: new URL("../artifacts/compositional-intent-graph-v1/CIG-01_RESULT.json", import.meta.url),
};
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const bytes = key => fs.readFileSync(paths[key]);
const normalize = text => String(text ?? "").normalize("NFKC").toLocaleLowerCase("und").trim().replace(/[。.!?？,，；;\s]+$/gu, "").trim();
const bag = text => [...normalize(text).matchAll(/[\p{L}\p{N}]/gu)].map(m => m[0]).sort().join("");
const fixture = JSON.parse(bytes("fixture").toString("utf8"));
const manifest = JSON.parse(bytes("manifest").toString("utf8"));
const freeze = JSON.parse(bytes("freeze").toString("utf8"));

function verifyFrozenInputs() {
  if (freeze.stage !== "CIG01_FROZEN_BEFORE_PROBE" || freeze.evaluation_invocations !== 0 ||
      freeze.fixture_sha256 !== hash(bytes("fixture")) ||
      freeze.parser_sha256 !== hash(bytes("parser")) ||
      freeze.manifest_sha256 !== hash(bytes("manifest")) ||
      freeze.scorer_sha256 !== hash(fs.readFileSync(new URL(import.meta.url)))) {
    throw new Error("CIG-01 pre-evidence freeze mismatch");
  }
  if (fixture.pairs.length !== 12 || fixture.heldout.length !== 12 || fixture.ambiguous.length !== 12) {
    throw new Error("CIG-01 fixture size changed");
  }
}
verifyFrozenInputs();
if (process.argv.includes("--verify-result")) {
  const result = JSON.parse(bytes("result").toString("utf8"));
  if (result.freeze_sha256 !== hash(bytes("freeze")) ||
      result.fixture_sha256 !== hash(bytes("fixture")) ||
      result.evaluation_invocations !== 1) throw new Error("Stored CIG-01 result does not bind freeze");
  console.log(JSON.stringify({ verdict: result.verdict, verified: true }));
} else {
  if (fs.existsSync(paths.result)) throw new Error("CIG-01 evidence already consumed; refusing rerun");
  const ids = new Set(manifest.topics.map(t => t.topic_id));
  if (ids.size !== 144) throw new Error("Formal catalog identity mismatch");
  const cases = [];
  for (const pair of fixture.pairs) {
    if (!ids.has(pair.a.topic_id) || !ids.has(pair.b.topic_id) || pair.a.topic_id === pair.b.topic_id) {
      throw new Error("Invalid contrasting Topic pair");
    }
    for (const lang of ["en", "zh"]) {
      const make = lang === "en" ? (tool, goal) => "Use " + tool + " to improve " + goal + "."
        : (tool, goal) => "用" + tool + "来改进" + goal + "。";
      const left = make(pair.a[lang], pair.b[lang]);
      const right = make(pair.b[lang], pair.a[lang]);
      if (bag(left) !== bag(right)) throw new Error("Bag signature differs for " + pair.id + "/" + lang);
      cases.push({ id: pair.id + ":" + lang + ":ab", current: left, goal_span: pair.b[lang], goal_topic: pair.b.topic_id, pair_id: pair.id + ":" + lang });
      cases.push({ id: pair.id + ":" + lang + ":ba", current: right, goal_span: pair.a[lang], goal_topic: pair.a.topic_id, pair_id: pair.id + ":" + lang });
    }
  }
  if (cases.length !== 48) throw new Error("Expected 48 balanced minimal-pair cases");
  let pairExact = 0, heldoutExact = 0, falseAmbiguous = 0, deterministic = true;
  let localAssigned = 0, localCorrect = 0;
  const pairFailures = [], heldoutFailures = [];
  function evaluate(row, group) {
    const first = extractGoal(row.current);
    const repeat = extractGoal(row.current);
    if (JSON.stringify(first) !== JSON.stringify(repeat)) deterministic = false;
    const exact = first?.role === "GOAL" && normalize(first.span) === normalize(row.goal_span);
    if (group === "pair") {
      pairExact += exact ? 1 : 0;
      if (!exact) pairFailures.push(row.id);
    } else {
      heldoutExact += exact ? 1 : 0;
      if (!exact) heldoutFailures.push(row.id);
    }
    if (first) {
      const span = normalize(first.span);
      const owners = manifest.topics.filter(t => Object.values(t.name).some(name => normalize(name) === span));
      if (owners.length === 1) {
        localAssigned++;
        if (owners[0].topic_id === row.goal_topic) localCorrect++;
      }
    }
  }
  for (const row of cases) evaluate(row, "pair");
  for (const row of fixture.heldout) {
    if (!ids.has(row.goal_topic)) throw new Error("Invalid held-out Topic");
    evaluate(row, "heldout");
  }
  for (const row of fixture.ambiguous) {
    const a = extractGoal(row.current), b = extractGoal(row.current);
    if (JSON.stringify(a) !== JSON.stringify(b)) deterministic = false;
    if (a) falseAmbiguous++;
  }
  const metrics = {
    pair_count: cases.length, pair_groups: 24, identical_bag_opposite_gold_groups: 24,
    bag_only_accuracy_ceiling: 0.5,
    pair_goal_span_accuracy: pairExact / 48,
    heldout_goal_span_accuracy: heldoutExact / 12,
    ambiguous_false_goal_rate: falseAmbiguous / 12,
    oracle_role_topic_accuracy: pairExact / 48,
    formal_name_grounding_coverage: localAssigned / 60,
    formal_name_grounding_precision: localAssigned ? localCorrect / localAssigned : 0,
    deterministic_repeat: deterministic,
    parser_bytes: bytes("parser").length,
  };
  const supported = metrics.pair_goal_span_accuracy >= 0.9 &&
    metrics.ambiguous_false_goal_rate === 0 && deterministic;
  const result = {
    format: "cig01-public-synthetic-result-v1",
    verdict: supported ? "ROLE_MECHANISM_SUPPORTED_DIAGNOSTIC_ONLY" : "ROLE_MECHANISM_UNQUALIFIED",
    freeze_sha256: hash(bytes("freeze")), fixture_sha256: hash(bytes("fixture")),
    evaluation_invocations: 1, metrics,
    failure_ids: { pair: pairFailures, heldout: heldoutFailures },
    evidence_scope: "NEW_PUBLIC_SYNTHETIC_DIAGNOSTIC_ONLY",
    private_artifact_reads: 0, legacy_evaluation_reads: 0,
    consumed_lockbox_reads: 0, real_paia_archive_reads: 0, production_paia_modified: false,
  };
  fs.writeFileSync(paths.result, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ verdict: result.verdict, metrics, failure_ids: result.failure_ids }));
}
