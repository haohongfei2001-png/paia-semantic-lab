import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { GATES, score } from "./cig03_score.mjs";
import { validatePacket } from "./cig03_validate.mjs";
import { buildPredictions } from "./cig03_adapter.mjs";
import { ARM_PATH, validateArm, validateTrigger } from "./cig03_execution_guard.mjs";

const DIR="artifacts/compositional-intent-graph-v1/";
const PREOPEN=DIR+"CIG-03_PRE_OPEN_FREEZE.json";
const CURATOR="docs/compositional-intent-graph-v1/CIG-03_TEST_FREEZE_MANIFEST.json";
const RESULT=DIR+"CIG-03_TEST_RESULT.json";
const RECEIPT=DIR+"CIG-03_RESULT_RECEIPT.json";
const CLAIM=DIR+"CIG-03_EXECUTION_CLAIM.json";
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const blob=b=>crypto.createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const requireTrue=(value,code)=>{if(!value)throw new Error(code);};
const jsonEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function pin(path, expectedBlob, expectedSha256) {
 const bytes=fs.readFileSync(path);
 requireTrue(blob(bytes)===expectedBlob,"FROZEN_BLOB_CHANGED");
 if(expectedSha256)requireTrue(sha256(bytes)===expectedSha256,"FROZEN_DIGEST_CHANGED");
 return bytes;
}
function identities() {
 const preBytes=fs.readFileSync(PREOPEN),m=JSON.parse(preBytes);
 requireTrue(m.schema_version==="cig03-pre-open-freeze-v1"&&m.protocol_version==="1.1.0","INVALID_PRE_OPEN");
 requireTrue(m.test_started===false&&m.candidate_writer_test_content_reads===0&&m.topic_count===144,"BLINDNESS_OR_UNIVERSE_CHANGED");
 requireTrue(jsonEqual(GATES,m.scoring_gates),"SCORING_GATES_CHANGED");
 const cBytes=pin(CURATOR,m.curator_manifest_git_blob_sha);
 const c=JSON.parse(cBytes);
 requireTrue(c.curator.candidate_writer_blind===true&&c.curator.forbidden_context_exposed===false&&
  c.test_started===false&&c.candidate_test_executed===false,"CURATOR_ISOLATION_CHANGED");
 requireTrue(c.curation_audit_receipt.validation.passed&&c.curation_audit_receipt.disjointness.passed,"INDEPENDENCE_AUDIT_FAILED");
 requireTrue(c.allocation.single_label===288&&c.allocation.context_pairs===72&&c.allocation.controls===36,"ALLOCATION_CHANGED");
 for(const f of c.files)pin(f.path,f.git_blob_sha,f.sha256);
 for(const f of c.formal_source_identities)pin(f.path,f.git_blob_sha,f.sha256);
 for(const [path,digest]of Object.entries(m.engineering_git_blobs))pin(path,digest);
 const candidateBytes=pin(DIR+"CIG-02G_CANDIDATE_FREEZE.json",m.candidate_freeze_git_blob_sha);
 const candidate=JSON.parse(candidateBytes);
 requireTrue(candidate.cig02_status==="COMPLETE_FROZEN_DEV_READY_NOT_CAPABILITY"&&
  candidate.index_sha256===m.index_sha256&&candidate.topic_count===144,"CANDIDATE_FREEZE_CHANGED");
 for(const [path,digest]of Object.entries(candidate.source_git_blobs))pin(path,digest);
 const indexBytes=fs.readFileSync(".cig02g-index.json");
 requireTrue(sha256(indexBytes)===m.index_sha256&&indexBytes.length===76827,"COMPILED_CANDIDATE_CHANGED");
 const index=JSON.parse(indexBytes);
 requireTrue(index.topic_count===144&&index.topics.length===144&&index.provenance.dev_rows_read===0&&
  index.provenance.capability_test_rows_read===0,"COMPILE_PARTITION_VIOLATION");
 requireTrue(jsonEqual([...c.topic_ids].sort(),index.topics.map(t=>t.topic_id).sort()),"FORMAL_UNIVERSE_CHANGED");
 const f=c.files.find(x=>x.path==="fixtures/cig_v1/cig03_independent_test_v1.json");
 requireTrue(f&&f.sha256===m.packet_sha256,"PACKET_IDENTITY_CHANGED");
 const runtimePaths=["authored_topic_router.mjs","authored_current_goal_scope.mjs","frame_grounder.mjs","current_goal_scope.mjs","goal_parser.mjs"]
  .map(x=>"runtime/compositional_intent_graph_v1/"+x);
 const runtimeBytes=runtimePaths.reduce((n,p)=>n+fs.statSync(p).size,0);
 requireTrue(indexBytes.length<=1048576&&runtimeBytes+indexBytes.length<=2097152,"FIXED_SIZE_CONTRACT_FAILED");
 return {m,c,index,packetPath:f.path,pre_open_git_blob_sha:blob(preBytes),index_bytes:indexBytes.length,router_plus_index_bytes:runtimeBytes+indexBytes.length};
}
function checkArm(state) {
 const arm=read(ARM_PATH);
 validateArm(arm,{pre_open_git_blob_sha:state.pre_open_git_blob_sha,packet_sha256:state.m.packet_sha256});
 const priorBlob=execFileSync("git",["rev-parse",arm.pre_open_source_ref+":"+PREOPEN],{encoding:"utf8"}).trim();
 requireTrue(priorBlob===state.pre_open_git_blob_sha,"PRE_OPEN_NOT_PREVIOUSLY_COMMITTED");
 execFileSync("git",["merge-base","--is-ancestor",arm.pre_open_source_ref,"HEAD"],{stdio:"ignore"});
 return arm;
}
async function claimOnce(arm,state) {
 const repo=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
 requireTrue(repo==="haohongfei2001-png/paia-semantic-lab"&&token,"MISSING_EXECUTION_IDENTITY");
 const url="https://api.github.com/repos/"+repo+"/contents/"+CLAIM;
 const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"};
 const prior=await fetch(url+"?ref="+encodeURIComponent(arm.ledger_branch),{headers});
 requireTrue(prior.status===404,"EXECUTION_ALREADY_CLAIMED_OR_LEDGER_UNAVAILABLE");
 const claim={schema_version:"cig03-execution-claim-v1",one_shot_nonce:arm.one_shot_nonce,
  packet_sha256:state.m.packet_sha256,pre_open_git_blob_sha:state.pre_open_git_blob_sha,
  evaluation_source_sha:process.env.GITHUB_SHA,run_id:process.env.GITHUB_RUN_ID,
  run_attempt:process.env.GITHUB_RUN_ATTEMPT,claimed_before_candidate_packet_access:true,replay_allowed:false};
 const res=await fetch(url,{method:"PUT",headers,body:JSON.stringify({
  message:"CIG-03: immutable one-shot execution claim",
  content:Buffer.from(JSON.stringify(claim,null,2)+"\n").toString("base64"),branch:arm.ledger_branch
 })});
 requireTrue(res.status===201,"EXECUTION_CLAIM_REJECTED");
 const payload=await res.json();
 return {branch:arm.ledger_branch,commit_sha:payload.commit.sha,git_blob_sha:payload.content.sha,run_id:claim.run_id};
}
function verifyResult(state) {
 const bytes=fs.readFileSync(RESULT),result=JSON.parse(bytes),receipt=read(RECEIPT);
 requireTrue(sha256(bytes)===receipt.result_sha256&&blob(bytes)===receipt.result_git_blob_sha,"STORED_RESULT_CHANGED");
 requireTrue(result.schema_version==="cig03-capability-result-v1"&&result.evaluation_invocations===1&&
  result.test_consumed===true&&result.candidate_writer_test_content_reads===0,"INVALID_STORED_RESULT");
 requireTrue(result.packet_sha256===state.m.packet_sha256&&result.pre_open_git_blob_sha===state.pre_open_git_blob_sha&&
  result.index_sha256===state.m.index_sha256,"RESULT_FREEZE_IDENTITY_MISMATCH");
 requireTrue(result.verdict==="PASS"||result.verdict==="FAIL"||result.verdict==="EVALUATION_ERROR","INVALID_RESULT_VERDICT");
 if(result.score) {
  const s=result.score,metrics=s.metrics,counts=s.counts;
  requireTrue(counts.single_label===288&&counts.context_pairs===72&&counts.controls===36&&counts.topics===144&&counts.inputs===468,"RESULT_ALLOCATION_CHANGED");
  requireTrue(metrics.assigned_precision===(counts.single_assigned?counts.single_correct_assigned/counts.single_assigned:0)&&
    metrics.single_label_auto_coverage===counts.single_assigned/288&&
    metrics.controls_false_assignment===counts.control_assigned/36,"RESULT_UNITS_CHANGED");
  const gates={assigned_precision:metrics.assigned_precision>=.95,single_label_auto_coverage:metrics.single_label_auto_coverage>=.7,
    full144_macro_recall:metrics.full144_macro_recall>=.7,controls_false_assignment:metrics.controls_false_assignment<=.02,
    context_harm:metrics.context_harm===0,deterministic_repeat:metrics.deterministic_repeat==="PASS"};
  requireTrue(jsonEqual(gates,s.gates)&&Object.values(gates).every(Boolean)===s.passed&&
    result.verdict===(s.passed?"PASS":"FAIL"),"STORED_VERDICT_CHANGED");
 }
 console.log("CIG03_STORED_RESULT_VERIFIED_JSON="+JSON.stringify({verdict:result.verdict,result_sha256:sha256(bytes),
  evaluation_invocations:1,test_replayed:false,packet_rows_parsed:false}));
}
async function main() {
 const mode=process.argv[2],state=identities();
 if(mode==="--preflight") {
  // Once consumed, stored-result verification no longer depends on shallow Git history.
  if(fs.existsSync(ARM_PATH)&&!fs.existsSync(RESULT))checkArm(state);
  console.log("CIG03_PRE_OPEN_VERIFIED_JSON="+JSON.stringify({pre_open_git_blob_sha:state.pre_open_git_blob_sha,
   packet_sha256:state.m.packet_sha256,topic_count:144,index_bytes:state.index_bytes,
   router_plus_index_bytes:state.router_plus_index_bytes,candidate_test_executed:false}));
  return;
 }
 if(mode==="--verify-result"){verifyResult(state);return;}
 requireTrue(mode==="--score-once","EXPLICIT_ONE_SHOT_MODE_REQUIRED");
 requireTrue(!fs.existsSync(RESULT),"CONSUMED_RESULT_ALREADY_PRESENT");
 const event=read(process.env.GITHUB_EVENT_PATH);
 validateTrigger(process.env,event);
 const arm=checkArm(state),claim=await claimOnce(arm,state);
 let executed=0,stage="PACKET_VALIDATE";
 const result={schema_version:"cig03-capability-result-v1",protocol_version:"1.1.0",
  classification:"FRESH_ISOLATED_CURATOR_AUTHORED_BLIND_TEST",topic_count:144,
  candidate_source_ref:state.c.candidate.source_ref,index_sha256:state.m.index_sha256,
  packet_sha256:state.m.packet_sha256,pre_open_git_blob_sha:state.pre_open_git_blob_sha,
  curator_manifest_git_blob_sha:state.m.curator_manifest_git_blob_sha,
  evaluation_source_sha:process.env.GITHUB_SHA,workflow_ref:process.env.GITHUB_WORKFLOW_REF,
  actions_run_id:process.env.GITHUB_RUN_ID,actions_run_attempt:process.env.GITHUB_RUN_ATTEMPT,
  execution_claim:claim,evaluation_invocations:1,test_consumed:true,
  candidate_writer_test_content_reads:0,private_artifact_reads:0,legacy_evaluation_reads:0,
  consumed_lockbox_reads:0,real_paia_archive_reads:0,production_modified:false,
  index_bytes:state.index_bytes,router_plus_index_bytes:state.router_plus_index_bytes,
  resource_browser_certification:"NOT_EVALUATED_CIG04",score:null};
 try {
  const packet=read(state.packetPath);
  const validation=validatePacket(packet,{topicIds:state.c.topic_ids,expectedRef:state.c.candidate.source_ref});
  requireTrue(validation.passed,"FROZEN_PACKET_VALIDATION_FAILED");
  stage="CANDIDATE_EXECUTION";
  const {createAuthoredTopicRouter}=await import("../runtime/compositional_intent_graph_v1/authored_topic_router.mjs");
  const router=createAuthoredTopicRouter(state.index);
  const predictions=buildPredictions(packet,input=>{executed++;return router.classify(input);});
  requireTrue(executed===936,"INCOMPLETE_DETERMINISM_ALLOCATION");
  stage="FROZEN_SCORER";
  result.score=score(packet,predictions);
  result.verdict=result.score.passed?"PASS":"FAIL";
 }catch {
  result.verdict="EVALUATION_ERROR";result.error_stage=stage;result.replay_allowed=false;
 }
 result.native_candidate_calls=executed;
 const bytes=JSON.stringify(result,null,2)+"\n";
 fs.writeFileSync(RESULT,bytes);
 console.log("CIG03_RESULT_JSON="+JSON.stringify(result));
 console.log("CIG03_RESULT_SHA256="+sha256(bytes));
 // Successful infrastructure execution reports scientific FAIL without hiding it.
 // The immutable result, not this process exit status, controls CIG-04 eligibility.
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 main().catch(()=>{console.error("CIG03_SAFE_PRE_OPEN_OR_EXECUTION_FAILURE");process.exitCode=1;});
}
