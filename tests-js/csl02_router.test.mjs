import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import test from "node:test";
import { createCompiledRouter } from "../runtime/compiled_semantic_v1/router.mjs";

const index = JSON.parse(fs.readFileSync("artifacts/compiled-semantic-lexicon-v1/CSL-01_INDEX.json", "utf8"));
const router = createCompiledRouter(index, { minimumWeight: 3, margin: 0.25 });
const freeze = JSON.parse(fs.readFileSync("artifacts/compiled-semantic-lexicon-v1/CSL-02_PRE_BLIND_FREEZE.json", "utf8"));

test("pre-blind hashes bind the exact index and runtime", () => {
  const sha = path => crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
  assert.equal(freeze.index_sha256, sha("artifacts/compiled-semantic-lexicon-v1/CSL-01_INDEX.json"));
  assert.equal(freeze.runtime_sha256, sha("runtime/compiled_semantic_v1/router.mjs"));
  assert.equal(freeze.evaluator_manifest_sha256, sha("artifacts/compiled-semantic-lexicon-v1/CSL-00_EVALUATOR_MANIFEST.json"));
  assert.equal(freeze.public_dev_sha256, sha("fixtures/compiled_semantic_v1/public_dev.tsv"));
  assert.equal(freeze.dev_selection_qualified, false);
  assert.equal(freeze.blind_test_reads, 0);
});

test("full Catalog, deterministic output and no network dependency", () => {
  assert.equal(router.topicCount, 144);
  const input = { current: "这个积分变换为什么成立，请推导" };
  assert.deepEqual(router.classify(input), router.classify(input));
  assert.equal(router.classify({ current: "qzxv 9841" }).state, "DEFER");
});

test("current evidence cannot be replaced by a stale title", () => {
  const current = router.classify({ current: "这个积分变换为什么成立，请推导" });
  const titled = router.classify({ current: "这个积分变换为什么成立，请推导", title: "家庭关系" });
  assert.deepEqual(titled, current);
});

test("content-poor continuation needs a clear anchor and acknowledgement is unassigned", () => {
  assert.equal(router.classify({ current: "好" }).state, "UNASSIGNED");
  assert.equal(router.classify({ current: "继续" }).state, "DEFER");
  assert.equal(router.classify({ current: "继续", title: "qzxv 9841" }).state, "DEFER");
});
