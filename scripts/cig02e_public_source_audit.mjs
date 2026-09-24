import fs from "node:fs";
import assert from "node:assert/strict";

const catalogPath = "catalog/system_topic_catalog_v0.2.yaml";
const manifestPath = "semantic_profiles/v0.1/manifest.json";
const receiptPath = "artifacts/compositional-intent-graph-v1/CIG-02E_PUBLIC_SOURCE_AUDIT.json";
const catalog = fs.readFileSync(catalogPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const catalogIds = [...catalog.matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(match => match[1]);
assert.equal(catalogIds.length, 144, "formal Catalog must have 144 Topics");
assert.equal(new Set(catalogIds).size, 144, "Catalog IDs must be unique");
assert.equal(manifest.profile_count, 144, "profile manifest must have 144 Topics");
assert.equal(manifest.shards.length, 6, "unexpected profile shard count");

const profiles = [];
for (const shard of manifest.shards) {
  assert.match(shard.path, /^semantic_profiles\/v0\.1\/system_topics_shard_0[1-6]\.json$/);
  const data = JSON.parse(fs.readFileSync(shard.path, "utf8"));
  assert.equal(data.profile_count, 24, "unexpected shard count");
  assert.equal(data.profiles.length, 24, "unexpected shard length");
  profiles.push(...data.profiles);
}
assert.equal(profiles.length, 144);
const byId = new Map(profiles.map(profile => [profile.topic_id, profile]));
assert.equal(byId.size, 144, "profile IDs must be unique");
for (const id of catalogIds) assert.ok(byId.has(id), "missing profile: " + id);

const anchorTopics = new Map();
const missing = [];
const normalize = raw => String(raw).normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
for (const profile of profiles) {
  if (!profile.canonical_names?.en || !profile.canonical_names?.zh ||
      !profile.semantic_core?.[0] || !profile.semantic_core?.[1]) missing.push(profile.topic_id);
  assert.deepEqual(profile.provenance.source_classes,
    ["FORMAL_CATALOG", "GENERAL_SEMANTIC_REASONING"],
    "unapproved source class: " + profile.topic_id);
  assert.equal(profile.provenance.formal_fields_overridden, false);
  for (const lang of ["en", "zh"]) {
    assert.ok(Array.isArray(profile.lexical_anchors?.[lang]), "missing anchors: " + profile.topic_id);
    for (const raw of profile.lexical_anchors[lang]) {
      const key = lang + ":" + normalize(raw);
      assert.ok(key.length > 3, "empty or trivial anchor");
      const topics = anchorTopics.get(key) ?? new Set();
      topics.add(profile.topic_id);
      anchorTopics.set(key, topics);
    }
  }
}
const shared = [...anchorTopics].filter(([, topics]) => topics.size > 1)
  .map(([anchor, topics]) => ({anchor, topics: [...topics]}));
assert.deepEqual(missing, receipt.profiles_missing_names_or_core);
assert.equal(profiles.length, receipt.topic_count);
assert.equal(byId.size, receipt.unique_topic_ids);
assert.equal(anchorTopics.size, receipt.distinct_language_qualified_anchors);
assert.deepEqual(shared, receipt.shared_anchors);
assert.equal(shared.length, receipt.shared_anchor_count);
assert.equal(receipt.classification, "SOURCE_INVENTORY_ONLY_NOT_CAPABILITY");
assert.equal(receipt.dev_rows_read, 0);
assert.equal(receipt.capability_test_rows_read, 0);
console.log(JSON.stringify({
  classification: receipt.classification, topic_count: profiles.length,
  distinct_language_qualified_anchors: anchorTopics.size,
  shared_anchor_count: shared.length, dev_rows_read: 0, capability_test_rows_read: 0
}));
