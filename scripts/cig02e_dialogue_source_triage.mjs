import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const [sourcePath, outputPath = "artifacts/ci/cig02e-dialogue-source-triage.json"] = process.argv.slice(2);
assert.ok(sourcePath, "pinned DailyDialog text path required");
const sourceCommit = "d74f69c3184b1771f5f92bd06bebffbe42b541bb";
const sourceBlob = "22674013988cfca4cf2069f6971ad6b049a9d79d";
const selected = [
  "sys.family_relationships.caregiving_family_support",
  "sys.finance_purchases.major_purchases",
  "sys.knowledge_memory.personal_archive",
  "sys.knowledge_memory.photos_media_archive",
  "sys.knowledge_memory.provenance_history",
  "sys.personal_direction.life_planning",
  "sys.projects_products.product_requirements",
  "sys.travel_places.trip_records"
];
const norm = value => String(value ?? "").normalize("NFKC").toLowerCase()
  .replace(/[^a-z0-9]+/gu, " ").trim().replace(/ +/gu, " ");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const matches = (utterance, phrase) => (" " + utterance + " ").includes(" " + phrase + " ");
assert.equal(matches(norm("I need a photo archive."), norm("photo archive")), true);
assert.equal(matches(norm("photography"), norm("photo")), false);

const manifest = JSON.parse(fs.readFileSync("semantic_profiles/v0.1/manifest.json", "utf8"));
const profiles = manifest.shards.flatMap(shard =>
  JSON.parse(fs.readFileSync(shard.path, "utf8")).profiles);
assert.equal(profiles.length, 144);
const profileById = new Map(profiles.map(profile => [profile.topic_id, profile]));
assert.equal(profileById.size, 144);
const topics = selected.map(topicId => {
  const profile = profileById.get(topicId);
  assert.ok(profile, "missing formal Topic " + topicId);
  const phrases = [...new Set([profile.canonical_names.en, ...profile.lexical_anchors.en]
    .map(norm).filter(x => x.length >= 3))];
  assert.ok(phrases.length, "no public anchors for " + topicId);
  return { topic_id: topicId, phrases, count: 0, samples: [] };
});

const lines = fs.readFileSync(sourcePath, "utf8").trim().split(/\r?\n/u);
assert.ok(lines.length > 10000, "unexpectedly small source");
let utteranceCount = 0;
let uniqueCount = 0;
const seen = new Set();
for (let row = 0; row < lines.length; row++) {
  const turns = lines[row].split("__eou__").map(x => x.trim()).filter(Boolean);
  for (let turn = 0; turn < turns.length; turn++) {
    utteranceCount++;
    const utterance = turns[turn];
    const normalized = norm(utterance);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueCount++;
    for (const topic of topics) {
      if (!topic.phrases.some(phrase => matches(normalized, phrase))) continue;
      topic.count++;
      topic.samples.push({
        source_row: "daily_dialog:" + (row + 1) + ":" + (turn + 1),
        utterance_sha256: hash(utterance),
        excerpt: utterance.replace(/\s+/gu, " ").slice(0, 120)
      });
      topic.samples.sort((a, b) => a.utterance_sha256.localeCompare(b.utterance_sha256));
      if (topic.samples.length > 3) topic.samples.length = 3;
    }
  }
}
const result = {
  format: "cig02e-dialogue-source-triage-v1",
  classification: "SOURCE_DISCOVERY_ONLY_NOT_GOLD_OR_CAPABILITY",
  source_repo: "diixo/daily-dialogs-dataset",
  source_commit: sourceCommit,
  source_path: "dataset/dialogues_text.txt",
  source_blob: sourceBlob,
  source_licence_claim: "CC-BY-NC-SA-4.0 in mirror README; reuse chain not adjudicated",
  selected_sparse_topics: selected.length,
  dialogue_rows: lines.length,
  utterance_turns: utteranceCount,
  unique_normalized_turns: uniqueCount,
  topics: topics.map(topic => ({
    topic_id: topic.topic_id,
    lexical_candidate_count: topic.count,
    selected_source_rows: topic.samples.map(({source_row, utterance_sha256}) =>
      ({source_row, utterance_sha256})),
    adjudication_status: "UNREVIEWED_SOURCE_ONLY"
  })),
  candidate_predictions_read: 0,
  gold_rows_created: 0,
  dev_scores_computed: 0,
  capability_test_rows_read: 0,
  private_artifact_reads: 0,
  legacy_evaluation_reads: 0,
  consumed_lockbox_reads: 0,
  real_paia_archive_reads: 0,
  interpretation: "Dialogue-turn lexical discovery only; turns may be scripted, background, or unrelated to the formal Topic. No source row qualifies as DEV or gold without full independent adjudication."
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
for (const topic of topics) console.log(JSON.stringify({
  classification: result.classification,
  topic_id: topic.topic_id,
  lexical_candidate_count: topic.count,
  sampled_excerpts: topic.samples
}));
console.log(JSON.stringify({ classification: result.classification,
  dialogue_rows: result.dialogue_rows, utterance_turns: utteranceCount,
  unique_normalized_turns: uniqueCount }));
