/** Atomic local consumption claim. Deployment must place this outside writer access. */
import { open, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJSON } from './contracts.mjs';

const DIGEST = /^[a-f0-9]{64}$/u;
const token = v => typeof v === 'string' && v.length > 0 && v.trim() === v;

/** Claim before packet open. Existing claim is never an automatic retry grant. */
export async function claimEvaluation(directory, claim) {
  if (!token(directory) || !claim || !DIGEST.test(claim.evaluation_key ?? '') ||
    !DIGEST.test(claim.packet_sha256 ?? '') || !DIGEST.test(claim.freeze_sha256 ?? '') ||
    !token(claim.runner_id) || !Number.isFinite(Date.parse(claim.claimed_at)))
    throw new Error('invalid claim identity');
  const record = {schema: 'ZMR-CONSUMPTION-1', evaluation_key: claim.evaluation_key,
    packet_sha256: claim.packet_sha256, freeze_sha256: claim.freeze_sha256,
    runner_id: claim.runner_id, claimed_at: claim.claimed_at,
    rule: 'claim precedes access; any contact or unknown crash consumes packet'};
  await mkdir(directory, {recursive: true, mode: 0o700});
  const path = join(directory, claim.evaluation_key + '.json');
  let handle;
  try {
    handle = await open(path, 'wx', 0o600);
    await handle.writeFile(canonicalJSON(record) + '\n');
    await handle.sync();
  } catch (error) {
    // The winner may still be writing its record. Never interpret that race as retry permission.
    if (error.code === 'EEXIST') return {status: 'ALREADY_CLAIMED_NO_RETRY', evaluation_key:claim.evaluation_key};
    throw error;
  } finally {
    if (handle) await handle.close();
  }
  const dirHandle = await open(directory, 'r');
  try { await dirHandle.sync(); } finally { await dirHandle.close(); }
  return {status: 'CLAIMED_BEFORE_ACCESS', record};
}
