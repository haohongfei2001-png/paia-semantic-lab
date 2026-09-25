import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import path from "node:path";

const [dollyPath, alpacaPath, selfPath, outputPath = "artifacts/ci/cig02e-full-catalog-source-triage.json"] =
  process.argv.slice(2);
assert.ok(dollyPath && alpacaPath && selfPath, "three pinned public source paths required");
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
const manifest = JSON.parse(fs.readFileSync("semantic_profiles/v0.1/manifest.json", "utf8"));
const profiles = manifest.shards.flatMap(shard =>
  JSON.parse(fs.readFileSync(shard.path, "utf8")).profiles);
assert.equal(profiles.length, 144);
const topics = profiles.map(profile => {
  const phrases = [...new Set([profile.canonical_names.en, ...profile.lexical_anchors.en]
    .map(normalize).filter(x => x.length >= 3))];
  assert.ok(phrases.length);
  return {
    topic_id: profile.topic_id,
    patterns: phrases.map(pattern),
    counts: { dolly: 0, alpaca: 0, self_instruct: 0 },
    examples: { dolly: [], alpaca: [], self_instruct: [] }
  };
}).sort((a, b) => a.topic_id.localeCompare(b.topic_id));
assert.deepEqual(topics.map(x => x.topic_id), catalogIds.sort());
const sources = [
  { name: "dolly", rows: fs.readFileSync(dollyPath, "utf8").trim().split(/\r?\n/u).map(JSON.parse) },
  { name: "alpaca", rows: JSON.parse(fs.readFileSync(alpacaPath, "utf8")) },
  { name: "self_instruct", rows: fs.readFileSync(selfPath, "utf8").trim().split(/\r?\n/u).map(JSON.parse) }
];
assert.equal(sources[0].rows.length, 15011);
assert.equal(sources[1].rows.length, 52002);
assert.equal(sources[2].rows.length, 82439);
for (const source of sources) {
  const seen = new Set();
  for (let i = 0; i < source.rows.length; i++) {
    const instruction = source.rows[i].instruction;
    assert.equal(typeof instruction, "string");
    const normalized = normalize(instruction);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const digest = sha256(instruction);
    for (const topic of topics) {
      if (!topic.patterns.some(re => re.test(normalized))) continue;
      topic.counts[source.name]++;
      const samples = topic.examples[source.name];
      samples.push({ source_row: source.name + ":" + (i + 1),
        instruction_sha256: digest,
        excerpt: instruction.replace(/\s+/gu, " ").slice(0, 140) });
      samples.sort((a, b) => a.instruction_sha256.localeCompare(b.instruction_sha256));
      if (samples.length > 3) samples.length = 3;
    }
  }
}
const queue = topics.map(topic => {
  const selected = [];
  const selectedHashes = new Set();
  for (const sourceName of ["dolly", "alpaca", "self_instruct"]) {
    for (const item of topic.examples[sourceName]) {
      if (selected.length >= 3) break;
      if (selectedHashes.has(item.instruction_sha256)) continue;
      selected.push(item);
      selectedHashes.add(item.instruction_sha256);
    }
  }
  const entry = {
    topic_id: topic.topic_id,
    lexical_candidate_counts: topic.counts,
    selected_source_rows: selected.map(({source_row, instruction_sha256}) =>
      ({source_row, instruction_sha256})),
    adjudication_status: "UNREVIEWED_SOURCE_ONLY"
  };
  console.log(JSON.stringify({
    classification: "FULL_CATALOG_SOURCE_TRIAGE_NOT_GOLD_OR_CAPABILITY",
    ...entry, sampled_excerpts: selected
  }));
  return entry;
});
const zero = queue.filter(x => Object.values(x.lexical_candidate_counts).every(n => n === 0))
  .map(x => x.topic_id);
const result = {
  format: "cig02e-full-catalog-source-triage-v1",
  classification: "SOURCE_RETRIEVAL_ONLY_NOT_GOLD_OR_CAPABILITY",
  source_commits: {
    dolly: "6d7ebf384c5e588ee1b0dff816557489bc16089c",
    alpaca: "761dc5bfbdeeffa89b8bff5d038781a4055f796a",
    self_instruct: "0b26ccaa415992100fa32df62d41b994cf928e23"
  },
  formal_topics: 144, topics_without_lexical_candidate: zero,
  queue, candidate_predictions_read: 0, gold_rows_created: 0,
  dev_scores_computed: 0, capability_test_rows_read: 0,
  private_artifact_reads: 0, legacy_evaluation_reads: 0,
  consumed_lockbox_reads: 0, real_paia_archive_reads: 0,
  interpretation: "Deterministic source-review queue only. Lexical retrieval and sampled excerpts are not adjudicated coverage, gold labels, DEV scores or capability."
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({
  classification: result.classification,
  formal_topics: result.formal_topics,
  topics_without_lexical_candidate: zero,
  source_rows: sources.map(x => ({source: x.name, rows: x.rows.length}))
}));
