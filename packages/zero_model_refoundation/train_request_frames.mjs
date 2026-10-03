/** Registered writer frame byte/provenance audit. Never infers a Topic or role truth. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
const must=(b,m)=>{if(!b)throw Error(m);},hash=s=>createHash('sha256').update(s).digest('hex');
export const POLICY_FRAME_INPUT_PINS=Object.freeze([
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part2_v0.1.json",
  "sha256": "323483c9745127f1837484264a18f1d4cf89d8d531474049fe3de306fa984353",
  "git_blob": "06b4b0e6f70ee7961a24e8279e23ea1fd8510982"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part3_v0.1.json",
  "sha256": "9f9308f0d2b88b86212078a81f58fb78eda3261f28301477ee68c4f3915d432d",
  "git_blob": "dcf788c501856ac5b04da0da1f96544a719e8e8a"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part4_v0.1.json",
  "sha256": "7a7d4f5dfa54c4fca7d22e162ca4562a25c8c5ef0cd6c9b38d6f43a75a406fbd",
  "git_blob": "217f75acb88e84cc0837ad3ff3ca7533396daf8e"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part5_v0.1.json",
  "sha256": "4b42effc9f87dbcb4e8177d1a4b80160d4745af6fa15faede8464d608ffcc57a",
  "git_blob": "b869d1cbedacc321da4e47dd468b05d5a5dcf272"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part6_v0.1.json",
  "sha256": "1021a38d726d5cbc7817bea8cf77c74bd4dc1cecd7990f98546adc2152ad8315",
  "git_blob": "03011e40e47f7bff59dff6d282121ff38515e447"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json",
  "sha256": "4377ecd423c38bbf4755113fffc844eb71f0e285901f921bd039d398573a0080",
  "git_blob": "157e08af47967e63a98d701274d7f25004e03f75"
 },
 {
  "path": "catalog/system_topic_catalog_v0.2.yaml",
  "sha256": "29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18",
  "git_blob": "6bcdd2af66879d7ac098cf237b5586c3c9818aad"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_older_role_proposals_v0.1.json",
  "sha256": "a41c3cf18788cdb22fbc1514133fdb65936db9d32810bfd95e31b802445ccbf8",
  "git_blob": "cd04e9443b56921772159b2d77816206641c0eac"
 },
 {
  "path": "docs/zero-model-refoundation-v1/ZMR-01B_ANNOTATION_GUIDELINE.md",
  "sha256": "250df34d1b3cfe8f08cfaf6612ae32058f7f9e2b585864e8301a22888dcb4660",
  "git_blob": "7d3cbc929c05cf6f935c08a4a8b49d2eddd30ca0"
 }
].map(p=>Object.freeze(p)));
const FRAME_EXPECTATIONS=Object.freeze(Object.fromEntries(Object.entries({
 "ZMR-MATRIX-TRAIN-SEED-005": {
  "request_form": "NOMINAL_INTERPRETATION",
  "frame_sha256": "d8af667694d3302fb67694a15cd878e9584abf71ed2261f705d2ebf8d005dec3"
 },
 "ZMR-MATRIX-TRAIN-SEED-020": {
  "request_form": "NOMINAL_COMPARISON",
  "frame_sha256": "74b25e230fca96df1fb47cb2ffcb3689eb9fcbdf70b76f543b540a183016b043"
 },
 "ZMR-MATRIX-TRAIN-SEED-035": {
  "request_form": "NOMINAL_OUTPUT_ARTIFACT",
  "frame_sha256": "f167db12907f2777641c412198d478e90926a567ccd6bf434ec4e25728dadc9c"
 },
 "ZMR-MATRIX-TRAIN-SEED-036": {
  "request_form": "MODAL_OUTPUT_ARTIFACT",
  "frame_sha256": "0a1f8db1f2f3dae710d9319b00cb2ae4c678d06f8bf358b25894f25c12a18fdc"
 },
 "ZMR-MATRIX-TRAIN-SEED-041": {
  "request_form": "MODAL_INTERPRETATION_CORRECTION",
  "frame_sha256": "2c1d2bf09115b3e3ca3c44fa52ea1e0afe043fe1c55bff9b9d3002497c6a205c"
 },
 "ZMR-MATRIX-TRAIN-SEED-050": {
  "request_form": "NOMINAL_SCHEDULING_GOAL",
  "frame_sha256": "6dc9d03b804072585543683c88aac8b75e5e3bf061129404417dfe7539d56733"
 },
 "ZMR-MATRIX-TRAIN-PART2-004": {
  "request_form": "NOMINAL_INTERPRETATION_QUESTION",
  "frame_sha256": "8e98432173aeeeadb945c694b6657dc79548b7bbe70479be0e4c6efaff4de051"
 },
 "ZMR-MATRIX-TRAIN-PART2-019": {
  "request_form": "NOMINAL_DESIGN_WITH_EXPLANATORY_MEANS",
  "frame_sha256": "6a299ae190152665c9cfcb1afa8f681409909c6bbfe1727ecc9e8c9a293c1479"
 },
 "ZMR-MATRIX-TRAIN-PART2-034": {
  "request_form": "NOMINAL_EDITING_GOAL",
  "frame_sha256": "e82e2e55b97653d7719afa7f7d25480d4df368ac428ac0f5d2fe182502f7b117"
 },
 "ZMR-MATRIX-TRAIN-PART2-042": {
  "request_form": "NOMINAL_CONCEPTUAL_QUESTION",
  "frame_sha256": "43c8294d6f7bcdc4e9d60f7d3511204c37ab19819f09fac17f6718663afcdb1f"
 },
 "ZMR-MATRIX-TRAIN-PART2-047": {
  "request_form": "MODAL_STRATEGIC_DIRECTION",
  "frame_sha256": "0b61a65bc3a82f266b0828d8e4dabbccb6fd535ea38f483b96a2739c54618ce7"
 },
 "ZMR-MATRIX-TRAIN-PART2-049": {
  "request_form": "NOMINAL_RULE_DRAFT",
  "frame_sha256": "983a843c2ec36658a22bbc8bc317f38c147f7050e16ce3db40a85e65dc1ebb97"
 },
 "ZMR-MATRIX-TRAIN-PART3-009": {
  "request_form": "MODAL_OUTPUT_FRAMEWORK",
  "frame_sha256": "131d576e67355a1c237cfdf193c4546ba6b2415efb186e9fd814a1cb1888d420"
 },
 "ZMR-MATRIX-TRAIN-PART4-020": {
  "request_form": "MODAL_PROCEDURAL_ARTIFACT",
  "frame_sha256": "2bd7db01e904460017d1a1dd04203ac933cfc8025bd58d180d4655f3ea07d0d8"
 },
 "ZMR-MATRIX-TRAIN-PART4-050": {
  "request_form": "MODAL_RECURRING_RULE",
  "frame_sha256": "b1c1fde90145a5c56a804569a6842385bd063ce601319049cf53949d80ca851a"
 },
 "ZMR-MATRIX-TRAIN-PART5-012": {
  "request_form": "MODAL_PRACTICE_FRAMEWORK",
  "frame_sha256": "896ecc603280b976bd8490398478afffe1f9a153a7247a08201fab9987bf8a59"
 },
 "ZMR-MATRIX-TRAIN-PART6-008": {
  "request_form": "MODAL_EXPLANATION_WITH_EMBEDDED_METHOD",
  "frame_sha256": "a901a217bdcfbc27002841976b0c7fa503bac08429a4f93ff97bc048e9d13648"
 },
 "ZMR-MATRIX-TRAIN-PART6-038": {
  "request_form": "MODAL_CONCEPTUAL_COMPARISON",
  "frame_sha256": "25428162bc3d4c0f77369917eeedf922c9d9e77feafc9964b176c8600b05d0b7"
 },
 "ZMR-MATRIX-TRAIN-PART6-053": {
  "request_form": "MODAL_OUTPUT_CHECKLIST",
  "frame_sha256": "cfc1a0b30e41b5b202f44c42eed23fb9c66c8e7dc1bd06fe9f8c904ff424c189"
 }
}).map(([k,v])=>[k,Object.freeze(v)])));
const priorPath='data/zero_model_refoundation/development/mechanism_matrix_train_older_role_proposals_v0.1.json';
const sourceMain='e9063bdeb1c1062f9bda20b7cbdd3bf2ca20b394',sourceTree='66a0089af09b671596a4197492fe6be83b88f302';
const boundary=(s,n)=>!(n>0&&n<s.length&&s.charCodeAt(n-1)>=0xD800&&s.charCodeAt(n-1)<=0xDBFF&&s.charCodeAt(n)>=0xDC00&&s.charCodeAt(n)<=0xDFFF);
const kinds=new Set(['DEMAND','GOAL','SUBJECT','BACKGROUND','MEANS','CONTENT','RECIPIENT','QUALIFIER','ORIGINAL_QUALIFIER','ORIGINAL_ANTECEDENT']);
export function auditWriterRequestFrames({journal:q,inputUtf8}){
 must(q?.schema==='ZMR-WRITER-REQUEST-FRAMES-1'&&q.status==='VERSIONED_WRITER_FRAMES_UNACCEPTED_QUALIFICATION_HOLD_RETAINED'&&q.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','writer frame boundary/schema');
 must(q.source_main===sourceMain&&q.source_tree===sourceTree&&q.publication_dependency_pr===250&&q.publication_dependency_head==='2dc19d2b6ccf3f67c6b62020213aeb8e2b5cc862','actual merged dependency provenance');
 must(canonicalJSON(q.input_pins)===canonicalJSON(POLICY_FRAME_INPUT_PINS)&&Object.keys(inputUtf8).length===9&&Object.keys(inputUtf8).every(p=>POLICY_FRAME_INPUT_PINS.some(x=>x.path===p)),'explicit immutable frame input scope');
 for(const p of POLICY_FRAME_INPUT_PINS){const b=inputUtf8[p.path];must(typeof b==='string'&&hash(b)===p.sha256&&createHash('sha1').update('blob '+Buffer.byteLength(b)+'\0').update(b).digest('hex')===p.git_blob,'immutable source/guideline/prior/Catalog bytes');}
 const prior=JSON.parse(inputUtf8[priorPath]),held=new Map(prior.records.filter(e=>e.proposed_role_spans===null).map(e=>[e.id,e]));
 must(prior.records.length===46&&held.size===19&&prior.unaccepted_span_repair_proposals===27&&prior.prior_known_unaccepted_proposals===5&&prior.combined_writer_role_holds===78&&prior.prior_label_holds===41&&prior.remaining_stable_allowance===null&&prior.qualification_holds_cleared===0,'prior writer proposals and every HOLD retained');
 const topicIds=[...inputUtf8['catalog/system_topic_catalog_v0.2.yaml'].matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);must(topicIds.length===144&&new Set(topicIds).size===144,'full144 formal Catalog');
 must(q.writer_decisions===19&&q.actual_source_rows_read===19&&q.unaccepted_frame_proposals===19&&q.combined_writer_role_holds===78&&q.label_holds===41&&q.older_explicit_proposals_preserved===27&&q.known_role_proposals_preserved===5,'bounded semantic review coverage only');
 for(const k of ['independent_reviewers','source_input_revisions','new_samples','candidate_predictions','semantic_evaluations','new_stable_allocations','accepted_role_rows','accepted_gold_rows','independent_quota_credit','policy_hold_clearance'])must(q[k]===0,'no quantity/gold/independence/evaluation/clearance');
 must(q.remaining_stable_allowance===null&&q.semantic_judgment_certified===false&&q.data_qualification==='NOT_QUALIFIED'&&q.capability_verdict==='UNTESTED'&&q.resource_verdict==='NOT_QUALIFIED'&&q.saturation_ceiling_claim===false&&q.compiler_admission==='HOLD_UNACCEPTED_LABELS_ROLES_AND_ACCOUNTING','admission and allowance remain HOLD');
 must(q.prior_proposal_path===priorPath&&q.prior_proposal_sha256===POLICY_FRAME_INPUT_PINS.find(p=>p.path===priorPath).sha256&&q.annotation_guideline_git_blob===POLICY_FRAME_INPUT_PINS.find(p=>p.path.endsWith('/ZMR-01B_ANNOTATION_GUIDELINE.md')).git_blob,'canonical annotation and actual original proposal links');
 must(Array.isArray(q.records)&&q.records.length===19&&new Set(q.records.map(r=>r.id)).size===19&&q.records_sha256===hash(canonicalJSON(q.records)),'exact unique frame record digest');
 const sources=new Map(POLICY_FRAME_INPUT_PINS.filter(p=>p.path.includes('_train_')&&p.path!==priorPath).map(p=>[p.path,JSON.parse(inputUtf8[p.path])]));let spanCount=0,demandCount=0;
 for(const e of q.records){
  const old=held.get(e.id),expected=FRAME_EXPECTATIONS[e.id],row=sources.get(e.source_path)?.rows.find(r=>r.id===e.id);must(old&&expected&&row&&topicIds.includes(row.topic_id),'actual policy-HOLD source row');
  must(e.source_path===old.source_path&&e.source_git_blob===old.source_git_blob&&e.prior_proposal_record_sha256===hash(canonicalJSON(old)),'original proposal record link');
  for(const [k,v]of [['bundle',canonicalJSON(row.input)],['gold',canonicalJSON(row.provisional_gold)],['spans',canonicalJSON(row.spans)]])must(e['original_'+k+'_sha256']===old['original_'+k+'_sha256']&&e['original_'+k+'_sha256']===hash(v),'original inputs/gold/roles unchanged');
  must(e.reviewer_id==='candidate-writer'&&e.independent===false&&e.accepted_roles===false&&e.accepted_gold===false&&e.qualification_hold_retained===true&&e.automatic_gold_state_change===false&&e.automatic_topic_change===false,'no writer impersonation or automatic relabel/DEFER');
  for(const k of ['source_input_revisions','candidate_predictions','new_stable_allocations','independent_quota_credit'])must(e[k]===0,'no source/evaluation/allocation mutation');
  for(const k of ['expected_state','topic_id','proposed_gold','accepted_topic_ids','runtime_output','compiled_role_slots'])must(!Object.hasOwn(e,k),'frame sidecar cannot carry a replacement outcome/gold/compiled role');
  must(e.policy_decision==='UNACCEPTED_NONIMPERATIVE_FRAME_PROPOSAL_HOLD_RETAINED'&&e.operation_evidence_state==='NO_UNIQUE_EXPLICIT_MAIN_OPERATION_IN_SOURCE'&&Array.isArray(e.explicit_main_operation_spans)&&e.explicit_main_operation_spans.length===0,'no fabricated main operation');
  must(e.request_form===expected.request_form&&hash(canonicalJSON(e.proposed_request_frame))===expected.frame_sha256&&typeof e.writer_reason==='string'&&e.writer_reason.length>=40&&Array.isArray(e.release_conditions)&&e.release_conditions.length===2&&e.release_conditions.every(s=>typeof s==='string'&&s.length>=40),'registered writer layers/reasons/release conditions');
  must(e.proposed_request_frame.some(s=>s.kind==='GOAL')&&e.proposed_request_frame.some(s=>s.kind==='SUBJECT'),'meaningful goal and subject evidence,not mandatory imperative');
  for(const s of row.spans.filter(s=>['QUALIFIER','ANTECEDENT'].includes(s.role))){const {role,...rest}=s;must(e.proposed_request_frame.some(t=>canonicalJSON(t)===canonicalJSON({kind:'ORIGINAL_'+role,...rest})),'all original qualifier/antecedent evidence retained');}
  for(const s of e.proposed_request_frame){const t=s.field==='current'?row.input.current:row.input.recent[Number(s.field.slice(7))];must(kinds.has(s.kind)&&typeof t==='string'&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=t.length&&boundary(t,s.start)&&boundary(t,s.end)&&t.slice(s.start,s.end)===s.text,'exact source UTF16 frame span');if(s.kind==='DEMAND'){must(s.field==='current'&&['I need','I want','需要','只需要'].includes(s.text),'current demand anchor never a background needs substring');demandCount++;}spanCount++;}
 }
 must(spanCount===104&&demandCount===10,'registered frame span/demand census');
 return {schema:'ZMR-WRITER-REQUEST-FRAMES-AUDIT-1',classification:'ENGINEERING_IMMUTABLE_WRITER_FRAME_COMPLETENESS_NOT_ROLE_TRUTH',evidence_class:q.evidence_class,writer_decisions:19,actual_source_rows_read:19,unaccepted_frame_proposals:19,exact_utf16_frame_spans:104,current_demand_anchors:demandCount,combined_writer_role_holds:78,label_holds:41,older_explicit_proposals_preserved:27,known_role_proposals_preserved:5,new_samples:0,policy_hold_clearance:0,accepted_role_rows:0,accepted_gold_rows:0,independent_quota_credit:0,candidate_predictions:0,semantic_evaluations:0,new_stable_allocations:0,remaining_stable_allowance:null,semantic_judgment_certified:false,compiler_admission:q.compiler_admission,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false};
}
