import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import path from "node:path";

const dataPath = process.argv[2] ?? ".cig02e-self-instruct-source.jsonl";
const outputPath = process.argv[3] ?? "artifacts/ci/cig02e-self-instruct-source-inventory.json";
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase()
  .replace(/\s+/gu, " ").trim();
function phrasePattern(phrase) {
  const escaped = phrase.replace(/[.*+?^$()|[\]{}\\]/gu, "\\$&");
  return new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "u");
}

const catalog = fs.readFileSync("catalog/system_topic_catalog_v0.2.yaml", "utf8");
const catalogIds = [...catalog.matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(match => match[1]);
assert.equal(catalogIds.length, 144);
const manifest = JSON.parse(fs.readFileSync("semantic_profiles/v0.1/manifest.json", "utf8"));
const profiles = manifest.shards.flatMap(shard => JSON.parse(fs.readFileSync(shard.path, "utf8")).profiles);
assert.equal(profiles.length, 144);
const topicQueries = profiles.map(profile => {
  const phrases = [...new Set([profile.canonical_names.en, ...profile.lexical_anchors.en]
    .map(normalize).filter(value => value.length >= 3))];
  assert.ok(phrases.length);
  return { topic_id: profile.topic_id, patterns: phrases.map(phrasePattern) };
}).sort((a, b) => a.topic_id.localeCompare(b.topic_id));
assert.deepEqual(topicQueries.map(x => x.topic_id).sort(), catalogIds.sort());

const broadQueries = [
  { topic_id: "sys.family_relationships.caregiving_family_support",
    cues: [/\b(?:parent|mother|father|grandparent|elderly|caregiver|family member)\b/iu,
      /\b(?:care|support|help|look after|assist|nursing)\b/iu] },
  { topic_id: "sys.finance_purchases.major_purchases",
    cues: [/\b(?:buy|purchase|shopping|replace|acquire)\b/iu,
      /\b(?:car|house|home|appliance|laptop|vehicle|expensive|budget|cost|price)\b/iu] },
  { topic_id: "sys.knowledge_memory.photos_media_archive",
    cues: [/\b(?:photo|picture|image|video|media)\b/iu,
      /\b(?:organize|sort|archive|store|backup|catalog|album|library)\b/iu] }
];
const bytes = fs.readFileSync(dataPath);
const lines = bytes.toString("utf8").trim().split(/\r?\n/u);
assert.ok(lines.length >= 80000 && lines.length <= 85000, "unexpected source row count");
const unique = new Map();
for (let i = 0; i < lines.length; i++) {
  const row = JSON.parse(lines[i]);
  assert.equal(typeof row.instruction, "string");
  const instruction = row.instruction.trim();
  if (instruction && !unique.has(instruction)) unique.set(instruction, i + 1);
}
const counts = new Map(topicQueries.map(topic => [topic.topic_id, 0]));
const broad = new Map(broadQueries.map(query => [query.topic_id, []]));
let matchedRows = 0;
for (const [instruction, sourceLine] of unique) {
  const normalized = normalize(instruction);
  let matched = false;
  for (const topic of topicQueries) {
    if (topic.patterns.some(re => re.test(normalized))) {
      counts.set(topic.topic_id, counts.get(topic.topic_id) + 1);
      matched = true;
    }
  }
  if (matched) matchedRows++;
  for (const query of broadQueries) {
    if (!query.cues.every(re => re.test(instruction))) continue;
    broad.get(query.topic_id).push({
      source_row: "self-instruct:" + sourceLine,
      instruction_sha256: sha256(instruction),
      excerpt: instruction.replace(/\s+/gu, " ").slice(0, 220)
    });
  }
}
const zero = [...counts].filter(([, count]) => count === 0).map(([id]) => id);
const result = {
  format: "cig02e-self-instruct-public-source-retrieval-inventory-v1",
  classification: "SOURCE_RETRIEVAL_ONLY_NOT_GOLD_OR_CAPABILITY",
  upstream: "Self-Instruct public model-generated instructions, yizhongw/self-instruct",
  upstream_commit: "0b26ccaa415992100fa32df62d41b994cf928e23",
  upstream_blob_sha1: "ccceb2677cbafcac4c996be47520b5581dd10295",
  upstream_repo_license_declared: "Apache-2.0",
  upstream_quality_caveat: "README reports quality problems in 46% of a 200-instruction sample; every candidate needs independent adjudication.",
  data_sha256: sha256(bytes),
  source_rows: lines.length,
  unique_nonempty_instructions: unique.size,
  lexical_retrieval_matched_unique_instructions: matchedRows,
  formal_topics: 144,
  topics_with_any_lexical_candidate: 144 - zero.length,
  topics_without_lexical_candidate: zero,
  lexical_candidate_count_by_topic: Object.fromEntries(counts),
  broad_query_candidate_count_by_topic: Object.fromEntries(
    [...broad].map(([id, items]) => [id, items.length])),
  interpretation: "Source-only recall probe. Neither lexical nor broad hits are gold, DEV coverage, router results or capability evidence.",
  candidate_predictions_read: 0, gold_rows_created: 0, dev_scores_computed: 0,
  capability_test_rows_read: 0, private_artifact_reads: 0,
  legacy_evaluation_reads: 0, consumed_lockbox_reads: 0, real_paia_archive_reads: 0
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({
  classification: result.classification, source_rows: result.source_rows,
  unique_nonempty_instructions: result.unique_nonempty_instructions,
  topics_with_any_lexical_candidate: result.topics_with_any_lexical_candidate,
  topics_without_lexical_candidate_ids: zero, data_sha256: result.data_sha256
}));
for (const [id, items] of broad) {
  items.sort((a, b) => a.instruction_sha256.localeCompare(b.instruction_sha256));
  console.log(JSON.stringify({
    classification: "SOURCE_REVIEW_DISCOVERY_NOT_GOLD_OR_CAPABILITY",
    topic_id: id, broad_query_candidate_count: items.length,
    sampled_excerpts: items.slice(0, 8)
  }));
}
