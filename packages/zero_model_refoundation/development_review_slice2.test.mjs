import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {reviewDigest,validateDevelopmentReviewJournal} from './development_review_journal.mjs';
const root=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8'),json=async p=>JSON.parse(await read(p)),sha=s=>createHash('sha256').update(s).digest('hex');
test('108-row two-packet review retains published54-record ancestry, actual memberships and non-independent holds',async()=>{
 const registry=await json('data/zero_model_refoundation/development/development_review_registry_v0.1.json'),prefix=await json('data/zero_model_refoundation/development/development_review_journal_v0.2.json'),journal=await json('data/zero_model_refoundation/development/development_review_journal_v0.3.json'),result=await json('docs/zero-model-refoundation-v1/ZMR-03_DEV_V04_TUNE_SLICE2_REVIEW_RESULT.json');
 assert.deepEqual(journal.records.slice(0,54),prefix.records);assert.equal(journal.prefix_journal_sha256,reviewDigest(prefix));assert.equal(journal.prefix_tail_sha256,prefix.records.at(-1).record_sha256);
 const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');assert.equal(sha(catalog),registry.catalog_sha256);const topics=[...catalog.matchAll(/^  - topic_id: (.+)$/gm)].map(x=>x[1]);
 const paths=['data/zero_model_refoundation/development/provisional_tune_v0.4_slice1.json','data/zero_model_refoundation/development/provisional_tune_v0.4_slice2.json'],packets=await Promise.all(paths.map(async path=>({path,utf8:await read(path)}))),rows=packets.flatMap(p=>JSON.parse(p.utf8).rows);
 const audit=validateDevelopmentReviewJournal({registry,journal,topics,packets});for(const [k,v] of Object.entries(audit))assert.deepEqual(result[k],v,k);
 assert.equal(result.journal_sha256,reviewDigest(journal));assert.equal(result.preserved_prefix_journal_sha256,reviewDigest(prefix));assert.deepEqual(result.source_packet_pins,packets.map(p=>({path:p.path,sha256:sha(p.utf8)})));
 assert.deepEqual(journal.records.map(r=>r.row_id),rows.map(r=>r.row_id));assert.equal(result.reviewed_rows,108);assert.equal(result.unreviewed_registered_rows,1092);assert.equal(result.reviewed_topics,new Set(rows.map(r=>r.topic_id)).size);assert.equal(result.reviewed_topics,36);
 const languages={};for(const r of rows)languages[r.language]=(languages[r.language]??0)+1;assert.deepEqual(result.reviewed_language_counts,languages);assert.deepEqual(audit.dispositions,{LABEL_IDENTIFIABILITY_HOLD:13,PROPOSE_REVISION:90,RETAIN_PROVISIONAL:5});
 const newDispositions={};for(const r of journal.records.slice(54))newDispositions[r.disposition]=(newDispositions[r.disposition]??0)+1;assert.deepEqual(result.new_dispositions,newDispositions);
 assert(journal.records.every(r=>r.revision===1&&r.independent===false&&r.qualification_credit===0&&r.proposed_annotation.provisional_gold_topics.join()===r.original_annotation.provisional_gold_topics.join()&&r.boundary_hypotheses.every(t=>topics.includes(t))));
 assert(journal.records.slice(54).some(r=>r.proposed_annotation.provisional_evidence_spans.some(s=>s.role==='NEGATION')));assert.equal(audit.semantic_evaluations,0);assert.equal(audit.independent_reviews,0);assert.equal(audit.calibration_admission,'HOLD_SOURCE_GOLD_MECHANISM_REVIEW_AND_ACCOUNTING');assert.equal(audit.capability_verdict,'UNTESTED');assert.equal(audit.resource_verdict,'NOT_QUALIFIED');
});
