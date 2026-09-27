import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyInputs } from "../scripts/cig02e_ledger_input_identity.mjs";
const hash = s => crypto.createHash("sha256").update(s).digest("hex");
const row = (instruction, context, response = "unused") => ({instruction,context,response});
const entry = (id, instruction, officialIds, topic = "synthetic.test.a") => ({
  source_row:"dolly:"+id, instruction_sha256:hash(instruction),
  official_input_rows:officialIds, topic_id:topic, origin_kind:"BASE_NOMINATION"
});
test("changed context and whitespace cannot pass instruction-only or normalized identity", () => {
  const mirror = [row("fixed request","one")], entries = [entry(1,"fixed request",[1])];
  assert.throws(() => verifyInputs(mirror,[row("fixed request","two")],entries),/No exact official/);
  assert.throws(() => verifyInputs(mirror,[row("fixed request","one ")],entries),/No exact official/);
  assert.throws(() => verifyInputs(mirror,[row("fixed request ","one")],entries),/No exact official/);
});
test("reordered official positions and duplicate inputs remain explicit; responses are irrelevant", () => {
  const mirror = [row("fixed request","ctx"),row("fixed request","ctx"),row("fixed request","different")];
  const official = [row("other",""),row("fixed request","ctx","changed"),row("fixed request","ctx"),row("fixed request","different")];
  const result = verifyInputs(mirror,official,[entry(1,"fixed request",[2,3]),entry(2,"fixed request",[2,3],"synthetic.test.b"),entry(3,"fixed request",[4])]);
  assert.equal(result.distinct_source_rows,3);
  assert.equal(result.distinct_input_pairs,2);
  assert.equal(result.repeated_input_groups.length,1);
  assert.deepEqual(result.repeated_input_groups[0].source_rows,["dolly:1","dolly:2"]);
  assert.throws(() => verifyInputs(mirror,official,[entry(1,"fixed request",[1])]),/Official input mapping changed/);
});
test("malformed selection, input schema and changed instruction hash fail closed", () => {
  assert.throws(() => verifyInputs([row("fixed","")],[row("fixed","")],[entry(2,"fixed",[1])]),/out of range/);
  assert.throws(() => verifyInputs([row("changed","")],[row("changed","")],[entry(1,"fixed",[1])]),/Instruction identity changed/);
  assert.throws(() => verifyInputs([{instruction:"fixed",context:null}],[row("fixed","")],[entry(1,"fixed",[1])]));
  const malformed = {...entry(1,"fixed",[1]),source_row:"dolly:0"};
  assert.throws(() => verifyInputs([row("fixed","")],[row("fixed","")],[malformed]));
});
