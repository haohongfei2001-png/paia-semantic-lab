import fs from "node:fs";
import assert from "node:assert/strict";

const framePath = "semantic_frames/cig02e_v1/family_relationships_d02.json";
const catalog = fs.readFileSync("catalog/system_topic_catalog_v0.2.yaml", "utf8");
const catalogIds = new Set([...catalog.matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(match => match[1]));
assert.equal(catalogIds.size, 144, "formal Catalog ID set changed");

const authored = JSON.parse(fs.readFileSync(framePath, "utf8"));
assert.equal(authored.format, "cig02e-predicate-frames-v1");
assert.equal(authored.status, "PARTIAL_SOURCE_AUTHORING_NOT_RUNTIME_CANDIDATE");
assert.equal(authored.authoring_scope, "PUBLIC_PROFILE_D02_ONLY");
assert.equal(authored.frame_count, 8);
assert.equal(authored.frames.length, 8);
const profilePath = "semantic_profiles/v0.1/system_topics_shard_01.json";
const source = JSON.parse(fs.readFileSync(profilePath, "utf8"));
const d02 = source.profiles.filter(profile => profile.domain.id === "D02");
assert.equal(d02.length, 8, "public source D02 Topic count changed");
const byId = new Map(d02.map(profile => [profile.topic_id, profile]));
const seen = new Set();
for (const frame of authored.frames) {
  assert.ok(catalogIds.has(frame.topic_id), "non-Catalog Topic");
  assert.ok(!seen.has(frame.topic_id), "duplicate frame");
  seen.add(frame.topic_id);
  const profile = byId.get(frame.topic_id);
  assert.ok(profile, "frame outside public D02 source");
  assert.equal(frame.domain_id, "D02");
  assert.equal(frame.source_profile_path, profilePath);
  assert.equal(frame.source_field, "semantic_core");
  assert.deepEqual(frame.source_classes, ["FORMAL_CATALOG", "GENERAL_SEMANTIC_REASONING"]);
  assert.equal(frame.basis.zh, profile.semantic_core[0], "Chinese public-source basis changed");
  assert.equal(frame.basis.en, profile.semantic_core[1], "English public-source basis changed");
  for (const role of ["ACTION", "OBJECT", "OUTCOME"]) {
    for (const lang of ["zh", "en"]) {
      const atoms = frame.roles?.[role]?.[lang];
      assert.ok(Array.isArray(atoms) && atoms.length >= 1 && atoms.length <= 4,
        "invalid bounded role atoms: " + frame.topic_id + " " + role + " " + lang);
      assert.equal(new Set(atoms).size, atoms.length, "duplicate role atoms");
      for (const atom of atoms) {
        assert.equal(typeof atom, "string");
        assert.ok(atom.trim() === atom && atom.length >= 2 && atom.length <= 80,
          "invalid role atom");
      }
    }
  }
}
assert.equal(seen.size, byId.size, "D02 source authoring incomplete");
console.log(JSON.stringify({
  classification: "SOURCE_AUTHORING_ONLY_NOT_CAPABILITY",
  authored_topics: seen.size, catalog_topics: catalogIds.size,
  runtime_candidate: false, dev_rows_read: 0, capability_test_rows_read: 0
}));
