import fs from "node:fs";
import assert from "node:assert/strict";

const frameDir = "semantic_frames/cig02e_v1";
const profilePath = "semantic_profiles/v0.1/system_topics_shard_01.json";
const catalog = fs.readFileSync("catalog/system_topic_catalog_v0.2.yaml", "utf8");
const catalogIds = new Set([...catalog.matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(match => match[1]));
assert.equal(catalogIds.size, 144, "formal Catalog ID set changed");
const source = JSON.parse(fs.readFileSync(profilePath, "utf8"));
assert.equal(source.profiles.length, 24, "public source shard changed");
const byId = new Map(source.profiles.map(profile => [profile.topic_id, profile]));
assert.equal(byId.size, 24, "duplicate public source Topic");
const expectedFiles = new Map([
  ["personal_direction_d01.json", "D01"],
  ["family_relationships_d02.json", "D02"],
  ["health_wellbeing_d03.json", "D03"]
]);
const files = fs.readdirSync(frameDir).filter(name => name.endsWith(".json")).sort();
assert.deepEqual(files, [...expectedFiles.keys()].sort(), "unexpected authored source files");
const seen = new Set();
for (const file of files) {
  const domain = expectedFiles.get(file);
  const authored = JSON.parse(fs.readFileSync(frameDir + "/" + file, "utf8"));
  assert.equal(authored.format, "cig02e-predicate-frames-v1");
  assert.equal(authored.status, "PARTIAL_SOURCE_AUTHORING_NOT_RUNTIME_CANDIDATE");
  assert.equal(authored.authoring_scope, "PUBLIC_PROFILE_" + domain + "_ONLY");
  assert.equal(authored.frame_count, 8);
  assert.equal(authored.frames.length, 8);
  const domainProfiles = source.profiles.filter(profile => profile.domain.id === domain);
  assert.equal(domainProfiles.length, 8, "public source domain changed");
  for (const frame of authored.frames) {
    assert.ok(catalogIds.has(frame.topic_id), "non-Catalog Topic");
    assert.ok(!seen.has(frame.topic_id), "duplicate frame");
    seen.add(frame.topic_id);
    const profile = byId.get(frame.topic_id);
    assert.ok(profile, "frame outside public source shard");
    assert.equal(profile.domain.id, domain);
    assert.equal(frame.domain_id, domain);
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
  assert.equal(authored.frames.filter(frame => frame.domain_id === domain).length,
    domainProfiles.length, "domain source authoring incomplete");
}
assert.equal(seen.size, byId.size, "public source shard authoring incomplete");
console.log(JSON.stringify({
  classification: "SOURCE_AUTHORING_ONLY_NOT_CAPABILITY",
  authored_topics: seen.size, catalog_topics: catalogIds.size,
  runtime_candidate: false, dev_rows_read: 0, capability_test_rows_read: 0
}));
