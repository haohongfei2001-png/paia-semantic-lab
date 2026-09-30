/** Append-only provisional source/gold review guard. Cannot authenticate people or qualify data. */
import {createHash} from 'node:crypto';
import {canonicalJSON,validateUniverse} from './contracts.mjs';
import {fingerprintBundle} from './fingerprints.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const token=v=>typeof v==='string'&&v.trim()===v&&v.length>0;
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const reviewDigest=v=>createHash('sha256').update(canonicalJSON(v)).digest('hex');
export const sourceAnnotation=r=>({expected_state:r.expected_state,provisional_gold_topics:r.provisional_gold_topics,excluded_topics:r.excluded_topics,provisional_evidence_spans:r.provisional_evidence_spans});
const roles=new Set(['CURRENT_GOAL','OBJECT','ACTION','QUALIFIER','MEANS','BACKGROUND','NEGATION','CONTEXT_REFERENT','BOUNDARY_EXCLUSION']);
const boundary=(text,n)=>!(n>0&&n<text.length&&text.charCodeAt(n-1)>=0xD800&&text.charCodeAt(n-1)<=0xDBFF&&text.charCodeAt(n)>=0xDC00&&text.charCodeAt(n)<=0xDFFF);
function annotation(a,row,universe){
 must(a&&['ASSIGNED','DEFER'].includes(a.expected_state)&&Array.isArray(a.provisional_gold_topics)&&new Set(a.provisional_gold_topics).size===a.provisional_gold_topics.length&&a.provisional_gold_topics.every(x=>universe.has(x)),'invalid review label universe');
 must((a.expected_state==='DEFER')===(a.provisional_gold_topics.length===0),'review state/set mismatch');
 must(Array.isArray(a.excluded_topics)&&new Set(a.excluded_topics).size===a.excluded_topics.length&&a.excluded_topics.every(x=>universe.has(x)&&!a.provisional_gold_topics.includes(x)),'invalid review exclusions');
 must(Array.isArray(a.provisional_evidence_spans),'review evidence spans required');
 for(const s of a.provisional_evidence_spans){
  must(roles.has(s.role)&&['current','title','recent'].includes(s.source),'unsupported review source/role');
  if(s.source==='recent')must(Number.isInteger(s.recent_index)&&s.recent_index>=0&&s.recent_index<row.recent.length,'invalid recent review index');
  const text=s.source==='recent'?row.recent[s.recent_index]:row[s.source];
  must(typeof text==='string'&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=text.length&&boundary(text,s.start)&&boundary(text,s.end)&&text.slice(s.start,s.end)===s.text,'invalid review UTF16 span');
 }
 if(a.expected_state==='ASSIGNED')must(a.provisional_evidence_spans.some(s=>s.role==='CURRENT_GOAL')&&a.provisional_evidence_spans.some(s=>s.role==='OBJECT'),'assigned review needs goal/object evidence');
}
function auditReviewRows({registry,journal,rows,topics}){
 const universe=validateUniverse(topics);
 must(registry?.schema==='ZMR-DEVELOPMENT-REVIEW-REGISTRY-1'&&registry.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&hex(registry.catalog_sha256)&&token(registry.reviewer_id)&&registry.reviewer_role==='CANDIDATE_WRITER'&&registry.independent===false&&registry.qualification_credit===0&&registry.semantic_evaluations===0&&registry.candidate_prediction_exposures===0,'review registry evidence boundary');
 must(registry.revision_limit===2&&Array.isArray(registry.source_packets)&&registry.source_packets.length>0,'fixed review source scope required');
 const sources=new Map();for(const s of registry.source_packets){must(/^data\/zero_model_refoundation\/development\/provisional_(tune|cal|safety)_v0\.4_[a-z0-9]+\.json$/.test(s.path)&&!sources.has(s.path)&&hex(s.sha256)&&Number.isInteger(s.rows)&&s.rows>0,'unsafe or duplicate review packet');sources.set(s.path,s);}
 must(journal?.schema==='ZMR-DEVELOPMENT-REVIEW-JOURNAL-1'&&journal.registry_sha256===reviewDigest(registry)&&journal.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&journal.qualification_credit===0&&journal.candidate_prediction_exposures===0&&journal.semantic_evaluations===0&&Array.isArray(journal.records),'review journal evidence boundary');
 must(Array.isArray(rows),'supplied original review rows required');const originals=new Map();
 for(const entry of rows){
  const r=entry.row,s=sources.get(entry.packet_path);must(s&&entry.packet_sha256===s.sha256,'unregistered or changed review packet');
  must(token(r?.row_id)&&r.id===r.row_id&&!originals.has(r.row_id)&&['TUNE_PROVISIONAL','CAL_PROVISIONAL'].includes(r.split)&&r.catalog_sha256===registry.catalog_sha256&&r.qualification_credit_rows===0&&r.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL','original review row identity');
  must(entry.candidate_prediction_exposures===0&&entry.evaluation_status==='UNRUN_NO_ROUTER_PREDICTIONS','post-prediction source review forbidden');
  must(r.span_offset_unit==='UTF16_CODE_UNITS'&&Number.isFinite(Date.parse(r.frozen_at))&&canonicalJSON(r.fingerprints)===canonicalJSON(fingerprintBundle(r)),'original review bundle/freeze mismatch');
  annotation(sourceAnnotation(r),r,universe);originals.set(r.row_id,{...entry,annotation_sha256:reviewDigest(sourceAnnotation(r))});
 }
 const seen=new Set(),perRow=new Map(),dispositions={},proposals=[];let previous=null,previousTime=-Infinity;
 for(const e of journal.records){
  const source=originals.get(e.row_id);must(source&&token(e.review_id)&&!seen.has(e.review_id),'missing source or duplicate review record');seen.add(e.review_id);
  const r=source.row;must(e.source_packet_path===source.packet_path&&e.source_packet_sha256===source.packet_sha256&&e.source_bundle_sha256===r.fingerprints.bundle_sha256&&e.original_annotation_sha256===source.annotation_sha256&&e.source_split===r.split,'review original identity mismatch');
  must(e.reviewer_id===registry.reviewer_id&&e.reviewer_role==='CANDIDATE_WRITER'&&e.independent===false&&e.qualification_credit===0&&e.candidate_prediction_exposures===0&&e.semantic_evaluations===0,'writer review cannot claim independent qualification or predictions');
  const time=Date.parse(e.reviewed_at);must(Number.isFinite(time)&&time>=Date.parse(r.frozen_at)&&time>=previousTime,'review timestamp precedes freeze/order');previousTime=time;
  const prior=perRow.get(e.row_id);must(e.revision===(prior?.revision??0)+1&&e.revision<=registry.revision_limit&&e.previous_row_review_sha256===(prior?.record_sha256??null),'review revision chain mismatch');
  must(e.previous_record_sha256===previous,'review append chain mismatch');
  must(['RETAIN_PROVISIONAL','PROPOSE_REVISION','LABEL_IDENTIFIABILITY_HOLD','SOURCE_LICENSE_HOLD'].includes(e.disposition)&&token(e.rationale)&&e.span_offset_unit==='UTF16_CODE_UNITS','review disposition/rationale required');
  must(canonicalJSON(e.original_annotation)===canonicalJSON(sourceAnnotation(r)),'original annotation overwritten');
  annotation(e.proposed_annotation,r,universe);
  if(e.disposition!=='PROPOSE_REVISION')must(canonicalJSON(e.proposed_annotation)===canonicalJSON(e.original_annotation),'nonrevision disposition changed gold');
  const {record_sha256,...body}=e;must(hex(record_sha256)&&reviewDigest(body)===record_sha256,'review record digest mismatch');
  previous=record_sha256;perRow.set(e.row_id,e);dispositions[e.disposition]=(dispositions[e.disposition]??0)+1;
  proposals.push({row_id:e.row_id,revision:e.revision,record_sha256,disposition:e.disposition,admission:'PROPOSAL_ONLY_NOT_SOURCE_REPLACEMENT_OR_CALIBRATION'});
 }
 return {schema:'ZMR-DEVELOPMENT-REVIEW-JOURNAL-AUDIT-1',classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',registered_source_rows:registry.source_packets.reduce((n,s)=>n+s.rows,0),review_records:journal.records.length,reviewed_rows:perRow.size,dispositions,proposals,tail_sha256:previous,
  source_mutations:0,semantic_evaluations:0,candidate_prediction_exposures:0,independent_reviews:0,qualification_credit:0,
  reviewer_identity_verification:'SUPPLIED_CANDIDATE_WRITER_METADATA_NOT_INDEPENDENT_ATTESTATION',semantic_review_verdict:'UNVERIFIED_PROVISIONAL_ANNOTATIONS_ONLY',
  calibration_admission:'HOLD_SOURCE_GOLD_MECHANISM_REVIEW_AND_ACCOUNTING',data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED'};
}

/** Source byte hashes prove row membership; caller supplies only explicitly registered public packets. */
export function validateDevelopmentReviewJournal({registry,journal,packets=[],topics}){
 auditReviewRows({registry,journal:{...journal,records:[]},rows:[],topics});
 must(Array.isArray(packets),'supplied review packet bytes required');const seen=new Set(),rows=[];
 for(const packet of packets){
  const source=registry.source_packets.find(s=>s.path===packet.path);
  must(source&&!seen.has(packet.path)&&typeof packet.utf8==='string','unknown or duplicate review source bytes');seen.add(packet.path);
  const digest=createHash('sha256').update(packet.utf8,'utf8').digest('hex');must(digest===source.sha256,'review packet byte digest mismatch');
  const d=JSON.parse(packet.utf8);must(d.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&d.catalog_sha256===registry.catalog_sha256&&d.qualification_credit_rows===0&&d.independent_source_cohorts===0&&Array.isArray(d.rows)&&d.rows.length===source.rows&&d.row_count===source.rows,'review source evidence/count mismatch');
  must((d.candidate_prediction_exposures??0)===0&&(d.semantic_evaluations??0)===0&&(d.evaluation_status??'UNRUN_NO_ROUTER_PREDICTIONS')==='UNRUN_NO_ROUTER_PREDICTIONS','post-prediction packet review forbidden');
  for(const row of d.rows)rows.push({row,packet_path:packet.path,packet_sha256:digest,candidate_prediction_exposures:0,evaluation_status:'UNRUN_NO_ROUTER_PREDICTIONS'});
 }
 return auditReviewRows({registry,journal,rows,topics});
}
