/** Registered writer card/source audit; neither a semantic judge nor Router rule. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
const must=(b,m)=>{if(!b)throw new Error(m);};
const hash=s=>createHash('sha256').update(s).digest('hex');
const same=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
// These generated pins freeze evidence identity, not label or grammatical truth.
export const LABEL_CARD_INPUT_PINS=Object.freeze([
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
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_part4_v0.1.json",
    "sha256": "7a7d4f5dfa54c4fca7d22e162ca4562a25c8c5ef0cd6c9b38d6f43a75a406fbd",
    "git_blob": "217f75acb88e84cc0837ad3ff3ca7533396daf8e"
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
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_seed_v0.1.json",
    "sha256": "4377ecd423c38bbf4755113fffc844eb71f0e285901f921bd039d398573a0080",
    "git_blob": "157e08af47967e63a98d701274d7f25004e03f75"
  },
  {
    "path": "data/zero_model_refoundation/development/mechanism_matrix_train_label_proposals_v0.1.json",
    "sha256": "ea076defbd3ab2fe679565ba2eb38a9c4d42fee5811bf05ce242168e10ccdd63",
    "git_blob": "2b47a5c0b4bd0dde33fbf661d31998576030b85c"
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
const REGISTERED_RECORDS_SHA256='c406b8e979d1bd88bb02d2a78377787f84596e04f7afcadda0d36dbb037f185e';
const parentPath='data/zero_model_refoundation/development/mechanism_matrix_train_label_proposals_v0.1.json';
const catalogPath='catalog/system_topic_catalog_v0.2.yaml';

export function auditWriterLabelReviewCards({journal:q,inputUtf8}) {
  must(q?.schema==='ZMR-WRITER-LABEL-REVIEW-CARDS-1'&&q.status==='VERSIONED_WRITER_REVIEW_CARDS_RECORDED_ALL_QUALIFICATION_HOLDS_RETAINED'&&q.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','writer card schema/evidence');
  must(q.source_main==='d926bf81c5c97d6e3e2678deda50e5d86f293f48'&&q.source_tree==='9744860cbe44bb47d9b281fe70e970c56d447a3c'&&q.publication_dependency_pr===252&&q.publication_dependency_head==='51f52299a76c556226df68d7f5d20b3a7c6a1d22'&&q.batch_id==='ZMR-TRAIN-LABEL9-REVIEW-CARDS-20261003','registered provenance');
  must(q.dependency_actual_main_verified===true&&(q.dependency_actual_main_ci==='PENDING'||/^SUCCESS_ATTEMPT1_SEMANTIC[0-9]+_ZMR[0-9]+$/.test(q.dependency_actual_main_ci)),'explicit actual-main dependency; pending is not integration PASS');
  must(same(q.input_pins,LABEL_CARD_INPUT_PINS),'immutable input manifest');
  must(inputUtf8&&Object.keys(inputUtf8).length===10&&Object.keys(inputUtf8).every(p=>LABEL_CARD_INPUT_PINS.some(pin=>pin.path===p)),'explicit immutable source scope');
  for(const p of LABEL_CARD_INPUT_PINS){
    const s=inputUtf8[p.path];must(typeof s==='string'&&hash(s)===p.sha256,'immutable input bytes: '+p.path);
    must(createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')===p.git_blob,'immutable Git blob: '+p.path);
  }
  must(q.parent_journal_path===parentPath&&q.parent_journal_sha256===hash(inputUtf8[parentPath]),'immutable parent proposal journal');
  const parent=JSON.parse(inputUtf8[parentPath]),held=parent.records.filter(e=>e.writer_decision==='HOLD');
  must(parent.records.length===41&&held.length===9&&parent.existing_label_holds===41&&parent.combined_role_holds===78&&parent.accepted_gold_rows===0&&parent.accepted_role_rows===0&&parent.remaining_stable_allowance===null,'all prior41/78 qualification HOLDs retained');
  const byID=new Map(held.map(e=>[e.id,e]));
  const catalog=inputUtf8[catalogPath],ids=[...catalog.matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);
  must(ids.length===144&&new Set(ids).size===144,'full144 Catalog');
  const sourcePins=LABEL_CARD_INPUT_PINS.filter(p=>p.path.includes('_train_')&&p.path!==parentPath);
  must(sourcePins.length===7,'finite seven original TRAIN packets');
  const sources=new Map(sourcePins.map(p=>[p.path,JSON.parse(inputUtf8[p.path])]));
  must(q.finite_cards===9&&Array.isArray(q.records)&&q.records.length===9&&new Set(q.records.map(e=>e.id)).size===9,'exactly nine unique existing semantic HOLDs');
  must(q.records_sha256===hash(canonicalJSON(q.records))&&q.records_sha256===REGISTERED_RECORDS_SHA256,'immutable registered writer cards, not semantic certification');
  const cards=new Set();let spans=0;
  for(const e of q.records){
    const p=byID.get(e.id);must(p,'only existing specific semantic HOLD rows');
    must(e.parent_record_sha256===hash(canonicalJSON(p))&&same(e.original_pins,p.original_pins)&&e.source_path===p.source_path,'parent/source linkage');
    const row=sources.get(e.source_path)?.rows.find(r=>r.id===e.id);must(row,'actual original row');
    must(hash(inputUtf8[e.source_path])===e.original_pins.source_packet_sha256&&hash(row.input.current)===e.original_pins.current_sha256&&hash(canonicalJSON(row.input))===e.original_pins.bundle_sha256&&hash(canonicalJSON(row.provisional_gold))===e.original_pins.gold_sha256&&hash(canonicalJSON(row.spans))===e.original_pins.spans_sha256,'original input/gold/spans fingerprints');
    must(same(e.original_input,row.input)&&same(e.original_gold,row.provisional_gold)&&same(e.original_spans,row.spans),'original current/title/recent/gold/roles/qualifiers not rewritten');
    must(same(e.competing_topic_ids,p.competing_label_hypotheses)&&same(e.actual_formal_cards,p.catalog_boundary_evidence)&&same(e.current_goal_evidence,p.current_goal_evidence),'prior actual full formal cards and goal evidence');
    must(e.competing_topic_ids.length===2&&e.competing_topic_ids.every(id=>ids.includes(id)),'two competing current interpretations, not guessed union gold');
    for(const id of e.competing_topic_ids){const text=e.actual_formal_cards[id];must(catalog.includes(text)&&text.startsWith('  - topic_id: '+id+'\n')&&text.includes('boundary_status: PROVISIONAL'),'actual formal PROVISIONAL card');cards.add(id);}
    for(const s of e.current_goal_evidence){
      const t=s.field==='current'?row.input.current:/^recent:[0-7]$/.test(s.field)?row.input.recent[Number(s.field.slice(7))]:null;
      must(typeof t==='string'&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=t.length&&t.slice(s.start,s.end)===s.text,'exact prior current/recent UTF16 evidence');
      for(const n of [s.start,s.end])must(!(n>0&&n<t.length&&/[\uD800-\uDBFF]/.test(t[n-1])&&/[\uDC00-\uDFFF]/.test(t[n])),'UTF16 scalar boundary');spans++;
    }
    must(typeof e.current_matter==='string'&&e.current_matter.length>=20&&e.interpretations?.length===2&&e.interpretations.every(s=>typeof s==='string'&&s.length>=20)&&typeof e.missing==='string'&&e.missing.length>=30,'individual writer reasoning and missing distinction');
    must(e.non_discriminators?.length===3&&e.non_discriminators.every(s=>typeof s==='string'&&s.length>=12),'known non-discriminating constraints retained');
    must(typeof e.review_exit_condition==='string'&&e.review_exit_condition.includes(e.id)&&e.review_exit_condition.length>=80&&typeof e.no_expansion_stop_condition==='string'&&e.no_expansion_stop_condition.includes(e.id)&&e.no_expansion_stop_condition.length>=80,'individual finite stop conditions');
    must(e.provisional_hypothesis_status==='REVERSIBLE_WRITER_REVIEW_HYPOTHESES_NOT_FORMAL_BOUNDARY_OR_RUNTIME_RULE'&&e.outcome==='SPECIFIC_LABEL_IDENTIFIABILITY_HOLD'&&e.proposed_gold===null,'writer hypotheses retain specific semantic HOLD');
    for(const k of ['formal_boundary_changed','accepted_gold','accepted_roles','independent','qualification_hold_cleared'])must(e[k]===false,'no formal rewrite/acceptance/independent claim/clearance');
    for(const k of ['source_input_revisions','independent_quota_credit','candidate_predictions','semantic_evaluations','new_stable_allocations'])must(e[k]===0,'no source mutation/exposure/allocation');
    for(const k of ['runtime_output','compiled_role_slots','accepted_topic_ids','resolver_rule','automatic_state_change'])must(!Object.hasOwn(e,k),'review cards cannot supply runtime rules or accepted gold');
  }
  must(cards.size===13&&spans===9,'finite thirteen formal cards and nine evidence spans');
  must(q.original_inputs_gold_spans_preserved===true&&q.all41_label_qualification_holds_retained===true&&q.all78_role_qualification_holds_retained===true,'qualification/source protections');
  for(const k of ['independent_reviewers','accepted','clearance','new_samples','predictions','semantic_evaluations','allocations'])must(q[k]===0,'no acceptance/exposure or budget fabrication');
  must(q.remaining_allowance===null&&q.formal_catalog_mutation===false&&q.semantic_judgment_certified===false&&q.saturation_ceiling_claim===false&&q.compiler_admission==='HOLD_UNACCEPTED_LABELS_ROLES_AND_ACCOUNTING'&&q.data_qualification==='NOT_QUALIFIED'&&q.capability_verdict==='UNTESTED'&&q.resource_verdict==='NOT_QUALIFIED','unchanged compiler and qualification HOLD');
  must(q.stop_rule==='FINITE_NINE_EXISTING_SEMANTIC_HOLDS_NO_NEW_ROWS_PREDICTIONS_OR_FORMAL_BOUNDARY_MUTATION','finite scope/stop rule');
  return {
    schema:'ZMR-WRITER-LABEL-REVIEW-CARDS-AUDIT-1',classification:'ENGINEERING_IMMUTABLE_WRITER_CARDS_NOT_SEMANTIC_BOUNDARY_OR_LABEL_TRUTH',evidence_class:q.evidence_class,
    cards:9,actual_source_packets:7,full_catalog_topics:144,actual_formal_provisional_cards:13,exact_utf16_goal_spans:9,writer_interpretations:18,known_non_discriminators:27,
    specific_semantic_holds_retained:9,label_qualification_holds_retained:41,role_qualification_holds_retained:78,new_samples:0,accepted:0,clearance:0,independent_reviewers:0,independent_quota_credit:0,
    predictions:0,semantic_evaluations:0,allocations:0,remaining_allowance:null,semantic_judgment_certified:false,formal_catalog_mutation:false,compiler_admission:q.compiler_admission,data_qualification:q.data_qualification,capability_verdict:q.capability_verdict,resource_verdict:q.resource_verdict,saturation_ceiling_claim:false
  };
}
