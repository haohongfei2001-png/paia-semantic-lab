/** Immutable writer proposal audit. Never chooses runtime Topics or certifies labels. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const hash=text=>createHash('sha256').update(text).digest('hex');
const same=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
// Generated pins freeze already read public writer evidence, not semantic truth.
export const LABEL_PROPOSAL_INPUT_PINS=Object.freeze([
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
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json",
    "sha256": "4377ecd423c38bbf4755113fffc844eb71f0e285901f921bd039d398573a0080",
    "git_blob": "157e08af47967e63a98d701274d7f25004e03f75"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json",
    "sha256": "b900e24967181e07f8fbe8483e0d9d47b4a826ed6f2496aa9bc3bb8169522b8d",
    "git_blob": "20f06d84001980cded9b20d67ee005925c4039b7"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_request_frames_v0.1.json",
    "sha256": "59684ff38c36b4dc6fe888ac606933323591c37d8e68a78952443f0adf5db543",
    "git_blob": "5bb3b861308ee81826f2ac1d7e642c7db73ee19e"
  },
  {
    "path": "catalog/system_topic_catalog_v0.2.yaml",
    "sha256": "29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18",
    "git_blob": "6bcdd2af66879d7ac098cf237b5586c3c9818aad"
  },
  {
    "path": "docs/zero-model-refoundation-v1/ZMR-01B_ANNOTATION_GUIDELINE.md",
    "sha256": "250df34d1b3cfe8f08cfaf6612ae32058f7f9e2b585864e8301a22888dcb4660",
    "git_blob": "7d3cbc929c05cf6f935c08a4a8b49d2eddd30ca0"
  }
].map(p=>Object.freeze(p)));
const REGISTERED_RECORDS_SHA256='dd9ab98f280a518ba010d072fe76662f4daa30b3b7bca4c58515f0bab1ff9e8b';
const priorPath='data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json';
const framePath='data/zero_model_refoundation/development/mechanism_matrix_train_request_frames_v0.1.json';
const catalogPath='catalog/system_topic_catalog_v0.2.yaml';

export function auditWriterLabelProposals({journal:q,inputUtf8}) {
  must(q?.schema==='ZMR-WRITER-LABEL-PROPOSALS-1'&&q.status==='VERSIONED_WRITER_LABEL_PROPOSALS_RECORDED_QUALIFICATION_HOLD_RETAINED','writer proposal schema/status');
  must(q.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','writer evidence class');
  must(q.source_main==='a99cc98aaf9c2b0f3103270bbb5cac7a9014b2b3'&&q.source_tree==='94e49e6a6c5176e70e727ff4f3133a6107573fe0'&&q.publication_dependency_pr===251&&q.publication_dependency_head==='f46c52bb6846399b7488a07bb600af6e6a415fa5'&&q.batch_id==='ZMR-TRAIN-LABEL41-PROPOSALS-20261003','registered provenance');
  must(q.dependency_actual_main_verified===true&&(q.dependency_actual_main_ci==='PENDING'||/^SUCCESS_ATTEMPT1_SEMANTIC[0-9]+_ZMR[0-9]+$/.test(q.dependency_actual_main_ci)),'explicit integration dependency; pending is not PASS');
  must(same(q.input_pins,LABEL_PROPOSAL_INPUT_PINS),'immutable input manifest');
  must(inputUtf8&&Object.keys(inputUtf8).length===18&&Object.keys(inputUtf8).every(p=>LABEL_PROPOSAL_INPUT_PINS.some(pin=>pin.path===p)),'explicit immutable input scope');
  for(const p of LABEL_PROPOSAL_INPUT_PINS){
    const bytes=inputUtf8[p.path];
    must(typeof bytes==='string'&&hash(bytes)===p.sha256,'immutable input bytes: '+p.path);
    const blob=createHash('sha1').update('blob '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
    must(blob===p.git_blob,'immutable Git blob: '+p.path);
  }
  const catalog=inputUtf8[catalogPath],ids=[...catalog.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);
  must(ids.length===144&&new Set(ids).size===144&&q.catalog_git_blob===LABEL_PROPOSAL_INPUT_PINS.find(p=>p.path===catalogPath).git_blob,'full144 Catalog identity');
  const prior=JSON.parse(inputUtf8[priorPath]),held=prior.records.filter(e=>e.label_hold===true);
  must(prior.records.length===72&&held.length===41&&prior.label_holds===41,'immutable41 prior label HOLD census');
  const byID=new Map(held.map(e=>[e.id,e]));
  const frames=JSON.parse(inputUtf8[framePath]);
  must(frames.records.length===19&&frames.accepted_role_rows===0&&frames.accepted_gold_rows===0&&frames.combined_writer_role_holds===78&&frames.label_holds===41&&frames.remaining_stable_allowance===null,'unaccepted frame and role HOLD dependency');
  const sourcePins=LABEL_PROPOSAL_INPUT_PINS.filter(p=>p.path.includes('_train_')&&p.path!==priorPath&&p.path!==framePath);
  must(sourcePins.length===14,'bounded14 original TRAIN packets');
  const sources=new Map(sourcePins.map(p=>[p.path,JSON.parse(inputUtf8[p.path])]));
  must(Array.isArray(q.records)&&q.records.length===41&&new Set(q.records.map(e=>e.id)).size===41,'complete unique41 writer decisions');
  must(q.records_sha256===hash(canonicalJSON(q.records))&&q.records_sha256===REGISTERED_RECORDS_SHA256,'immutable registered writer decisions; not semantic certification');
  let spans=0;const cards=new Set(),counts={};
  for(const e of q.records){
    const p=byID.get(e.id);must(p,'only existing registered label HOLDs');
    must(same(e.original_pins,p.original_pins)&&e.prior_hold_record_sha256===hash(canonicalJSON(p)),'prior immutable disposition');
    const row=sources.get(e.source_path)?.rows.find(r=>r.id===e.id);
    must(row&&e.source_path===e.original_pins.source_path,'actual original row');
    must(hash(inputUtf8[e.source_path])===e.original_pins.source_packet_sha256,'original source packet');
    must(hash(row.input.current)===e.original_pins.current_sha256&&hash(canonicalJSON(row.input))===e.original_pins.bundle_sha256&&hash(canonicalJSON(row.provisional_gold))===e.original_pins.gold_sha256&&hash(canonicalJSON(row.spans))===e.original_pins.spans_sha256,'original current/title/recent/gold/spans preserved');
    must(same(e.original_gold,row.provisional_gold)&&same(e.competing_label_hypotheses,p.competing_label_hypotheses),'original gold and competing interpretations unchanged');
    must(same(Object.keys(e.catalog_boundary_evidence).sort(),[...e.competing_label_hypotheses].sort()),'exact competing formal boundary cards');
    for(const id of e.competing_label_hypotheses){
      const text=e.catalog_boundary_evidence[id];
      must(ids.includes(id)&&typeof text==='string'&&catalog.includes(text)&&text.startsWith('  - topic_id: '+id+'\n')&&text.includes('boundary_status: PROVISIONAL'),'actual full formal PROVISIONAL card');
      cards.add(id);
    }
    must(['ORIGINAL','ALTERNATIVE','MULTI','HOLD'].includes(e.writer_decision),'registered writer preference or specific HOLD');
    counts[e.writer_decision]=(counts[e.writer_decision]??0)+1;
    if(e.writer_decision==='HOLD')must(e.proposed_gold===null,'specific HOLD cannot carry proposed union gold');
    else {
      const g=e.proposed_gold;
      must(g?.expected_state==='ASSIGNED'&&Array.isArray(g.topics)&&g.topics.length>0&&new Set(g.topics).size===g.topics.length&&g.topics.every(id=>ids.includes(id)&&e.competing_label_hypotheses.includes(id)),'known-universe unaccepted preference');
      must(same(g.excluded_topics,row.provisional_gold.excluded_topics)&&g.topics.every(id=>!g.excluded_topics.includes(id)),'original exclusions retained');
      if(e.writer_decision==='ORIGINAL')must(same(g.topics,row.provisional_gold.topics),'original preference remains original gold');
      if(e.writer_decision==='MULTI')must(g.topics.length===2&&e.current_goal_evidence.length===3,'registered unaccepted two-task interpretation, not automatic multi truth');
    }
    must(Array.isArray(e.current_goal_evidence)&&e.current_goal_evidence.length>0&&e.current_goal_evidence.some(s=>s.field==='current'),'actual current goal evidence');
    for(const s of e.current_goal_evidence){
      must(s.field==='current'||/^recent:[0-7]$/.test(s.field),'explicit current/recent source field');
      const text=s.field==='current'?row.input.current:row.input.recent[Number(s.field.slice(7))];
      must(typeof text==='string'&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=text.length&&text.slice(s.start,s.end)===s.text,'exact original UTF16 evidence');
      for(const n of [s.start,s.end])must(!(n>0&&n<text.length&&/[\uD800-\uDBFF]/.test(text[n-1])&&/[\uDC00-\uDFFF]/.test(text[n])),'UTF16 scalar boundary');
      spans++;
    }
    must(typeof e.writer_reason==='string'&&e.writer_reason.length>=45&&e.release_conditions?.length===2&&e.release_conditions.every(s=>typeof s==='string'&&s.includes(e.id)&&s.length>=80),'individual semantic rationale and release conditions');
    for(const k of ['accepted_gold','accepted_roles','independent','formal_pairwise_boundary_resolved'])must(e[k]===false,'no label/role acceptance or fabricated independence');
    must(e.label_hold_retained===true&&e.role_holds_preserved===true&&e.reviewer_id==='candidate-writer','all original qualification HOLDs retained');
    for(const k of ['independent_quota_credit','source_input_revisions','candidate_predictions','new_stable_allocations'])must(e[k]===0,'no clearance/source mutation/exposure/allocation');
    for(const k of ['runtime_output','compiled_role_slots','accepted_topic_ids','automatic_state_change'])must(!Object.hasOwn(e,k),'review sidecar cannot supply runtime or accepted gold');
  }
  must(spans===43&&cards.size===43&&same(counts,{ORIGINAL:26,ALTERNATIVE:5,MULTI:1,HOLD:9})&&same(q.decision_counts,counts),'complete finite writer proposal census');
  for(const k of ['accepted_gold_rows','accepted_role_rows','independent_reviewers','independent_quota_credit','qualification_holds_cleared','new_samples','candidate_predictions','semantic_evaluations','new_stable_allocations'])must(q[k]===0,'no acceptance or budget/exposure fabrication');
  must(q.existing_label_holds===41&&q.combined_role_holds===78&&q.old_unaccepted_span_proposals===27&&q.old_unaccepted_request_frames===19&&q.older_unaccepted_role_proposals===5&&q.writer_read_contexts===41&&q.catalog_cards_read===43&&q.writer_decisions===41,'prior review counts retained');
  must(q.remaining_stable_allowance===null&&q.formal_catalog_mutation===false&&q.semantic_judgment_certified===false&&q.saturation_ceiling_claim===false&&q.original_inputs_gold_spans_factors_preserved===true,'no semantic/ceiling/budget claim');
  must(q.compiler_admission==='HOLD_UNACCEPTED_LABELS_ROLES_AND_ACCOUNTING'&&q.data_qualification==='NOT_QUALIFIED'&&q.capability_verdict==='UNTESTED'&&q.resource_verdict==='NOT_QUALIFIED','qualification and compiler HOLD');
  must(q.stop_rule==='FINITE_EXISTING_41_LABEL_DISPUTES_NO_NEW_ROWS_OR_PREDICTIONS; writer completeness does not clear qualification HOLD or enter stable comparison','bounded stop rule');
  return {
    schema:'ZMR-WRITER-LABEL-PROPOSALS-AUDIT-1',classification:'ENGINEERING_IMMUTABLE_WRITER_PROPOSALS_NOT_LABEL_ROLE_OR_CAPABILITY_TRUTH',
    evidence_class:q.evidence_class,writer_decisions:41,actual_source_packets:14,full_catalog_topics:144,formal_provisional_cards:43,
    exact_utf16_evidence_spans:spans,original_preferences:26,alternative_preferences:5,unaccepted_multi_interpretations:1,specific_writer_label_holds:9,
    label_qualification_holds_retained:41,role_qualification_holds_retained:78,unaccepted_full_span_proposals_preserved:27,unaccepted_request_frames_preserved:19,older_role_proposals_preserved:5,
    new_samples:0,accepted_gold_rows:0,accepted_role_rows:0,independent_quota_credit:0,qualification_holds_cleared:0,candidate_predictions:0,semantic_evaluations:0,new_stable_allocations:0,
    remaining_stable_allowance:null,semantic_judgment_certified:false,compiler_admission:q.compiler_admission,data_qualification:q.data_qualification,capability_verdict:q.capability_verdict,resource_verdict:q.resource_verdict,saturation_ceiling_claim:false
  };
}
