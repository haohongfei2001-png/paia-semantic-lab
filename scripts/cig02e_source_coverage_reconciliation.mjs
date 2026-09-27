import fs from "node:fs";
import assert from "node:assert/strict";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const A="artifacts/compositional-intent-graph-v1/";
const manifest=read(A+"CIG-02E_SOURCE_COVERAGE_RECONCILIATION.json");
const ledger=read(A+"CIG-02E_ADJUDICATION_LEDGER.json");
const matrix=read(A+"CIG-02E_FULL_CATALOG_INTAKE_MATRIX.json");
const repeated=read(A+"CIG-02E_REPEATED_INPUT_BOUNDARY_REVIEW.json");
const task=read(A+"CIG-02E_TASK_TOPIC_BOUNDARY_REVIEW.json");
const neighbor=read(A+"CIG-02E_NEIGHBOR_BOUNDARY_REVIEW.json");
const identity=read(A+"CIG-02E_LEDGER_INPUT_IDENTITY_OBSERVATION.json").identities;
const key=e=>[e.topic_id,e.source_row,e.origin_kind].join("|");
const followups=[
 ...repeated.reviews.flatMap(g=>g.nominations.map(n=>({...n,source_row:g.source_row}))),
 ...task.reviews,...neighbor.reviews
];
assert.equal(ledger.entries.length,79);
assert.equal(followups.length,43);
assert.equal(new Set(followups.map(key)).size,43);
for(const f of followups) {
 const original=ledger.entries.find(e=>key(e)===key(f));
 assert.ok(original,"Follow-up outside fixed ledger");
 assert.equal(f.historical_decision,original.historical_decision);
 assert.equal(f.accepted_gold,false);
 assert.ok(["UNRESOLVED_FORMAL_PROFILE_OVERLAP","UNCERTAIN_NEIGHBOR_BOUNDARY","UNCERTAIN_TOPIC_SCOPE","PLAUSIBLE_SOURCE_CANDIDATE","NO_EXPLICIT_NOMINATED_GOAL_SOURCE_ONLY","INSUFFICIENT_EXPLICIT_SOURCE_GOAL"].includes(f.followup_decision));
}
const uncertain=ledger.entries.filter(e=>e.historical_decision.startsWith("UNCERTAIN"));
assert.equal(uncertain.length,42);
assert.ok(uncertain.every(e=>followups.some(f=>key(f)===key(e))),"Missing uncertain follow-up");
const rows=ledger.entries.map(e=>{
 const f=followups.find(f=>key(f)===key(e));
 const i=identity.find(i=>key(i)===key(e));
 assert.ok(i);
 assert.equal(e.accepted_gold,false);
 assert.equal(i.instruction_sha256,e.instruction_sha256);
 return {topic_id:e.topic_id,source_row:e.source_row,origin_kind:e.origin_kind,
  historical_decision:e.historical_decision,current_source_decision:f?f.followup_decision:e.historical_decision,
  followup_applied:!!f,instruction_sha256:i.instruction_sha256,context_sha256:i.context_sha256,
  instruction_context_sha256:i.instruction_context_sha256,official_input_rows:i.official_input_rows,accepted_gold:false};
});
const count=xs=>xs.reduce((a,e)=>(a[e.current_source_decision]=(a[e.current_source_decision]||0)+1,a),{});
const historical=rows.filter(e=>e.historical_decision==="PLAUSIBLE_SOURCE_CANDIDATE");
const prospective=rows.filter(e=>e.current_source_decision==="PLAUSIBLE_SOURCE_CANDIDATE");
const hs=new Set(historical.map(e=>e.topic_id)),cs=new Set(prospective.map(e=>e.topic_id));
const topics=matrix.topics.map(t=>({
 topic_id:t.topic_id,domain_id:t.domain_id,
 historical_has_prospective_candidate:t.has_prospective_plausible_candidate,
 current_has_prospective_source:cs.has(t.topic_id),
 current_prospective_source_rows:prospective.filter(e=>e.topic_id===t.topic_id).map(e=>e.source_row),
 unresolved_nomination_keys:rows.filter(e=>e.topic_id===t.topic_id&&["UNCERTAIN_NEIGHBOR_BOUNDARY","UNCERTAIN_TOPIC_SCOPE","UNRESOLVED_FORMAL_PROFILE_OVERLAP"].includes(e.current_source_decision)).map(key),
 sparse_retrieval_gap:t.sparse_retrieval_gap,accepted_gold_rows:0
}));
assert.equal(topics.length,144);
assert.equal(new Set(topics.map(t=>t.topic_id)).size,144);
assert.ok(rows.every(r=>topics.some(t=>t.topic_id===r.topic_id)));
assert.equal(historical.length,37);
assert.equal(hs.size,33);
assert.deepEqual([...hs].sort(),matrix.topics.filter(t=>t.has_prospective_plausible_candidate).map(t=>t.topic_id).sort());
assert.equal(prospective.length,41);
assert.equal(cs.size,35);
assert.equal(new Set(prospective.map(e=>e.source_row)).size,41);
assert.deepEqual(rows,manifest.nominations);
assert.deepEqual(topics,manifest.topics);
assert.deepEqual(count(rows),manifest.current_decision_counts);
assert.deepEqual(manifest.summary,{
 ledger_nominations:79,distinct_ledger_source_rows:76,uncertain_nominations_with_followups:42,
 total_followup_nominations:43,historical_prospective_nominations:37,historical_prospective_topics:33,
 newly_prospective_nominations:5,historical_prospective_now_unresolved:1,
 current_prospective_nominations:41,current_distinct_prospective_source_rows:41,
 current_prospective_topics:35,topics_without_current_prospective_sources:109,
 unresolved_nominations:28,no_explicit_nominated_goal_nominations:7,insufficient_source_goal_nominations:3,
 accepted_fixture_rows:0,gold_rows_created:0
});
assert.deepEqual(manifest.added_prospective_topics,[...cs].filter(t=>!hs.has(t)).sort());
assert.deepEqual(manifest.historical_only_prospective_topics,[...hs].filter(t=>!cs.has(t)).sort());
for(const field of ["candidate_predictions_read","dev_scores_computed","capability_test_rows_read"]) assert.equal(manifest[field],0);
assert.equal(manifest.annotation_independence,"DEVELOPER_SOURCE_RECONCILIATION_NOT_INDEPENDENT_GOLD");
assert.equal(manifest.historical_matrix_preserved,true);
assert.equal(manifest.natural_defer_controls_status,"NOT_REGISTERED");
assert.equal(manifest.natural_context_controls_status,"NOT_REGISTERED");
assert.equal(manifest.cig02_frozen,false);assert.equal(manifest.cig03_started,false);
console.log(JSON.stringify({classification:manifest.classification,summary:manifest.summary,cig02_frozen:false}));
