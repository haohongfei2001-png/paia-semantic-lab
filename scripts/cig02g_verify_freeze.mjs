import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const dir = "artifacts/compositional-intent-graph-v1/";
const freeze = JSON.parse(fs.readFileSync(dir + "CIG-02G_CANDIDATE_FREEZE.json", "utf8"));
const resultPath = dir + "CIG-02G_DEV_RESULT.json";
const resultBytes = fs.readFileSync(resultPath);
const result = JSON.parse(resultBytes);
const blob = bytes => crypto.createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
assert.equal(freeze.format, "CIG02G_CANDIDATE_FREEZE_V1");
assert.equal(freeze.cig02_status, "COMPLETE_FROZEN_DEV_READY_NOT_CAPABILITY");
assert.equal(freeze.cig03_test_started, false);
assert.equal(result.full_capability_verdict, "NOT_EVALUATED");
assert.equal(result.classification, "SAME_WRITER_AUTHORED_DEV_NOT_INDEPENDENT_CAPABILITY");
assert.equal(result.capability_test_rows_read, 0);
assert.equal(result.topic_count, 144);
assert.equal(result.single_label_cases, 288);
assert.equal(result.safety_cases, 36);
assert.equal(result.context_pairs, 72);
assert.equal(result.github_sha, freeze.dev_evidence.workflow_event_ref_sha);
assert.equal(blob(resultBytes), freeze.dev_evidence.result_git_blob_sha);
for (const [path, expected] of Object.entries(freeze.source_git_blobs)) {
  assert.equal(blob(fs.readFileSync(path)), expected, "frozen source changed: " + path);
}
const indexBytes = fs.readFileSync(".cig02g-index.json");
assert.equal(sha256(indexBytes), freeze.index_sha256);
assert.equal(sha256(indexBytes), result.source_sha256.index);
assert.equal(indexBytes.length, 76827);
const m = result.metrics;
const gates = {
  assigned_precision: m.assigned_precision >= 0.95,
  auto_assignment_coverage: m.auto_assignment_coverage >= 0.70,
  topic_macro_recall: m.topic_macro_recall >= 0.70,
  insufficient_false_assignment: m.insufficient_false_assignment <= 0.02,
  context_harm: m.context_harm === 0,
  deterministic_repeat: m.nondeterministic_repeats === 0
};
assert.ok(Object.values(gates).every(Boolean), "unchanged DEV floor not met");
assert.deepEqual(gates, result.gates);
assert.equal(result.failures.length, 9, "preserved DEV misses changed");
assert.ok(indexBytes.length <= 1048576);
const runtimePaths = Object.keys(result.source_sha256.runtime);
const runtimeBytes = runtimePaths.reduce((sum, path) => {
  const bytes = fs.readFileSync(path);
  assert.equal(sha256(bytes), result.source_sha256.runtime[path], "scored runtime changed");
  return sum + bytes.length;
}, 0);
assert.equal(runtimeBytes + indexBytes.length, result.router_plus_index_bytes);
assert.ok(runtimeBytes + indexBytes.length <= 2097152);
console.log("CIG02G_FREEZE_VERIFIED_JSON=" + JSON.stringify({
  candidate_head_sha: freeze.candidate_head_sha, candidate_merged_main_sha: freeze.candidate_merged_main_sha,
  dev_result_git_blob_sha: freeze.dev_evidence.result_git_blob_sha,
  source_files_verified: Object.keys(freeze.source_git_blobs).length,
  index_sha256: freeze.index_sha256, classification: freeze.cig02_status,
  synthetic_dev_rescored: false, capability_test_started: false
}));
