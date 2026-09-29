import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
const norm=s=>s.normalize('NFKC').toLowerCase();
const grams=s=>{const c=Array.from(norm(s)),out=new Set();
  for(let i=0;i+3<=c.length;i++)out.add(c.slice(i,i+3).join(''));
  return out;};
const item=r=>({id:r.id,
  hash:fingerprintBundle({current:r.current,title:r.title??'',recent:r.recent??[]}).bundle_sha256,
  norm:norm(r.current),grams:grams(r.current),scenario:r.scenario_family,
  template:r.template_family,contrast:r.contrast_family});

test('fresh A6-R1 repair DEV has honest provenance, provisional labels, and separate lineage',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const ids=new Set(parsePinnedCatalog(catalog).map(x=>x.id));
  const graphBytes=await read('data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json');
  const graph=JSON.parse(graphBytes);
  const dev=JSON.parse(await read('data/zero_model_refoundation/development/provisional_a6_r1_repair_dev_v0.1.json'));
  assert.equal(ids.size,144);
  assert.equal(dev.schema,'ZMR-A6-R1-REPAIR-DEV-1');
  assert.equal(dev.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(dev.catalog_sha256,createHash('sha256').update(catalog).digest('hex'));
  assert.equal(dev.boundary_graph_sha256,createHash('sha256').update(graphBytes).digest('hex'));
  assert.deepEqual(dev.edge_ranks,[9,10,11,12]);
  for(const [key,value] of Object.entries({single_rows:8,control_rows:12,
    later_request_rows:4,context_required_rows:4,multi_rows:4,
    ambiguous_unscored_rows:4,row_count:36,qualification_credit_rows:0,
    independent_source_cohorts:0}))assert.equal(dev[key],value);
  assert.equal(dev.rows.length,36);
  assert.equal(dev.intake_status,'PUBLIC_REPAIR_DEV_FROZEN_UNRUN');
  assert.equal(dev.evaluation_status,'UNRUN');
  const names=['provisional_train_v0.1','provisional_train_v0.2','provisional_train_v0.3',
    'provisional_tune_v0.1','provisional_cal_v0.1','provisional_a7_dev_v0.1',
    'provisional_a4_triads_v0.1','provisional_a4_train_v0.1',
    'provisional_a4_challenge_v0.1','provisional_a4_positive_challenge_v0.1',
    'provisional_a5_challenge_v0.1','provisional_a5_repair_dev_v0.1',
    'provisional_a5_r1_challenge_v0.1','provisional_a6_complement_challenge_v0.1',
    'provisional_challenge_v0.1','provisional_challenge_v0.2',
    'provisional_challenge_v0.3','provisional_challenge_v0.4',
    'provisional_challenge_v0.5','provisional_challenge_v0.6',
    'provisional_safety_seed_v0.1','provisional_safety_seed_v0.2',
    'provisional_safety_seed_v0.3','provisional_safety_seed_v0.4',
    'provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(names.map(async n=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${n}.json`)).rows))).flat();
  assert.equal(prior.length,1810);
  const seen=prior.map(r=>({...item(r),old:true}));
  const roles={SINGLE:0,CONTROL:0,LATER_REQUEST:0,CONTEXT_REQUIRED:0,MULTI:0,AMBIGUOUS:0};
  const languages={zh:0,en:0,mixed:0};
  for(const [i,row] of dev.rows.entries()){
    assert.equal(row.split,'REPAIR_DEV_PROVISIONAL');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.writer_cohort,'candidate-writer-G0');
    assert.equal(row.source_id,'writer-a6-r1-repair-dev-20260930');
    assert.equal(row.source_family,'candidate-writer-G0');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_REPAIR_DEV');
    assert.equal(row.authoring_batch,'ZMR-05-A6-R1-REPAIR-DEV-V01-20260930');
    assert.equal(row.title,'');
    assert(row.current.trim().length>=(row.role==='CONTEXT_REQUIRED'?6:10));
    assert.equal(row.scenario_id,row.scenario_family);
    assert.equal(row.template_family,row.scenario_family);
    assert(Object.hasOwn(roles,row.role)&&Object.hasOwn(languages,row.language));
    roles[row.role]++;languages[row.language]++;
    assert.equal(new Set(row.provisional_gold_topics).size,row.provisional_gold_topics.length);
    assert(row.provisional_gold_topics.every(x=>ids.has(x)));
    if(row.role==='SINGLE'){
      const rank=dev.edge_ranks[Math.floor(i/2)],edge=graph.edges[rank-1];
      assert.equal(row.layer,'SINGLE');assert.equal(row.graph_rank,rank);
      assert.equal(row.left_topic_id,edge.left_topic_id);
      assert.equal(row.right_topic_id,edge.right_topic_id);
      assert.equal(row.provisional_topic_id,i%2?edge.right_topic_id:edge.left_topic_id);
      assert.deepEqual(row.provisional_gold_topics,[row.provisional_topic_id]);
      assert.equal(row.contrast_family,`a6-r1-neighbor-${String(rank).padStart(2,'0')}`);
    }else if(['LATER_REQUEST','CONTEXT_REQUIRED'].includes(row.role)){
      assert.equal(row.provisional_gold_topics.length,1);
      assert.equal(row.provisional_topic_id,row.provisional_gold_topics[0]);
      assert.equal(row.recent.length,row.role==='CONTEXT_REQUIRED'?1:0);
    }else if(row.role==='MULTI'){
      assert.equal(row.provisional_gold_topics.length,2);
      assert.equal(row.provisional_topic_id,null);
      assert.deepEqual(row.recent,[]);
    }else{
      assert.deepEqual(row.provisional_gold_topics,[]);
      assert.equal(row.provisional_topic_id,null);
      assert.equal(row.annotation_state,row.role==='AMBIGUOUS'?
        'AMBIGUOUS_UNRESOLVED_NO_GOLD':'CANDIDATE_WRITER_PROVISIONAL_DEFER_UNREVIEWED');
    }
    if(row.role!=='CONTEXT_REQUIRED')assert.deepEqual(row.recent,[]);
    const now={...item(row),old:false};
    for(const old of seen){
      assert.notEqual(now.hash,old.hash);assert.notEqual(now.norm,old.norm);
      assert.notEqual(now.scenario,old.scenario);
      assert.notEqual(now.template,old.template);
      if(old.old&&old.contrast)assert.notEqual(now.contrast,old.contrast);
      let common=0;for(const g of now.grams)if(old.grams.has(g))common++;
      assert(common/(now.grams.size+old.grams.size-common||1)<.55,
        `${now.id} overlaps ${old.id}`);
    }
    seen.push(now);
  }
  assert.deepEqual(roles,{SINGLE:8,CONTROL:12,LATER_REQUEST:4,
    CONTEXT_REQUIRED:4,MULTI:4,AMBIGUOUS:4});
  assert.deepEqual(languages,{zh:18,en:18,mixed:0});
});
