/** Supplied draft-source audit only. No fitting, candidate execution or file discovery. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {validateMechanismMatrixPlan} from './mechanism_matrix_plan.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
export const seedHash=v=>createHash('sha256').update(v).digest('hex');
const normalized=s=>s.normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
const source=(input,field)=>field==='current'?input.current:field==='title'?input.title:/^recent\.[0-9]+$/.test(field)?input.recent[Number(field.slice(7))]:undefined;
const grams=s=>{const c=Array.from(normalized(s));return new Set(c.length<3?[c.join('')]:c.slice(0,-2).map((_,i)=>c.slice(i,i+3).join('')));};
const dice=(a,b)=>{let shared=0;for(const v of a)if(b.has(v))shared++;return 2*shared/(a.size+b.size||1);};
export function auditMechanismMatrixSeed({packet,plan,planUtf8,topicIds}){
 validateMechanismMatrixPlan(plan,topicIds);
 must(packet?.schema==='ZMR-MECHANISM-MATRIX-DRAFT-SOURCE-1'&&packet.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','draft evidence');
 must(packet.plan_sha256===seedHash(planUtf8)&&packet.catalog_sha256===plan.catalog_sha256,'source plan/catalog identity');
 must(/^[a-f0-9]{40}$/.test(packet.registration_main)&&/^[a-f0-9]{40}$/.test(packet.registration_tree),'main registration required');
 must(packet.status==='SOURCE_BYTES_FROZEN_DRAFT_UNACCEPTED_NO_COMPILER_ADMISSION'&&packet.source_license==='ORIGINAL_CANDIDATE_WRITER_FICTIONAL_DECLARATION_NOT_INDEPENDENTLY_VERIFIED','draft admission/license');
 must(packet.generation_claim==='NONE_NO_STABLE_ALLOCATION_OR_BUDGET_RESET'&&packet.writer_id==='candidate-writer'&&packet.writer_cohort==='candidate-writer-G0'&&packet.source_family==='candidate-writer-G0','same writer lineage required');
 for(const k of ['independent_quota_credit','accepted_rows','candidate_prediction_exposures','semantic_evaluations','new_competition_generations','source_intake_revision'])must(packet[k]===0,'draft cannot mint admission/independence/budget');
 must(packet.data_qualification==='NOT_QUALIFIED'&&packet.capability_verdict==='UNTESTED'&&packet.resource_verdict==='NOT_QUALIFIED'&&packet.sealed_contents_created===false&&packet.saturation_ceiling_claim===false,'false qualification claim');
 must(packet.near_duplicate_screen.threshold===.55&&packet.near_duplicate_screen.scope==='WITHIN_THIS_DRAFT_ONLY_NOT_SEALED_OR_OLD_CORPUS'&&packet.near_duplicate_screen.independent_review===false,'screen scope/threshold');
 must(Array.isArray(packet.rows)&&packet.rows.length===54&&packet.rows_sha256===seedHash(canonicalJSON(packet.rows)),'draft source count/digest');
 const ids=new Set(),currents=new Set(),bundles=new Set(),languages={zh:0,en:0,mixed:0},matrix={},literalNames=[],cards=new Map(plan.cards.map(c=>[c.topic_id,c]));
 for(const [i,r]of packet.rows.entries()){
  const t=plan.first_batch_selection.topics[Math.floor(i/3)],lang=['zh','en','mixed'][i%3],card=cards.get(t),allocation=card.train_allocations[[0,1,4][i%3]];
  must(r.id===`ZMR-MATRIX-TRAIN-SEED-${String(i+1).padStart(3,'0')}`&&!ids.has(r.id),'draft ID/order');ids.add(r.id);
  must(r.topic_id===t&&r.language===lang&&r.split==='TRAIN'&&r.mechanism_family===allocation.mechanism_family&&allocation.languages[lang]>0,'draft plan allocation mismatch');
  must(r.writer_id===packet.writer_id&&r.writer_cohort===packet.writer_cohort&&r.source_family===packet.source_family&&r.scenario_id===r.id+'-scenario'&&r.source_id===r.id+'-original','draft provenance');
  must(r.lineage.writer==='candidate-writer-G0'&&r.lineage.source===r.source_id&&r.lineage.scenario===r.scenario_id&&r.lineage.shared_authoring_run===packet.batch_id&&r.lineage.template_review==='UNREVIEWED_POSSIBLE_SHARED_SKELETONS'&&r.lineage.translation_family===null&&r.lineage.paraphrase_family===null&&r.lineage.contrast_family===null,'lineage declaration incomplete');
  must(r.source_status==='ORIGINAL_FICTIONAL_WRITER_DRAFT_NOT_INDEPENDENT_SOURCE'&&r.label_status==='PROVISIONAL_WRITER_LABEL_UNACCEPTED'&&r.reviewer_id==='candidate-writer'&&r.independent_reviewer_count===0&&r.independent_quota_credit===0,'row independence/gold');
  must(r.provisional_gold.expected_state==='ASSIGNED'&&canonicalJSON(r.provisional_gold.topics)===canonicalJSON([t])&&Array.isArray(r.provisional_gold.excluded_topics)&&r.provisional_gold.excluded_topics.every(x=>topicIds.includes(x)&&x!==t)&&new Set(r.provisional_gold.excluded_topics).size===r.provisional_gold.excluded_topics.length,'provisional label universe');
  must(r.identifiability==='PENDING_BOUNDARY_AND_INDEPENDENT_ADJUDICATION'&&typeof r.writer_rationale==='string'&&r.writer_rationale.length>=20,'writer rationale/hold required');
  const input=r.input;must(input&&Object.keys(input).sort().join(',')==='current,recent,title'&&typeof input.current==='string'&&input.current.length>=20&&typeof input.title==='string'&&Array.isArray(input.recent)&&input.recent.every(x=>typeof x==='string'),'product bundle');
  must(r.input_sha256===seedHash(input.current)&&r.normalized_current_sha256===seedHash(normalized(input.current))&&r.bundle_sha256===seedHash(canonicalJSON(input)),'input fingerprints');
  must(!currents.has(r.normalized_current_sha256)&&!bundles.has(r.bundle_sha256),'unexplained draft normalized duplication');currents.add(r.normalized_current_sha256);bundles.add(r.bundle_sha256);
  for(const role of ['ACTION','OBJECT','QUALIFIER'])must(r.spans.some(s=>s.role===role),'missing proposed role');
  if(r.mechanism_family==='mf-context-continuation')must(input.recent.length>0&&r.spans.some(s=>s.role==='ANTECEDENT'&&s.field.startsWith('recent.')),'continuation antecedent required');
  for(const s of r.spans){const text=source(input,s.field);must(typeof text==='string'&&['ACTION','OBJECT','QUALIFIER','ANTECEDENT'].includes(s.role)&&Number.isSafeInteger(s.start)&&Number.isSafeInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=text.length&&text.slice(s.start,s.end)===s.text,'exact UTF16 span');const boundary=n=>n===0||n===text.length||!(text.charCodeAt(n-1)>=0xd800&&text.charCodeAt(n-1)<=0xdbff&&text.charCodeAt(n)>=0xdc00&&text.charCodeAt(n)<=0xdfff);must(boundary(s.start)&&boundary(s.end),'surrogate span split');}
  must(canonicalJSON(r.factors)===canonicalJSON(Object.fromEntries(['ACTION','OBJECT','QUALIFIER'].map(role=>[role.toLowerCase(),r.spans.find(s=>s.role===role).text]))),'declared factors/span mismatch');
  must(r.frozen_at===packet.frozen_at&&!Number.isNaN(Date.parse(r.frozen_at)),'source freeze timestamp');
  const name=normalized(input.current);if([card.name_zh,card.name_en].some(x=>name.includes(normalized(x))))literalNames.push(r.id);
  languages[lang]++;matrix[r.mechanism_family]??={zh:0,en:0,mixed:0};matrix[r.mechanism_family][lang]++;
 }
 const near=[];for(let i=0;i<packet.rows.length;i++)for(let j=i+1;j<packet.rows.length;j++){const score=dice(grams(packet.rows[i].input.current),grams(packet.rows[j].input.current));if(score>=packet.near_duplicate_screen.threshold)near.push({first:packet.rows[i].id,second:packet.rows[j].id,dice:score,disposition:'HOLD_WRITER_SCREEN_NOT_INDEPENDENTLY_REVIEWED'});}
 const supplied=new Set(packet.rows.map(r=>r.topic_id));
 return {schema:'ZMR-MECHANISM-MATRIX-DRAFT-AUDIT-1',evidence_class:packet.evidence_class,source_rows:54,source_topics:18,language_counts:languages,full_topic_universe:144,missing_topics:topicIds.filter(t=>!supplied.has(t)),raw_train_remaining:plan.targets.TRAIN.total-54,raw_language_remaining:{zh:1728-languages.zh,en:1152-languages.en,mixed:576-languages.mixed},nominal_family_language_matrix:matrix,semantic_family_equivalence:'UNADJUDICATED_POSSIBLE_OVERLAP',accepted_rows:0,independent_quota_credit:0,writer_lineage_components:1,independent_scenario_count:null,boundary_directional_gold:'REQUIRED_UNADJUDICATED',own_literal_name_proxy:{rows:literalNames.length,ids:literalNames,adjudicated_echo_fraction:null},within_packet_near_duplicate_flags:near,old_source_overlap_review:'NOT_PERFORMED_NO_LEGACY_OR_SEALED_READS',source_license:'DECLARATION_ONLY_NOT_INDEPENDENTLY_VERIFIED',candidate_predictions:0,semantic_evaluations:0,new_competition_generations:0,remaining_stable_allowance:null,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false};
}
