/** Bounded provenance/completeness guard; cannot establish semantic role truth. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const hash=s=>createHash('sha256').update(s).digest('hex');
export const OLDER_ROLE_INPUT_PINS=Object.freeze([
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json",
  "git_blob": "157e08af47967e63a98d701274d7f25004e03f75",
  "sha256": "4377ecd423c38bbf4755113fffc844eb71f0e285901f921bd039d398573a0080"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_review_v0.1.json",
  "git_blob": "69c0915c26b6c8e296cf12e5dcd2ee2b93c89c34",
  "sha256": "9004526809b15bf4d55e9a44d3da44d2bc5cb67929ddd6be586f2c16fc861e06"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part2_v0.1.json",
  "git_blob": "06b4b0e6f70ee7961a24e8279e23ea1fd8510982",
  "sha256": "323483c9745127f1837484264a18f1d4cf89d8d531474049fe3de306fa984353"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part2_review_v0.1.json",
  "git_blob": "c66b4714436e25bc47404fa7b4aa11bd42713281",
  "sha256": "cff041adeb0c1d20f609391941b52d6fbbe52d94c9885f78a0bfb5ddbf66b7a1"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part3_v0.1.json",
  "git_blob": "dcf788c501856ac5b04da0da1f96544a719e8e8a",
  "sha256": "9f9308f0d2b88b86212078a81f58fb78eda3261f28301477ee68c4f3915d432d"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part3_review_v0.1.json",
  "git_blob": "a4b9ed88bf77fb4afdb77a25923705d4f892442b",
  "sha256": "b0e786aaa4c23d78837ccdcb82f26d28804a50d8fcbf0c41962008d2e01e77e3"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part4_v0.1.json",
  "git_blob": "217f75acb88e84cc0837ad3ff3ca7533396daf8e",
  "sha256": "7a7d4f5dfa54c4fca7d22e162ca4562a25c8c5ef0cd6c9b38d6f43a75a406fbd"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part4_review_v0.1.json",
  "git_blob": "013d568cef2b2bae8a2aa52e91cb51ae8cdf6b18",
  "sha256": "8b05863e9b077a22f0ab08fea405bd1beab56764e6aeb14262f191ca6f9cc2ed"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part5_v0.1.json",
  "git_blob": "b869d1cbedacc321da4e47dd468b05d5a5dcf272",
  "sha256": "4b42effc9f87dbcb4e8177d1a4b80160d4745af6fa15faede8464d608ffcc57a"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part5_review_v0.1.json",
  "git_blob": "40e179f56590b00b73271e6ec6e8061cbbe02505",
  "sha256": "1e3f8dcdbf59bd7bff7572413defdb8963326ed277f9480282aa4dcab1f763f7"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part6_v0.1.json",
  "git_blob": "03011e40e47f7bff59dff6d282121ff38515e447",
  "sha256": "1021a38d726d5cbc7817bea8cf77c74bd4dc1cecd7990f98546adc2152ad8315"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part6_review_v0.1.json",
  "git_blob": "51fda74ef2fda412aaed3efbb7289964313390cc",
  "sha256": "71cc5589964f653c6d8aa4b158f3261659f09c7d4be90e2e37a9756c3b0f75d1"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part7_v0.1.json",
  "git_blob": "ba1d59b8ca6c4d72e96e0ba135634171160b9371",
  "sha256": "2264ab3384d5595725e3e66745a86e1aaac2503820055573e5855b814764277c"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part7_review_v0.1.json",
  "git_blob": "a3fecc5461a872180241da2a63d1436ba309b9ff",
  "sha256": "7bc5bfe6b41aea7d1109e9ced3ec1c41cf09408f6d68f8d779d804783d08c228"
 },
 {
  "path": "catalog/system_topic_catalog_v0.2.yaml",
  "git_blob": "6bcdd2af66879d7ac098cf237b5586c3c9818aad",
  "sha256": "29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json",
  "git_blob": "20f06d84001980cded9b20d67ee005925c4039b7",
  "sha256": "b900e24967181e07f8fbe8483e0d9d47b4a826ed6f2496aa9bc3bb8169522b8d"
 }
].map(p=>Object.freeze(p)));
export const OLDER_ROLE_HOLD_IDS=Object.freeze([
 "ZMR-MATRIX-TRAIN-SEED-004",
 "ZMR-MATRIX-TRAIN-SEED-005",
 "ZMR-MATRIX-TRAIN-SEED-008",
 "ZMR-MATRIX-TRAIN-SEED-010",
 "ZMR-MATRIX-TRAIN-SEED-020",
 "ZMR-MATRIX-TRAIN-SEED-028",
 "ZMR-MATRIX-TRAIN-SEED-029",
 "ZMR-MATRIX-TRAIN-SEED-034",
 "ZMR-MATRIX-TRAIN-SEED-035",
 "ZMR-MATRIX-TRAIN-SEED-036",
 "ZMR-MATRIX-TRAIN-SEED-037",
 "ZMR-MATRIX-TRAIN-SEED-041",
 "ZMR-MATRIX-TRAIN-SEED-050",
 "ZMR-MATRIX-TRAIN-PART2-004",
 "ZMR-MATRIX-TRAIN-PART2-011",
 "ZMR-MATRIX-TRAIN-PART2-019",
 "ZMR-MATRIX-TRAIN-PART2-025",
 "ZMR-MATRIX-TRAIN-PART2-026",
 "ZMR-MATRIX-TRAIN-PART2-034",
 "ZMR-MATRIX-TRAIN-PART2-041",
 "ZMR-MATRIX-TRAIN-PART2-042",
 "ZMR-MATRIX-TRAIN-PART2-047",
 "ZMR-MATRIX-TRAIN-PART2-049",
 "ZMR-MATRIX-TRAIN-PART3-002",
 "ZMR-MATRIX-TRAIN-PART3-009",
 "ZMR-MATRIX-TRAIN-PART3-016",
 "ZMR-MATRIX-TRAIN-PART3-020",
 "ZMR-MATRIX-TRAIN-PART3-052",
 "ZMR-MATRIX-TRAIN-PART3-054",
 "ZMR-MATRIX-TRAIN-PART4-011",
 "ZMR-MATRIX-TRAIN-PART4-014",
 "ZMR-MATRIX-TRAIN-PART4-016",
 "ZMR-MATRIX-TRAIN-PART4-020",
 "ZMR-MATRIX-TRAIN-PART4-029",
 "ZMR-MATRIX-TRAIN-PART4-044",
 "ZMR-MATRIX-TRAIN-PART4-050",
 "ZMR-MATRIX-TRAIN-PART5-012",
 "ZMR-MATRIX-TRAIN-PART5-034",
 "ZMR-MATRIX-TRAIN-PART5-035",
 "ZMR-MATRIX-TRAIN-PART5-051",
 "ZMR-MATRIX-TRAIN-PART6-002",
 "ZMR-MATRIX-TRAIN-PART6-008",
 "ZMR-MATRIX-TRAIN-PART6-017",
 "ZMR-MATRIX-TRAIN-PART6-038",
 "ZMR-MATRIX-TRAIN-PART6-047",
 "ZMR-MATRIX-TRAIN-PART6-053"
]);
export function auditOlderTrainRoleDispositions({journal:q,inputUtf8}){
 must(q?.schema==='ZMR-OLDER-TRAIN-ROLE-DISPOSITIONS-1'&&q.batch_id==='ZMR-OLDER-TRAIN-ROLE-DISPOSITIONS-20261003'&&q.status==='VERSIONED_WRITER_DISPOSITIONS_RECORDED_QUALIFICATION_HOLD_RETAINED'&&q.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','writer evidence/schema');
 must(q.source_main==='043d11004afde54deca207e6302eba954c5d1153'&&q.source_tree==='54b4f9ccab5a2cef0daaa661133d4ecf20135501'&&q.publication_dependency_pr===248&&q.reviewer_id==='candidate-writer'&&q.reviewer_is_source_writer===true&&q.scope==='EXACT_SEVEN_ORIGINAL_TRAIN_PACKETS_AND_REVIEWS_PLUS_CATALOG_AND_PRIOR72_JOURNAL','registered provenance');
 must(canonicalJSON(q.input_pins)===canonicalJSON(OLDER_ROLE_INPUT_PINS),'immutable input manifest');
 must(Object.keys(inputUtf8).length===16&&Object.keys(inputUtf8).every(p=>OLDER_ROLE_INPUT_PINS.some(k=>k.path===p)),'explicit input scope');
 for(const p of OLDER_ROLE_INPUT_PINS){const b=inputUtf8[p.path];must(typeof b==='string'&&hash(b)===p.sha256,'immutable input bytes');must(createHash('sha1').update('blob '+Buffer.byteLength(b)+'\0').update(b).digest('hex')===p.git_blob,'immutable Git blob');}
 const catalog=inputUtf8['catalog/system_topic_catalog_v0.2.yaml'],topics=[...catalog.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);
 must(topics.length===144&&new Set(topics).size===144,'full144 Catalog');
 const known=JSON.parse(inputUtf8['data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json']);
 must(known.unique_held_rows===72&&known.label_holds===41&&known.explicit_role_holds===32&&known.unaccepted_role_proposals===5&&known.older_roles_without_disposition===378,'preserve prior72 historical snapshot');
 const originals=new Map();
 for(const pin of OLDER_ROLE_INPUT_PINS.filter(p=>p.path.includes('_review_v'))){
  const prior=JSON.parse(inputUtf8[pin.path]),source=JSON.parse(inputUtf8[prior.source_path]);
  must(prior.records.length===54&&source.rows.length===54&&prior.records_sha256===hash(canonicalJSON(prior.records))&&prior.source_sha256===hash(inputUtf8[prior.source_path]),'original packet/review census');
  for(const old of prior.records){must(!Object.hasOwn(old,'role_review_disposition')&&!originals.has(old.id),'original missing-role scope');const row=source.rows.find(x=>x.id===old.id);must(row&&topics.includes(row.topic_id),'original row/Topic');originals.set(old.id,{row,old,sourcePath:prior.source_path,reviewPath:pin.path});}
 }
 must(originals.size===378&&q.prior_older_roles_without_disposition===378&&q.actual_source_rows_read===378&&q.writer_role_dispositions===378&&q.older_roles_without_writer_disposition===0&&q.older_role_rows_independently_unqualified===378,'complete writer dispositions never independent acceptance');
 must(q.writer_provisional_retains===332&&q.new_writer_role_holds===46&&q.prior_known_label_holds===41&&q.prior_explicit_role_holds===32&&q.combined_writer_role_holds===78&&q.prior_known_dispositions===72&&q.prior_unaccepted_role_proposals===5,'preserve all role and label concerns');
 for(const k of ['source_input_revisions','independent_reviewers','accepted_gold_rows','accepted_role_rows','independent_quota_credit','candidate_predictions','semantic_evaluations','new_stable_allocations'])must(q[k]===0,'no acceptance/exposure/allocation');
 must(q.remaining_stable_allowance===null&&q.data_qualification==='NOT_QUALIFIED'&&q.capability_verdict==='UNTESTED'&&q.resource_verdict==='NOT_QUALIFIED'&&q.saturation_ceiling_claim===false&&q.semantic_judgment_certified===false,'qualification and budget HOLD');
 must(Array.isArray(q.records)&&q.records.length===378&&new Set(q.records.map(x=>x.id)).size===378&&q.records_sha256===hash(canonicalJSON(q.records)),'complete unique record digest');
 must(new Set(q.records.map(x=>x.role_review_comment)).size===378,'individual writer rationale');
 let labelHolds=0;const held=[];
 for(const e of q.records){
  const o=originals.get(e.id);must(o,'unknown disposition');const {row,old,sourcePath,reviewPath}=o;
  must(e.source_path===sourcePath&&e.prior_review_path===reviewPath&&e.source_git_blob===OLDER_ROLE_INPUT_PINS.find(p=>p.path===sourcePath).git_blob&&e.prior_review_git_blob===OLDER_ROLE_INPUT_PINS.find(p=>p.path===reviewPath).git_blob,'original source/review pins');
  for(const [k,v] of [['current',row.input.current],['bundle',canonicalJSON(row.input)],['gold',canonicalJSON(row.provisional_gold)],['spans',canonicalJSON(row.spans)]])must(e['original_'+k+'_sha256']===old['original_'+k+'_sha256']&&e['original_'+k+'_sha256']===hash(v),'original gold/roles/current/context');
  must(e.prior_label_disposition===old.disposition&&e.prior_role_disposition===null,'prior label/role snapshot');if(old.disposition==='LABEL_IDENTIFIABILITY_HOLD')labelHolds++;
  const expected=OLDER_ROLE_HOLD_IDS.includes(e.id)?'ROLE_IDENTIFIABILITY_HOLD':'PROVISIONAL_WRITER_ROLE_RETAIN';
  must(e.role_review_disposition===expected,'registered writer concern preserved');if(expected==='ROLE_IDENTIFIABILITY_HOLD')held.push(e.id);
  must(e.reviewer_id==='candidate-writer'&&e.independent===false&&e.evidence_class===q.evidence_class&&e.source_row_read===true&&e.semantic_judgment_certified===false&&e.accepted_gold===false&&e.accepted_roles===false&&e.source_input_revisions===0&&e.independent_quota_credit===0&&e.formal_catalog_mutation===false&&e.candidate_prediction_exposures===0&&e.proposed_role_replacements===null,'no writer impersonation/gold overwrite');
  must(typeof e.role_review_comment==='string'&&e.role_review_comment.length>=20&&Array.isArray(e.release_conditions)&&e.release_conditions.length===2&&e.release_conditions.every(s=>typeof s==='string'&&s.length>=30),'reasoned writer disposition/release conditions');
 }
 must(held.length===46,'complete new writer concerns');
 return {schema:'ZMR-OLDER-TRAIN-ROLE-DISPOSITIONS-AUDIT-1',classification:'ENGINEERING_PROVENANCE_AND_WRITER_DISPOSITION_COMPLETENESS_ONLY',evidence_class:q.evidence_class,actual_source_rows_read:378,writer_role_dispositions:378,writer_provisional_retains:332,new_writer_role_holds:46,prior_explicit_role_holds:32,combined_writer_role_holds:78,prior_known_label_holds:41,older_subset_label_holds_preserved:labelHolds,older_roles_without_writer_disposition:0,older_role_rows_independently_unqualified:378,prior_known_dispositions:72,prior_unaccepted_role_proposals:5,original_source_gold_spans_preserved:true,semantic_judgment_certified:false,accepted_gold_rows:0,accepted_role_rows:0,independent_quota_credit:0,candidate_predictions:0,semantic_evaluations:0,new_stable_allocations:0,remaining_stable_allowance:null,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false};
}
