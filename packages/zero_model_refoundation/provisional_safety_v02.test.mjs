import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url);
const read=path=>readFile(new URL(path,ROOT));
const norm=s=>s.normalize('NFKC').toLowerCase();
const bundle=row=>({current:row.current,title:row.title??'',recent:row.recent??[]});
const grams=s=>{const c=Array.from(norm(s)),out=new Set();for(let i=0;i+3<=c.length;i++)out.add(c.slice(i,i+3).join(''));return out;};
const overlap=(a,b)=>{let common=0;for(const x of a)if(b.has(x))common++;return common/(a.size+b.size-common||1);};

test('fresh public safety v0.2 has isolated same-writer lineage and four unrun layers',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const catalogSha=createHash('sha256').update(catalog).digest('hex');
  const ids=new Set(parsePinnedCatalog(catalog).map(t=>t.id));
  const fresh=JSON.parse(await read('data/zero_model_refoundation/development/provisional_safety_seed_v0.2.json'));
  assert.equal(fresh.schema,'ZMR-PROVISIONAL-SAFETY-SEED-2');
  assert.equal(fresh.catalog_sha256,catalogSha);
  assert.equal(fresh.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(fresh.qualification_credit_rows,0);
  assert.equal(fresh.evaluation_status,'UNRUN');
  assert.equal(fresh.rows.length,48);
  const counts={CONTROL:0,CONTEXT_REQUIRED:0,CONTEXT_INVARIANCE:0,MULTI_INTENT:0};
  const languages={zh:0,en:0,mixed:0},scenarios=new Set();
  for(const row of fresh.rows){
    counts[row.layer]++;languages[row.language]++;
    assert.equal(row.catalog_sha256,catalogSha);
    assert.equal(row.split,'CHALLENGE_SAFETY_PROVISIONAL');
    assert.equal(row.generation_id,'G0_DEV');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_family,'candidate-writer-G0');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.gold_origin,'CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_CHALLENGE');
    assert(!scenarios.has(row.scenario_family));scenarios.add(row.scenario_family);
    assert(row.gold_topics.every(id=>ids.has(id)));
    if(row.layer==='CONTROL'){
      assert.equal(row.expected_state,'DEFER');assert.deepEqual(row.gold_topics,[]);assert.equal(row.variant,null);
    }else if(row.layer==='MULTI_INTENT'){
      assert.equal(row.expected_state,'ASSIGNED');assert.equal(row.gold_topics.length,2);
      assert.equal(new Set(row.gold_topics).size,2);assert.equal(row.variant,null);
    }else{
      assert.equal(row.expected_state,'ASSIGNED');assert.equal(row.gold_topics.length,1);
      assert.equal(row.variant.current,row.current);assert.equal(row.variant.title,'');
      assert.deepEqual(row.variant.recent,[]);
      assert.equal(row.variant.kind,row.layer==='CONTEXT_REQUIRED'?'REMOVE_REQUIRED_CONTEXT':'REMOVE_DISTRACTING_CONTEXT');
      assert.equal(row.variant.expected_state,row.layer==='CONTEXT_REQUIRED'?'DEFER':'ASSIGNED');
      assert.deepEqual(row.variant.gold_topics,row.layer==='CONTEXT_REQUIRED'?[]:row.gold_topics);
    }
  }
  assert.deepEqual(counts,{CONTROL:12,CONTEXT_REQUIRED:12,CONTEXT_INVARIANCE:12,MULTI_INTENT:12});
  assert.deepEqual(languages,{zh:16,en:16,mixed:16});
  const priorNames=['provisional_train_v0.2','provisional_tune_v0.1','provisional_cal_v0.1',
    'provisional_challenge_v0.2','provisional_challenge_v0.3','provisional_challenge_v0.4',
    'provisional_safety_seed_v0.1','provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(priorNames.map(async name=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${name}.json`)).rows))).flat();
  const registered=prior.map(row=>({hash:fingerprintBundle(bundle(row)).bundle_sha256,
    normalized:norm(row.current),features:grams(row.current)}));
  for(const row of fresh.rows){
    const hash=fingerprintBundle(bundle(row)).bundle_sha256;
    const normalized=norm(row.current),features=grams(row.current);
    for(const other of registered){
      assert.notEqual(hash,other.hash);
      assert.notEqual(normalized,other.normalized);
      assert(overlap(features,other.features)<.55);
    }
    registered.push({hash,normalized,features});
  }
});
