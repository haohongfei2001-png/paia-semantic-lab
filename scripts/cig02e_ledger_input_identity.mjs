import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const inputKey = row => {
  assert.equal(typeof row?.instruction, "string");
  assert.equal(typeof row?.context, "string");
  return JSON.stringify([row.instruction, row.context]);
};
export function verifyInputs(mirror, official, entries, digest = sha256) {
  const officialInputs = new Map();
  official.forEach((row, i) => {
    const key = inputKey(row);
    if (!officialInputs.has(key)) officialInputs.set(key, []);
    officialInputs.get(key).push(i + 1);
  });
  const identities = entries.map(entry => {
    assert.match(entry.source_row, /^dolly:[1-9][0-9]*$/u);
    const id = Number(entry.source_row.slice(6));
    assert.ok(id <= mirror.length, "Selected mirror row out of range");
    const row = mirror[id - 1], key = inputKey(row);
    assert.equal(digest(row.instruction), entry.instruction_sha256, "Instruction identity changed");
    const officialIds = officialInputs.get(key) || [];
    assert.ok(officialIds.length > 0, "No exact official instruction/context pair; do not substitute");
    assert.deepEqual(officialIds, entry.official_input_rows, "Official input mapping changed");
    return {
      topic_id:entry.topic_id, origin_kind:entry.origin_kind, source_row:entry.source_row,
      instruction_sha256:digest(row.instruction), context_sha256:digest(row.context),
      instruction_context_sha256:digest(key), official_input_rows:officialIds
    };
  });
  const byInput = new Map();
  for (const identity of identities) {
    const key = identity.instruction_context_sha256;
    if (!byInput.has(key)) byInput.set(key, {input_sha256:key, source_rows:[], nominations:[]});
    const group = byInput.get(key);
    if (!group.source_rows.includes(identity.source_row)) group.source_rows.push(identity.source_row);
    group.nominations.push({topic_id:identity.topic_id, origin_kind:identity.origin_kind, source_row:identity.source_row});
  }
  return {
    classification:"FIXED_SOURCE_INPUT_IDENTITY_NOT_GOLD_OR_CAPABILITY",
    selected_nominations:identities.length, distinct_source_rows:new Set(identities.map(x => x.source_row)).size,
    distinct_input_pairs:byInput.size, identities,
    repeated_input_groups:[...byInput.values()].filter(g => g.nominations.length > 1),
    accepted_fixture_rows:0, gold_rows_created:0, candidate_predictions_read:0,
    dev_scores_computed:0, capability_test_rows_read:0, cig02_frozen:false, cig03_started:false
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mirrorPath, officialPath] = process.argv.slice(2);
  assert.ok(mirrorPath && officialPath, "Two pinned public source files required");
  const read = path => {
    const bytes = fs.readFileSync(path);
    return {bytes, rows:bytes.toString("utf8").trim().split(/\r?\n/u).map(JSON.parse)};
  };
  const mirror = read(mirrorPath), official = read(officialPath);
  assert.equal(mirror.rows.length,15011); assert.equal(official.rows.length,15014);
  const ledgerPath = "artifacts/compositional-intent-graph-v1/CIG-02E_ADJUDICATION_LEDGER.json";
  const ledgerBytes = fs.readFileSync(ledgerPath), ledger = JSON.parse(ledgerBytes.toString("utf8"));
  assert.equal(ledger.accepted_fixture_rows,0); assert.equal(ledger.gold_rows_created,0);
  assert.equal(ledger.cig02_frozen,false); assert.equal(ledger.cig03_started,false);
  const result = verifyInputs(mirror.rows, official.rows, ledger.entries);
  assert.equal(result.selected_nominations,79); assert.equal(result.distinct_source_rows,76);
  result.ledger = {path:ledgerPath, sha256:sha256(ledgerBytes)};
  result.mirror = {repo:"buayism/dolly-15k-dataset", commit:"6d7ebf384c5e588ee1b0dff816557489bc16089c", blob:"7c507d16b055ae32107a6dd0585779678565dcd2", sha256:sha256(mirror.bytes)};
  result.official = {repo:"databrickslabs/dolly", commit:"2305eb7f2f4b3beb2379f34c6addf335b46c4b43", blob:"9b0b912c478e7ccd61ce741ebb409ddf8c7c22e6", sha256:sha256(official.bytes)};
  result.comparison = "Exact decoded instruction/context strings, no normalization. Generated response and category are unused. Pair equality verifies identity, not source-unit or gold independence.";
  fs.mkdirSync("artifacts/ci",{recursive:true});
  fs.writeFileSync("artifacts/ci/cig02e-ledger-input-identities.json",JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result));
}
