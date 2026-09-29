import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {parseAdditiveTrain} from './a7_compile.mjs';
import {compileA7} from './a7_case_memory.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url);
const read=p=>readFile(new URL(p,ROOT));
const norm=s=>s.normalize('NFKC').toLowerCase();
const grams=s=>{const c=Array.from(norm(s)),out=new Set();
  for(let i=0;i+3<=c.length;i++)out.add(c.slice(i,i+3).join(''));
  return out;};
const hash=row=>fingerprintBundle({current:row.current,title:row.title??'',recent:row.recent??[]}).bundle_sha256;

test('additive A7 TRAIN has 144 distinct, disclosed scenarios and an isolated compile closure',async()=>{
  const cat=await read('catalog/system_topic_catalog_v0.2.yaml');
  const catalogSha=createHash('sha256').update(cat).digest('hex');
  const ids=parsePinnedCatalog(cat).map(x=>x.id);
  const oldBytes=await read('data/zero_model_refoundation/development/provisional_train_v0.2.json');
  const newBytes=await read('data/zero_model_refoundation/development/provisional_train_v0.3.json');
  const old=parseProvisionalTrain(oldBytes,catalogSha,ids);
  const next=parseAdditiveTrain(newBytes,catalogSha,ids);
  assert.equal(next.length,144);
  assert.deepEqual(Object.fromEntries(['zh','en','mixed'].map(x=>
    [x,next.filter(r=>r.language===x).length])),{zh:103,en:38,mixed:3});
  const previousNames=['provisional_train_v0.1','provisional_train_v0.2',
    'provisional_tune_v0.1','provisional_cal_v0.1',
    'provisional_challenge_v0.1','provisional_challenge_v0.2',
    'provisional_challenge_v0.3','provisional_challenge_v0.4',
    'provisional_challenge_v0.5','provisional_challenge_v0.6',
    'provisional_safety_seed_v0.1','provisional_safety_seed_v0.2',
    'provisional_safety_seed_v0.3','provisional_safety_seed_v0.4',
    'provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(previousNames.map(async n=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${n}.json`)).rows))).flat();
  assert.equal(prior.length,1386);
  const seen=prior.map(r=>({id:r.id,hash:hash(r),norm:norm(r.current),grams:grams(r.current),
    scenario:r.scenario_family,template:r.template_family}));
  for(const row of next){
    const item={id:row.id,hash:hash(row),norm:norm(row.current),grams:grams(row.current),
      scenario:row.scenario_family,template:row.template_family};
    for(const p of seen){
      assert.notEqual(item.hash,p.hash);assert.notEqual(item.norm,p.norm);
      assert.notEqual(item.scenario,p.scenario);assert.notEqual(item.template,p.template);
      let common=0;for(const g of item.grams)if(p.grams.has(g))common++;
      assert(common/(item.grams.size+p.grams.size-common||1)<.55,
        `${item.id} overlaps ${p.id}`);
    }
    seen.push(item);
  }
  const trainSha=createHash('sha256').update(Buffer.concat([oldBytes,Buffer.from('\n'),newBytes])).digest('hex');
  for(const mode of ['char','word']){
    const index=compileA7({topic_ids:ids,cases:[...old,...next],
      catalog_sha256:catalogSha,train_sha256:trainSha,mode});
    assert.equal(index.prototypes.length,288);
    assert(new TextEncoder().encode(JSON.stringify(index)+'\n').length<=1048576);
  }
});
