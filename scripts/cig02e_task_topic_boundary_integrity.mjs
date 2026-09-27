import fs from "node:fs";
import assert from "node:assert/strict";
const read = p => JSON.parse(fs.readFileSync(p,"utf8"));
const review = read("artifacts/compositional-intent-graph-v1/CIG-02E_TASK_TOPIC_BOUNDARY_REVIEW.json");
const selected = read(review.ledger).entries.filter(e=>e.historical_decision==="UNCERTAIN_TASK_VS_TOPIC");
const identities = read(review.identity_evidence).identities;
assert.equal(review.reviews.length,12);
assert.deepEqual(review.reviews.map(e=>[e.topic_id,e.source_row,e.origin_kind,e.historical_decision]),
 selected.map(e=>[e.topic_id,e.source_row,e.origin_kind,e.historical_decision]));
for(const entry of review.reviews) {
 const identity = identities.find(e=>e.topic_id===entry.topic_id&&e.source_row===entry.source_row&&e.origin_kind===entry.origin_kind);
 assert.ok(identity);
 for(const field of ["instruction_sha256","context_sha256","instruction_context_sha256","official_input_rows"])
  assert.deepEqual(entry[field],identity[field]);
 assert.equal(entry.accepted_gold,false);
 assert.equal(entry.full_instruction_and_context_read,true);
 assert.equal(entry.generated_response_used,false);
 for(const id of [entry.topic_id,...entry.competing_profiles_considered])
  assert.ok(review.profile_snapshots.some(p=>p.topic_id===id),"Missing profile snapshot");
}
const counts = review.reviews.reduce((a,d)=>{a[d.followup_decision]=(a[d.followup_decision]||0)+1;return a;},{});
assert.deepEqual(counts,review.decision_counts);
assert.deepEqual(counts,{UNCERTAIN_TOPIC_SCOPE:2,UNCERTAIN_NEIGHBOR_BOUNDARY:4,PLAUSIBLE_SOURCE_CANDIDATE:3,NO_EXPLICIT_NOMINATED_GOAL_SOURCE_ONLY:3});
assert.equal(review.profile_snapshots.length,16);
for(const snapshot of review.profile_snapshots) {
 const profile = read(snapshot.path).profiles.find(p=>p.topic_id===snapshot.topic_id);
 assert.ok(profile);
 for(const field of ["profile_version","formal_catalog_version","semantic_core","positive_intents","exclusion_cues"])
  assert.deepEqual(profile[field],snapshot[field],"Profile drift requires explicit review");
}
for(const field of ["accepted_fixture_rows","gold_rows_created","candidate_predictions_read","dev_scores_computed","capability_test_rows_read"])assert.equal(review[field],0);
assert.equal(review.cig02_frozen,false);assert.equal(review.cig03_started,false);
console.log(JSON.stringify({classification:review.classification,nominations:12,decision_counts:counts,profile_snapshots:16,accepted_gold:0,cig02_frozen:false}));
