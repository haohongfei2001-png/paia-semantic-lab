/** Pure bounded audit of versioned writer dispositions;no Router or qualification. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const hash=s=>createHash('sha256').update(s).digest('hex');
export const DISPOSITION_INPUT_PINS=Object.freeze([
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion10_review_v0.2.json",
  "sha256": "2912888d92eb1714ccad4107f2b1e1cd3cf10a1749793c168f3b1b343c0652a7",
  "git_blob": "b38d92f3eb026b65c40706e0f9e40d76a52b9845"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion11_review_v0.1.json",
  "sha256": "6f185af5921099bb6e438d08e0f81df9ef92fef82164267e18d2a1c0f56a83c7",
  "git_blob": "07d9d63c657866215132f2bbc564778b00273fe0"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion1_review_v0.1.json",
  "sha256": "c493af3c9b6ceedc17c44b08f93795b57faacf1f86fd3b1ac6252595523ae9eb",
  "git_blob": "515e7a0dfec08865f9354f06926e90fb2d25f471"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion2_review_v0.1.json",
  "sha256": "436c848a606fc0a07624698b40ed9a8ee069639b4df402ca51d1d6b7c3f37c85",
  "git_blob": "c12647ee1cc663e78f2da86c1a98633fcebb0203"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion3_review_v0.1.json",
  "sha256": "d86a38775a1f80f424a79acabc009b82c12e57cae760e43e9b2c05d7d5399f93",
  "git_blob": "becd469704e3c1dc7ba3991092a53936451b6c89"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion4_review_v0.1.json",
  "sha256": "31b6cde91a4282232b76f8e302a022c845d5dbba55fd30d5573c5431148750e9",
  "git_blob": "0f8155fd072816416f0d7a60eedd1bb84d45e653"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion5_review_v0.1.json",
  "sha256": "9cb333e27eb1660e1194db9089cc2f220f4ce31b079405396407b3404e0b4d54",
  "git_blob": "70eafdda85152619f715e97ceca86356ce9735a0"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion6_review_v0.1.json",
  "sha256": "660a2bb8ea63210a14f108454e6f6c501a91e1e551be558a679030cdb5150711",
  "git_blob": "0f18e76df4cb61ea571548687c7136b94fef7ad7"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion7_review_v0.1.json",
  "sha256": "2db5207836e09bdbfc5650663adcf5d2efa355abd8385c5bd9168d96e70a5a82",
  "git_blob": "392273a9cddd56ac8096ec9b00467c6d83dc5b55"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion8_review_v0.1.json",
  "sha256": "bd19ad23e69cafff97e4ebab23dcd6c469381bddf7a4e523a32581cc592a31c0",
  "git_blob": "4ac2041716df81ce067317e31719449090bb6b57"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion9_review_v0.1.json",
  "sha256": "365b9cdaa5269679c52b831da609be790b418c78b7093dec4ad68af7d49bfbfd",
  "git_blob": "0088c26f25436b5b623d1e8c9a55e2b35363d90f"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part2_review_v0.1.json",
  "sha256": "cff041adeb0c1d20f609391941b52d6fbbe52d94c9885f78a0bfb5ddbf66b7a1",
  "git_blob": "c66b4714436e25bc47404fa7b4aa11bd42713281"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part3_review_v0.1.json",
  "sha256": "b0e786aaa4c23d78837ccdcb82f26d28804a50d8fcbf0c41962008d2e01e77e3",
  "git_blob": "a4b9ed88bf77fb4afdb77a25923705d4f892442b"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part4_review_v0.1.json",
  "sha256": "8b05863e9b077a22f0ab08fea405bd1beab56764e6aeb14262f191ca6f9cc2ed",
  "git_blob": "013d568cef2b2bae8a2aa52e91cb51ae8cdf6b18"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part5_review_v0.1.json",
  "sha256": "1e3f8dcdbf59bd7bff7572413defdb8963326ed277f9480282aa4dcab1f763f7",
  "git_blob": "40e179f56590b00b73271e6ec6e8061cbbe02505"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part6_review_v0.1.json",
  "sha256": "71cc5589964f653c6d8aa4b158f3261659f09c7d4be90e2e37a9756c3b0f75d1",
  "git_blob": "51fda74ef2fda412aaed3efbb7289964313390cc"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part7_review_v0.1.json",
  "sha256": "7bc5bfe6b41aea7d1109e9ced3ec1c41cf09408f6d68f8d779d804783d08c228",
  "git_blob": "a3fecc5461a872180241da2a63d1436ba309b9ff"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part8_review_v0.1.json",
  "sha256": "54a2e6c92a0a67074bddd50eb014b89184d40b743793e7e790ab88ee0f8d6244",
  "git_blob": "1d3e8f53378e7f1ecc86d7ff9599348ffef81eb4"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_review_v0.1.json",
  "sha256": "9004526809b15bf4d55e9a44d3da44d2bc5cb67929ddd6be586f2c16fc861e06",
  "git_blob": "69c0915c26b6c8e296cf12e5dcd2ee2b93c89c34"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json",
  "sha256": "4377ecd423c38bbf4755113fffc844eb71f0e285901f921bd039d398573a0080",
  "git_blob": "157e08af47967e63a98d701274d7f25004e03f75"
 },
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
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part7_v0.1.json",
  "sha256": "2264ab3384d5595725e3e66745a86e1aaac2503820055573e5855b814764277c",
  "git_blob": "ba1d59b8ca6c4d72e96e0ba135634171160b9371"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part8_v0.1.json",
  "sha256": "4f66e9bbca830e4de2b400cd5adf3a3220be1799d7592989d6792502987c59e9",
  "git_blob": "58185b5e93228cab9f3b9018864fa847f00c4686"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion1_v0.1.json",
  "sha256": "9334b10cda8591792cd01bcb032c71a24b8131624b22c27767c639743aa688d5",
  "git_blob": "65820c7b99448c527d51e1f9eeadc9d425edccab"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion2_v0.1.json",
  "sha256": "36e35906b06ba2571f56149f8403895b01df84088a0a2a83802493c04e3729e8",
  "git_blob": "277744edc77add1349706bb790d85c7da6ab6ac7"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion3_v0.1.json",
  "sha256": "e70fef8e4ab0a58b12bce91385a5de2a96e807e15b2690ce99d90f5be90b34f5",
  "git_blob": "8f5ff6f49043b71747d6ed4159563ae2647dd142"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion4_v0.1.json",
  "sha256": "0ce47d9e8bc2fbb8610b3f38bbc4a70aaf1f84d63fcb0d2f64174e1bcaacb9c4",
  "git_blob": "690d019cd51bdef2ee382bcd1737c07605a96519"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion5_v0.1.json",
  "sha256": "03d941a88aac8ee247cda20b66f2dd8b50837b0579c378078eb90380f0167dcd",
  "git_blob": "a6c857c3dc98233038c1a09e6c50a4a2d7c34dcc"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion6_v0.1.json",
  "sha256": "ead1135aaff9f2a99e5c76785cf9cad5be471070d8b3c45de5238fe1a2cc7ac2",
  "git_blob": "7026a936739368b948f0c684192e16e9dbdc17ef"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion7_v0.1.json",
  "sha256": "55eda41da845f829c77f8979046dbd2868a8261c887a4379ca34417c78f74817",
  "git_blob": "65810ef516d155dc2b1036e22a811c960fc5abb2"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion8_v0.1.json",
  "sha256": "b8c6616b3b7eb57e803899ee2935b9023a715ea11da6c507ef0e06b6e4a3ede1",
  "git_blob": "d88fd4aeb4315d2e43f6e8e70c054593bd84ced0"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion9_v0.1.json",
  "sha256": "decfda82a145b0c914c8f8c92f8709716c4e74dfbdbd8cc79cf7d486384becb6",
  "git_blob": "f102e9ad20c6f3f1cd2ece0509ba0dd95e635ca3"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion10_v0.1.json",
  "sha256": "48740ee57f80449ea63390d574e3850074548c873538c0b40613df5cb9387cca",
  "git_blob": "4d1433990b1441d8a0a288b1e49f64dff2eb0571"
 },
 {
  "path": "catalog/system_topic_catalog_v0.2.yaml",
  "sha256": "29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18",
  "git_blob": "6bcdd2af66879d7ac098cf237b5586c3c9818aad"
 }
].map(p=>Object.freeze(p)));
const SOURCE_MAIN='1ee73115fc1727308f6940c1f535c309f2c4a5cc',SOURCE_TREE='2b634364b3ad9e21a4dc7e4ed5e0f8858a613b31';
const proposals=new Map([
 ['ZMR-MATRIX-TRAIN-EXPANSION4-036',{verb:'需要',start:24,end:26,kind:'CORRECT_OCCURRENCE_ONLY_MODAL_POLICY_PENDING',modality:null}],
 ['ZMR-MATRIX-TRAIN-EXPANSION10-081',{verb:'解释',start:29,end:31}],
 ['ZMR-MATRIX-TRAIN-EXPANSION10-091',{verb:'说明',start:26,end:28}],
 ['ZMR-MATRIX-TRAIN-EXPANSION10-111',{verb:'厘清',start:25,end:27}],
 ['ZMR-MATRIX-TRAIN-EXPANSION10-141',{verb:'解释',start:32,end:34}]
]);
export function auditTrainHoldDispositions({journal:q,catalogUtf8,sourceUtf8,reviewUtf8}){
 must(q?.schema==='ZMR-KNOWN-TRAIN-HOLD-DISPOSITIONS-1'&&q.status==='VERSIONED_WRITER_DISPOSITIONS_RECORDED_QUALIFICATION_HOLD_RETAINED'&&q.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','writer evidence/schema');
 must(q.source_main===SOURCE_MAIN&&q.source_tree===SOURCE_TREE&&q.publication_dependency_pr===247&&q.batch_id==='ZMR-KNOWN-TRAIN-HOLD-DISPOSITIONS-20261003'&&Number.isFinite(Date.parse(q.reviewed_at)),'registered provenance');
 must(canonicalJSON(q.input_pins)===canonicalJSON(DISPOSITION_INPUT_PINS),'immutable input manifest');
 const supplied={...sourceUtf8,...reviewUtf8,'catalog/system_topic_catalog_v0.2.yaml':catalogUtf8};
 must(Object.keys(supplied).length===38&&Object.keys(sourceUtf8).length===18&&Object.keys(reviewUtf8).length===19,'explicit input scope');
 for(const p of DISPOSITION_INPUT_PINS){
  const b=supplied[p.path];must(typeof b==='string'&&hash(b)===p.sha256,'immutable input bytes');
  const blob=createHash('sha1').update('blob '+Buffer.byteLength(b)+'\0').update(b).digest('hex');
  must(blob===p.git_blob,'immutable Git blob');
 }
 const ids=[...catalogUtf8.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);
 must(ids.length===144&&new Set(ids).size===144,'full144 Catalog');
 must(q.catalog_path==='catalog/system_topic_catalog_v0.2.yaml'&&q.catalog_git_blob===DISPOSITION_INPUT_PINS.find(p=>p.path===q.catalog_path).git_blob,'Catalog pin');
 const sources=new Map(Object.entries(sourceUtf8).map(([p,b])=>[p,JSON.parse(b)])),held=new Map();
 let reviewRows=0,labelHolds=0,roleHolds=0,olderMissing=0;
 for(const [path,b]of Object.entries(reviewUtf8)){
  const review=JSON.parse(b);must(review.records_sha256===hash(canonicalJSON(review.records)),'review record digest');
  reviewRows+=review.records.length;
  for(const prior of review.records){
   const label=prior.disposition==='LABEL_IDENTIFIABILITY_HOLD',role=prior.role_review_disposition==='ROLE_IDENTIFIABILITY_HOLD';
   if(!Object.hasOwn(prior,'role_review_disposition'))olderMissing++;
   if(label)labelHolds++;if(role)roleHolds++;
   if(!label&&!role)continue;
   must(!held.has(prior.id),'duplicate original held row');
   const source=sources.get(review.source_path),row=source?.rows.find(r=>r.id===prior.id);must(row,'held original source missing');
   held.set(prior.id,{path,review,prior,row,label,role});
  }
 }
 must(reviewRows===1296&&labelHolds===41&&roleHolds===32&&held.size===72&&olderMissing===378,'complete known review census');
 must(q.unique_held_rows===72&&q.label_holds===41&&q.explicit_role_holds===32&&q.overlap_rows===1&&q.older_roles_without_disposition===378&&q.actual_source_rows_read===72&&q.versioned_writer_dispositions===72&&q.unaccepted_role_proposals===5,'known disposition counts');
 for(const k of ['independent_reviewers','accepted_gold_rows','accepted_roles','candidate_predictions','new_semantic_evaluations','new_stable_allocations'])must(q[k]===0,'no acceptance/exposure/allocation');
 must(q.remaining_stable_allowance===null&&q.data_qualification==='NOT_QUALIFIED'&&q.capability_verdict==='UNTESTED'&&q.resource_verdict==='NOT_QUALIFIED'&&q.saturation_ceiling_claim===false&&q.semantic_judgment_certified===false&&q.all_original_source_gold_spans_factors_preserved===true,'qualification HOLD');
 must(Array.isArray(q.records)&&q.records.length===72&&new Set(q.records.map(r=>r.id)).size===72,'complete unique disposition records');
 let proposalCount=0;
 for(const entry of q.records){
  const original=held.get(entry.id);must(original,'unknown disposition row');const {path,review,prior,row,label,role}=original,pin=entry.original_pins;
  must(pin.source_path===review.source_path&&pin.source_packet_sha256===review.source_sha256&&pin.review_path===path&&pin.review_git_blob===DISPOSITION_INPUT_PINS.find(p=>p.path===path).git_blob&&pin.review_records_sha256===review.records_sha256,'original source/review provenance');
  must(pin.current_sha256===prior.original_current_sha256&&pin.current_sha256===hash(row.input.current)&&pin.bundle_sha256===prior.original_bundle_sha256&&pin.bundle_sha256===hash(canonicalJSON(row.input))&&pin.gold_sha256===prior.original_gold_sha256&&pin.gold_sha256===hash(canonicalJSON(row.provisional_gold))&&pin.spans_sha256===prior.original_spans_sha256&&pin.spans_sha256===hash(canonicalJSON(row.spans)),'original gold/spans/current/context');
  must(entry.prior_label_disposition===prior.disposition&&entry.prior_role_disposition===(prior.role_review_disposition??null)&&entry.label_hold===label&&entry.role_hold===role&&entry.writer_disposition==='VERSIONED_WRITER_ANALYSIS_COMPLETE_QUALIFICATION_HOLD_RETAINED','preserve prior qualification holds');
  must(entry.reviewer_id==='candidate-writer'&&entry.independent===false&&entry.evidence_class===q.evidence_class&&entry.source_row_read===true&&entry.semantic_judgment_certified===false&&entry.accepted_gold===false&&entry.accepted_roles===false&&entry.source_input_revisions===0&&entry.formal_catalog_mutation===false&&entry.independent_quota_credit===0&&entry.candidate_prediction_exposures===0,'no writer impersonation/source mutation');
  must(typeof entry.semantic_reason==='string'&&entry.semantic_reason.length>=40&&Array.isArray(entry.release_conditions)&&entry.release_conditions.length>=2&&entry.release_conditions.every(s=>typeof s==='string'&&s.length>=20),'reasoned disposition/release conditions');
  must(canonicalJSON(entry.competing_label_hypotheses)===canonicalJSON(label?[row.topic_id,...prior.competing_topic_hypotheses]:null)&&(!label||entry.competing_label_hypotheses.every(t=>ids.includes(t))),'preserve competing hypotheses not union gold');
  const expected=proposals.get(entry.id),proposal=entry.unaccepted_role_proposal;
  if(!expected){must(proposal===null,'unregistered role proposal');continue;}
  must(proposal?.accepted===false&&proposal.offset_encoding==='UTF16'&&proposal.kind===(expected.kind??'REQUEST_OPERATOR_PROPOSAL_MODALITY_PRESERVED')&&proposal.original_modality===(Object.hasOwn(expected,'modality')?expected.modality:'需要'),'unaccepted proposal provenance');
  const spans=JSON.parse(JSON.stringify(row.spans)),action=spans.find(s=>s.role==='ACTION');
  Object.assign(action,{start:expected.start,end:expected.end,text:expected.verb});
  if(!expected.kind){const object=spans.find(s=>s.role==='OBJECT');object.start=expected.end;object.text=row.input.current.slice(object.start,object.end);}
  must(canonicalJSON(proposal.spans)===canonicalJSON(spans),'registered current-request occurrence/operator proposal');
  for(const s of proposal.spans){const text=s.field==='current'?row.input.current:row.input.recent[Number(s.field.slice(7))];must(text?.slice(s.start,s.end)===s.text,'proposal exact UTF16 span');}
  proposalCount++;
 }
 must(proposalCount===5,'five unaccepted role proposals');
 return {schema:'ZMR-KNOWN-TRAIN-HOLD-DISPOSITIONS-AUDIT-1',classification:'ENGINEERING_PROVENANCE_AND_WRITER_DISPOSITION_COMPLETENESS_ONLY',evidence_class:q.evidence_class,reviewed_rows:1296,source_rows_read:72,versioned_writer_dispositions:72,label_holds:41,role_holds:32,unique_held_rows:72,overlap_rows:1,older_roles_without_disposition:378,unaccepted_role_proposals:5,original_inputs_gold_roles_factors_preserved:true,semantic_judgment_certified:false,independent_reviewers:0,accepted_gold_rows:0,accepted_role_rows:0,independent_quota_credit:0,candidate_predictions:0,semantic_evaluations:0,new_stable_allocations:0,remaining_stable_allowance:null,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false};
}
