import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateAuthoredTrain } from "../scripts/cig02g_train_contract.mjs";
import { createAuthoredTopicRouter } from "../runtime/compositional_intent_graph_v1/authored_topic_router.mjs";
const train = JSON.parse(fs.readFileSync("fixtures/cig_v1/cig02g_train_v1.json", "utf8"));
const ids = train.topics.map(x => x.topic_id);
const index = JSON.parse(fs.readFileSync(".cig02g-index.json", "utf8"));
test("compiler rejects DEV/TEST partitions, extra fields, missing and duplicate Topics", () => {
  assert.equal(validateAuthoredTrain(train, ids), train);
  for (const partition of ["DEV", "TEST"]) {
    assert.throws(() => validateAuthoredTrain({ ...train, partition }, ids));
  }
  assert.throws(() => validateAuthoredTrain({ ...train, dev_rows: [] }, ids));
  assert.throws(() => validateAuthoredTrain({ ...train, topics: train.topics.slice(1) }, ids));
  const duplicate = structuredClone(train);
  duplicate.topics[1].topic_id = duplicate.topics[0].topic_id;
  assert.throws(() => validateAuthoredTrain(duplicate, ids));
});
test("runtime admits all 144 and fails closed on any contaminated index", () => {
  assert.equal(index.topic_count, 144);
  for (const key of ["dev_rows_read", "capability_test_rows_read"]) {
    const bad = structuredClone(index); bad.provenance[key] = 1;
    assert.throws(() => createAuthoredTopicRouter(bad));
  }
  const router = createAuthoredTopicRouter(index);
  // Previously DEFER-mask Topics can qualify from explicit current evidence.
  for (const topic of index.topics) {
    const result = router.classify({ current: "Please help with " + topic.names.zh });
    assert.deepEqual(result.topics, [topic.topic_id]);
  }
});
test("context, means, quote, negation and ambiguity cannot supply missing goal evidence", () => {
  const router = createAuthoredTopicRouter(index);
  const good = "I want to design a database schema";
  assert.deepEqual(router.classify({ current: good, context: "Investing" }), router.classify({ current: good }));
  assert.deepEqual(router.classify({ current: "I want to do that", context: good }).topics, []);
  for (const current of [
    "Please do not design a database schema",
    'Please discuss "design a database schema"',
    "My friend said I want to design a database schema",
    "If I wanted to design a database schema, what happens?",
    "Use a database schema to improve something unspecified"
  ]) assert.deepEqual(router.classify({ current }).topics, []);
});

test("owner amendment pins unchanged product gates and historical public source blobs", async () => {
  const { createHash } = await import("node:crypto");
  const amendment = JSON.parse(fs.readFileSync("artifacts/compositional-intent-graph-v1/CIG-02G_PROTOCOL_AMENDMENT.json", "utf8"));
  assert.deepEqual(amendment.capability_gates, {
    assigned_precision_min: 0.95, coverage_min: 0.70, topic_macro_recall_min: 0.70,
    insufficient_false_assignment_max: 0.02, context_harm_max: 0, deterministic_repeat: "PASS"
  });
  assert.deepEqual(amendment.product_contract, {
    neural_assets_bytes_max: 0, semantic_network_calls_max: 0, index_bytes_max: 1048576,
    router_plus_index_bytes_max: 2097152, incremental_memory_bytes_max: 33554432,
    warm_p95_ms_max: 20, cold_init_ms_max: 100
  });
  assert.equal(amendment.formal_catalog_modified, false);
  assert.equal(amendment.cig02_frozen, false);
  assert.equal(amendment.cig03_started, false);
  for (const [path, expected] of Object.entries(amendment.preserved_public_source_git_blobs)) {
    const bytes = fs.readFileSync(path);
    const sha = createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
    assert.equal(sha, expected, path + " changed after owner amendment");
  }
});

test("Chinese lexical identification compounds are not negation; real negation stays DEFER", async () => {
  const { authoredCurrentGoalScopeReason } = await import("../runtime/compositional_intent_graph_v1/authored_current_goal_scope.mjs");
  const router = createAuthoredTopicRouter(index);
  for (const current of ["请帮我设计品牌与视觉识别", "请帮我识别品牌与视觉识别", "请分别比较这些类别"]) {
    assert.equal(authoredCurrentGoalScopeReason(current), null);
  }
  for (const current of ["请别帮我设计品牌与视觉识别", "别识别品牌与视觉识别", "请不要识别品牌与视觉识别"]) {
    assert.equal(authoredCurrentGoalScopeReason(current), "NEGATED_CURRENT_SCOPE");
    assert.deepEqual(router.classify({ current }).topics, []);
  }
  assert.deepEqual(router.classify({ current: "请帮我设计品牌与视觉识别" }).topics, ["sys.creative_design.branding_identity"]);
});
