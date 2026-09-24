import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { createRouter } from "../runtime/lightweight_router_v1/router.mjs";

const indexPath = process.env.LSR01_INDEX ?? "artifacts/ci/lsr01-topic-index.json";
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const router = createRouter(index);

test("full catalog and deterministic ranking", () => {
  assert.equal(router.topicCount, 144);
  const first = router.rank("睡眠", { candidate: "B", limit: 10 });
  const second = router.rank("睡眠", { candidate: "B", limit: 10 });
  assert.deepEqual(first, second);
  assert.equal(first[0].topic_id, "sys.health_wellbeing.sleep");
});

test("blank and acknowledgement are UNASSIGNED", () => {
  assert.equal(
    router.classify({ current: "" }, { candidate: "B", threshold: 0.5 }).state,
    "UNASSIGNED",
  );
  assert.equal(
    router.classify({ current: "好的。" }, { candidate: "B", threshold: 0.5 }).state,
    "UNASSIGNED",
  );
});

test("strong current evidence is not overridden by stale title", () => {
  const result = router.classify(
    {
      current: "睡眠",
      title: "面试",
      recent_user_inputs: ["明天还有一场面试。"],
    },
    { candidate: "B", threshold: 0.5 },
  );
  assert.equal(result.state, "ASSIGNED");
  assert.deepEqual(result.topics, ["sys.health_wellbeing.sleep"]);
});

test("ordinary context cannot manufacture eligibility from unrelated current", () => {
  const result = router.classify(
    {
      current: "qzxv completely unrelated token",
      title: "睡眠",
      recent_user_inputs: ["睡眠"],
    },
    { candidate: "B", threshold: 0.5 },
  );
  assert.notEqual(result.state, "ASSIGNED");
});

test("content-poor continuation can use a clear title fallback", () => {
  const result = router.classify(
    { current: "继续", title: "睡眠", recent_user_inputs: [] },
    { candidate: "B", threshold: 0.5 },
  );
  assert.equal(result.state, "ASSIGNED");
  assert.deepEqual(result.topics, ["sys.health_wellbeing.sleep"]);
  assert.equal(result.reason, "TITLE_ONLY_FALLBACK");
});

test("ambiguous ordinal reference defers instead of inheriting", () => {
  const result = router.classify(
    {
      current: "那第二个呢？",
      title: "求职",
      recent_user_inputs: ["我在比较两个方向。"],
    },
    { candidate: "B", threshold: 0.5 },
  );
  assert.equal(result.state, "DEFER");
  assert.deepEqual(result.topics, []);
});

test("production index excludes mixed domain paths and synthetic text", () => {
  assert.ok(index.excluded_scoring_sources.includes("synthetic_utterance_patterns"));
  for (const topic of index.topics) {
    assert.equal("domain" in topic, false);
    for (const values of Object.values(topic.fields.names_anchors)) {
      assert.ok(values.every((value) => !value.includes(">")));
    }
  }
});
