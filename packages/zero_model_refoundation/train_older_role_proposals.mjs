/** Bounded audit of unaccepted writer proposals;no Router,role truth or qualification. */
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const hash=s=>createHash('sha256').update(s).digest('hex');
export const OLDER_PROPOSAL_INPUT_PINS=Object.freeze([
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
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_older_role_dispositions_v0.1.json",
  "sha256": "9077a962d7246c1711ca3f7239deb856cc6e9d1515bf086e847acb32dc651d8c",
  "git_blob": "9476d784d76c458f8ae7b93d2a53306e5a2fc363"
 },
 {
  "path": "data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json",
  "sha256": "b900e24967181e07f8fbe8483e0d9d47b4a826ed6f2496aa9bc3bb8169522b8d",
  "git_blob": "20f06d84001980cded9b20d67ee005925c4039b7"
 },
 {
  "path": "catalog/system_topic_catalog_v0.2.yaml",
  "sha256": "29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18",
  "git_blob": "6bcdd2af66879d7ac098cf237b5586c3c9818aad"
 }
].map(p=>Object.freeze(p)));
const OLDER_PROPOSAL_EXPECTATIONS=Object.freeze(Object.fromEntries(Object.entries({
 "ZMR-MATRIX-TRAIN-SEED-004": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "75740d336682bf7f6b978737441c3fcd4b4601373465e879ca1038954f1224ba"
 },
 "ZMR-MATRIX-TRAIN-SEED-005": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-SEED-008": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "886596d9526ee5db2f399dbe266c8f8da6ff9687c89d6969d4c39d8da1f9bc3f"
 },
 "ZMR-MATRIX-TRAIN-SEED-010": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "9cc06fd40b111be9ee13001ec0f9b412bae7e130b3f8edd356f70effb71ecef8"
 },
 "ZMR-MATRIX-TRAIN-SEED-020": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-SEED-028": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "053861ae802b2873bc68267cb90a1b0664fc3f68b3f1d19b253581b1792cd91b"
 },
 "ZMR-MATRIX-TRAIN-SEED-029": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "d4f83eb68f5f8fb077b7b8f7aeeff6ed57b007f071adfa45fbbdda56ed777a78"
 },
 "ZMR-MATRIX-TRAIN-SEED-034": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "e5691ac18d0b087422b146d72cfead17b7d6ee3f5cc7724656d17382587c1981"
 },
 "ZMR-MATRIX-TRAIN-SEED-035": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-SEED-036": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-SEED-037": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "0d7ef2f71237e678490e7d131638b06a06819c4a66e858c7760ff26fcf724b41"
 },
 "ZMR-MATRIX-TRAIN-SEED-041": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-SEED-050": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART2-004": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART2-011": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "da579f32ef85d00b8d2ac6fc52f0778da57af32b9e6b5ed262fe2a1ff10801f9"
 },
 "ZMR-MATRIX-TRAIN-PART2-019": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART2-025": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "612cb4acee55ad54eff73667481d1280df367922f8352f17a21a1c0cff798cc7"
 },
 "ZMR-MATRIX-TRAIN-PART2-026": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "102689dcd215b705c064d7106a8729a3f1620fca9a1f710597a305523e7cf82a"
 },
 "ZMR-MATRIX-TRAIN-PART2-034": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART2-041": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "57898626d1cb71fc4f422d7408423d936cb2aaa0fc6974fd4828d40e58f76a6e"
 },
 "ZMR-MATRIX-TRAIN-PART2-042": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART2-047": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART2-049": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART3-002": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "13c0fcdf387645c6996d673aa365354239371bbc788c369e91991ab058e6d026"
 },
 "ZMR-MATRIX-TRAIN-PART3-009": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART3-016": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "48ecbff9ca0efff1ebe9d7466c7eb141a024a83432a66dfd67f66952742c9848"
 },
 "ZMR-MATRIX-TRAIN-PART3-020": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "69f8c50801c83fc8aca2d9235ad710ac8b8734d8f2133f7ff05445d7275657ce"
 },
 "ZMR-MATRIX-TRAIN-PART3-052": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "fb07991dcc7b8faf9efab232c953d2ad7734e0117c5256c51184dfb7e1c20e36"
 },
 "ZMR-MATRIX-TRAIN-PART3-054": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "c851e7a991c4c27736a0980585f6158378c46945eb34b068dec287ee7eb23b17"
 },
 "ZMR-MATRIX-TRAIN-PART4-011": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "11669f1f36521d89b66e2b93430b00e404a96f6cf73ef8721e86e077ed290719"
 },
 "ZMR-MATRIX-TRAIN-PART4-014": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "e0bc53baa2c5d2e71ddb21145a4d5d03d9004303c760625415a91bed998b7afd"
 },
 "ZMR-MATRIX-TRAIN-PART4-016": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "13112b5e32708dbd118d7a8dcf7e891461e35db99d63609da75c7eb7a15bf091"
 },
 "ZMR-MATRIX-TRAIN-PART4-020": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART4-029": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "ba0b1fbd4c2bea4499f48574f992953d76ab22974c82d4c4918b619aa4286cff"
 },
 "ZMR-MATRIX-TRAIN-PART4-044": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "8536da0093484ff0bb7cb6356c2fb8cd1ce49e84f1e5a214279a2d04d5a9fb77"
 },
 "ZMR-MATRIX-TRAIN-PART4-050": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART5-012": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART5-034": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "5e153821f9ae40a6a58e760ba7ef1b801e343c5394e36d1d838a236f1854a2e3"
 },
 "ZMR-MATRIX-TRAIN-PART5-035": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "893f5fda67ceea95340b2373906c7592317b076a511437ad3d5c47de76d32b48"
 },
 "ZMR-MATRIX-TRAIN-PART5-051": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "3212b6f936e57d748173e7823c243cdaa829e8e5326731c57a6a941e914f33eb"
 },
 "ZMR-MATRIX-TRAIN-PART6-002": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "86881f8e8af3306c4bce826819b56ddfd9776e2785dfcb7f0587ed883273f98c"
 },
 "ZMR-MATRIX-TRAIN-PART6-008": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART6-017": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "72a4c990123134672aa47700ef5ab55b5a331c56a903b468d11288615cbeffda"
 },
 "ZMR-MATRIX-TRAIN-PART6-038": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 },
 "ZMR-MATRIX-TRAIN-PART6-047": {
  "decision": "UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD",
  "spans_sha256": "11fab2e6f98d3a62b951553c6c56b812b4e1d1aa6a802b2b32ba84be86c630f9"
 },
 "ZMR-MATRIX-TRAIN-PART6-053": {
  "decision": "ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR",
  "spans_sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
 }
}).map(([k,v])=>[k,Object.freeze(v)])));
const journalPath='data/zero_model_refoundation/development/mechanism_matrix_train_older_role_dispositions_v0.1.json';
const knownPath='data/zero_model_refoundation/development/mechanism_matrix_train_hold_dispositions_v0.1.json';
const sourceMain='52e1f1a8a540f40bd1d696b611af62bf914aadc6',sourceTree='26457af1ef2bf8e2132a0b1ab3f1a9928b7f3486';
const boundary=(s,n)=>!(n>0&&n<s.length&&s.charCodeAt(n-1)>=0xD800&&s.charCodeAt(n-1)<=0xDBFF&&s.charCodeAt(n)>=0xDC00&&s.charCodeAt(n)<=0xDFFF);
export function auditOlderTrainRoleProposals({journal:q,inputUtf8}){
 must(q?.schema==='ZMR-OLDER-TRAIN-ROLE-PROPOSALS-1'&&q.status==='VERSIONED_WRITER_PROPOSALS_AND_POLICY_HOLDS_QUALIFICATION_HOLD_RETAINED'&&q.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE','writer evidence/schema');
 must(q.source_main===sourceMain&&q.source_tree===sourceTree&&q.publication_dependency_pr===249&&q.publication_dependency_head==='01ba17dd2f6162bfba0c82064e8a53dd74ebee5a','registered provenance');
 must(canonicalJSON(q.input_pins)===canonicalJSON(OLDER_PROPOSAL_INPUT_PINS)&&Object.keys(inputUtf8).length===9&&Object.keys(inputUtf8).every(p=>OLDER_PROPOSAL_INPUT_PINS.some(k=>k.path===p)),'explicit immutable input scope');
 for(const p of OLDER_PROPOSAL_INPUT_PINS){const b=inputUtf8[p.path];must(typeof b==='string'&&hash(b)===p.sha256,'immutable input bytes');must(createHash('sha1').update('blob '+Buffer.byteLength(b)+'\0').update(b).digest('hex')===p.git_blob,'immutable Git blob');}
 const prior=JSON.parse(inputUtf8[journalPath]),known=JSON.parse(inputUtf8[knownPath]),held=new Map(prior.records.filter(r=>r.role_review_disposition==='ROLE_IDENTIFIABILITY_HOLD').map(r=>[r.id,r]));
 must(prior.records.length===378&&held.size===46&&prior.writer_provisional_retains===332&&prior.combined_writer_role_holds===78&&prior.prior_known_label_holds===41&&prior.older_roles_without_writer_disposition===0&&prior.older_role_rows_independently_unqualified===378&&known.unique_held_rows===72&&known.unaccepted_role_proposals===5,'preserve prior disposition census');
 const topics=[...inputUtf8['catalog/system_topic_catalog_v0.2.yaml'].matchAll(/^  - topic_id: (sys\.[a-z_]+\.[a-z_]+)$/gm)].map(m=>m[1]);must(topics.length===144&&new Set(topics).size===144,'full144 Catalog');
 must(q.source_disposition_path===journalPath&&q.source_disposition_sha256===OLDER_PROPOSAL_INPUT_PINS.find(p=>p.path===journalPath).sha256&&q.writer_decisions===46&&q.actual_source_rows_read===46&&q.unaccepted_span_repair_proposals===27&&q.specific_role_policy_holds===19&&q.partial_occurrence_only_proposals===1&&q.combined_writer_role_holds===78&&q.prior_label_holds===41&&q.prior_known_unaccepted_proposals===5,'complete writer proposal coverage');
 for(const k of ['source_input_revisions','independent_reviewers','accepted_gold_rows','accepted_role_rows','independent_quota_credit','candidate_predictions','semantic_evaluations','new_stable_allocations','qualification_holds_cleared'])must(q[k]===0,'no acceptance/exposure/allocation');
 must(q.remaining_stable_allowance===null&&q.all_qualification_holds_retained===true&&q.semantic_judgment_certified===false&&q.data_qualification==='NOT_QUALIFIED'&&q.capability_verdict==='UNTESTED'&&q.resource_verdict==='NOT_QUALIFIED'&&q.saturation_ceiling_claim===false&&q.compiler_admission==='HOLD_UNACCEPTED_LABELS_ROLES_AND_ACCOUNTING','qualification/compiler/budget HOLD');
 must(Array.isArray(q.records)&&q.records.length===46&&new Set(q.records.map(r=>r.id)).size===46&&q.records_sha256===hash(canonicalJSON(q.records)),'complete unique record digest');
 const sources=new Map(OLDER_PROPOSAL_INPUT_PINS.filter(p=>p.path.includes('_train_')&&!p.path.includes('_dispositions_')).map(p=>[p.path,JSON.parse(inputUtf8[p.path])]));
 let proposals=0,policyHolds=0,partial=0,spanCount=0;
 for(const e of q.records){
  const old=held.get(e.id),expected=OLDER_PROPOSAL_EXPECTATIONS[e.id];must(old&&expected,'unknown proposal row');const row=sources.get(e.source_path)?.rows.find(r=>r.id===e.id);must(row&&topics.includes(row.topic_id),'original source row');
  must(e.source_path===old.source_path&&e.source_git_blob===old.source_git_blob&&e.prior_role_disposition_sha256===hash(canonicalJSON(old))&&e.prior_label_disposition===old.prior_label_disposition&&canonicalJSON(e.original_role_spans)===canonicalJSON(row.spans),'original prior/source/roles preserved');
  for(const [k,v]of [['current',row.input.current],['bundle',canonicalJSON(row.input)],['gold',canonicalJSON(row.provisional_gold)],['spans',canonicalJSON(row.spans)]])must(e['original_'+k+'_sha256']===old['original_'+k+'_sha256']&&e['original_'+k+'_sha256']===hash(v),'original source/gold/role fingerprints');
  must(e.reviewer_id==='candidate-writer'&&e.independent===false&&e.accepted_gold===false&&e.accepted_roles===false&&e.source_input_revisions===0&&e.candidate_predictions===0&&e.new_stable_allocations===0&&e.independent_quota_credit===0&&e.qualification_hold_retained===true&&e.automatic_hold_clearance===false&&e.proposal_revision===1&&e.offset_encoding==='UTF16_CODE_UNITS','no writer impersonation/overwrite/clearance');
  must(typeof e.writer_reason==='string'&&e.writer_reason.length>=30&&e.disposition===expected.decision&&hash(canonicalJSON(e.proposed_role_spans))===expected.spans_sha256,'registered individual writer proposal/hold');
  if(e.proposed_role_spans===null){must(e.disposition==='ROLE_POLICY_HOLD_NO_UNSPOKEN_OPERATOR','policy hold without fabricated operator');policyHolds++;}
  else{
   proposals++;must(e.disposition==='UNACCEPTED_SPAN_REPAIR_DRAFT_QUALIFICATION_HOLD'&&e.proposal_scope==='FOCUSED_CURRENT_REQUEST_WITH_INPUT_OUTPUT_METHOD_BACKGROUND_AND_QUOTE_LAYERS_PRESERVED'&&e.proposed_role_spans.some(s=>s.role==='ACTION')&&e.proposed_role_spans.some(s=>s.role==='OBJECT')&&e.proposed_role_spans.some(s=>s.role==='CURRENT_GOAL'),'registered proposed layers');
   for(const s of row.spans.filter(s=>!['ACTION','OBJECT'].includes(s.role)))must(e.proposed_role_spans.some(t=>canonicalJSON(t)===canonicalJSON(s)),'preserve original qualifiers and antecedents');
   for(const s of e.proposed_role_spans){const text=s.field==='current'?row.input.current:row.input.recent[Number(s.field.slice(7))];must(['ACTION','OBJECT','QUALIFIER','ANTECEDENT','CURRENT_GOAL','MEANS','BACKGROUND'].includes(s.role)&&typeof text==='string'&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=text.length&&boundary(text,s.start)&&boundary(text,s.end)&&text.slice(s.start,s.end)===s.text,'exact source UTF16 proposal span');spanCount++;}
  }
  if(e.id==='ZMR-MATRIX-TRAIN-PART6-053'){
   const p=e.partial_occurrence_only_proposal,at=row.input.current.indexOf('I need')+2;
   must(p?.accepted===false&&p.modality_policy_pending===true&&canonicalJSON(p.original_action)===canonicalJSON(row.spans.find(s=>s.role==='ACTION'))&&row.input.current.slice(21,26)==='needs'&&p.proposed_action.role==='ACTION'&&p.proposed_action.field==='current'&&p.proposed_action.start===at&&p.proposed_action.end===at+4&&p.proposed_action.text==='need'&&row.input.current.slice(at,at+4)==='need','current-demand occurrence remains modal-policy HOLD');partial++;
  }else must(!Object.hasOwn(e,'partial_occurrence_only_proposal'),'unregistered partial proposal');
 }
 must(proposals===27&&policyHolds===19&&partial===1&&spanCount===150,'complete bounded correction batch');
 return {schema:'ZMR-OLDER-TRAIN-ROLE-PROPOSALS-AUDIT-1',classification:'ENGINEERING_IMMUTABLE_WRITER_PROPOSAL_COMPLETENESS_ONLY',evidence_class:q.evidence_class,writer_decisions:46,actual_source_rows_read:46,unaccepted_span_repair_proposals:27,specific_role_policy_holds:19,partial_occurrence_only_proposals:1,exact_utf16_spans:150,combined_writer_role_holds:78,prior_label_holds:41,prior_known_unaccepted_proposals:5,original_source_gold_roles_preserved:true,accepted_gold_rows:0,accepted_role_rows:0,independent_quota_credit:0,qualification_holds_cleared:0,candidate_predictions:0,semantic_evaluations:0,new_stable_allocations:0,remaining_stable_allowance:null,semantic_judgment_certified:false,compiler_admission:q.compiler_admission,data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false};
}
