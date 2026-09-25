import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const dollyPath = process.argv[2] ?? ".cig02e-dolly-source.jsonl";
const alpacaPath = process.argv[3] ?? ".cig02e-alpaca-source.json";
const hash = text => crypto.createHash("sha256").update(text).digest("hex");
const queries = [
  {
    topic_id: "sys.family_relationships.caregiving_family_support",
    cues: [/\b(?:parent|mother|father|grandparent|elderly|caregiver|family member)\b/iu,
      /\b(?:care|support|help|look after|assist|nursing)\b/iu]
  },
  {
    topic_id: "sys.finance_purchases.major_purchases",
    cues: [/\b(?:buy|purchase|shopping|replace|acquire)\b/iu,
      /\b(?:car|house|home|appliance|laptop|vehicle|expensive|budget|cost|price)\b/iu]
  },
  {
    topic_id: "sys.knowledge_memory.photos_media_archive",
    cues: [/\b(?:photo|picture|image|video|media)\b/iu,
      /\b(?:organize|sort|archive|store|backup|catalog|album|library)\b/iu]
  }
];
const dolly = fs.readFileSync(dollyPath, "utf8").trim().split(/\r?\n/u).map(JSON.parse);
const alpaca = JSON.parse(fs.readFileSync(alpacaPath, "utf8"));
assert.equal(dolly.length, 15011);
assert.equal(alpaca.length, 52002);
for (const [name, rows] of [["dolly", dolly], ["alpaca", alpaca]]) {
  for (const query of queries) {
    const matches = [];
    for (let i = 0; i < rows.length; i++) {
      const instruction = rows[i].instruction;
      assert.equal(typeof instruction, "string");
      if (!query.cues.every(re => re.test(instruction))) continue;
      matches.push({ source_row: name + ":" + (i + 1),
        instruction_sha256: hash(instruction),
        excerpt: instruction.replace(/\s+/gu, " ").slice(0, 220) });
    }
    matches.sort((a, b) => a.instruction_sha256.localeCompare(b.instruction_sha256));
    console.log(JSON.stringify({
      classification: "SOURCE_REVIEW_DISCOVERY_NOT_GOLD_OR_CAPABILITY",
      source: name, topic_id: query.topic_id, broad_query_candidate_count: matches.length,
      sampled_excerpts: matches.slice(0, 8), candidate_predictions_read: 0,
      gold_rows_created: 0, dev_scores_computed: 0
    }));
  }
}
