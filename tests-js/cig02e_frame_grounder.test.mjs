import test from "node:test";
import assert from "node:assert/strict";
import { createFrameGrounder } from "../runtime/compositional_intent_graph_v1/frame_grounder.mjs";

function fixture() {
  const topics = Array.from({ length: 144 }, (_, i) => ({
    topic_id: "test.topic." + String(i).padStart(3, "0"),
    source_frame_path: "public/source/" + String(i),
    names: { zh: "测试话题" + String(i), en: "synthetic topic " + String(i) },
    roles: {
      ACTION: { zh: ["测试动作" + String(i)], en: ["synthetic action " + String(i)] },
      OBJECT: { zh: ["测试对象" + String(i)], en: ["synthetic object " + String(i)] },
      OUTCOME: { zh: ["测试结果" + String(i)], en: ["synthetic outcome " + String(i)] }
    }
  }));
  topics[0].names.en = "alpha topic";
  topics[0].roles.ACTION.en = ["back up"];
  topics[0].roles.OBJECT.en = ["data"];
  topics[0].roles.OUTCOME.en = ["restore"];
  topics[1].names.en = "beta topic";
  topics[1].roles.ACTION.en = ["archive"];
  topics[1].roles.OBJECT.en = ["music"];
  topics[1].roles.OUTCOME.en = ["listen"];
  topics[2].roles.ACTION.en = ["train"];
  topics[2].roles.OBJECT.en = ["animal"];
  topics[3].roles.ACTION.en = ["train"];
  topics[3].roles.OBJECT.en = ["body"];
  return { format: "cig02e-typed-frame-index-v1", topic_count: 144, topics };
}
const index = fixture();
const router = createFrameGrounder(index);

test("assigns only with current request and paired typed evidence", () => {
  assert.deepEqual(router.classify({ current: "I want to back up data" }).topics, ["test.topic.000"]);
  assert.deepEqual(router.classify({ current: "Please back up data" }).topics, ["test.topic.000"]);
  assert.deepEqual(router.classify({ current: "The data are in a folder" }).topics, []);
  assert.deepEqual(router.classify({ current: "I want to back up" }).topics, []);
  assert.deepEqual(router.classify({ current: "Only quoting: I want to back up data" }).topics, []);
});

test("shared phrase, competing formal names and means do not force assignment", () => {
  assert.deepEqual(router.classify({ current: "I want to train" }).topics, []);
  assert.deepEqual(router.classify({ current: "I want to train animal" }).topics, ["test.topic.002"]);
  assert.equal(router.classify({ current: "I want to compare alpha topic and beta topic" }).reason,
    "COMPETING_FORMAL_NAMES");
  assert.deepEqual(router.classify({ current: "Use music to improve data" }).topics, []);
});

test("context is not assignment evidence and repeated outputs are deterministic", () => {
  const current = "I want to back up data";
  const plain = router.classify({ current });
  const contextual = router.classify({ current, context: "Beta topic and music were mentioned earlier." });
  assert.deepEqual(contextual, plain);
  assert.deepEqual(router.classify({ current }), plain);
});

test("rejects incomplete or duplicate full-Catalog indexes", () => {
  assert.throws(() => createFrameGrounder({ ...index, topic_count: 143 }));
  const duplicate = fixture();
  duplicate.topics[1].topic_id = duplicate.topics[0].topic_id;
  assert.throws(() => createFrameGrounder(duplicate));
});
