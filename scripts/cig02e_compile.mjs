import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const frameDir = "semantic_frames/cig02e_v1";
const manifestPath = "semantic_profiles/v0.1/manifest.json";
const catalogPath = "catalog/system_topic_catalog_v0.2.yaml";
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const read = path => fs.readFileSync(path);
const normalize = value => String(value).normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();

const catalogBytes = read(catalogPath);
const catalogIds = [...catalogBytes.toString("utf8").matchAll(/^  - topic_id: ([^\s]+)$/gm)]
  .map(match => match[1]);
assert.equal(catalogIds.length, 144, "formal Catalog must have 144 Topics");
assert.equal(new Set(catalogIds).size, 144, "duplicate formal Topic");
const catalogSet = new Set(catalogIds);

const manifestBytes = read(manifestPath);
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.profile_count, 144, "public profile manifest changed");
assert.equal(manifest.shards.length, 6, "public profile shard count changed");
const sourceShas = {};
const profiles = new Map();
for (let i = 0; i < 6; i++) {
  const path = "semantic_profiles/v0.1/system_topics_shard_0" + (i + 1) + ".json";
  assert.equal(manifest.shards[i].path, path, "unexpected public profile path");
  const bytes = read(path);
  sourceShas[path] = sha256(bytes);
  const source = JSON.parse(bytes);
  assert.equal(source.profiles.length, 24, "public profile shard size changed");
  for (const profile of source.profiles) {
    assert.ok(!profiles.has(profile.topic_id), "duplicate public profile Topic");
    assert.equal(profile.status, "DRAFT", "unexpected profile status");
    assert.deepEqual(profile.provenance.source_classes,
      ["FORMAL_CATALOG", "GENERAL_SEMANTIC_REASONING"], "unapproved profile source");
    assert.equal(profile.provenance.formal_fields_overridden, false,
      "formal fields overridden");
    profiles.set(profile.topic_id, { profile, path });
  }
}
assert.equal(profiles.size, 144, "public profiles incomplete");
assert.deepEqual([...profiles.keys()].sort(), [...catalogSet].sort(),
  "profile/Catalog Topic mismatch");

const expectedFiles = [
  "personal_direction_d01.json", "family_relationships_d02.json",
  "health_wellbeing_d03.json", "education_learning_d04.json",
  "career_work_d05.json", "projects_products_d06.json",
  "ai_computing_d07.json", "finance_purchases_d08.json",
  "home_daily_d09.json", "travel_places_d10.json",
  "media_culture_d11.json", "communication_writing_d12.json",
  "legal_civic_d13.json", "science_technical_d14.json",
  "creative_design_d15.json", "business_entrepreneurship_d16.json",
  "time_events_d17.json", "knowledge_memory_d18.json"
];
assert.deepEqual(fs.readdirSync(frameDir).filter(name => name.endsWith(".json")).sort(),
  [...expectedFiles].sort(), "unexpected frame source files");
const frameShas = {};
const topics = [];
const seen = new Set();
for (const filename of expectedFiles) {
  const path = frameDir + "/" + filename;
  const bytes = read(path);
  frameShas[path] = sha256(bytes);
  const authored = JSON.parse(bytes);
  assert.equal(authored.format, "cig02e-predicate-frames-v1");
  assert.equal(authored.status, "PARTIAL_SOURCE_AUTHORING_NOT_RUNTIME_CANDIDATE");
  assert.equal(authored.frame_count, 8);
  assert.equal(authored.frames.length, 8);
  const domain = filename.match(/_d(\d\d)\.json$/u)?.[1];
  assert.ok(domain, "invalid frame filename");
  for (const frame of authored.frames) {
    assert.ok(catalogSet.has(frame.topic_id), "non-Catalog frame");
    assert.ok(!seen.has(frame.topic_id), "duplicate frame Topic");
    seen.add(frame.topic_id);
    const source = profiles.get(frame.topic_id);
    assert.ok(source, "frame missing public profile");
    assert.equal(frame.domain_id, "D" + domain, "frame/domain mismatch");
    assert.equal(source.profile.domain.id, frame.domain_id, "profile/domain mismatch");
    assert.equal(frame.source_profile_path, source.path, "source shard mismatch");
    assert.equal(frame.source_field, "semantic_core", "unapproved source field");
    assert.deepEqual(frame.source_classes,
      ["FORMAL_CATALOG", "GENERAL_SEMANTIC_REASONING"], "unapproved frame source");
    assert.equal(frame.basis.zh, source.profile.semantic_core[0], "Chinese basis changed");
    assert.equal(frame.basis.en, source.profile.semantic_core[1], "English basis changed");
    const roles = {};
    for (const role of ["ACTION", "OBJECT", "OUTCOME"]) {
      roles[role] = {};
      for (const lang of ["zh", "en"]) {
        const raw = frame.roles?.[role]?.[lang];
        assert.ok(Array.isArray(raw) && raw.length >= 1 && raw.length <= 4,
          "invalid role list");
        assert.equal(new Set(raw).size, raw.length, "duplicate raw atom");
        const atoms = raw.map(atom => {
          assert.equal(typeof atom, "string", "non-string atom");
          assert.ok(atom.trim() === atom && atom.length >= 2 && atom.length <= 80,
            "invalid source atom");
          const value = normalize(atom);
          assert.ok(value.length >= 2 && value.length <= 80, "invalid normalized atom");
          return value;
        });
        assert.equal(new Set(atoms).size, atoms.length, "normalization collision");
        roles[role][lang] = atoms.sort();
      }
    }
    const names = source.profile.canonical_names;
    assert.ok(names?.zh && names?.en, "missing formal names");
    topics.push({
      topic_id: frame.topic_id,
      domain_id: frame.domain_id,
      source_frame_path: path,
      names: { zh: normalize(names.zh), en: normalize(names.en) },
      roles
    });
  }
}
assert.equal(seen.size, 144, "frame Topic coverage changed");
assert.deepEqual([...seen].sort(), [...catalogSet].sort(), "frame/Catalog Topic mismatch");
topics.sort((a, b) => a.topic_id.localeCompare(b.topic_id));
const index = {
  format: "cig02e-typed-frame-index-v1",
  topic_count: 144,
  provenance: {
    build_rule: "GLOBAL_PUBLIC_PROFILE_TYPED_FRAME_COMPILER_V1",
    catalog_sha256: sha256(catalogBytes),
    manifest_sha256: sha256(manifestBytes),
    profile_shards_sha256: sourceShas,
    source_frames_sha256: frameShas,
    dev_rows_read: 0,
    capability_test_rows_read: 0
  },
  topics
};
const output = JSON.stringify(index) + "\n";
const indexBytes = Buffer.byteLength(output);
assert.ok(indexBytes <= 1048576, "compiled index exceeds 1 MiB");
fs.writeFileSync(process.argv[2] ?? ".cig02e-index.json", output);
console.log(JSON.stringify({
  format: index.format, topic_count: topics.length, index_bytes: indexBytes,
  index_sha256: sha256(output), frame_files: expectedFiles.length,
  classification: "SOURCE_COMPILE_ONLY_NOT_CAPABILITY"
}));
