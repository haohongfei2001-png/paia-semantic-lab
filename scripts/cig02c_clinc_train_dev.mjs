import fs from "node:fs";
import crypto from "node:crypto";
import { createTypedGrounder } from "../runtime/compositional_intent_graph_v1/typed_grounder.mjs";
import { createCatalogNameGrounder } from "../runtime/compositional_intent_graph_v1/catalog_name_grounder.mjs";

// Frozen before opening any CLINC train utterance: conservative label-to-Topic mapping.
const mapping = {
  transfer:"sys.finance_purchases.banking_payments",
  calories:"sys.health_wellbeing.nutrition",
  calendar_update:"sys.time_events.calendar_scheduling",
  reminder:"sys.time_events.reminders_deadlines",
  play_music:"sys.media_culture.music",
  tire_pressure:"sys.home_daily.transportation_ownership",
  international_visa:"sys.travel_places.visas_border",
  book_hotel:"sys.travel_places.lodging",
  book_flight:"sys.travel_places.transport_travel",
  translate:"sys.communication_writing.translation",
  todo_list:"sys.time_events.plans_checklists"
};
const datasetPath=process.argv[2]??"external-clinc/data/data_full.json";
const bPath=process.argv[3]??".cig02b-index.json";
const cPath=process.argv[4]??".cig02c-index.json";
const sha=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const datasetBytes=fs.readFileSync(datasetPath);
const data=JSON.parse(datasetBytes);
if (!Array.isArray(data.train)) throw new Error("CLINC train split missing");
const classes=Object.keys(mapping).sort();
const selected=[];
for (const label of classes) {
  const candidates=data.train.filter(row=>Array.isArray(row)&&row.length===2&&row[1]===label)
    .map(row=>({current:String(row[0]),label,gold_topic:mapping[label]}))
    .sort((a,b)=>sha(a.current+"\0"+label).localeCompare(sha(b.current+"\0"+label)));
  if (candidates.length<10) throw new Error("insufficient train rows for "+label);
  selected.push(...candidates.slice(0,10));
}
const b=createTypedGrounder(JSON.parse(fs.readFileSync(bPath,"utf8")),"balanced");
const c=createCatalogNameGrounder(JSON.parse(fs.readFileSync(cPath,"utf8")),"balanced");
function summarize(router) {
  let assigned=0,correct=0;
  const perLabel={};
  for (const row of selected) {
    const topics=router.classify({current:row.current}).topics;
    assigned+=topics.length;
    const hit=topics.length===1&&topics[0]===row.gold_topic;
    correct+=hit?1:0;
    const bucket=perLabel[row.label]??{count:0,correct:0,assigned:0};
    bucket.count++;bucket.correct+=hit?1:0;bucket.assigned+=topics.length?1:0;
    perLabel[row.label]=bucket;
  }
  return {assigned_precision:assigned?correct/assigned:0,coverage:assigned/selected.length,
    represented_topic_macro_recall:classes.reduce((n,label)=>n+perLabel[label].correct/10,0)/classes.length,
    correct,assigned,per_label:perLabel};
}
const result={
  format:"cig02c-clinc-crowd-train-public-dev-v1",
  upstream:"clinc/oos-eval",upstream_commit:"828f8093932c8fe6ca7936c3d2e52903b1c523de",
  upstream_license:"CC-BY-3.0",upstream_split_used:"train",upstream_rows_scored:selected.length,
  mapped_intents:classes.length,represented_topics:new Set(Object.values(mapping)).size,
  source_sha256:{upstream_data_full:sha(datasetBytes),selected_train_rows:sha(JSON.stringify(selected)),
    b_index:sha(fs.readFileSync(bPath)),c_index:sha(fs.readFileSync(cPath))},
  baseline_cig02b_balanced:summarize(b),candidate_cig02c_balanced:summarize(c),
  interpretation_scope:"SOURCE_SEPARATED_PUBLIC_TRAIN_DEV_ONLY_NOT_FULL_CATALOG_OR_CAPABILITY_TEST",
  private_artifact_reads:0,legacy_evaluation_reads:0,consumed_lockbox_reads:0,
  real_paia_archive_reads:0,consumed_lsr_csl_test_reads:0,cig03_test_invocations:0
};
console.log("CIG02C_CLINC_TRAIN_DEV_JSON="+JSON.stringify(result));
