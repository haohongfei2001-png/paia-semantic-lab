/** Registration bookkeeping only: allocation counts cannot adjudicate mechanisms or create data. */
import {validateUniverse,canonicalJSON} from './contracts.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const same=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const languages=['zh','en','mixed'];
export function validateMechanismMatrixPlan(plan,topicIds){
 const universe=validateUniverse(topicIds);
 must(plan?.schema==='ZMR-PROVISIONAL-MECHANISM-MATRIX-PLAN-1'&&plan.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&plan.topic_universe===144,'plan evidence/universe');
 must(plan.status==='REGISTRATION_BEFORE_FRESH_AUTHORING_NO_DATA_QUALIFICATION'&&plan.actual_authored_rows===0,'plan cannot claim authored data');
 must(/^[a-f0-9]{40}$/.test(plan.source_main)&&/^[a-f0-9]{40}$/.test(plan.source_tree)&&[plan.catalog_sha256,plan.source_audit_sha256,plan.source_audit_journal_sha256].every(s=>/^[a-f0-9]{64}$/.test(s))&&plan.source_audit_path==='docs/zero-model-refoundation-v1/ZMR-03_DEV_V04_MECHANISM_AUDIT_RESULT.json','plan source registration missing');
 for(const k of ['independent_quota_credit','qualification_credit_rows','candidate_prediction_exposures','semantic_evaluations'])must(plan[k]===0,'plan cannot mint qualification/predictions');
 must(plan.candidate_generation_claim==='NONE'&&plan.stable_allocation_claim==='NONE_ALLOWANCE_RECONCILIATION_REQUIRED','plan cannot reset competition allowance');
 must(plan.writer_id==='candidate-writer'&&plan.writer_cohort==='candidate-writer-G0'&&plan.source_family==='candidate-writer-G0','plan must disclose original writer lineage');
 must(plan.sealed_authoring==='FORBIDDEN_TO_CANDIDATE_WRITER_NO_AS_OR_TEST_CREATED'&&plan.family_review.existing_v04_tags_relabelled===false&&plan.family_review.rotating_heldout_ids_is_qualification===false&&plan.family_review.near_neighbor_and_family_overlap_review_required===true,'plan cannot certify nominal family labels');
 must(same(plan.targets,{TRAIN:{per_topic:24,total:3456,languages:{zh:12,en:8,mixed:4},minimum_mechanism_families:8},ordinary_DEV:{per_topic:12,total:1728,languages:{zh:6,en:4,mixed:2}},challenge_DEV:{per_topic:12,total:1728,languages:{zh:6,en:4,mixed:2}},minimum_heldout_families_per_topic:2}),'formal quota target changed');
 must(same(plan.safety_requirements,{TRAIN:{independent_scenarios_per_kind:144,kinds:['control','context_required','context_invariance','multi']},ordinary_DEV:{controls:300,context_required_pairs:144,context_invariance_pairs:144,multi:144,controls_minimum_language_fraction:.2},challenge_DEV:{controls:300,context_required_pairs:144,context_invariance_pairs:144,multi:144,controls_minimum_language_fraction:.2}}),'safety quota changed');
 must(same(plan.independence_requirements,{TRAIN_cohorts:3,ordinary_DEV_cohorts:2,challenge_DEV_cohorts:2,AS_cohorts:3,different_set_writers_required:true,same_writer_development_credit:0}),'independence requirement changed');
 must(same(plan.boundary_requirements,{same_domain_neighbors_per_topic:2,cross_domain_neighbors_per_topic:1,maximum_initial_edges_per_topic:6,directions:['positive','reverse','ambiguity'],formal_catalog_changes:'FORBIDDEN'}),'boundary requirement changed');
 must(same(plan.name_echo,{formal_adjudicated_maximum_fraction:.1,proxy_is_adjudication:false,remove_all_natural_keywords:false,prediction_based_row_exclusion:false}),'name echo boundary changed');
 must(same(plan.budget,{topics:144,assigned_precision_floor:.95,coverage_floor:.7,macro_recall_floor:.7,language_floor:.7,context_floor:.7,multi_floor:.7,index_bytes:1048576,router_plus_index_bytes:2097152,incremental_memory_bytes:33554432,warm_p95_ms:20,cold_ms:100,neural_assets_bytes:0,semantic_api_calls:0,local_first:true,global_label_precision_floor:.95,control_false_assignment_ceiling:.02,context_harm_ceiling:0}),'product constraints changed');
 must(plan.data_qualification==='NOT_QUALIFIED'&&plan.capability_verdict==='UNTESTED'&&plan.resource_verdict==='NOT_QUALIFIED'&&plan.saturation_ceiling_claim===false,'plan qualification claim');
 must(Array.isArray(plan.families)&&plan.families.length===10&&new Set(plan.families.map(f=>f.id)).size===10&&plan.families.every(f=>/^mf-[a-z-]+$/.test(f.id)&&f.definition&&f.boundary&&f.semantic_family_equivalence==='PROVISIONAL_WRITER_HYPOTHESIS_NOT_ADJUDICATED'),'invalid mechanism hypotheses');
 const familyIds=new Set(plan.families.map(f=>f.id));
 must(Array.isArray(plan.cards)&&plan.cards.length===144&&new Set(plan.cards.map(c=>c.topic_id)).size===144&&plan.cards.every((c,i)=>c.topic_id===topicIds[i]&&universe.has(c.topic_id)),'full144 ordered authoring cards required');
 const matrix=Object.fromEntries(plan.families.map(f=>[f.id,{TRAIN:{zh:0,en:0,mixed:0},ordinary_DEV:{zh:0,en:0,mixed:0},challenge_DEV:{zh:0,en:0,mixed:0}}])),totals={TRAIN:0,ordinary_DEV:0,challenge_DEV:0};
 for(const card of plan.cards){
  const tf=card.train_family_hypotheses,hf=card.heldout_family_hypotheses;
  must(tf.length===8&&hf.length===2&&new Set([...tf,...hf]).size===10&&[...tf,...hf].every(f=>familyIds.has(f)),'nominal family allocation/holdout overlap');
  must(card.adjudicated_heldout_families===null&&card.independent_quota_credit===0&&card.boundary_graph_status==='PROVISIONAL_NEIGHBOR_EDGES_AND_DIRECTIONAL_GOLD_REQUIRED_BEFORE_QUALIFICATION','cards cannot claim semantic/boundary qualification');
  must(same(card.factor_minimum,{actions:2,object_scenarios:3,qualifiers:3,unseen_dev_combinations_required:true}),'factor requirements changed');
  for(const [layer,key,expected]of [['TRAIN','train_allocations',tf],['ordinary_DEV','ordinary_dev_allocations',hf],['challenge_DEV','challenge_dev_allocations',hf]]){
   const allocations=card[key],counts={zh:0,en:0,mixed:0};must(Array.isArray(allocations)&&same(allocations.map(a=>a.mechanism_family),expected),'missing/repeated allocated family');
   for(const a of allocations){must(a.unique_original_scenarios_required===true&&Object.keys(a.languages).length===3&&languages.every(l=>Number.isSafeInteger(a.languages[l])&&a.languages[l]>=0),'invalid planned language allocation');const n=languages.reduce((sum,l)=>sum+a.languages[l],0);must(n===a.planned_base_scenarios&&n>0,'planned scenario count mismatch');for(const l of languages){counts[l]+=a.languages[l];matrix[a.mechanism_family][layer][l]+=a.languages[l];}totals[layer]+=n;}
   must(same(counts,plan.targets[layer].languages),'perTopic language quota mismatch');
  }
 }
 for(const layer of Object.keys(totals))must(totals[layer]===plan.targets[layer].total&&Object.values(matrix).every(m=>languages.every(l=>m[layer][l]>0)),'global planned family/language coverage absent');
 must(plan.first_batch_selection.topics.length===18&&new Set(plan.first_batch_selection.topics).size===18&&plan.first_batch_selection.topics.every(t=>universe.has(t)),'first batch Catalog scope');
 return {schema:'ZMR-MECHANISM-MATRIX-PLAN-AUDIT-1',evidence_class:plan.evidence_class,topic_cards:144,nominal_family_hypotheses:10,planned_ordinary_scenarios:totals,planned_family_language_matrix:matrix,actual_authored_rows:0,independent_quota_credit:0,semantic_family_adjudication:'NOT_ADJUDICATED_NO_AUTHORING_OR_CAPABILITY_CREDIT',boundary_adjudication:'UNADJUDICATED',candidate_predictions:0,new_competition_generations:0,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED'};
}
