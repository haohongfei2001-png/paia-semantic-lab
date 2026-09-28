import assert from "node:assert/strict";
const roles = ["ACTION", "OBJECT"];
const normalize = value => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
function exactKeys(value, keys) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), "unexpected TRAIN field");
}
export function validateAuthoredTrain(bundle, catalogIds) {
  exactKeys(bundle, ["format", "partition", "authoring", "topic_count", "source_classes", "capability_test_rows_read", "topics"]);
  assert.equal(bundle.format, "cig02g-authored-train-v1");
  assert.equal(bundle.partition, "TRAIN", "DEV/TEST input forbidden in compiler");
  assert.equal(bundle.authoring, "SAME_WRITER_PUBLIC_SYNTHETIC_DISCLOSED");
  assert.deepEqual(bundle.source_classes, ["FORMAL_CATALOG", "PUBLIC_PROFILE", "AUTHORED_SYNTHETIC_TRAIN"]);
  assert.equal(bundle.capability_test_rows_read, 0);
  assert.equal(bundle.topic_count, 144);
  assert.equal(bundle.topics.length, 144);
  assert.equal(new Set(catalogIds).size, 144);
  const ids = bundle.topics.map(topic => topic.topic_id);
  assert.equal(new Set(ids).size, 144, "duplicate TRAIN Topic");
  assert.deepEqual([...ids].sort(), [...catalogIds].sort(), "TRAIN must retain exact full Catalog");
  for (const topic of bundle.topics) {
    exactKeys(topic, ["topic_id", "roles", "example"]);
    exactKeys(topic.roles, roles);
    exactKeys(topic.example, ["current", "synthetic_template"]);
    assert.equal(topic.example.synthetic_template, "DIRECT_ACTION_OBJECT_TRAIN_V1");
    assert.equal(typeof topic.example.current, "string");
    assert.ok(topic.example.current.length > 8 && topic.example.current.length <= 400);
    for (const role of roles) {
      exactKeys(topic.roles[role], ["en"]);
      const atoms = topic.roles[role].en;
      assert.ok(Array.isArray(atoms) && atoms.length >= 1 && atoms.length <= 4);
      assert.equal(new Set(atoms.map(normalize)).size, atoms.length, "TRAIN atom collision");
      for (const atom of atoms) {
        assert.equal(typeof atom, "string");
        assert.ok(atom.trim() === atom && atom.length >= 2 && atom.length <= 80);
        assert.ok(normalize(topic.example.current).includes(normalize(atom)) ||
          atoms[0] !== atom, "primary TRAIN atom must occur in training example");
      }
    }
  }
  return bundle;
}
