import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {fingerprintBundle} from './fingerprints.mjs';
import {reviewDigest,sourceAnnotation,validateDevelopmentReviewJournal} from './development_review_journal.mjs';
const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
const topics=Array.from({length:144},(_,i)=>'T'+String(i).padStart(3,'0'));
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const empty=r=>({schema:'ZMR-DEVELOPMENT-REVIEW-JOURNAL-1',registry_sha256:reviewDigest(r),evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',qualification_credit:0,candidate_prediction_exposures:0,semantic_evaluations:0,records:[]});
function fixture(){
 const catalog='a'.repeat(64),path='data/zero_model_refoundation/development/provisional_tune_v0.4_slice1.json';
 // Opaque Unicode/count/ID engineering fixture: no semantic TRAIN/DEV/AS/TEST.
 const make=(id,state)=>{const r={id,row_id:id,catalog_sha256:catalog,split:'TUNE_PROVISIONAL',current:'a😀z',title:'',recent:['zz'],expected_state:state,provisional_gold_topics:state==='ASSIGNED'?[topics[0]]:[],excluded_topics:[],provisional_evidence_spans:state==='ASSIGNED'?[{source:'current',role:'CURRENT_GOAL',start:0,end:4,text:'a😀z'},{source:'current',role:'OBJECT',start:1,end:3,text:'😀'}]:[],span_offset_unit:'UTF16_CODE_UNITS',frozen_at:'2026-09-30T13:00:00Z',qualification_credit_rows:0,source_license_status:'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL'};r.fingerprints=fingerprintBundle(r);return r;};
 const rows=[make('opaque1','ASSIGNED'),make('opaque2','DEFER')],data={evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',catalog_sha256:catalog,qualification_credit_rows:0,independent_source_cohorts:0,candidate_prediction_exposures:0,semantic_evaluations:0,evaluation_status:'UNRUN_NO_ROUTER_PREDICTIONS',row_count:2,rows};
 const utf8=JSON.stringify(data),registry={schema:'ZMR-DEVELOPMENT-REVIEW-REGISTRY-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',catalog_sha256:catalog,reviewer_id:'opaque-writer',reviewer_role:'CANDIDATE_WRITER',independent:false,qualification_credit:0,semantic_evaluations:0,candidate_prediction_exposures:0,revision_limit:2,source_packets:[{path,sha256:sha(utf8),rows:2}]},journal=empty(registry);
 const record=(revision,disposition='RETAIN_PROVISIONAL')=>{
  const prev=journal.records.at(-1),r=rows[0],original_annotation=sourceAnnotation(r),proposed_annotation=structuredClone(original_annotation);
  if(disposition==='PROPOSE_REVISION')proposed_annotation.provisional_gold_topics=[topics[2]];
  const body={review_id:'opaque-review-'+revision,row_id:r.id,source_packet_path:path,source_packet_sha256:sha(utf8),source_bundle_sha256:r.fingerprints.bundle_sha256,original_annotation_sha256:reviewDigest(original_annotation),source_split:r.split,reviewer_id:registry.reviewer_id,reviewer_role:'CANDIDATE_WRITER',independent:false,qualification_credit:0,candidate_prediction_exposures:0,semantic_evaluations:0,reviewed_at:'2026-09-30T14:00:0'+revision+'Z',revision,previous_row_review_sha256:prev?.record_sha256??null,previous_record_sha256:prev?.record_sha256??null,disposition,rationale:'OPAQUE_ENGINEERING_ONLY',span_offset_unit:'UTF16_CODE_UNITS',original_annotation,proposed_annotation};return {...body,record_sha256:reviewDigest(body)};
 };
 journal.records.push(record(1));journal.records.push(record(2,'PROPOSE_REVISION'));
 return {registry,journal,packets:[{path,utf8}],topics:[...topics]};
}
test('real nine-packet registry pins1200 declared rows but zero reviews, without loading original packets',async()=>{
 const registry=JSON.parse(await read('data/zero_model_refoundation/development/development_review_registry_v0.1.json'));
 const mb=await read(registry.manifest_path);assert.equal(blob(mb),registry.manifest_git_blob);const m=JSON.parse(mb);
 assert.deepEqual(registry.source_packets,[...m.splits.TUNE_PROVISIONAL.slices,...m.splits.CAL_PROVISIONAL.slices,...m.safety_slices].map(x=>({path:x.path,sha256:x.sha256,rows:x.rows})));assert.equal(registry.source_packets.length,9);
 const a=validateDevelopmentReviewJournal({registry,journal:empty(registry),topics});assert.equal(a.registered_source_rows,1200);assert.equal(a.review_records,0);assert.equal(a.reviewed_rows,0);assert.equal(a.independent_reviews,0);assert.equal(a.qualification_credit,0);assert.equal(a.data_qualification,'NOT_QUALIFIED');assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');
});
test('byte-pinned original annotation survives an append-only provisional revision without becoming gold replacement',()=>{
 const args=fixture(),before=canonicalJSON(args),a=validateDevelopmentReviewJournal(args);assert.equal(canonicalJSON(args),before);assert.equal(a.review_records,2);assert.equal(a.reviewed_rows,1);assert.deepEqual(a.dispositions,{RETAIN_PROVISIONAL:1,PROPOSE_REVISION:1});assert.equal(a.source_mutations,0);assert(a.proposals.every(p=>p.admission==='PROPOSAL_ONLY_NOT_SOURCE_REPLACEMENT_OR_CALIBRATION'));assert.equal(a.independent_reviews,0);assert.equal(a.qualification_credit,0);
});
test('tampering with packet membership, gold snapshots, append ancestry or Unicode offsets is rejected',()=>{
 for(const [change,error] of [
  [x=>x.packets[0].utf8+=' ',/byte digest/],
  [x=>x.packets[0].path='data/zero_model_refoundation/development/consumed_test.json',/unknown or duplicate/],
  [x=>x.journal.records[0].source_bundle_sha256='b'.repeat(64),/original identity/],
  [x=>x.journal.records[0].original_annotation.provisional_gold_topics=[topics[1]],/annotation overwritten/],
  [x=>x.journal.records.reverse(),/revision chain/],
  [x=>x.journal.records.shift(),/revision chain/],
  [x=>x.journal.records[1].previous_record_sha256=null,/append chain/],
  [x=>x.journal.records[0].record_sha256='b'.repeat(64),/record digest/],
  [x=>{const s=x.journal.records[1].proposed_annotation.provisional_evidence_spans[1];s.end=2;s.text='\ud83d';},/UTF16 span/],
  [x=>x.journal.records[1].proposed_annotation.excluded_topics=[topics[2]],/exclusions/],
  [x=>x.journal.records[1].proposed_annotation.provisional_evidence_spans[0].role='UNREVIEWED_ROLE',/source\/role/]
 ]){const a=fixture();change(a);assert.throws(()=>validateDevelopmentReviewJournal(a),error);}
});
test('candidate review refuses independence claims, exposures, backdating, shrinking144 and extra revisions',()=>{
 for(const [change,error] of [
  [x=>x.registry.independent=true,/registry evidence/],
  [x=>x.registry.source_packets[0].path='../private/AS.json',/unsafe or duplicate/],
  [x=>x.journal.candidate_prediction_exposures=1,/journal evidence/],
  [x=>x.journal.records[0].independent=true,/cannot claim independent/],
  [x=>x.journal.records[0].reviewer_role='INDEPENDENT_CURATOR',/cannot claim independent/],
  [x=>x.journal.records[0].candidate_prediction_exposures=1,/cannot claim independent/],
  [x=>x.journal.records[0].semantic_evaluations=1,/cannot claim independent/],
  [x=>x.journal.records[0].reviewed_at='2026-09-30T12:00:00Z',/timestamp/],
  [x=>x.topics.pop(),/full144/],
  [x=>x.journal.records[1].revision=3,/revision chain/],
  [x=>{const d=JSON.parse(x.packets[0].utf8);d.candidate_prediction_exposures=1;x.packets[0].utf8=JSON.stringify(d);x.registry.source_packets[0].sha256=sha(x.packets[0].utf8);x.journal.registry_sha256=reviewDigest(x.registry);},/post-prediction packet/]
 ]){const a=fixture();change(a);assert.throws(()=>validateDevelopmentReviewJournal(a),error);}
});
