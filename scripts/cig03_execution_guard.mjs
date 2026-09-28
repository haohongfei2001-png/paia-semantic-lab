import { execFileSync } from "node:child_process";
export const ARM_PATH = "artifacts/compositional-intent-graph-v1/CIG-03_EXECUTION_ARM.json";
const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
export function validateArm(arm, expected) {
  if (!arm || arm.schema_version !== "cig03-execution-arm-v1" ||
      arm.protocol_version !== "1.1.0" || arm.execution_invocations_max !== 1 ||
      arm.pre_open_git_blob_sha !== expected.pre_open_git_blob_sha ||
      !sha.test(arm.pre_open_source_ref ?? "") ||
      arm.packet_sha256 !== expected.packet_sha256 ||
      !digest.test(arm.packet_sha256 ?? "") ||
      arm.one_shot_nonce !== "CIG03:" + expected.packet_sha256 ||
      arm.ledger_branch !== "cig03-execution-ledger" ||
      arm.candidate_changed !== false || arm.test_consumed !== false) {
    throw new Error("INVALID_EXECUTION_ARM");
  }
  return true;
}
// Read filenames only. Actions push payloads do not guarantee per-commit file lists.
export function changedArmPaths(cwd = process.cwd()) {
  return execFileSync("git", ["diff", "--name-only", "HEAD^1", "HEAD", "--", ARM_PATH],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    .trim().split("\n").filter(Boolean);
}
export function validateTrigger(env, changedPaths) {
  if (env.GITHUB_EVENT_NAME !== "push" || env.GITHUB_REF !== "refs/heads/main" ||
      env.GITHUB_RUN_ATTEMPT !== "1" || !Array.isArray(changedPaths) ||
      !changedPaths.includes(ARM_PATH)) {
    throw new Error("ONE_SHOT_TRIGGER_REJECTED");
  }
  return true;
}
