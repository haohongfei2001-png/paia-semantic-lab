import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = 'artifacts/compositional-intent-graph-v1/';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const observation = read(base + 'CIG-02E_HH_FIXED_PREFIX_INVENTORY_OBSERVATION.json');
const review = read(base + 'CIG-02E_HH_FIXED_PREFIX_BOUNDARY_REVIEW.json');
const intake = read(base + 'CIG-02E_PUBLIC_CORPUS_ROOT_INTAKE.json');
const profiles = Object.fromEntries(review.profile_snapshots.map(s => [s.path, read(s.path)]));
function verify(o, r) {
  assert.equal(o.format, 'CIG02E_HH_FIXED_PREFIX_INVENTORY_OBSERVATION_V1');
  assert.equal(r.format, 'CIG02E_HH_FIXED_PREFIX_BOUNDARY_REVIEW_V1');
  assert.equal(o.exact_head, '55ab4dbcc351c5de3c1c909ced0ab257a89a2d6d');
  assert.equal(o.job_url, 'https://github.com/haohongfei2001-png/paia-semantic-lab/actions/runs/36321867772/job/108627130794');
  assert.equal(o.artifact_id, 10932940208);
  assert.equal(o.artifact_zip_sha256, '629d18c8a3689e932a15f51b7d6e093be307ebe7f8abc523aea50cb4782bc1d4');
  assert.deepEqual(o.source, intake.source);
  assert.deepEqual(r.fixed_targets, intake.topics);
  assert.equal(o.first_pairs, intake.limits.first_pairs);
  assert.equal(o.extractable_root_pairs, 240);
  assert.equal(o.distinct_extracted_roots, 236);
  assert.equal(o.inventory.length, 240);
  assert.equal(r.records.length, 240);
  assert.equal(new Set(o.inventory.map(x => x.instruction_sha256)).size, 236);
  const allowed = new Set(['NO_EXPLICIT_FIXED_TARGET_GOAL', 'UNDERSPECIFIED_TARGET_PROXIMITY', 'TARGET_SCOPE_UNCERTAIN', 'PLAUSIBLE_TARGET_GOAL_PROVENANCE_HELD', 'TARGET_NEIGHBOR_UNCERTAIN']);
  const counts = {};
  for (let i = 0; i < 240; i++) {
    const identity = o.inventory[i], row = r.records[i];
    assert.equal(identity.row, i + 1);
    assert.match(identity.instruction_sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(identity).sort(), ['instruction_sha256','row']);
    assert.equal(row.row, identity.row);
    assert.equal(row.instruction_sha256, identity.instruction_sha256);
    assert.equal(row.accepted_gold, false);
    assert.equal(row.full_instruction_certified, false);
    assert.ok(allowed.has(row.decision));
    assert.ok(typeof row.rationale === 'string' && row.rationale.length > 20);
    counts[row.decision] = (counts[row.decision] || 0) + 1;
  }
  assert.deepEqual(counts, {
    NO_EXPLICIT_FIXED_TARGET_GOAL:235, UNDERSPECIFIED_TARGET_PROXIMITY:2,
    TARGET_SCOPE_UNCERTAIN:1, PLAUSIBLE_TARGET_GOAL_PROVENANCE_HELD:1, TARGET_NEIGHBOR_UNCERTAIN:1
  });
  const rowsFor = d => r.records.filter(x => x.decision === d).map(x => x.row);
  assert.deepEqual(rowsFor('PLAUSIBLE_TARGET_GOAL_PROVENANCE_HELD'), r.findings.lexical_hint_false_negative_source_only_rows);
  assert.deepEqual(rowsFor('TARGET_SCOPE_UNCERTAIN'), r.findings.scope_uncertain_rows);
  assert.deepEqual(rowsFor('TARGET_NEIGHBOR_UNCERTAIN'), r.findings.neighbor_uncertain_rows);
  assert.deepEqual(rowsFor('UNDERSPECIFIED_TARGET_PROXIMITY'), r.findings.underspecified_rows);
  assert.deepEqual(r.findings.lexical_hint_false_negative_source_only_rows, [192]);
  assert.equal(r.findings.prospective_coverage_updates, 0);
  assert.deepEqual(Object.keys(o.selected_counts).sort(), intake.topics.map(x=>x.topic_id).sort());
  assert.ok(Object.values(o.selected_counts).every(x=>x===0));
  assert.equal(r.profile_snapshots.length, 11);
  assert.equal(new Set(r.profile_snapshots.map(s=>s.profile.topic_id)).size, 11);
  for (const s of r.profile_snapshots) {
    assert.deepEqual(s.profile, profiles[s.path].profiles.find(p=>p.topic_id===s.profile.topic_id));
  }
  for (const t of intake.topics) assert.ok(r.profile_snapshots.some(s=>s.profile.topic_id===t.topic_id));
  for (const x of [o,r]) {
    for (const k of ['accepted_fixture_rows','gold_rows_created','candidate_predictions_read','dev_scores_computed','capability_test_rows_read']) assert.equal(x[k],0);
    assert.equal(x.cig02_frozen,false);
    assert.equal(x.cig03_started,false);
  }
  assert.deepEqual(r.coverage,{prospective_source_nominations:41,prospective_source_topics:35,topics_without_prospective_sources:109,unresolved_source_nominations:28});
}
verify(observation, review);
// These probes guard evidence identity and non-promotion; they do not label source text or evaluate the router.
for (const mutate of [
  (o,r)=>r.records.pop(),
  (o,r)=>r.records[0].instruction_sha256='0'.repeat(64),
  (o,r)=>r.records[191].accepted_gold=true,
  (o,r)=>r.profile_snapshots[0].profile.semantic_core=['changed'],
  (o,r)=>r.fixed_targets[0].retrieval_hint='changed',
  (o,r)=>r.gold_rows_created=1
]) {
  const o=structuredClone(observation), r=structuredClone(review);
  mutate(o,r);
  assert.throws(()=>verify(o,r));
}
console.log('CIG02E_HH_FIXED_PREFIX_REVIEW_INTEGRITY_PASS: 240 rows; 236 identities; six negative integrity probes; zero gold; no capability score');
