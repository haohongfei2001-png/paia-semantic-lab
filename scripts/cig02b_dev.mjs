import fs from "node:fs";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { createTypedGrounder } from "../runtime/compositional_intent_graph_v1/typed_grounder.mjs";

const read = path => fs.readFileSync(path);
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const indexPath = process.argv[2] ?? ".cig02b-index.json";
const fixturePath = "fixtures/cig_v1/public_dev_cig02b_v1.json";
const runtimePath = "runtime/compositional_intent_graph_v1/typed_grounder.mjs";
const parserPath = "runtime/compositional_intent_graph_v1/goal_parser.mjs";
const indexBytes = read(indexPath), fixtureBytes = read(fixturePath);
const fixture = JSON.parse(fixtureBytes), index = JSON.parse(indexBytes);
if (fixture.role.length !== 18 || fixture.natural.length !== 18 || fixture.defer.length !== 18) {
  throw new Error("new public DEV dimensions changed");
}
const rows = [...fixture.role, ...fixture.natural, ...fixture.defer];
const domainOf = new Map(index.topics.map(topic => [topic.topic_id, topic.domain_id]));
const represented = new Set([...fixture.role,...fixture.natural].map(row => row.gold_topic));
if (new Set([...represented].map(id => domainOf.get(id))).size !== 18) throw new Error("not all domains represented");
function score(policy) {
  const startHeap = process.memoryUsage().heapUsed;
  const start = performance.now();
  const grounder = createTypedGrounder(index, policy);
  const coldInitMs = performance.now()-start;
  const calls = rows.map(row => grounder.classify({current:row.current}));
  const repeat = rows.map(row => grounder.classify({current:row.current}));
  const contextCalls = rows.map(row => grounder.classify({current:row.current,
    context:"Unrelated prior discussion of a calendar, film, and contract."}));
  const correctByTopic = new Map();
  let correct = 0, assigned = 0, falseDefer = 0, means = 0, positiveAssigned = 0;
  const errors = [];
  for (let i=0;i<rows.length;i++) {
    const row=rows[i], predicted=calls[i].topics;
    assigned += predicted.length;
    if (row.kind === "defer") {
      if (predicted.length) { falseDefer++; errors.push({id:row.id,predicted}); }
    } else {
      positiveAssigned += predicted.length ? 1 : 0;
      if (predicted.length === 1 && predicted[0] === row.gold_topic) {
        correct++;correctByTopic.set(row.gold_topic,(correctByTopic.get(row.gold_topic)??0)+1);
      } else if (predicted.length) errors.push({id:row.id,predicted,gold:row.gold_topic});
      if (row.kind === "role" && predicted.includes(row.means_topic)) means++;
    }
  }
  const times=[];
  for (let round=0;round<10;round++) for (const row of rows) {
    const t=performance.now();grounder.classify({current:row.current});times.push(performance.now()-t);
  }
  times.sort((a,b)=>a-b);
  return {
    policy, assigned_precision:assigned ? correct/assigned : 0,
    auto_assignment_coverage:positiveAssigned/36,
    represented_topic_macro_recall:[...represented].reduce((n,id)=>n+(correctByTopic.get(id)??0),0)/36,
    represented_topic_count:represented.size, full_catalog_topic_count:144,
    role_correct:fixture.role.reduce((n,row,i)=>n+(calls[i].topics[0]===row.gold_topic?1:0),0),
    natural_correct:fixture.natural.reduce((n,row,i)=>n+(calls[i+18].topics[0]===row.gold_topic?1:0),0),
    defer_false_assignment:falseDefer, means_false_assignment:means,
    context_harm:contextCalls.filter((call,i)=>JSON.stringify(call.topics)!==JSON.stringify(calls[i].topics)).length,
    deterministic_repeat:JSON.stringify(calls)===JSON.stringify(repeat),
    resource:{cold_init_ms:coldInitMs,warm_p95_ms:times[Math.ceil(times.length*0.95)-1],
      incremental_heap_bytes:Math.max(0,process.memoryUsage().heapUsed-startHeap)},
    errors
  };
}
const result={
  format:"cig02b-new-public-dev-diagnostic-v1",case_counts:{role:18,natural:18,defer:18},
  source_sha256:{fixture:digest(fixtureBytes),index:digest(indexBytes),runtime:digest(read(runtimePath)),
    parser:digest(read(parserPath))},
  index_bytes:indexBytes.length,router_plus_index_bytes:indexBytes.length+read(runtimePath).length+read(parserPath).length,
  policies:[score("strict"),score("balanced")],
  source_scope:"PUBLIC_CATALOG_AND_DRAFT_PROFILES_ONLY",
  interpretation_scope:"SAME_WRITER_PUBLIC_DEV_ONLY_NOT_CAPABILITY_OR_PROMOTION",
  private_artifact_reads:0,legacy_evaluation_reads:0,consumed_lockbox_reads:0,real_archive_reads:0,
  consumed_lsr_csl_test_reads:0,consumed_cig01_case_reads:0,cig03_test_invocations:0
};
if (result.index_bytes>1048576 || result.router_plus_index_bytes>2097152) throw new Error("tiny footprint exceeded");
if (result.policies.some(x=>!x.deterministic_repeat || x.context_harm)) throw new Error("determinism/context regression");
console.log("CIG02B_DEV_RESULT_JSON="+JSON.stringify(result));
