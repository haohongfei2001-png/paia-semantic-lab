/** Candidate-writer source review integrity only;does not adjudicate boundary or independent gold. */
import {canonicalJSON} from './contracts.mjs';
import {seedHash,auditMechanismMatrixSeed} from './mechanism_matrix_seed.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
export function auditMechanismMatrixReview({review,packet,packetUtf8,plan,planUtf8,topicIds}){
 const source=auditMechanismMatrixSeed({packet,plan,planUtf8,topicIds});
 must(review?.schema==='ZMR-MECHANISM-MATRIX-WRITER-REVIEW-1'&&review.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','review evidence');
 must(review.source_path==='data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json'&&review.source_sha256===seedHash(packetUtf8)&&review.source_rows_sha256===packet.rows_sha256&&review.plan_sha256===seedHash(planUtf8),'review source identity');
 must(review.source_main==='0576f39e386f8ac06a480c7c671a7dbe416b400f'&&review.source_tree==='08678f382086296d9a73b3ba0f0176092eeda727','review canonical main registration');
 must(review.reviewer_id==='candidate-writer'&&review.reviewer_is_source_writer===true&&review.independent_reviewer_count===0&&review.independent_quota_credit===0&&review.accepted_gold_rows===0,'same writer review is not independent acceptance');
 must(review.compiler_admission==='HOLD_FULL144_SOURCE_BOUNDARY_AND_COMPETITION_ACCOUNTING'&&review.source_input_revisions===0&&review.candidate_predictions===0&&review.semantic_evaluations===0&&review.stable_allocations_created===0&&review.remaining_stable_allowance===null,'review cannot mint admission/evaluation/allowance');
 must(review.data_qualification==='NOT_QUALIFIED'&&review.capability_verdict==='UNTESTED'&&review.resource_verdict==='NOT_QUALIFIED'&&review.saturation_ceiling_claim===false,'review qualification claim');
 must(Array.isArray(review.records)&&review.records.length===54&&review.records_sha256===seedHash(canonicalJSON(review.records)),'complete frozen writer review required');
 const dispositions={RETAIN_PROVISIONAL_WRITER_ONLY:0,LABEL_IDENTIFIABILITY_HOLD:0},holdIds=[];
 for(const [i,r]of review.records.entries()){
  const original=packet.rows[i];must(r.id===original.id&&r.original_bundle_sha256===original.bundle_sha256&&r.original_current_sha256===original.input_sha256&&r.original_gold_sha256===seedHash(canonicalJSON(original.provisional_gold))&&r.original_spans_sha256===seedHash(canonicalJSON(original.spans)),'original source evidence/gold changed');
  must(r.reviewer_id==='candidate-writer'&&r.independent===false&&r.reviewed_at===review.reviewed_at&&Number.isFinite(Date.parse(r.reviewed_at)),'reviewer/time provenance');
  must(Object.hasOwn(dispositions,r.disposition)&&r.writer_comment.length>=30&&r.accepted_gold===false&&r.source_input_revisions===0&&r.candidate_prediction_exposures===0,'writer review status');
  must(r.original_positive_labels_preserved===true&&r.proposed_positive_labels===null&&r.proposed_exclusions===null&&r.formal_catalog_mutation===false,'review cannot silently relabel or mutate Catalog');
  must(Array.isArray(r.competing_topic_hypotheses)&&new Set(r.competing_topic_hypotheses).size===r.competing_topic_hypotheses.length&&r.competing_topic_hypotheses.every(t=>topicIds.includes(t)&&t!==original.topic_id),'competing hypothesis universe');
  if(r.disposition==='LABEL_IDENTIFIABILITY_HOLD'){must(r.competing_topic_hypotheses.length>0,'label hold must explain competing target');holdIds.push(r.id);}else must(r.competing_topic_hypotheses.length===0,'retained record cannot disguise boundary hold');
  dispositions[r.disposition]++;
 }
 must(review.boundary_graph.evidence==='PROVISIONAL_WRITER_HYPOTHESES_NOT_FORMAL_CATALOG'&&review.boundary_graph.directional_source_cases===0&&review.boundary_graph.adjudicated_edges===0,'graph cannot claim directional gold');
 must(review.boundary_graph.cards.length===18,'seed graph scope');
 const cards=new Map(plan.cards.map(c=>[c.topic_id,c]));let edges=0;
 for(const [i,c]of review.boundary_graph.cards.entries()){
  must(c.topic_id===plan.first_batch_selection.topics[i]&&c.neighbors.length===3&&new Set(c.neighbors.map(n=>n.topic_id)).size===3&&c.neighbors.every(n=>topicIds.includes(n.topic_id)&&n.topic_id!==c.topic_id&&n.boundary_status==='PROVISIONAL_WRITER_EDGE_NOT_FORMAL_GOLD'),'boundary graph identity/edge scope');
  must(c.neighbors.filter(n=>cards.get(n.topic_id).domain===cards.get(c.topic_id).domain).length===2,'same-domain neighbors');
  must(c.neighbors.filter(n=>cards.get(n.topic_id).domain!==cards.get(c.topic_id).domain).length===1,'cross-domain neighbor');
  must(c.basis==='PUBLIC_CATALOG_GENERIC_PROVISIONAL_BOUNDS_PLUS_WRITER_HYPOTHESIS'&&c.rationale.length>=30&&c.required_directions.join('/')==='positive/reverse/ambiguity'&&c.status==='DIRECTIONAL_CASES_AND_INDEPENDENT_ADJUDICATION_MISSING','directional graph qualification');
  edges+=c.neighbors.length;
 }
 const families=new Set(plan.families.map(f=>f.id));must(review.family_overlap_observations.length===4&&review.family_adjudication==='UNADJUDICATED_NO_QUALIFIED_HELDOUT_COUNT','family observation scope');
 for(const o of review.family_overlap_observations)must(o.families.length===2&&new Set(o.families).size===2&&o.families.every(f=>families.has(f))&&o.status==='POSSIBLE_OVERLAP_NOT_ADJUDICATED'&&o.rationale.length>=30,'family label pair/rationale');
 return {schema:'ZMR-MECHANISM-MATRIX-WRITER-REVIEW-AUDIT-1',evidence_class:review.evidence_class,source_rows:54,writer_reviewed_rows:54,dispositions,hold_ids:holdIds,source_input_revisions:0,original_gold_and_spans_preserved:true,source_topics:18,full_topic_universe:144,missing_topics:source.missing_topics.length,provisional_neighbor_cards:18,provisional_neighbor_edges:edges,directional_source_cases:0,adjudicated_edges:0,family_overlap_observations:4,qualified_heldout_family_count:null,independent_reviewers:0,accepted_gold_rows:0,independent_quota_credit:0,license_review:'WRITER_DECLARATION_ONLY_NO_INDEPENDENT_VERIFICATION',template_review:'WRITER_COMMENTS_NOT_INDEPENDENT_SKELETON_ADJUDICATION',candidate_predictions:0,semantic_evaluations:0,remaining_stable_allowance:null,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false};
}
