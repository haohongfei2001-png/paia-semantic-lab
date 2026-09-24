import fs from "node:fs";
import assert from "node:assert/strict";

const frameDir = "semantic_frames/cig02e_v1";
const catalog = fs.readFileSync("catalog/system_topic_catalog_v0.2.yaml", "utf8");
const catalogIds = new Set([...catalog.matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(match => match[1]));
assert.equal(catalogIds.size, 144, "formal Catalog ID set changed");
const sourcePaths = [
  "semantic_profiles/v0.1/system_topics_shard_01.json",
  "semantic_profiles/v0.1/system_topics_shard_02.json",
  "semantic_profiles/v0.1/system_topics_shard_03.json"
];
const sources = new Map(sourcePaths.map(path => [path,
  JSON.parse(fs.readFileSync(path, "utf8")).profiles]));
for (const [path, profiles] of sources) assert.equal(profiles.length, 24, "public source shard changed: " + path);
const profiles = sourcePaths.flatMap(path => sources.get(path));
const byId = new Map(profiles.map(profile => [profile.topic_id, profile]));
assert.equal(byId.size, 72, "duplicate public source Topic");
const expectedFiles = new Map([
  ["personal_direction_d01.json", ["D01", sourcePaths[0]]],
  ["family_relationships_d02.json", ["D02", sourcePaths[0]]],
  ["health_wellbeing_d03.json", ["D03", sourcePaths[0]]],
  ["education_learning_d04.json", ["D04", sourcePaths[1]]],
  ["career_work_d05.json", ["D05", sourcePaths[1]]],
  ["projects_products_d06.json", ["D06", sourcePaths[1]]],
  ["ai_computing_d07.json", ["D07", sourcePaths[2]]],
  ["finance_purchases_d08.json", ["D08", sourcePaths[2]]],
  ["home_daily_d09.json", ["D09", sourcePaths[2]]]
]);
const files = fs.readdirSync(frameDir).filter(name => name.endsWith(".json")).sort();
assert.deepEqual(files, [...expectedFiles.keys()].sort(), "unexpected authored source files");
const seen = new Set();
for (const file of files) {
  const [domain, profilePath] = expectedFiles.get(file);
  const authored = JSON.parse(fs.readFileSync(frameDir + "/" + file, "utf8"));
  assert.equal(authored.format, "cig02e-predicate-frames-v1");
  assert.equal(authored.status, "PARTIAL_SOURCE_AUTHORING_NOT_RUNTIME_CANDIDATE");
  assert.equal(authored.authoring_scope, "PUBLIC_PROFILE_" + domain + "_ONLY");
  assert.equal(authored.frame_count, 8);
  assert.equal(authored.frames.length, 8);
  const domainProfiles = sources.get(profilePath).filter(profile => profile.domain.id === domain);
  assert.equal(domainProfiles.length, 8, "public source domain changed");
  for (const frame of authored.frames) {
    assert.ok(catalogIds.has(frame.topic_id), "non-Catalog Topic");
    assert.ok(!seen.has(frame.topic_id), "duplicate frame");
    seen.add(frame.topic_id);
    const profile = byId.get(frame.topic_id);
    assert.ok(profile, "frame outside public source shards");
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
assert.equal(seen.size, 72, "authored public source Topic count changed");
console.log(JSON.stringify({
  classification: "SOURCE_AUTHORING_ONLY_NOT_CAPABILITY",
  authored_topics: seen.size, catalog_topics: catalogIds.size,
  runtime_candidate: false, dev_rows_read: 0, capability_test_rows_read: 0
}));
