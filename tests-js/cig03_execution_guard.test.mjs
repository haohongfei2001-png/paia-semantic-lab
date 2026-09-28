import test from "node:test";
import assert from "node:assert/strict";
import { ARM_PATH, validateArm, validateTrigger } from "../scripts/cig03_execution_guard.mjs";
const packet="a".repeat(64), preopen="b".repeat(40);
const expected={packet_sha256:packet,pre_open_git_blob_sha:preopen};
const arm={schema_version:"cig03-execution-arm-v1",protocol_version:"1.1.0",execution_invocations_max:1,
 pre_open_git_blob_sha:preopen,pre_open_source_ref:"c".repeat(40),packet_sha256:packet,one_shot_nonce:"CIG03:"+packet,
 ledger_branch:"cig03-execution-ledger",candidate_changed:false,test_consumed:false};
test("arm binds immutable identities and one execution",()=>{
 assert.equal(validateArm(arm,expected),true);
 for(const edit of [{execution_invocations_max:2},{packet_sha256:"d".repeat(64)},
   {pre_open_git_blob_sha:"e".repeat(40)},{candidate_changed:true},{test_consumed:true},
   {one_shot_nonce:"other"},{ledger_branch:"main"}]) assert.throws(()=>validateArm({...arm,...edit},expected));
});
test("only first main push changing the dedicated arm may score",()=>{
 const env={GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",GITHUB_RUN_ATTEMPT:"1"};
 const event={commits:[{added:[ARM_PATH],modified:[]}]};
 assert.equal(validateTrigger(env,event),true);
 for(const edit of [{GITHUB_RUN_ATTEMPT:"2"},{GITHUB_EVENT_NAME:"pull_request"},{GITHUB_REF:"refs/heads/stub"}])
   assert.throws(()=>validateTrigger({...env,...edit},event));
 assert.throws(()=>validateTrigger(env,{commits:[{modified:["status/COMPOSITIONAL_INTENT_GRAPH_STATUS.yaml"]}]}));
});
