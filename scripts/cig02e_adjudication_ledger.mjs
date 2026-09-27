import fs from "node:fs";
import assert from "node:assert/strict";
export function buildLedger(matrix, batches) {
  const rows = batches.flatMap(({path, manifest}) => [
    ...manifest.decisions.filter(d => d.decision === "PLAUSIBLE_SOURCE_CANDIDATE" || d.decision.startsWith("UNCERTAIN_")).map(d => ({...d, origin_kind:"BASE_NOMINATION", origin_manifest:path})),
    ...(manifest.supplemental_followups || []).filter(d => d.decision === "PLAUSIBLE_SOURCE_CANDIDATE" || d.decision.startsWith("UNCERTAIN_")).map(d => ({...d, origin_kind:"SUPPLEMENTAL_FOLLOWUP", origin_manifest:path}))
  ]);
  const entries = rows.map(d => ({
    topic_id:d.topic_id, source_row:d.source_row, instruction_sha256:d.instruction_sha256,
    official_input_rows:d.official_input_rows, origin_kind:d.origin_kind, origin_manifest:d.origin_manifest,
    historical_decision:d.decision, historical_reason:d.reason,
    source_class:"PUBLIC_HUMAN_AUTHORED_UPSTREAM_DOLLY",
    review_queue:d.decision === "PLAUSIBLE_SOURCE_CANDIDATE" ? "INDEPENDENT_GOLD_AND_INPUT_IDENTITY_PENDING" : "SOURCE_BOUNDARY_REVIEW_PENDING",
    other_catalog_nominations:matrix.topics.flatMap(t => t.source_rows.filter(r => r.source_row === d.source_row && t.topic_id !== d.topic_id).map(r => ({topic_id:t.topic_id, historical_decision:r.decision}))),
    official_duplicate_input_count:d.official_input_rows.length,
    annotation_independence:"DEVELOPER_SOURCE_ANNOTATION_NOT_INDEPENDENT_GOLD",
    accepted_gold:false
  }));
  return {
    format:"CIG-02E_ADJUDICATION_LEDGER_V1",
    classification:"SOURCE_REVIEW_WORK_QUEUE_NOT_GOLD_OR_CAPABILITY",
    parent_matrix:"artifacts/compositional-intent-graph-v1/CIG-02E_FULL_CATALOG_INTAKE_MATRIX.json",
    queue_job_id:matrix.queue_job_id, queue_exact_head_sha:matrix.queue_exact_head_sha,
    entries, entry_count:entries.length,
    base_prospective_nominations:entries.filter(d => d.origin_kind === "BASE_NOMINATION" && d.historical_decision === "PLAUSIBLE_SOURCE_CANDIDATE").length,
    supplemental_prospective_nominations:entries.filter(d => d.origin_kind === "SUPPLEMENTAL_FOLLOWUP").length,
    uncertain_nominations:entries.filter(d => d.historical_decision.startsWith("UNCERTAIN_")).length,
    distinct_selected_source_rows:new Set(entries.map(d => d.source_row)).size,
    topics_with_prospective_candidates:matrix.topics_with_plausible_candidates_including_followups,
    topics_without_prospective_candidates:matrix.topics_without_plausible_candidates,
    excluded_classes:["QUARANTINED_SOURCE_INPUT_MISMATCH","REJECT_FOR_NOMINATED_TOPIC","SUPPLEMENTAL_SYNTHETIC_REVIEW_PENDING"],
    synthetic_review:"artifacts/compositional-intent-graph-v1/CIG-02E_SYNTHETIC_FULL_INPUT_REVIEW.json",
    identity_boundary:"Queue instruction hashes and historical exact official input row mappings are preserved. Full instruction/context pair digests are not yet registered in this ledger. Source IDs, official duplicate positions and lexical nominations are not independent language or gold units.",
    required_before_fixture:["RECHECK_PINNED_FULL_INPUT_PAIR_IDENTITIES","RESOLVE_TOPIC_AND_TASK_BOUNDARIES_UNDER_CURRENT_PROFILES","INDEPENDENT_GOLD_ADJUDICATION_WITHOUT_CANDIDATE_PREDICTIONS","DEDUPLICATE_INPUTS_AND_SEPARATE_SOURCE_UNITS","REGISTER_NATURAL_DEFER_AND_CONTEXT_CONTROLS","FREEZE_SOURCE_GOLD_CANDIDATE_SCORER_BEFORE_NEW_DIAGNOSTIC"],
    accepted_fixture_rows:0, gold_rows_created:0, candidate_predictions_read:0, dev_scores_computed:0,
    capability_test_rows_read:0, cig02_frozen:false, cig03_started:false
  };
}

const prefix = "artifacts/compositional-intent-graph-v1/";
const paths = ["artifacts/compositional-intent-graph-v1/CIG-02E_THREE_DOMAIN_SOURCE_PILOT.json","artifacts/compositional-intent-graph-v1/CIG-02E_EDUCATION_CAREER_TRAVEL_SOURCE_PILOT.json","artifacts/compositional-intent-graph-v1/CIG-02E_PERSONAL_FAMILY_PROJECTS_MEMORY_SOURCE_PILOT.json","artifacts/compositional-intent-graph-v1/CIG-02E_FINANCE_MEDIA_COMMUNICATION_LEGAL_SOURCE_PILOT.json","artifacts/compositional-intent-graph-v1/CIG-02E_SCIENCE_CREATIVE_BUSINESS_TIME_SOURCE_PILOT.json"];
const read = path => JSON.parse(fs.readFileSync(path, "utf8"));
const matrix = read(prefix + "CIG-02E_FULL_CATALOG_INTAKE_MATRIX.json");
const ledger = buildLedger(matrix, paths.map(path => ({path, manifest:read(path)})));
assert.equal(ledger.entry_count,79);
assert.equal(ledger.base_prospective_nominations,36);
assert.equal(ledger.supplemental_prospective_nominations,1);
assert.equal(ledger.uncertain_nominations,42);
assert.equal(ledger.distinct_selected_source_rows,76);
assert.equal(new Set(ledger.entries.map(d => [d.origin_kind,d.topic_id,d.source_row].join("|"))).size,79);
for (const d of ledger.entries) {
  assert.match(d.source_row,/^dolly:[1-9][0-9]*$/u);
  assert.match(d.instruction_sha256,/^[a-f0-9]{64}$/u);
  assert.ok(d.official_input_rows.length > 0 && d.official_input_rows.every(n => Number.isInteger(n) && n > 0));
  if (d.origin_kind === "BASE_NOMINATION") {
    const original = matrix.topics.find(t => t.topic_id === d.topic_id)?.source_rows.find(r => r.source_row === d.source_row);
    assert.equal(original?.instruction_sha256,d.instruction_sha256);
    assert.equal(original?.decision,d.historical_decision);
  }
}
assert.deepEqual(read(prefix + "CIG-02E_ADJUDICATION_LEDGER.json"),ledger);
console.log(JSON.stringify({classification:ledger.classification,entry_count:ledger.entry_count,distinct_source_rows:ledger.distinct_selected_source_rows,base_prospective:36,supplemental_prospective:1,uncertain:42,accepted_gold:0,cig02_frozen:false}));
