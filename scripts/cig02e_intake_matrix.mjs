import fs from "node:fs";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
export function buildMatrix(manifests, profiles, sparseIds) {
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const known = new Set(profiles.map(p => p.topic_id));
assert(known.size === 144 && profiles.length === 144, "Catalog must contain 144 unique Topics");
const domainGroups = [["D03","D07","D09"],["D04","D05","D10"],["D01","D02","D06","D18"],["D08","D11","D12","D13"],["D14","D15","D16","D17"]];
const all = [], followups = [], topicRows = [], seen = new Set();
const counts = rows => rows.reduce((a,r) => { a[r.decision] = (a[r.decision] || 0) + 1; return a; }, {});
manifests.forEach((m,i) => {
  assert(m.accepted_fixture_rows === 0 && m.gold_rows_created === 0 && m.cig02_frozen === false && m.cig03_started === false, "Evidence boundary changed");
  assert(m.queue_job_id === 108002125705 && m.queue_exact_head_sha === "e5a6f4c56ef882208b9bf6fe06a209058045689b", "Queue changed");
  const topics = profiles.filter(p => domainGroups[i].includes(p.domain_id));
  assert(topics.length === m.topic_count && m.decisions.length === m.topic_nominations, "Batch topology changed");
  const actualCounts = counts(m.decisions);
  assert(Object.keys(actualCounts).length === Object.keys(m.decision_counts).length && Object.entries(actualCounts).every(([k,v]) => m.decision_counts[k] === v), "Disposition count mismatch");
  for (const d of m.decisions) assert(topics.some(p => p.topic_id === d.topic_id) && typeof d.source_row === "string" && /^[a-f0-9]{64}$/.test(d.instruction_sha256), "Invalid nomination identity");
  for (const p of topics) {
    assert(!seen.has(p.topic_id), "Duplicate batch Topic"); seen.add(p.topic_id);
    const rows = m.decisions.filter(d => d.topic_id === p.topic_id);
    const supplemental = manifests.flatMap(x => x.supplemental_followups || []).filter(d => d.topic_id === p.topic_id);
    if (m.topics) assert(m.topics.find(t => t.topic_id === p.topic_id)?.selected_nominations === rows.length, "Recorded selection count mismatch");
    topicRows.push({topic_id:p.topic_id, domain_id:p.domain_id, batch_index:i+1, selected_nominations:rows.length,
      distinct_selected_source_rows:new Set(rows.map(d => d.source_row)).size,
      decision_counts:counts(rows), source_rows:rows.map(d => ({source_row:d.source_row,instruction_sha256:d.instruction_sha256,decision:d.decision})),
      supplemental_followups:supplemental.map(d => ({source_row:d.source_row,decision:d.decision})),
      has_prospective_plausible_candidate:[...rows,...supplemental].some(d => d.decision === "PLAUSIBLE_SOURCE_CANDIDATE"),
      sparse_retrieval_gap:sparseIds.includes(p.topic_id), accepted_gold_rows:0});
  }
  all.push(...m.decisions); followups.push(...(m.supplemental_followups || []));
});
assert(seen.size === 144 && sparseIds.length === 18 && new Set(sparseIds).size === 18 && sparseIds.every(id => known.has(id)), "Catalog or sparse gap topology changed");
for (const d of followups) assert(known.has(d.topic_id), "Unknown follow-up Topic");
topicRows.sort((a,b) => a.topic_id.localeCompare(b.topic_id, "en"));
return {format:"cig02e-full-catalog-intake-matrix-v1",classification:"SOURCE_FEASIBILITY_MATRIX_NOT_GOLD_OR_CAPABILITY",
  queue_job_id:108002125705,queue_exact_head_sha:"e5a6f4c56ef882208b9bf6fe06a209058045689b",
  topic_count:144,selected_nominations:all.length,distinct_selected_source_rows:new Set(all.map(d => d.source_row)).size,
  decision_counts:counts(all),base_plausible_nominations:all.filter(d => d.decision === "PLAUSIBLE_SOURCE_CANDIDATE").length,
  base_topics_with_plausible_candidates:new Set(all.filter(d => d.decision === "PLAUSIBLE_SOURCE_CANDIDATE").map(d => d.topic_id)).size,
  supplemental_followup_records:followups.length,
  topics_with_plausible_candidates_including_followups:topicRows.filter(t => t.has_prospective_plausible_candidate).length,
  topics_without_plausible_candidates:topicRows.filter(t => !t.has_prospective_plausible_candidate).length,
  topics_with_zero_selected_nominations:topicRows.filter(t => t.selected_nominations === 0).map(t => t.topic_id),
  sparse_retrieval_gap_topics:sparseIds.slice().sort(),topics:topicRows,
  accepted_fixture_rows:0,gold_rows_created:0,candidate_predictions_read:0,dev_scores_computed:0,capability_test_rows_read:0,
  natural_defer_controls_status:"NOT_REGISTERED",natural_context_controls_status:"NOT_REGISTERED",
  source_feasibility_verdict:"SOURCE_FEASIBILITY_UNQUALIFIED_NOT_ROUTER_CAPABILITY",
  annotation_independence:"Independent source-language authorship; developer boundary annotations are not independent gold.",
  cig02_frozen:false,cig03_started:false};

}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const read = p => JSON.parse(fs.readFileSync(p, "utf8"));
  const names = ["THREE_DOMAIN","EDUCATION_CAREER_TRAVEL","PERSONAL_FAMILY_PROJECTS_MEMORY","FINANCE_MEDIA_COMMUNICATION_LEGAL","SCIENCE_CREATIVE_BUSINESS_TIME"];
  const manifests = names.map(n => read("artifacts/compositional-intent-graph-v1/CIG-02E_" + n + "_SOURCE_PILOT.json"));
  const profiles = [1,2,3,4,5,6].flatMap(n => read("semantic_profiles/v0.1/system_topics_shard_0" + n + ".json").profiles.map(p => ({topic_id:p.topic_id,domain_id:p.domain.id})));
  const sparse = read("artifacts/compositional-intent-graph-v1/CIG-02E_EIGHTEEN_SPARSE_EXCERPT_TRIAGE.json").rows.map(r => r.topic_id);
  const actual = buildMatrix(manifests, profiles, sparse);
  assert.deepEqual(actual, read("artifacts/compositional-intent-graph-v1/CIG-02E_FULL_CATALOG_INTAKE_MATRIX.json"), "Committed intake matrix differs from immutable manifests");
  console.log(JSON.stringify({classification:actual.classification,topics:actual.topic_count,nominations:actual.selected_nominations,distinct_source_rows:actual.distinct_selected_source_rows,topics_with_plausible_candidates:actual.topics_with_plausible_candidates_including_followups,accepted_gold_rows:0,cig02_frozen:false}));
}
