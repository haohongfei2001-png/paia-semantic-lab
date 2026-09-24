import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createRouter } from "../runtime/lightweight_router_v1/router.mjs";

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 2) {
    result[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  for (const key of ["index", "fixtures", "output"]) {
    if (!result[key]) throw new Error("Missing --" + key);
  }
  return result;
}

function sameSet(left, right) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function evaluateCases(router, cases, candidate, threshold) {
  const rows = [];
  const topicGold = new Map();
  const topicHit = new Map();
  let predictedAssigned = 0;
  let correctAssigned = 0;
  let assignable = 0;
  let assignedCoverage = 0;
  let insufficient = 0;
  let insufficientFalseAssign = 0;
  let contextHarm = 0;
  let exactSetCases = 0;
  let stateCorrect = 0;

  for (const row of cases) {
    const prediction = router.classify(
      {
        current: row.current,
        title: row.title ?? "",
        recent_user_inputs: row.recent_user_inputs ?? [],
      },
      { candidate, threshold },
    );

    const expected = row.expected ?? [];
    const predicted = prediction.topics ?? [];
    const forbidden = row.forbidden ?? [];

    if (row.state === "ASSIGNED") {
      assignable += 1;
      if (prediction.state === "ASSIGNED") assignedCoverage += 1;
      for (const topicId of expected) {
        topicGold.set(topicId, (topicGold.get(topicId) ?? 0) + 1);
        if (predicted.includes(topicId)) {
          topicHit.set(topicId, (topicHit.get(topicId) ?? 0) + 1);
        }
      }
    } else {
      insufficient += 1;
      if (prediction.state === "ASSIGNED") insufficientFalseAssign += 1;
    }

    if (prediction.state === "ASSIGNED") {
      predictedAssigned += 1;
      if (
        expected.length > 0
        && predicted.length > 0
        && predicted.every((topicId) => expected.includes(topicId))
      ) {
        correctAssigned += 1;
      }
    }

    if (forbidden.some((topicId) => predicted.includes(topicId))) {
      contextHarm += 1;
    }
    if (sameSet(predicted, expected) && prediction.state === row.state) {
      exactSetCases += 1;
    }
    if (prediction.state === row.state) stateCorrect += 1;

    rows.push({
      id: row.id,
      family: row.family,
      gold_state: row.state,
      expected,
      forbidden,
      predicted_state: prediction.state,
      predicted,
      reason: prediction.reason,
    });
  }

  const recalls = [];
  for (const [topicId, count] of topicGold.entries()) {
    recalls.push((topicHit.get(topicId) ?? 0) / count);
  }

  return {
    case_count: cases.length,
    assigned_precision: predictedAssigned ? correctAssigned / predictedAssigned : 1,
    coverage: assignable ? assignedCoverage / assignable : 1,
    topic_macro_recall: recalls.length
      ? recalls.reduce((sum, value) => sum + value, 0) / recalls.length
      : 1,
    insufficient_evidence_false_assignment_rate: insufficient
      ? insufficientFalseAssign / insufficient
      : 0,
    context_harm_events: contextHarm,
    exact_set_case_rate: cases.length ? exactSetCases / cases.length : 1,
    state_accuracy: cases.length ? stateCorrect / cases.length : 1,
    predicted_assigned_count: predictedAssigned,
    assignable_case_count: assignable,
    insufficient_case_count: insufficient,
    rows,
  };
}

function thresholdCandidates() {
  const values = [];
  for (let value = 0.04; value <= 1.0001; value += 0.02) {
    values.push(Number(value.toFixed(2)));
  }
  return values;
}

function selectThreshold(router, cases, candidate) {
  const candidates = thresholdCandidates().map((threshold) => ({
    threshold,
    metrics: evaluateCases(router, cases, candidate, threshold),
  }));

  candidates.sort((left, right) => {
    const lp = left.metrics.assigned_precision >= 0.95 ? 1 : 0;
    const rp = right.metrics.assigned_precision >= 0.95 ? 1 : 0;
    return (
      rp - lp
      || right.metrics.coverage - left.metrics.coverage
      || right.metrics.topic_macro_recall - left.metrics.topic_macro_recall
      || right.metrics.assigned_precision - left.metrics.assigned_precision
      || right.threshold - left.threshold
    );
  });

  return candidates[0];
}

function loadLegacyCases(root) {
  const manifestPath = path.join(root, "synthetic_contrastive", "v0.1", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const cases = [];
  for (const shard of manifest.shards) {
    const payload = JSON.parse(fs.readFileSync(path.join(root, shard.path), "utf8"));
    cases.push(...payload.cases);
  }
  return cases;
}

function legacyRankingMetrics(router, cases) {
  let hit10 = 0;
  let hit20 = 0;
  for (const row of cases) {
    const ranking = router.rank(row.text, { candidate: "B", limit: 20 })
      .map((entry) => entry.topic_id);
    if (ranking.slice(0, 10).includes(row.expected_topic_id)) hit10 += 1;
    if (ranking.includes(row.expected_topic_id)) hit20 += 1;
  }
  return {
    role: "REGRESSION_INTEGRITY_ONLY",
    selection_authority: false,
    case_count: cases.length,
    hit_at_10: cases.length ? hit10 / cases.length : null,
    hit_at_20: cases.length ? hit20 / cases.length : null,
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[index];
}

function resourceMetrics(indexPath, fixtureCases) {
  if (global.gc) global.gc();
  const memoryBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const router = createRouter(index);
  const coldMs = performance.now() - start;
  if (global.gc) global.gc();
  const memoryAfter = process.memoryUsage().heapUsed;

  const sample = fixtureCases.filter((row) => row.state === "ASSIGNED");
  const times = [];
  for (let repeat = 0; repeat < 20; repeat += 1) {
    for (const row of sample) {
      const t0 = performance.now();
      router.classify(
        {
          current: row.current,
          title: row.title ?? "",
          recent_user_inputs: row.recent_user_inputs ?? [],
        },
        { candidate: "B", threshold: 0.5 },
      );
      times.push(performance.now() - t0);
    }
  }

  const routerPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../runtime/lightweight_router_v1/router.mjs",
  );
  const indexBytes = fs.statSync(indexPath).size;
  const routerBytes = fs.statSync(routerPath).size;

  return {
    router,
    metrics: {
      generated_index_bytes: indexBytes,
      router_core_bytes: routerBytes,
      router_plus_index_bytes: routerBytes + indexBytes,
      cold_init_ms: coldMs,
      warm_p95_ms: percentile(times, 0.95),
      incremental_heap_bytes: Math.max(0, memoryAfter - memoryBefore),
      memory_measurement_scope: "Node heap delta after GC; browser hardening remains LSR-03.",
      warm_measurement_count: times.length,
    },
  };
}

function passesFloor(metrics) {
  return (
    metrics.assigned_precision >= 0.95
    && metrics.coverage >= 0.60
    && metrics.topic_macro_recall >= 0.60
    && metrics.insufficient_evidence_false_assignment_rate <= 0.02
    && metrics.context_harm_events === 0
  );
}

const args = parseArgs(process.argv);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const fixtures = JSON.parse(fs.readFileSync(args.fixtures, "utf8"));
const dev = fixtures.cases.filter((row) => row.split === "dev");
const test = fixtures.cases.filter((row) => row.split === "test");

const resource = resourceMetrics(args.index, fixtures.cases);
const router = resource.router;

const thresholds = {};
const candidateResults = {};
for (const candidate of ["A", "B", "C"]) {
  const selected = selectThreshold(router, dev, candidate);
  thresholds[candidate] = selected.threshold;
  candidateResults[candidate] = {
    selected_threshold: selected.threshold,
    threshold_selection_source: "source_separated_public_dev_only",
    dev: selected.metrics,
    test: evaluateCases(router, test, candidate, selected.threshold),
  };
}

const repeatOne = fixtures.cases.map((row) => router.classify(
  {
    current: row.current,
    title: row.title ?? "",
    recent_user_inputs: row.recent_user_inputs ?? [],
  },
  { candidate: "B", threshold: thresholds.B },
));
const repeatTwo = fixtures.cases.map((row) => router.classify(
  {
    current: row.current,
    title: row.title ?? "",
    recent_user_inputs: row.recent_user_inputs ?? [],
  },
  { candidate: "B", threshold: thresholds.B },
));
const deterministicRepeat = JSON.stringify(repeatOne) === JSON.stringify(repeatTwo);

const legacy = legacyRankingMetrics(router, loadLegacyCases(root));
const productResourcePass = (
  resource.metrics.generated_index_bytes <= 1048576
  && resource.metrics.router_plus_index_bytes <= 2097152
  && resource.metrics.incremental_heap_bytes <= 33554432
  && resource.metrics.warm_p95_ms <= 20
  && resource.metrics.cold_init_ms <= 100
);

const primaryPass = (
  passesFloor(candidateResults.B.test)
  && deterministicRepeat
  && productResourcePass
);

const result = {
  package: "PAIA-LIGHTWEIGHT-SEMANTIC-ROUTER-v1",
  round: "LSR-01",
  stage: primaryPass ? "PUBLIC_BASELINE_PASS" : "PUBLIC_BASELINE_FAIL",
  primary_candidate: "B",
  candidate_definitions: {
    A: "typed exact alias/phrase + evidence/continuation gates",
    B: "A + field-separated binary TF-IDF + zh 2/3-gram + Latin word features",
    C: "A + fixed BM25(k1=1.2,b=0.75) control",
  },
  selected_thresholds: thresholds,
  candidates: candidateResults,
  legacy_contrastive: legacy,
  deterministic_repeat: deterministicRepeat,
  resources: resource.metrics,
  resource_pass: productResourcePass,
  guards: {
    neural_model_assets_bytes: 0,
    semantic_network_calls: 0,
    private_calibration_reads: 0,
    evaluation_reads: 0,
    consumed_lockbox_reads: 0,
    production_paia_writes: 0,
    domain_prior: false,
    sibling_expansion: false,
  },
  credibility_floor: {
    assigned_precision_min: 0.95,
    coverage_min: 0.60,
    topic_macro_recall_min: 0.60,
    insufficient_false_assignment_max: 0.02,
    context_harm_events_max: 0,
  },
  primary_pass: primaryPass,
};

fs.mkdirSync(path.dirname(args.output), { recursive: true });
fs.writeFileSync(args.output, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log("LSR01_SUMMARY " + JSON.stringify({
  stage: result.stage,
  primary_pass: primaryPass,
  selected_thresholds: thresholds,
  candidate_B_dev: candidateResults.B.dev,
  candidate_B_test: candidateResults.B.test,
  resources: resource.metrics,
  legacy_contrastive: legacy,
  deterministic_repeat: deterministicRepeat,
}, (key, value) => key === "rows" ? undefined : value));

process.exit(primaryPass ? 0 : 2);
