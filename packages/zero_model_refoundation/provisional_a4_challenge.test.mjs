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
const hash=r=>fingerprintBundle({current:r.current,title:r.title??'',recent:r.recent??[]}).bundle_sha256;

test('A4 fresh public challenge is unrun, same-writer, lineage-screened and gold-honest',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const catalogSha=createHash('sha256').update(catalog).digest('hex');
  const ids=new Set(parsePinnedCatalog(catalog).map(x=>x.id));
  const graphBytes=await read('data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json');
  const graph=JSON.parse(graphBytes),fresh=JSON.parse(await read('data/zero_model_refoundation/development/provisional_a4_challenge_v0.1.json'));
  assert.equal(fresh.schema,'ZMR-A4-FRESH-PUBLIC-CHALLENGE-1');
  assert.equal(fresh.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(fresh.catalog_sha256,catalogSha);
  assert.equal(fresh.boundary_graph_sha256,createHash('sha256').update(graphBytes).digest('hex'));
  assert.deepEqual(fresh.edge_ranks,[1,3,5,8]);
  assert.equal(fresh.pair_count,4);assert.equal(fresh.pair_rows,20);
  assert.equal(fresh.provisional_labeled_pair_rows,16);
  assert.equal(fresh.ambiguous_unscored_rows,4);
  assert.equal(fresh.control_rows,12);assert.equal(fresh.row_count,32);
  assert.equal(fresh.qualification_credit_rows,0);
  assert.equal(fresh.independent_source_cohorts,0);
  assert.equal(fresh.intake_status,'PUBLIC_CHALLENGE_FROZEN_UNRUN');
  assert.equal(fresh.evaluation_status,'UNRUN');
  const names=['provisional_train_v0.1','provisional_train_v0.2','provisional_train_v0.3',
    'provisional_tune_v0.1','provisional_cal_v0.1','provisional_a7_dev_v0.1',
    'provisional_a4_triads_v0.1','provisional_a4_train_v0.1',
    'provisional_challenge_v0.1','provisional_challenge_v0.2','provisional_challenge_v0.3',
    'provisional_challenge_v0.4','provisional_challenge_v0.5','provisional_challenge_v0.6',
    'provisional_safety_seed_v0.1','provisional_safety_seed_v0.2',
    'provisional_safety_seed_v0.3','provisional_safety_seed_v0.4',
    'provisional_role_challenge_v0.1'];
  const prior=(await Promise.all(names.map(async n=>
    JSON.parse(await read(`data/zero_model_refoundation/development/${n}.json`)).rows))).flat();
  assert.equal(prior.length,1622);
  const seen=prior.map(r=>({id:r.id,hash:hash(r),norm:norm(r.current),grams:grams(r.current),
    scenario:r.scenario_family,template:r.template_family,contrast:r.contrast_family,old:true}));
  const languages={zh:0,en:0,mixed:0};
  for(const [i,row] of fresh.rows.entries()){
    assert.equal(row.source_id,'writer-a4-fresh-challenge-20260929');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_CHALLENGE');
    assert.equal(row.authoring_batch,'ZMR-05-A4-FRESH-CHALLENGE-V01-20260929');
    assert.equal(row.title,'');assert.deepEqual(row.recent,[]);
    assert(row.current.trim().length>=(i<20?10:4));
    if(i<20){
      const rank=fresh.edge_ranks[Math.floor(i/5)],edge=graph.edges[rank-1];
      assert.equal(row.layer,'PAIR');assert.equal(row.graph_rank,rank);
      assert.equal(row.left_topic_id,edge.left_topic_id);
      assert.equal(row.right_topic_id,edge.right_topic_id);
      assert(ids.has(row.left_topic_id)&&ids.has(row.right_topic_id));
      const role=i%5<2?'LEFT':i%5<4?'RIGHT':'AMBIGUOUS';
      assert.equal(row.role,role);
      assert.equal(row.contrast_family,`a4-fresh-contrast-${String(rank).padStart(2,'0')}`);
      if(role==='AMBIGUOUS'){
        assert.equal(row.provisional_topic_id,null);
        assert.deepEqual(row.provisional_gold_topics,[]);
        assert.equal(row.annotation_state,'AMBIGUOUS_UNRESOLVED_NO_GOLD');
      }else{
        assert.equal(row.provisional_topic_id,role==='LEFT'?edge.left_topic_id:edge.right_topic_id);
        assert.deepEqual(row.provisional_gold_topics,[row.provisional_topic_id]);
      }
    }else{
      assert.equal(row.layer,'CONTROL');assert.equal(row.role,'NO_REQUEST');
      assert.equal(row.provisional_topic_id,null);
      assert.deepEqual(row.provisional_gold_topics,[]);
      assert.equal(row.annotation_state,'CANDIDATE_WRITER_PROVISIONAL_DEFER_UNREVIEWED');
    }
    languages[row.language]++;
    const item={id:row.id,hash:hash(row),norm:norm(row.current),grams:grams(row.current),
      scenario:row.scenario_family,template:row.template_family,contrast:row.contrast_family};
    for(const p of seen){
      assert.notEqual(item.hash,p.hash);assert.notEqual(item.norm,p.norm);
      assert.notEqual(item.scenario,p.scenario);assert.notEqual(item.template,p.template);
      if(p.old&&p.contrast)assert.notEqual(item.contrast,p.contrast);
      let common=0;for(const g of item.grams)if(p.grams.has(g))common++;
      assert(common/(item.grams.size+p.grams.size-common||1)<.55,
        `${item.id} overlaps ${p.id}`);
    }
    seen.push(item);
  }
  assert.deepEqual(languages,{zh:19,en:13,mixed:0});
});
