import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import path from "node:path";

const dataPath = process.argv[2] ?? ".cig02e-dolly-source.jsonl";
const outputPath = process.argv[3] ?? "artifacts/ci/cig02e-dolly-source-inventory.json";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase()
  .replace(/\s+/gu, " ").trim();
function pattern(phrase) {
  const escaped = phrase.replace(/[.*+?^$()|[\]{}\\]/gu, "\\$&");
  return new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "u");
}

const catalog = fs.readFileSync("catalog/system_topic_catalog_v0.2.yaml", "utf8");
const catalogIds = [...catalog.matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(match => match[1]);
assert.equal(catalogIds.length, 144);
assert.equal(new Set(catalogIds).size, 144);
const manifest = JSON.parse(fs.readFileSync("semantic_profiles/v0.1/manifest.json", "utf8"));
assert.equal(manifest.shards.length, 6);
const profiles = manifest.shards.flatMap(shard => {
  assert.match(shard.path, /^semantic_profiles\/v0\.1\/system_topics_shard_0[1-6]\.json$/u);
  return JSON.parse(fs.readFileSync(shard.path, "utf8")).profiles;
});
assert.equal(profiles.length, 144);
const byId = new Map(profiles.map(profile => [profile.topic_id, profile]));
assert.equal(byId.size, 144);
assert.deepEqual([...byId.keys()].sort(), catalogIds.sort());
const topicQueries = [...byId].sort(([a], [b]) => a.localeCompare(b)).map(([topicId, profile]) => {
  const names = [profile.canonical_names.en, ...profile.lexical_anchors.en];
  const phrases = [...new Set(names.map(normalize).filter(value => value.length >= 3))];
  assert.ok(phrases.length, "missing English public-source anchor");
  return { topic_id: topicId, patterns: phrases.map(pattern) };
});

const dataBytes = fs.readFileSync(dataPath);
const lines = dataBytes.toString("utf8").trim().split(/\r?\n/u);
assert.ok(lines.length >= 15000 && lines.length <= 16000, "unexpected Dolly source size");
const counts = new Map(topicQueries.map(topic => [topic.topic_id, 0]));
let nonempty = 0;
let matchedRows = 0;
for (const line of lines) {
  const row = JSON.parse(line);
  assert.equal(typeof row.instruction, "string", "missing public instruction");
  const instruction = normalize(row.instruction);
  if (!instruction) continue;
  nonempty++;
  let matched = false;
  for (const topic of topicQueries) {
    if (topic.patterns.some(re => re.test(instruction))) {
      counts.set(topic.topic_id, counts.get(topic.topic_id) + 1);
      matched = true;
    }
  }
  if (matched) matchedRows++;
}
const perTopic = Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
const zero = [...counts].filter(([, count]) => count === 0).map(([id]) => id);
const result = {
  format: "cig02e-dolly-public-source-retrieval-inventory-v1",
  classification: "SOURCE_RETRIEVAL_ONLY_NOT_GOLD_OR_CAPABILITY",
  upstream: "Databricks Dolly 15k, public GitHub mirror buayism/dolly-15k-dataset",
  upstream_commit: "6d7ebf384c5e588ee1b0dff816557489bc16089c",
  upstream_blob_sha1: "7c507d16b055ae32107a6dd0585779678565dcd2",
  upstream_license_declared: "CC-BY-SA-3.0",
  data_sha256: sha256(dataBytes),
  source_rows: lines.length,
  nonempty_instruction_rows: nonempty,
  lexical_retrieval_matched_rows: matchedRows,
  formal_topics: 144,
  topics_with_any_lexical_candidate: 144 - zero.length,
  topics_without_lexical_candidate: zero,
  lexical_candidate_count_by_topic: perTopic,
  interpretation: "Source-only recall probe. Lexical hits are not gold labels, router assignments, DEV coverage, or capability evidence. Zero lexical hits do not prove semantic absence.",
  candidate_predictions_read: 0,
  gold_rows_created: 0,
  dev_scores_computed: 0,
  capability_test_rows_read: 0,
  private_artifact_reads: 0,
  legacy_evaluation_reads: 0,
  consumed_lockbox_reads: 0,
  real_paia_archive_reads: 0
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({
  classification: result.classification,
  source_rows: result.source_rows,
  topics_with_any_lexical_candidate: result.topics_with_any_lexical_candidate,
  topics_without_lexical_candidate: zero.length,
  data_sha256: result.data_sha256
}));
