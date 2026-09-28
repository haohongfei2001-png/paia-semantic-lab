import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { validateAuthoredTrain } from "./cig02g_train_contract.mjs";
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const norm = value => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
// Fixed allowlist. Neither DEV nor TEST is an argument or a compiler dependency.
const basePath = ".cig02e-index.json";
const trainPath = "fixtures/cig_v1/cig02g_train_v1.json";
const catalogPath = "catalog/system_topic_catalog_v0.2.yaml";
const baseBytes = fs.readFileSync(basePath);
const trainBytes = fs.readFileSync(trainPath);
const catalogBytes = fs.readFileSync(catalogPath);
const ids = [...catalogBytes.toString("utf8").matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(x => x[1]);
const base = JSON.parse(baseBytes);
assert.equal(base.format, "cig02e-typed-frame-index-v1");
assert.equal(base.topic_count, 144);
assert.equal(base.provenance.dev_rows_read, 0);
assert.equal(base.provenance.capability_test_rows_read, 0);
assert.equal(base.provenance.catalog_sha256, hash(catalogBytes));
assert.deepEqual(base.topics.map(x => x.topic_id).sort(), [...ids].sort());
const train = validateAuthoredTrain(JSON.parse(trainBytes), ids);
const authored = new Map(train.topics.map(x => [x.topic_id, x]));
const topics = base.topics.map(topic => {
  const extra = authored.get(topic.topic_id);
  const roles = structuredClone(topic.roles);
  for (const role of ["ACTION", "OBJECT"]) {
    roles[role].en = [...new Set([...roles[role].en, ...extra.roles[role].en.map(norm)])].sort();
  }
  return { ...topic, roles };
});
const index = {
  format: "cig02g-authored-frame-index-v1", topic_count: 144,
  provenance: {
    build_rule: "PUBLIC_FRAME_PLUS_ALLOWLISTED_AUTHORED_TRAIN_V1",
    base_index_sha256: hash(baseBytes), catalog_sha256: hash(catalogBytes),
    train_path: trainPath, train_sha256: hash(trainBytes),
    train_topics: 144, dev_rows_read: 0, capability_test_rows_read: 0,
    natural_source_readiness_is_runtime_eligibility: false
  },
  topics
};
const output = JSON.stringify(index) + "\n";
assert.ok(Buffer.byteLength(output) <= 1048576, "index exceeds 1 MiB");
fs.writeFileSync(".cig02g-index.json", output);
console.log("CIG02G_COMPILE_JSON=" + JSON.stringify({
  index_bytes: Buffer.byteLength(output), index_sha256: hash(output),
  topic_count: 144, dev_rows_read: 0, capability_test_rows_read: 0,
  classification: "AUTHORED_TRAIN_COMPILE_NOT_CAPABILITY"
}));
