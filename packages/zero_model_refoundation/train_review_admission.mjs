/** Deterministic source/review admission metadata; never semantic adjudication or fitting. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
// Frozen source identity is not accepted label, role or independent evidence.
export const ADMISSION_INPUT_PINS=Object.freeze([
  {
    "path": "catalog/system_topic_catalog_v0.2.yaml",
    "sha256": "29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18",
    "git_blob": "6bcdd2af66879d7ac098cf237b5586c3c9818aad"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion10_v0.1.json",
    "sha256": "48740ee57f80449ea63390d574e3850074548c873538c0b40613df5cb9387cca",
    "git_blob": "4d1433990b1441d8a0a288b1e49f64dff2eb0571"
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
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_expansion6_v0.1.json",
    "sha256": "ead1135aaff9f2a99e5c76785cf9cad5be471070d8b3c45de5238fe1a2cc7ac2",
    "git_blob": "7026a936739368b948f0c684192e16e9dbdc17ef"
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
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json",
    "sha256": "b900e24967181e07f8fbe8483e0d9d47b4a826ed6f2496aa9bc3bb8169522b8d",
    "git_blob": "20f06d84001980cded9b20d67ee005925c4039b7"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_label_proposals_v0.1.json",
    "sha256": "ea076defbd3ab2fe679565ba2eb38a9c4d42fee5811bf05ce242168e10ccdd63",
    "git_blob": "2b47a5c0b4bd0dde33fbf661d31998576030b85c"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_label_review_cards_v0.1.json",
    "sha256": "ab16c7e00f09981c6a4dc8b1df1d0db2440a07f519f5e296d213536e8e412f09",
    "git_blob": "a471653caf6f114cf0c09aff484112a325f0899f"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_older_role_proposals_v0.1.json",
    "sha256": "a41c3cf18788cdb22fbc1514133fdb65936db9d32810bfd95e31b802445ccbf8",
    "git_blob": "cd04e9443b56921772159b2d77816206641c0eac"
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
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_request_frames_v0.1.json",
    "sha256": "59684ff38c36b4dc6fe888ac606933323591c37d8e68a78952443f0adf5db543",
    "git_blob": "5bb3b861308ee81826f2ac1d7e642c7db73ee19e"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json",
    "sha256": "4377ecd423c38bbf4755113fffc844eb71f0e285901f921bd039d398573a0080",
    "git_blob": "157e08af47967e63a98d701274d7f25004e03f75"
  }
].map(Object.freeze));
const REGISTERED_DEPENDENCY_CI='SUCCESS_ATTEMPT1_SEMANTIC37135845304_ZMR37135845322';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fingerprint=x=>hash(canonicalJSON(x));
const must=(b,m)=>{if(!b)throw Error(m);};
const prefix='data/zero_model_refoundation/development/mechanism_matrix_train_';
const paths={labels:prefix+'label_proposals_v0.1.json',known:prefix+'hold_dispositions_v0.1.json',older:prefix+'older_role_proposals_v0.1.json',frames:prefix+'request_frames_v0.1.json',cards:prefix+'label_review_cards_v0.1.json'};
const catalogPath='catalog/system_topic_catalog_v0.2.yaml';

export function buildReviewAwareTrainAdmission({inputUtf8}) {
  must(inputUtf8&&Object.keys(inputUtf8).length===20&&Object.keys(inputUtf8).every(p=>ADMISSION_INPUT_PINS.some(x=>x.path===p)),'finite original TRAIN and review input scope');
  for(const p of ADMISSION_INPUT_PINS){
    const s=inputUtf8[p.path];must(typeof s==='string'&&hash(s)===p.sha256,'immutable source/review input '+p.path);
    must(createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')===p.git_blob,'immutable Git blob '+p.path);
  }
  const js=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,JSON.parse(inputUtf8[p])]));
  const by=Object.fromEntries(Object.entries(js).map(([k,q])=>[k,new Map(q.records.map(e=>[e.id,e]))]));
  const labels=js.labels;
  must(labels.records.length===41&&by.labels.size===41&&labels.existing_label_holds===41&&labels.combined_role_holds===78&&labels.accepted_gold_rows===0&&labels.accepted_role_rows===0&&labels.remaining_stable_allowance===null,'prior unaccepted label/role and allocation HOLDs');
  must(js.cards.records.length===9&&by.cards.size===9&&js.cards.accepted===0&&js.cards.clearance===0&&js.cards.remaining_allowance===null,'nine unaccepted specific cards');
  const catalog=inputUtf8[catalogPath],topicIDs=[...catalog.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(x=>x[1]);
  must(topicIDs.length===144&&new Set(topicIDs).size===144,'full144 original Catalog');
  const packetPaths=[...new Set(labels.records.map(e=>e.source_path))];must(packetPaths.length===14,'fourteen existing original TRAIN packets');
  const packets=new Map(packetPaths.map(p=>[p,JSON.parse(inputUtf8[p])]));
  const records=labels.records.map(label=>{
    const {id,source_path,original_pins:p}=label,packet=packets.get(source_path),row=packet?.rows.find(e=>e.id===id),known=by.known.get(id);
    must(row&&known?.label_hold===true&&label.accepted_gold===false&&label.accepted_roles===false,'actual original disputed row with no acceptance');
    must(hash(inputUtf8[source_path])===p.source_packet_sha256&&hash(row.input.current)===p.current_sha256&&fingerprint(row.input)===p.bundle_sha256&&fingerprint(row.provisional_gold)===p.gold_sha256&&fingerprint(row.spans)===p.spans_sha256,'exact original current/context/gold/role evidence');
    must(row.independent_reviewer_count===0&&row.independent_quota_credit===0,'writer source has no independent quota');
    const references=Object.fromEntries(Object.entries(paths).map(([k,path])=>{
      const e=by[k].get(id);return [k,e?{path,journal_sha256:hash(inputUtf8[path]),record_sha256:fingerprint(e),accepted_as_semantic_evidence:false}:null];
    }));
    return {id,source_path,source_packet_sha256:p.source_packet_sha256,
      original_current_sha256:p.current_sha256,original_context_sha256:fingerprint({title:row.input.title,recent:row.input.recent}),original_bundle_sha256:p.bundle_sha256,original_gold_sha256:p.gold_sha256,original_spans_sha256:p.spans_sha256,original_role_spans:row.spans,original_factors_sha256:fingerprint(row.factors),catalog_sha256:hash(catalog),
      proposed_label_disposition:label.writer_decision,original_provisional_gold:row.provisional_gold,review_references:references,
      writer_id:row.writer_id,writer_cohort:row.writer_cohort,source_family:row.source_family,source_id:row.source_id,scenario_id:row.scenario_id,lineage:row.lineage,source_status:row.source_status,label_status:row.label_status,
      original_independent_reviewers:row.independent_reviewer_count,original_independent_quota_credit:row.independent_quota_credit,source_license:packet.source_license,source_license_not_independent_review_receipt:true,
      known_writer_label_hold:known.label_hold,known_writer_role_hold:known.role_hold,role_truth_and_acceptance:'NOT_ESTABLISHED_BY_WRITER_METADATA_OR_TEST_PASS',label_truth_and_acceptance:'NOT_ESTABLISHED_BY_WRITER_PREFERENCE_OR_TEST_PASS',
      qualified_data_admission:false,development_compilation_admission:false,
      qualification_blockers:['LABEL_QUALIFICATION_HOLD_RETAINED','ROLE_ACCEPTANCE_NOT_EVIDENCED','INDEPENDENT_SOURCE_REVIEW_NOT_PROVISIONED','WRITER_SOURCE_SCENARIO_LINEAGE_NOT_INDEPENDENTLY_QUALIFIED'],
      development_compilation_blockers:['EXPLICIT_UNACCEPTED_LABEL_REVIEW_REQUIRES_TRACEABLE_DISPOSITION','ROLE_ACCEPTANCE_NOT_EVIDENCED'],
      accepted:false,independent_quota_credit:0,candidate_predictions:0,compiled_features:0,index_bytes_created:0};
  });
  must(records.filter(e=>e.review_references.cards).length===9&&records.filter(e=>e.review_references.older).length===3&&records.filter(e=>e.review_references.frames).length===0,'actual row-specific review links; no blanket role/frame coverage claim');
  return {schema:'ZMR-REVIEW-AWARE-TRAIN-ADMISSION-1',status:'VERSIONED_SEMANTIC_FREE_ADMISSION_MANIFEST_EXISTING41_BLOCKED',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    source_main:'043bb1b2396e7ff9dc63eea641c9a63c75017952',source_tree:'105f43076af4c6b78b8582fcf43db5081712bc7c',publication_dependency_pr:253,publication_dependency_head:'8a9b0d1405b1016268cdebd8aafb7f136778a38e',dependency_card_batch_actual_main_verified:true,dependency_actual_main_ci:REGISTERED_DEPENDENCY_CI,batch_id:'ZMR-TRAIN-REVIEW-AWARE-ADMISSION41-20261003',compiler_admission:'BLOCKED_EXISTING41_LABEL_ROLE_REVIEWS_NOT_COMPILER_INPUT',
    full_catalog_topic_ids:topicIDs,full_catalog_sha256:hash(catalog),input_pins:ADMISSION_INPUT_PINS,
    finite_disputed_rows:41,qualified_admitted_rows:0,development_compile_admitted_rows:0,label_qualification_holds:41,role_qualification_holds_global:78,
    data_admission_and_candidate_budget_are_separate:true,candidate_budget:{history_complete:false,history_reconciled:false,stable_configuration_allowance_remaining:null,stable_comparison:'HOLD_PENDING_ACCOUNTING_RECONCILIATION'},
    missing_independence_freezes_only_qualification:true,original_data_not_mutated:true,formal_catalog_not_mutated:true,no_topic_mask:true,
    new_samples:0,predictions:0,semantic_evaluations:0,stable_allocations:0,fitted_features:0,index_bytes_created:0,compiler_executed:false,accepted:0,independent_quota_credit:0,semantic_judgment_certified:false,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false,
    stop_rule:'FINITE41_TRACEABLE_SOURCE_REVIEW_LINEAGE_AND_BLOCK_REASONS_NO_FITTING_PREDICTION_OR_TOPIC_MASK',records,records_sha256:fingerprint(records)};
}

export function auditReviewAwareTrainAdmission({manifest,inputUtf8}) {
  const actual=buildReviewAwareTrainAdmission({inputUtf8});
  must(canonicalJSON(manifest)===canonicalJSON(actual),'manifest must exactly derive from original source and unaccepted review metadata');
  return {classification:'ENGINEERING_TRACEABILITY_NOT_SEMANTIC_LABEL_OR_ROLE_TRUTH',evidence_class:actual.evidence_class,disputed_rows:41,original_packets:14,full_catalog_topics:144,specific_card_links:9,older_role_proposal_links:3,request_frame_links:0,
    qualified_admitted:0,development_compile_admitted:0,label_qualification_holds:41,role_qualification_holds_global:78,accepted:0,independent_quota_credit:0,predictions:0,fitted_features:0,stable_allocations:0,remaining_allowance:null,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',semantic_judgment_certified:false};
}
