import fs from "node:fs";
import assert from "node:assert/strict";
const read = p => JSON.parse(fs.readFileSync(p,"utf8"));
const review = read("artifacts/compositional-intent-graph-v1/CIG-02E_NEIGHBOR_BOUNDARY_REVIEW.json");
const repeated = read(review.previous_repeated_review).reviews.flatMap(r=>r.nominations.map(n=>[n.topic_id,r.source_row,n.origin_kind].join("|")));
const selected = read(review.ledger).entries.filter(e=>e.historical_decision==="UNCERTAIN_NEIGHBOR_BOUNDARY"&&!repeated.includes([e.topic_id,e.source_row,e.origin_kind].join("|")));
const identities = read(review.identity_evidence).identities;
assert.equal(selected.length,25);
assert.equal(review.reviews.length,25);
assert.equal(new Set(review.reviews.map(e=>[e.topic_id,e.source_row,e.origin_kind].join("|"))).size,25);
assert.deepEqual(review.reviews.map(e=>[e.topic_id,e.source_row,e.origin_kind,e.historical_decision,e.historical_reason]),
 selected.map(e=>[e.topic_id,e.source_row,e.origin_kind,e.historical_decision,e.historical_reason]));
for(const entry of review.reviews) {
 const identity = identities.find(e=>e.topic_id===entry.topic_id&&e.source_row===entry.source_row&&e.origin_kind===entry.origin_kind);
 assert.ok(identity);
 for(const field of ["instruction_sha256","context_sha256","instruction_context_sha256","official_input_rows"])
  assert.deepEqual(entry[field],identity[field]);
 assert.equal(entry.accepted_gold,false);
 assert.equal(entry.full_instruction_and_context_read,true);
 assert.equal(entry.generated_response_used,false);
 for(const field of ["goal","reason","missing_evidence"]) assert.ok(typeof entry[field]==="string"&&entry[field].length>20);
 for(const id of [entry.topic_id,...entry.competing_profiles_considered])
  assert.ok(review.profile_snapshots.some(p=>p.topic_id===id),"Missing profile snapshot");
}
const counts = review.reviews.reduce((a,d)=>{a[d.followup_decision]=(a[d.followup_decision]||0)+1;return a;},{});
assert.deepEqual(counts,review.decision_counts);
assert.deepEqual(counts,{UNCERTAIN_NEIGHBOR_BOUNDARY:11,UNCERTAIN_TOPIC_SCOPE:6,PLAUSIBLE_SOURCE_CANDIDATE:2,NO_EXPLICIT_NOMINATED_GOAL_SOURCE_ONLY:3,INSUFFICIENT_EXPLICIT_SOURCE_GOAL:3});
const used = [...new Set(review.reviews.flatMap(e=>[e.topic_id,...e.competing_profiles_considered]))].sort();
assert.deepEqual(review.profile_snapshots.map(p=>p.topic_id).sort(),used);
assert.equal(review.profile_snapshots.length,43);
for(const snapshot of review.profile_snapshots) {
 const profile = read(snapshot.path).profiles.find(p=>p.topic_id===snapshot.topic_id);
 assert.ok(profile);
 for(const field of ["profile_version","formal_catalog_version","semantic_core","positive_intents","exclusion_cues"])
  assert.deepEqual(profile[field],snapshot[field],"Profile drift requires explicit review");
}
assert.equal(review.annotation_independence,"DEVELOPER_SOURCE_REVIEW_NOT_INDEPENDENT_GOLD");
assert.equal(review.historical_annotations_preserved,true);
assert.equal(review.coverage_recomputed,false);
for(const field of ["accepted_fixture_rows","gold_rows_created","candidate_predictions_read","dev_scores_computed","capability_test_rows_read"])assert.equal(review[field],0);
assert.equal(review.cig02_frozen,false);assert.equal(review.cig03_started,false);
assert.deepEqual(review.source_pin,{repository:"databrickslabs/dolly",commit:"2305eb7f2f4b3beb2379f34c6addf335b46c4b43",blob:"9b0b912c478e7ccd61ce741ebb409ddf8c7c22e6",path:"data/databricks-dolly-15k.jsonl"});
console.log(JSON.stringify({classification:review.classification,nominations:25,decision_counts:counts,profile_snapshots:43,accepted_gold:0,cig02_frozen:false}));
