import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';

// Exercise the exact CI reader with fake public responses; no fixture or network reads.
const workflow = readFileSync(new URL('../../.github/workflows/zmr-v1.yml', import.meta.url), 'utf8');
const begin = '            // BEGIN_PINNED_PUBLIC_READER';
const end = '            // END_PINNED_PUBLIC_READER';
assert.equal(workflow.split(begin).length, 2);
assert.equal(workflow.split(end).length, 2);
const source = workflow.slice(workflow.indexOf(begin) + begin.length, workflow.indexOf(end));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const bytes = Buffer.from('synthetic engineering bytes only\n');
const sha = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const entry = {mode:'100644', type:'blob', size:bytes.length, sha};
const head = '1'.repeat(40);
async function reader(fetchImpl, entries = [['safe/file.mjs', entry]], paths = ['safe/file.mjs']) {
  const make = new AsyncFunction('allowed', 'after', 'head', 'context', 'fetch', 'assert', 'crypto', 'Buffer', 'AbortSignal', source + '\nreturn {read, stats:()=>({reads:[...reads], rawFetches, unique:byteCache.size})};');
  return make(new Set(paths), new Map(entries), head, {repo:{owner:'example', repo:'public'}}, fetchImpl, assert, crypto, Buffer, AbortSignal);
}

test('immutable public URL, no credentials, digest cache and defensive copies', async () => {
  const calls=[];
  const r=await reader(async (url, options) => {calls.push({url,options}); return new Response(bytes);}, [['safe/file.mjs',entry],['safe/alias.mjs',entry]], ['safe/file.mjs','safe/alias.mjs']);
  const first=await r.read('safe/file.mjs'); first[0]=0;
  assert.deepEqual(await r.read('safe/alias.mjs'),bytes);
  assert.deepEqual(await r.read('safe/file.mjs'),bytes);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,`https://raw.githubusercontent.com/example/public/${head}/safe/file.mjs`);
  assert.equal(calls[0].options.credentials,'omit');
  assert.equal(calls[0].options.redirect,'error');
  assert.equal(calls[0].options.headers,undefined);
  assert.deepEqual(r.stats(),{reads:['safe/file.mjs','safe/alias.mjs','safe/file.mjs'],rawFetches:1,unique:1});
});

test('unallowlisted, traversal, symlink and invalid metadata fail before network', async () => {
  let calls=0; const fetchImpl=async()=>{calls++;return new Response(bytes);};
  const r=await reader(fetchImpl);
  await assert.rejects(r.read('sealed/TEST.json'),/not allowlisted/);
  for (const [path, bad, message] of [
    ['safe/../file.mjs',entry,/canonical path/],
    ['safe/file.mjs',{...entry,mode:'120000'},/regular file/],
    ['safe/file.mjs',{...entry,type:'tree'},/blob required/],
    ['safe/file.mjs',{...entry,sha:'main'},/immutable blob/],
    ['safe/file.mjs',{...entry,size:8*1024*1024+1},/bounded blob/],
  ]) {
    const badReader=await reader(fetchImpl,[[path,bad]],[path]);
    await assert.rejects(badReader.read(path),message);
  }
  assert.equal(calls,0);
});

test('wrong bytes, wrong length and HTTP errors never enter verified cache', async () => {
  for (const body of [Buffer.alloc(bytes.length),Buffer.from('short')]) {
    const r=await reader(async()=>new Response(body));
    await assert.rejects(r.read('safe/file.mjs'),/tree\/blob (digest|size) mismatch/);
    assert.equal(r.stats().unique,0);
  }
  let calls=0;
  const denied=await reader(async()=>{calls++;return new Response('',{status:403});});
  await assert.rejects(denied.read('safe/file.mjs'),/HTTP 403/);
  assert.equal(calls,1); assert.equal(denied.stats().unique,0);
  calls=0;
  const transient=await reader(async()=>{calls++;return new Response('',{status:503});});
  await assert.rejects(transient.read('safe/file.mjs'),/HTTP 503/);
  assert.equal(calls,3); assert.equal(transient.stats().unique,0);
});


test('tree metadata uses two immutable public identities without token fallback', async () => {
  const start='            // BEGIN_PUBLIC_TREE_READER', stop='            // END_PUBLIC_TREE_READER';
  assert.equal(workflow.split(start).length,2); assert.equal(workflow.split(stop).length,2);
  const body=workflow.slice(workflow.indexOf(start)+start.length,workflow.indexOf(stop));
  const make=new AsyncFunction('context','fetch','assert','Buffer','AbortSignal',body+'\nreturn tree;');
  const calls=[];
  const fake=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({sha:'2'.repeat(40),truncated:false,tree:[{path:'safe/file.mjs',...entry}]}));};
  const tree=await make({repo:{owner:'example',repo:'public'}},fake,assert,Buffer,AbortSignal);
  assert.equal((await tree(head)).get('safe/file.mjs').sha,sha);
  await tree('3'.repeat(40));
  assert.equal(calls.length,2); assert.equal(calls[0].url,`https://api.github.com/repos/example/public/git/trees/${head}?recursive=1`);
  assert.equal(calls[0].options.credentials,'omit'); assert.equal(calls[0].options.redirect,'error');
  assert.deepEqual(calls[0].options.headers,{accept:'application/vnd.github+json'});
  await assert.rejects(tree('main')); assert.equal(calls.length,2);
  for(const response of [
    ()=>new Response('',{status:403}),
    ()=>new Response(JSON.stringify({sha:head,truncated:true,tree:[]})),
    ()=>new Response(JSON.stringify({sha:head,truncated:false,tree:[{path:'x'},{path:'x'}]})),
  ]) {
    let reads=0;
    const denied=await make({repo:{owner:'example',repo:'public'}},async()=>{reads++;return response();},assert,Buffer,AbortSignal);
    await assert.rejects(denied(head)); assert.equal(reads,1);
  }
});
