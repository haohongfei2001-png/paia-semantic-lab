import fs from "node:fs";
import crypto from "node:crypto";

const labels=["transfer","calories","calendar_update","reminder","play_music","tire_pressure",
  "international_visa","book_hotel","book_flight","translate","todo_list"].sort();
const sha=value=>crypto.createHash("sha256").update(value).digest("hex");
const data=JSON.parse(fs.readFileSync(process.argv[2]??"external-clinc/data/data_full.json","utf8"));
const index=JSON.parse(fs.readFileSync(process.argv[3]??".cig02b-index.json","utf8"));
const selected=[];
for (const label of labels) {
  const rows=data.train.filter(row=>Array.isArray(row)&&row.length===2&&row[1]===label)
    .map(row=>({current:String(row[0]),label}))
    .sort((a,b)=>sha(a.current+"\0"+label).localeCompare(sha(b.current+"\0"+label)));
  selected.push(...rows.slice(0,10));
}
const expected="d1a9795706df705b20a9e6663e69bbf90a888501da7ba097e00f33bffa67cf04";
const result=JSON.parse(fs.readFileSync("artifacts/compositional-intent-graph-v1/CIG-02C_CLINC_TRAIN_DEV_RESULT.json","utf8"));
if (result.source_sha256.selected_train_rows!==expected || selected.length!==110) throw new Error("selected DEV changed");
const lower=value=>String(value).normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim();
function contains(span,atom) {
  if (/^[\x00-\x7f]+$/u.test(atom)) {
    const escaped=atom.replace(/[.*+?^$()|[\]{}\\]/gu,"\\$&");
    return new RegExp("(^|[^a-z0-9])"+escaped+"($|[^a-z0-9])","u").test(span);
  }
  return span.includes(atom);
}
const actionAtoms=[...index.global_action_atoms.en,...index.global_action_atoms.zh].map(lower);
const objects=index.topics.flatMap(topic=>topic.atoms.OBJECT.map(atom=>atom.value));
const counts={action_cue:0,any_object_anchor:0,action_and_object:0,neither:0};
for (const row of selected) {
  const span=lower(row.current);
  const action=actionAtoms.some(atom=>contains(span,atom));
  const object=objects.some(atom=>contains(span,atom));
  counts.action_cue+=action?1:0;
  counts.any_object_anchor+=object?1:0;
  counts.action_and_object+=action&&object?1:0;
  counts.neither+=!action&&!object?1:0;
}
console.log("CIG02C_CLINC_AGGREGATE_DIAGNOSTIC_JSON="+JSON.stringify({
  format:"cig02c-post-score-public-dev-aggregate-diagnostic-v1",
  selected_rows:110,selected_rows_sha256:expected,counts,
  interpretation_scope:"POST_SCORE_DEV_FAILURE_ATTRIBUTION_NOT_CANDIDATE_SELECTION",
  case_text_output:false,cig03_test_invocations:0
}));
