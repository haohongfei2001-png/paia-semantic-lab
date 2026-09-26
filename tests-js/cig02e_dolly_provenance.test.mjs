import test from "node:test";
import assert from "node:assert/strict";
import { reconcile } from "../scripts/cig02e_dolly_provenance.mjs";
const row = (instruction, context = "", response = "answer", category = "open_qa") =>
  ({ instruction, context, response, category });
test("maps reordered and duplicate rows without assuming row-position identity", () => {
  const a = row("request A"), b = row("request B");
  const result = reconcile([a, b, a], [b, a, a], [1, 2]);
  assert.deepEqual(result.selected_rows[0].official_full_row_ids, [2, 3]);
  assert.deepEqual(result.selected_rows[1].official_full_row_ids, [1]);
  assert.equal(result.mirror_full_rows_exactly_matching_official, 3);
  assert.equal(result.mirror_unique_full_rows, 2);
});
test("distinguishes changed context from changed answer and absent instructions", () => {
  const result = reconcile([row("A", "different"), row("B", "", "changed"), row("missing")],
    [row("A", "original"), row("B")], [1, 2, 3]);
  assert.deepEqual(result.selected_rows.map(item => item.mapping),
    ["INSTRUCTION_ONLY_CONTEXT_DIFFERENT", "EXACT_INPUT_ONLY", "NO_EXACT_INSTRUCTION"]);
  assert.equal(result.mirror_instruction_and_context_exact_matches, 1);
  assert.equal(result.mirror_full_rows_exactly_matching_official, 0);
});
test("does not silently normalize source strings or accept invalid IDs or schemas", () => {
  assert.equal(reconcile([row("A ")], [row("A")], [1]).selected_rows[0].mapping, "NO_EXACT_INSTRUCTION");
  assert.throws(() => reconcile([row("A")], [row("A")], [0]));
  assert.throws(() => reconcile([{ instruction: "A" }], [row("A")]));
});
