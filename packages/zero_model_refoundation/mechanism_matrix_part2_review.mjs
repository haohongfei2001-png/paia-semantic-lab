/** Writer source-QA receipts only:no independent adjudication or candidate execution. */
import {canonicalJSON} from './contracts.mjs';
import {seedHash} from './mechanism_matrix_seed.mjs';
import {auditMechanismMatrixTrainBatch} from './mechanism_matrix_train_batch.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
export function auditMechanismMatrixPart2Review(input){
 const base=auditMechanismMatrixTrainBatch(input),{qa,packet,packetUtf8,plan,topicIds}=input;
 must(qa?.schema==='ZMR-MECHANISM-MATRIX-PART2-WRITER-REVIEW-1'&&qa.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','QA evidence');
 must(qa.source_path==='data/zero_model_refoundation/development/mechanism_matrix_train_part2_v0.1.json'&&qa.source_sha256===seedHash(packetUtf8)&&qa.source_rows_sha256===packet.rows_sha256&&qa.source_main==='4fa82403d0ff4eab63319b01b534fac895163bf7'&&qa.source_tree==='764d9b2ae840558e88953c970997f894b1811d54','QA registered source identity');
 must(qa.reviewer_id==='candidate-writer'&&qa.reviewer_is_source_writer===true&&qa.independent_reviewers===0&&qa.accepted_gold_rows===0&&qa.independent_quota_credit===0,'QA cannot simulate independent acceptance');
 must(qa.source_input_revisions===0&&qa.candidate_predictions===0&&qa.semantic_evaluations===0&&qa.new_stable_allocations===0&&qa.remaining_stable_allowance===null&&qa.compiler_admission==='HOLD_FULL144_SOURCE_BOUNDARY_AND_COMPETITION_ACCOUNTING','QA cannot mint admission/budget/evaluation');
 must(qa.data_qualification==='NOT_QUALIFIED'&&qa.capability_verdict==='UNTESTED'&&qa.resource_verdict==='NOT_QUALIFIED'&&qa.saturation_ceiling_claim===false,'QA qualification claim');
 must(qa.records.length===54&&qa.records_sha256===seedHash(canonicalJSON(qa.records)),'QA complete source records/digest');
 const counts={RETAIN_PROVISIONAL_WRITER_ONLY:0,LABEL_IDENTIFIABILITY_HOLD:0},holdIds=[];
 for(const [i,r]of qa.records.entries()){
  const s=packet.rows[i];must(r.id===s.id&&r.original_current_sha256===s.input_sha256&&r.original_bundle_sha256===s.bundle_sha256&&r.original_gold_sha256===seedHash(canonicalJSON(s.provisional_gold))&&r.original_spans_sha256===seedHash(canonicalJSON(s.spans)),'QA original source/gold/spans changed');
  must(r.reviewer_id==='candidate-writer'&&r.independent===false&&r.reviewed_at===qa.reviewed_at&&Number.isFinite(Date.parse(r.reviewed_at))&&Date.parse(r.reviewed_at)>=Date.parse(packet.frozen_at),'QA writer/freeze provenance');
  must(Object.hasOwn(counts,r.disposition)&&r.writer_comment.length>=30&&r.proposed_positive_labels===null&&r.proposed_exclusions===null&&r.original_positive_labels_preserved===true&&r.source_input_revisions===0&&r.accepted_gold===false&&r.candidate_prediction_exposures===0&&r.formal_catalog_mutation===false,'QA cannot silently replace gold or source');
  must(Array.isArray(r.competing_topic_hypotheses)&&new Set(r.competing_topic_hypotheses).size===r.competing_topic_hypotheses.length&&r.competing_topic_hypotheses.every(t=>topicIds.includes(t)&&t!==s.topic_id),'QA competing universe');
  must(r.disposition==='LABEL_IDENTIFIABILITY_HOLD'?r.competing_topic_hypotheses.length>0:r.competing_topic_hypotheses.length===0,'QA hold must explain ambiguity');counts[r.disposition]++;if(r.disposition==='LABEL_IDENTIFIABILITY_HOLD')holdIds.push(r.id);
 }
 const selected=plan.cards.filter((c,i)=>i%8===1),cards=new Map(plan.cards.map(c=>[c.topic_id,c]));
 must(qa.neighbor_cards.length===18&&qa.directional_source_cases===0&&qa.adjudicated_edges===0&&qa.family_equivalence==='UNADJUDICATED_POSSIBLE_OVERLAP'&&qa.qualified_heldout_family_count===null,'QA graph/family not qualified');
 for(const [i,c]of qa.neighbor_cards.entries())must(c.topic_id===selected[i].topic_id&&c.neighbors.length===3&&new Set(c.neighbors).size===3&&c.neighbors.every(t=>topicIds.includes(t)&&t!==c.topic_id)&&c.neighbors.filter(t=>cards.get(t).domain===selected[i].domain).length===2&&c.neighbors.filter(t=>cards.get(t).domain!==selected[i].domain).length===1&&c.rationale.length>=30&&c.evidence==='PROVISIONAL_WRITER_HYPOTHESES_NOT_FORMAL_CATALOG'&&c.required_directions.join('/')==='positive/reverse/ambiguity','QA neighbor scope/directions');
 return {schema:'ZMR-MECHANISM-MATRIX-PART2-WRITER-QA-AUDIT-1',evidence_class:qa.evidence_class,new_writer_reviewed_rows:54,new_dispositions:counts,new_hold_ids:holdIds,combined_writer_reviewed_rows:108,combined_label_holds:base.prior_label_holds+counts.LABEL_IDENTIFIABILITY_HOLD,combined_source_topics:36,full_topic_universe:144,missing_topics:108,original_inputs_gold_spans_preserved:true,source_input_revisions:0,new_neighbor_cards:18,new_neighbor_edges:54,combined_provisional_neighbor_cards:36,combined_provisional_neighbor_edges:108,directional_source_cases:0,adjudicated_edges:0,qualified_heldout_family_count:null,independent_reviewers:0,accepted_gold_rows:0,independent_quota_credit:0,source_license:'DECLARATION_ONLY_NOT_INDEPENDENTLY_VERIFIED',candidate_predictions:0,semantic_evaluations:0,new_stable_allocations:0,remaining_stable_allowance:null,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false};
}
