import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const prefix = "artifacts/compositional-intent-graph-v1/";
const read = p => JSON.parse(fs.readFileSync(p,"utf8"));
const evidence = read(prefix+"CIG-02E_LEDGER_INPUT_IDENTITY_OBSERVATION.json");
const review = read(prefix+"CIG-02E_REPEATED_INPUT_BOUNDARY_REVIEW.json");
const ledgerBytes = fs.readFileSync(review.ledger);
const ledger = JSON.parse(ledgerBytes.toString("utf8"));
assert.equal(crypto.createHash("sha256").update(ledgerBytes).digest("hex"),evidence.ledger.sha256);
assert.equal(evidence.selected_nominations,79); assert.equal(evidence.distinct_source_rows,76);
assert.equal(evidence.distinct_input_pairs,76);
assert.equal(evidence.identities.length,ledger.entries.length);
assert.deepEqual(evidence.identities.map(x=>[x.topic_id,x.source_row,x.origin_kind,x.instruction_sha256,x.official_input_rows]),
 ledger.entries.map(x=>[x.topic_id,x.source_row,x.origin_kind,x.instruction_sha256,x.official_input_rows]));
assert.deepEqual(review.reviews.map(x=>x.instruction_context_sha256),evidence.repeated_input_groups.map(x=>x.input_sha256));
assert.equal(review.reviews.length,3);
assert.equal(review.reviews.reduce((n,x)=>n+x.nominations.length,0),6);
for(const item of review.reviews) {
 const identities = evidence.identities.filter(x=>x.source_row===item.source_row);
 assert.ok(identities.length>1);
 for(const field of ["instruction_sha256","context_sha256","instruction_context_sha256","official_input_rows"])
  assert.deepEqual(item[field],identities[0][field]);
 assert.deepEqual(item.nominations.map(n=>[n.topic_id,n.origin_kind]),identities.map(n=>[n.topic_id,n.origin_kind]));
 for(const nomination of item.nominations) {
  assert.equal(nomination.accepted_gold,false);
  assert.equal(nomination.historical_decision,ledger.entries.find(e=>e.topic_id===nomination.topic_id&&e.source_row===item.source_row).historical_decision);
 }
}
for(const snapshot of review.profile_snapshots) {
 const profile = read(snapshot.path).profiles.find(p=>p.topic_id===snapshot.topic_id);
 assert.ok(profile);
 for(const field of ["profile_version","formal_catalog_version","semantic_core","positive_intents","exclusion_cues"])
  assert.deepEqual(profile[field],snapshot[field],"Profile drift must be explicitly reviewed");
}
for(const doc of [evidence,review]) {
 for(const field of ["accepted_fixture_rows","gold_rows_created","candidate_predictions_read","dev_scores_computed","capability_test_rows_read"])assert.equal(doc[field],0);
 assert.equal(doc.cig02_frozen,false);assert.equal(doc.cig03_started,false);
}
console.log(JSON.stringify({classification:review.classification,input_pairs:3,historical_nominations:6,profile_snapshots:7,accepted_gold:0,cig02_frozen:false}));
