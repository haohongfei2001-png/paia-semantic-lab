import fs from "node:fs";
import crypto from "node:crypto";
import { createCatalogNameGrounder } from "../runtime/compositional_intent_graph_v1/catalog_name_grounder.mjs";
import { createGradedGrounder } from "../runtime/compositional_intent_graph_v1/graded_grounder.mjs";

const mapping={
  transfer:"sys.finance_purchases.banking_payments",calories:"sys.health_wellbeing.nutrition",
  calendar_update:"sys.time_events.calendar_scheduling",reminder:"sys.time_events.reminders_deadlines",
  play_music:"sys.media_culture.music",tire_pressure:"sys.home_daily.transportation_ownership",
  international_visa:"sys.travel_places.visas_border",book_hotel:"sys.travel_places.lodging",
  book_flight:"sys.travel_places.transport_travel",translate:"sys.communication_writing.translation",
  todo_list:"sys.time_events.plans_checklists"
};
const sha=value=>crypto.createHash("sha256").update(value).digest("hex");
const dataBytes=fs.readFileSync(process.argv[2]??"external-clinc/data/data_full.json");
const data=JSON.parse(dataBytes);
const cBytes=fs.readFileSync(process.argv[3]??".cig02c-index.json");
const index=JSON.parse(cBytes);
const controlBytes=fs.readFileSync("fixtures/cig_v1/public_dev_cig02d_defer.json");
const controls=JSON.parse(controlBytes);
if(!Array.isArray(data.train)||controls.cases.length!==22)throw Error("DEV input dimensions");
const labels=Object.keys(mapping).sort(),selected=[];
for(const label of labels) {
  const ordered=data.train.filter(row=>Array.isArray(row)&&row.length===2&&row[1]===label)
    .map(row=>({current:String(row[0]),label,gold_topic:mapping[label]}))
    .sort((a,b)=>sha(a.current+"\0"+label).localeCompare(sha(b.current+"\0"+label)));
  if(ordered.length<20)throw Error("not enough train rows: "+label);
  const earlier=new Set(ordered.slice(0,10).map(row=>row.current));
  const fresh=ordered.slice(10,20);
  if(fresh.some(row=>earlier.has(row.current)))throw Error("selection overlaps prior DEV: "+label);
  selected.push(...fresh);
}
function summarize(router) {
  let assigned=0,correct=0,deferFalse=0,contextHarm=0;
  const perLabel=Object.fromEntries(labels.map(label=>[label,{count:0,assigned:0,correct:0}]));
  for(const row of selected) {
    const predicted=router.classify({current:row.current}).topics;
    const withContext=router.classify({current:row.current,context:"Unrelated prior note about music and a contract."}).topics;
    if(JSON.stringify(predicted)!==JSON.stringify(withContext))contextHarm++;
    assigned+=predicted.length;
    const hit=predicted.length===1&&predicted[0]===row.gold_topic;
    correct+=hit?1:0;
    const bucket=perLabel[row.label];
    bucket.count++;bucket.assigned+=predicted.length?1:0;bucket.correct+=hit?1:0;
  }
  for(const row of controls.cases)if(router.classify({current:row.current}).topics.length)deferFalse++;
  return {assigned_precision:assigned?correct/assigned:0,auto_assignment_coverage:assigned/selected.length,
    represented_topic_macro_recall:labels.reduce((n,label)=>n+perLabel[label].correct/10,0)/labels.length,
    correct,assigned,defer_false_assignment:deferFalse,defer_case_count:controls.cases.length,
    context_harm:contextHarm,per_label:perLabel};
}
const c=createCatalogNameGrounder(index,"balanced"),d=createGradedGrounder(index,"balanced");
const result={
  format:"cig02d-fresh-clinc-train-public-dev-v1",
  upstream:"clinc/oos-eval",upstream_commit:"828f8093932c8fe6ca7936c3d2e52903b1c523de",
  upstream_license:"CC-BY-3.0",upstream_split_used:"train",selection:"sha256-ranks-10-through-19-per-label",
  case_counts:{crowd_train_positive:selected.length,same_writer_defer:controls.cases.length},
  represented_topics:new Set(Object.values(mapping)).size,
  source_sha256:{upstream_data_full:sha(dataBytes),selected_train_rows:sha(JSON.stringify(selected)),
    index:sha(cBytes),defer_controls:sha(controlBytes)},
  baseline_cig02c_balanced:summarize(c),candidate_cig02d_balanced:summarize(d),
  interpretation_scope:"FRESH_SOURCE_SEPARATED_PUBLIC_TRAIN_DEV_PLUS_SAME_WRITER_DEFER_NOT_CAPABILITY_TEST",
  prior_clinc_rank_0_9_used_only_for_disjointness_check:true,private_artifact_reads:0,legacy_evaluation_reads:0,
  consumed_lockbox_reads:0,real_paia_archive_reads:0,cig03_test_invocations:0
};
console.log("CIG02D_FRESH_DEV_RESULT_JSON="+JSON.stringify(result));
