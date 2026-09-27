import fs from "node:fs";
import assert from "node:assert/strict";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const review=read("artifacts/compositional-intent-graph-v1/CIG-02E_SIX_TOPIC_PUBLIC_ISSUE_SOURCE_GATE.json");
const expected=[["sys.family_relationships.caregiving_family_support","fjAutisticaCitizenScience/AutisticaCitizenScience",26],["sys.knowledge_memory.photos_media_archive","kaustubhhiware/facebook-archive",37],["sys.education_learning.learning_methods","ArneVogel/listudy",92],["sys.education_learning.academic_admin","apluslms/a-plus",721],["sys.projects_products.project_planning","robotunicr0n/dm-suite",1],["sys.projects_products.product_requirements","yousefissa/Twitter-Follow-and-Unfollow-Bot",7]];
assert.equal(review.records.length,6);
assert.deepEqual(review.records.map(r=>[r.topic_id,r.repository,r.issue_number]),expected);
assert.equal(new Set(review.records.map(r=>r.issue_id)).size,6);
for(const r of review.records) {
 assert.equal(r.source_url,"https://github.com/"+r.repository+"/issues/"+r.issue_number);
 assert.equal(r.full_title_and_body_read,true);
 assert.equal(r.comments_read,false);
 assert.equal(r.body_copied_to_repository,false);
 assert.equal(r.independent_language_authorship,"UNVERIFIED_ACCOUNT_TYPE_AND_AGE_ONLY");
 assert.equal(r.issue_text_reuse_basis,"NOT_ESTABLISHED");
 assert.equal(r.repository_license_is_not_issue_text_reuse_basis,true);
 assert.equal(r.immutable_input_snapshot,"NOT_REGISTERED");
 assert.equal(r.source_reuse_ready,false);
 assert.equal(r.accepted_gold,false);
 assert.ok(r.reason.length>50);
 for(const id of [r.topic_id,...r.competing_profiles_considered])assert.ok(review.profile_snapshots.some(p=>p.topic_id===id));
}
for(const p of review.profile_snapshots) {
 const actual=read(p.path).profiles.find(x=>x.topic_id===p.topic_id);
 assert.ok(actual);
 for(const k of ["profile_version","formal_catalog_version","semantic_core","positive_intents","exclusion_cues"])assert.deepEqual(p[k],actual[k]);
}
assert.equal(review.source_family_action,"STOP_EXPANDING_ISSUE_SEARCH_FOR_PERSONAL_TOPIC_GAPS");
assert.equal(review.current_prospective_source_topics_unchanged,35);
assert.equal(review.current_topics_without_prospective_sources_unchanged,109);
for(const k of ["accepted_fixture_rows","gold_rows_created","candidate_predictions_read","dev_scores_computed","capability_test_rows_read"])assert.equal(review[k],0);
assert.equal(review.cig02_frozen,false);assert.equal(review.cig03_started,false);
console.log(JSON.stringify({classification:review.classification,reviewed:6,source_reuse_ready:0,accepted_gold:0}));
