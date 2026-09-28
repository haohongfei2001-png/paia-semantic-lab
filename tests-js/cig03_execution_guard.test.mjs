import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ARM_PATH, changedArmPaths, validateArm, validateTrigger } from "../scripts/cig03_execution_guard.mjs";
const packet="a".repeat(64), preopen="b".repeat(40);
const expected={packet_sha256:packet,pre_open_git_blob_sha:preopen};
const arm={schema_version:"cig03-execution-arm-v1",protocol_version:"1.1.0",execution_invocations_max:1,
 pre_open_git_blob_sha:preopen,pre_open_source_ref:"c".repeat(40),packet_sha256:packet,one_shot_nonce:"CIG03:"+packet,
 ledger_branch:"cig03-execution-ledger",candidate_changed:false,test_consumed:false};
const env={GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",GITHUB_RUN_ATTEMPT:"1"};
test("arm binds immutable identities and one execution",()=>{
 assert.equal(validateArm(arm,expected),true);
 for(const edit of [{execution_invocations_max:2},{packet_sha256:"d".repeat(64)},
   {pre_open_git_blob_sha:"e".repeat(40)},{candidate_changed:true},{test_consumed:true},
   {one_shot_nonce:"other"},{ledger_branch:"main"}]) assert.throws(()=>validateArm({...arm,...edit},expected));
});
test("only first main push changing the dedicated arm may score",()=>{
 assert.equal(validateTrigger(env,[ARM_PATH]),true);
 for(const edit of [{GITHUB_RUN_ATTEMPT:"2"},{GITHUB_EVENT_NAME:"pull_request"},{GITHUB_REF:"refs/heads/stub"}])
   assert.throws(()=>validateTrigger({...env,...edit},[ARM_PATH]));
 assert.throws(()=>validateTrigger(env,["status/COMPOSITIONAL_INTENT_GRAPH_STATUS.yaml"]));
 assert.throws(()=>validateTrigger(env,{commits:[{modified:[ARM_PATH]}]}));
});
test("real merge first-parent filenames work without Actions event file lists",()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),"cig03-trigger-stub-"));
 const git=(...args)=>execFileSync("git",["-c","user.name=CI Stub","-c","user.email=stub@example.invalid",...args],
   {cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 try {
  git("init","-b","main"); fs.writeFileSync(path.join(cwd,"README"),"stub only\n"); git("add",".");git("commit","-m","base");
  git("checkout","-b","arm-stub");
  fs.mkdirSync(path.dirname(path.join(cwd,ARM_PATH)),{recursive:true});
  fs.writeFileSync(path.join(cwd,ARM_PATH),"{}\n");git("add",".");git("commit","-m","arm");
  git("checkout","main");git("merge","--no-ff","arm-stub","-m","merge arm");
  assert.deepEqual(changedArmPaths(cwd),[ARM_PATH]);
  assert.equal(validateTrigger(env,changedArmPaths(cwd)),true);
  // A subsequent unrelated main commit must never replay the arm.
  fs.writeFileSync(path.join(cwd,"README"),"metadata closure\n");git("add",".");git("commit","-m","closure");
  assert.deepEqual(changedArmPaths(cwd),[]);
  assert.throws(()=>validateTrigger(env,changedArmPaths(cwd)));
 } finally {fs.rmSync(cwd,{recursive:true,force:true});}
});
test("modified arm is eligible, shallow missing parent fails closed",()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),"cig03-trigger-stub-"));
 const git=(...args)=>execFileSync("git",["-c","user.name=CI Stub","-c","user.email=stub@example.invalid",...args],
   {cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 try {
  git("init","-b","main");fs.mkdirSync(path.dirname(path.join(cwd,ARM_PATH)),{recursive:true});
  fs.writeFileSync(path.join(cwd,ARM_PATH),"{}\n");git("add",".");git("commit","-m","initial");
  assert.throws(()=>changedArmPaths(cwd));
  fs.writeFileSync(path.join(cwd,ARM_PATH),"{\"stub\":true}\n");git("add",".");git("commit","-m","technical re-arm");
  assert.equal(validateTrigger(env,changedArmPaths(cwd)),true);
  assert.throws(()=>validateTrigger({...env,GITHUB_RUN_ATTEMPT:"2"},changedArmPaths(cwd)));
 } finally {fs.rmSync(cwd,{recursive:true,force:true});}
});
