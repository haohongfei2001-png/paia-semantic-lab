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
const treeStart='            // BEGIN_PUBLIC_TREE_READER',treeStop='            // END_PUBLIC_TREE_READER';
const treeSource=workflow.slice(workflow.indexOf(treeStart)+treeStart.length,workflow.indexOf(treeStop));
const source = treeSource+'\n'+workflow.slice(workflow.indexOf(begin) + begin.length, workflow.indexOf(end));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const bytes = Buffer.from('synthetic engineering bytes only\n');
const sha = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const entry = {mode:'100644', type:'blob', size:bytes.length, sha};
const head = '1'.repeat(40);
async function reader(fetchImpl, entries = [['safe/file.mjs', entry]], paths = ['safe/file.mjs'], clock = Date, events = [], signals = AbortSignal) {
  const make = new AsyncFunction('allowed', 'after', 'head', 'context', 'fetch', 'assert', 'crypto', 'Buffer', 'AbortSignal', 'Date', 'core', source + '\nreturn {read, tree, transportStats:()=>({attempts:publicTransportAttempts,retries:publicTransportRetries,treeFetches:publicTreeFetches}), stats:()=>({reads:[...reads], rawFetches, unique:byteCache.size})};');
  return make(new Set(paths), new Map(entries), head, {repo:{owner:'example', repo:'public'}}, fetchImpl, assert, crypto, Buffer, signals, clock, {info:s=>events.push(JSON.parse(s))});
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
  assert.equal(calls,2); assert.equal(transient.stats().unique,0);
});


test('tree metadata uses two immutable public identities without token fallback', async () => {
  const start='            // BEGIN_PUBLIC_TREE_READER', stop='            // END_PUBLIC_TREE_READER';
  assert.equal(workflow.split(start).length,2); assert.equal(workflow.split(stop).length,2);
  const body=workflow.slice(workflow.indexOf(start)+start.length,workflow.indexOf(stop));
  const make=new AsyncFunction('context','fetch','assert','Buffer','AbortSignal','Date','core',body+'\nreturn tree;');
  const calls=[];
  const fake=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({sha:'2'.repeat(40),truncated:false,tree:[{path:'safe/file.mjs',...entry}]}));};
  const tree=await make({repo:{owner:'example',repo:'public'}},fake,assert,Buffer,AbortSignal,Date,{info:()=>{}});
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
    const denied=await make({repo:{owner:'example',repo:'public'}},async()=>{reads++;return response();},assert,Buffer,AbortSignal,Date,{info:()=>{}});
    await assert.rejects(denied(head)); assert.equal(reads,1);
  }
});

test('timeout recovery shares one retry token across metadata/blob reads with finite per-attempt signals', async () => {
  let now=0,calls=0;const events=[],timeouts=[],clock={now:()=>now},signals={timeout:ms=>{timeouts.push(ms);return undefined;}};
  const r=await reader(async url=>{calls++;if(calls===1){now=31000;throw new DOMException('finite synthetic timeout','TimeoutError');}return new Response(url.includes('api.github.com')?JSON.stringify({sha:head,truncated:false,tree:null}):bytes);},undefined,undefined,clock,events,signals);
  assert.deepEqual(await r.read('safe/file.mjs'),bytes);assert.equal(calls,2);assert.deepEqual(timeouts,[5000,4000]);assert.equal(events.length,1);assert.equal(events[0].retry,true);
  assert.deepEqual(r.transportStats(),{attempts:2,retries:1,treeFetches:0});
  await assert.rejects(r.tree(head),/tree metadata/);assert.equal(calls,3);assert.equal(r.transportStats().retries,1);
  let requests=0;
  const treeFirst=await reader(async url=>{requests++;if(requests===1)throw new DOMException('metadata timeout','TimeoutError');if(url.includes('api.github.com'))return new Response(JSON.stringify({sha:head,truncated:false,tree:[]}));return new Response('',{status:503});});
  await treeFirst.tree(head);await assert.rejects(treeFirst.read('safe/file.mjs'),/HTTP 503/);assert.equal(requests,3);assert.deepEqual(treeFirst.transportStats(),{attempts:3,retries:1,treeFetches:2});
});

test('body timeout discards partial chunks and validates full replacement before cache; concurrent reads share retry cap', async () => {
  let calls=0,pulls=0;const r=await reader(async()=>{calls++;return calls===1?new Response(new ReadableStream({pull(c){if(++pulls===1)c.enqueue(bytes.subarray(0,5));else c.error(new DOMException('body timeout','TimeoutError'));}})):new Response(bytes);});
  assert.deepEqual(await r.read('safe/file.mjs'),bytes);assert.equal(calls,2);assert.equal(r.stats().unique,1);assert.equal(r.stats().rawFetches,2);
  const entries=Array.from({length:4},(_,i)=>['safe/'+i,{...entry,sha:crypto.createHash('sha1').update('blob 1\0'+i).digest('hex'),size:1}]),seen=new Map();
  let attempts=0;const concurrent=await reader(async url=>{attempts++;const p=decodeURIComponent(url.split('/').at(-1));seen.set(p,(seen.get(p)||0)+1);if(seen.get(p)===1)throw new DOMException('timeout','TimeoutError');return new Response(p);},entries,entries.map(([p])=>p));
  const settled=await Promise.allSettled(entries.map(([p])=>concurrent.read(p)));
  assert.equal(attempts,5);assert.equal(concurrent.transportStats().retries,1);assert.equal(settled.filter(r=>r.status==='fulfilled').length,1);assert.equal(settled.filter(r=>r.status==='rejected').length,3);assert.equal(concurrent.stats().unique,1);
});

test('expired shared deadline starts no replacement request and repeated timeout stops at two attempts without cache', async () => {
  let now=0,calls=0;const events=[];const r=await reader(async()=>{calls++;now=35000;throw new DOMException('timeout','TimeoutError');},undefined,undefined,{now:()=>now},events);
  await assert.rejects(r.read('safe/file.mjs'),/timeout/);assert.equal(calls,1);assert.equal(events[0].retry,false);assert.equal(r.transportStats().retries,0);assert.equal(r.stats().unique,0);
  await assert.rejects(r.tree(head),/deadline/);assert.equal(calls,1);
  calls=0;const repeated=await reader(async()=>{calls++;throw new DOMException('timeout','TimeoutError');});
  await assert.rejects(repeated.read('safe/file.mjs'),/timeout/);assert.equal(calls,2);assert.equal(repeated.stats().unique,0);assert.equal(repeated.transportStats().retries,1);
});

test('permissions/rate/redirect/schema/digest failures never retry or add authorization; only named transient network causes recover', async () => {
  for(const status of [401,403,404,429]){let calls=0;const r=await reader(async()=>{calls++;return new Response('',{status});});await assert.rejects(r.read('safe/file.mjs'),new RegExp('HTTP '+status));assert.equal(calls,1);assert.equal(r.transportStats().retries,0);}
  for(const code of ['UNEXPECTED_REDIRECT','ENOTFOUND','CERT_HAS_EXPIRED',undefined]){let calls=0;const r=await reader(async()=>{calls++;throw new TypeError('fetch failed',{cause:{code}});});await assert.rejects(r.read('safe/file.mjs'),/fetch failed/);assert.equal(calls,1);assert.equal(r.transportStats().retries,0);}
  const calls=[];const r=await reader(async(url,options)=>{calls.push({url,options});if(calls.length===1)throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}});return new Response(bytes);});
  await r.read('safe/file.mjs');assert.equal(calls.length,2);assert.equal(calls[0].url,calls[1].url);assert(calls.every(x=>x.options.redirect==='error'&&x.options.credentials==='omit'&&x.options.headers===undefined));assert.equal(r.transportStats().retries,1);
});
