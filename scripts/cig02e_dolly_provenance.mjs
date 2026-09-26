import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const fields = ["instruction", "context", "response", "category"];
const tuple = row => JSON.stringify(fields.map(field => row[field]));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
export function reconcile(mirror, official, selectedRows = []) {
  const full = new Map(), instructions = new Map();
  official.forEach((row, index) => {
    for (const field of fields) assert.equal(typeof row[field], "string");
    const item = { row, row_id: index + 1 };
    if (!full.has(tuple(row))) full.set(tuple(row), []);
    full.get(tuple(row)).push(item.row_id);
    if (!instructions.has(row.instruction)) instructions.set(row.instruction, []);
    instructions.get(row.instruction).push(item);
  });
  const mirrorKeys = new Set();
  let fullMatches = 0, instructionMatches = 0, inputMatches = 0;
  for (const row of mirror) {
    for (const field of fields) assert.equal(typeof row[field], "string");
    mirrorKeys.add(tuple(row));
    if (full.has(tuple(row))) fullMatches++;
    const matches = instructions.get(row.instruction) ?? [];
    if (matches.length) instructionMatches++;
    if (matches.some(item => item.row.context === row.context)) inputMatches++;
  }
  const selected = selectedRows.map(rowId => {
    assert.ok(Number.isInteger(rowId) && rowId >= 1 && rowId <= mirror.length);
    const row = mirror[rowId - 1];
    const matches = instructions.get(row.instruction) ?? [];
    const fullIds = full.get(tuple(row)) ?? [];
    const inputIds = matches.filter(item => item.row.context === row.context).map(item => item.row_id);
    return {
      mirror_row_id: rowId,
      instruction_sha256: sha256(row.instruction),
      context_sha256: sha256(row.context),
      official_full_row_ids: fullIds,
      official_instruction_ids: matches.map(item => item.row_id),
      official_instruction_and_context_ids: inputIds,
      mapping: fullIds.length ? "EXACT_FULL_ROW" : inputIds.length ? "EXACT_INPUT_ONLY" :
        matches.length ? "INSTRUCTION_ONLY_CONTEXT_DIFFERENT" : "NO_EXACT_INSTRUCTION"
    };
  });
  return {
    official_rows: official.length, mirror_rows: mirror.length,
    official_unique_full_rows: full.size, mirror_unique_full_rows: mirrorKeys.size,
    mirror_full_rows_exactly_matching_official: fullMatches,
    mirror_instruction_exact_matches: instructionMatches,
    mirror_instruction_and_context_exact_matches: inputMatches,
    official_unique_full_rows_not_in_mirror: [...full.keys()].filter(key => !mirrorKeys.has(key)).length,
    mirror_unique_full_rows_not_in_official: [...mirrorKeys].filter(key => !full.has(key)).length,
    selected_rows: selected
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mirrorPath, officialPath, outputPath = "artifacts/ci/cig02e-dolly-provenance.json", reviewPath = "artifacts/compositional-intent-graph-v1/CIG-02E_DOLLY_FULL_ROW_REVIEW.json"] = process.argv.slice(2);
  assert.ok(["artifacts/compositional-intent-graph-v1/CIG-02E_DOLLY_FULL_ROW_REVIEW.json",
    "artifacts/compositional-intent-graph-v1/CIG-02E_THREE_DOMAIN_SOURCE_PILOT.json",
    "artifacts/compositional-intent-graph-v1/CIG-02E_EDUCATION_CAREER_TRAVEL_SOURCE_PILOT.json"].includes(reviewPath), "unregistered source review path");
  assert.ok(mirrorPath && officialPath, "two pinned source files required");
  const read = file => {
    const bytes = fs.readFileSync(file);
    return { bytes, rows: bytes.toString("utf8").trim().split(/\r?\n/u).map(JSON.parse) };
  };
  const mirror = read(mirrorPath), official = read(officialPath);
  const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
  const allDecisions = [...review.decisions, ...(review.supplemental_followups ?? [])];
  const dollyDecisions = allDecisions.filter(item => item.source_row.startsWith("dolly:"));
  const ids = dollyDecisions.map(item => Number(item.source_row.split(":")[1]));
  const reconciliation = reconcile(mirror.rows, official.rows, ids);
  assert.equal(mirror.rows.length, 15011);
  assert.equal(official.rows.length, 15014);
  for (const item of reconciliation.selected_rows) {
    const decision = dollyDecisions.find(row => row.source_row === "dolly:" + item.mirror_row_id);
    assert.equal(item.instruction_sha256, decision.instruction_sha256, "reviewed row identity changed");
    if (decision.official_input_rows) {
      assert.deepEqual(item.official_instruction_and_context_ids, decision.official_input_rows, "official input mapping changed");
    }
  }
  const result = {
    format: "cig02e-dolly-provenance-reconciliation-v1",
    classification: "SOURCE_IDENTITY_ONLY_NOT_GOLD_OR_CAPABILITY",
    review_manifest: reviewPath,
    non_dolly_nominations_not_verified: allDecisions.length - dollyDecisions.length,
    mirror: { repo: "buayism/dolly-15k-dataset", commit: "6d7ebf384c5e588ee1b0dff816557489bc16089c", blob: "7c507d16b055ae32107a6dd0585779678565dcd2", sha256: sha256(mirror.bytes) },
    official: { repo: "databrickslabs/dolly", commit: "2305eb7f2f4b3beb2379f34c6addf335b46c4b43", blob: "9b0b912c478e7ccd61ce741ebb409ddf8c7c22e6", sha256: sha256(official.bytes) },
    reconciliation,
    comparison: "Exact decoded strings for instruction, context, response, category. No whitespace or semantic normalization; no row-position identity assumption.",
    accepted_fixture_rows: 0, gold_rows_created: 0, candidate_predictions_read: 0,
    dev_scores_computed: 0, capability_test_rows_read: 0,
    cig02_frozen: false, cig03_started: false
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}
