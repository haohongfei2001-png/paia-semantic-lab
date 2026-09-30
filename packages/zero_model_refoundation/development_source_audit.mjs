/** Pure source bookkeeping for public writer-created DEV; never gold adjudication. */
import {validateUniverse,canonicalJSON} from './contracts.mjs';
import {fingerprintBundle} from './fingerprints.mjs';
const must=(ok,m)=>{if(!ok)throw new Error(m);};
const token=x=>typeof x==='string'&&x.length>0;
const norm=x=>x.normalize('NFKC').toLowerCase();
const zero={control_rows:0,context_required_pairs:0,context_invariance_pairs:0,multi_rows:0};
const langs=['zh','en','mixed'];
export const ORDINARY_QUOTAS=Object.freeze({per_topic:12,zh:6,en:4,mixed:2});
export const SAFETY_QUOTAS=Object.freeze({control_rows:300,context_required_pairs:144,context_invariance_pairs:144,multi_rows:144});

export function auditDevelopmentSources({topics,packets,catalog_sha256}) {
 const universe=validateUniverse(topics.map(t=>t.id));must(topics.every(t=>token(t.name_zh)&&token(t.name_en)),'formal names required');
 must(/^[a-f0-9]{64}$/.test(catalog_sha256),'Catalog digest required');must(Array.isArray(packets)&&packets.length>0,'source packets required');
 const rows=[],pairs=[],flags=[],packetClaims=[];const rowIds=new Set(),paths=new Set();
 for(const packet of packets){must(token(packet.path)&&!paths.has(packet.path),'duplicate/missing packet path');paths.add(packet.path);const d=packet.data;
  must(d?.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&d.catalog_sha256===catalog_sha256,'wrong source evidence/Catalog');
  must(d.qualification_credit_rows===0&&d.independent_source_cohorts===0,'writer source cannot claim independence');
  must(Array.isArray(d.rows)&&d.rows.length===d.row_count,'physical row count mismatch');
  must(d.candidate_prediction_exposures===undefined||d.candidate_prediction_exposures===0,'source audit requires pre-prediction CAL');
  must(d.semantic_evaluations===undefined||d.semantic_evaluations===0,'semantic source exposure');
  if(d.evaluation_status!==undefined)must(d.evaluation_status==='UNRUN_NO_ROUTER_PREDICTIONS','source packet already evaluated');
  packetClaims.push({path:packet.path,rows:d.rows.length,prediction_exposure_claim:d.candidate_prediction_exposures??null,evaluation_status_claim:d.evaluation_status??null});
  for(const row of d.rows){must(token(row.id)&&row.row_id===row.id&&!rowIds.has(row.id),'duplicate/missing row identity');rowIds.add(row.id);must(row.catalog_sha256===catalog_sha256,'row Catalog mismatch');
   must(['TUNE_PROVISIONAL','CAL_PROVISIONAL'].includes(row.split)&&langs.includes(row.language),'source split/language');
   must(row.exposure===(row.split==='TUNE_PROVISIONAL'?'PUBLIC_TUNE':'PUBLIC_CAL'),'exposure mismatch');
   must(row.qualification_credit_rows===0&&token(row.writer_id)&&token(row.writer_cohort)&&token(row.source_id)&&token(row.source_family),'missing source provenance');
   must(row.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL','source/license declaration missing');
   must(token(row.scenario_family)&&token(row.template_family)&&token(row.generation_id)&&token(row.authoring_batch)&&Number.isFinite(Date.parse(row.frozen_at)),'missing frozen lineage');
   must(row.span_offset_unit==='UTF16_CODE_UNITS','unknown offset unit');must(typeof row.current==='string'&&typeof row.title==='string'&&Array.isArray(row.recent)&&row.recent.every(x=>typeof x==='string'),'input bundle shape');
   must(canonicalJSON(row.fingerprints)===canonicalJSON(fingerprintBundle({current:row.current,title:row.title,recent:row.recent})),'input fingerprint mismatch');
   must(Array.isArray(row.provisional_gold_topics)&&new Set(row.provisional_gold_topics).size===row.provisional_gold_topics.length&&row.provisional_gold_topics.every(t=>universe.has(t)),'illegal provisional gold set');
   must(['ASSIGNED','DEFER'].includes(row.expected_state)&&(row.expected_state==='DEFER')===(row.provisional_gold_topics.length===0),'state/set mismatch');
   if(row.kind!==undefined)must(['control','multi','context_required','context_invariance'].includes(row.kind),'unknown safety layer');
   if(row.kind==='control')must(row.expected_state==='DEFER','control cannot have assigned gold');
   if(row.kind==='multi')must(row.expected_state==='ASSIGNED'&&row.provisional_gold_topics.length>=2,'multi needs multiple provisional targets');
   must(Array.isArray(row.excluded_topics)&&row.excluded_topics.every(t=>universe.has(t))&&!row.excluded_topics.some(t=>row.provisional_gold_topics.includes(t)),'invalid exclusions');
   must(Array.isArray(row.provisional_evidence_spans),'missing spans');if(row.expected_state==='ASSIGNED')must(row.provisional_evidence_spans.some(s=>s.role==='CURRENT_GOAL')&&row.provisional_evidence_spans.some(s=>s.role==='OBJECT'),'assigned input missing provisional roles');for(const s of row.provisional_evidence_spans){must(['current','title','recent'].includes(s.source),'unsupported span source');const text=s.source==='recent'?row.recent[s.recent_index]:row[s.source];must(typeof text==='string'&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=text.length&&text.slice(s.start,s.end)===s.text,'invalid UTF16 evidence span');}
   rows.push(row);
  }
  for(const p of d.pairs??[])pairs.push(p);for(const f of d.public_screen?.flags??[])flags.push({...f,packet_path:packet.path});
 }
 const byId=new Map(rows.map(r=>[r.id,r])),pairIds=new Set(),membership=new Set(),pairByMembers=new Map();
 for(const p of pairs){must(token(p.id)&&!pairIds.has(p.id),'duplicate pair');pairIds.add(p.id);const a=byId.get(p.base_id),b=byId.get(p.variant_id);must(a&&b&&a.id!==b.id&&!membership.has(a.id)&&!membership.has(b.id),'missing/reused pair member');membership.add(a.id);membership.add(b.id);
  must(['context_required','context_invariance'].includes(p.kind)&&a.kind===p.kind&&b.kind===p.kind&&a.split===p.split&&b.split===p.split,'cross-split/wrong pair');
  must(a.scenario_family===p.id&&b.scenario_family===p.id&&a.contrast_family===b.contrast_family&&a.template_family===b.template_family&&a.writer_cohort===b.writer_cohort,'pair lineage mismatch');
  must(a.current===b.current&&a.fingerprints.bundle_sha256!==b.fingerprints.bundle_sha256&&a.expected_state==='ASSIGNED'&&b.title===''&&b.recent.length===0,'not a concrete context deletion');
  if(p.kind==='context_required')must(p.operation==='DELETE_TITLE_AND_ALL_RECENT'&&b.expected_state==='DEFER'&&b.provisional_gold_topics.length===0,'required context declaration');
  else must(p.operation==='DELETE_MISLEADING_TITLE_AND_RECENT'&&p.provisional_expectation==='COMPLETE_NATIVE_OUTPUT_IDENTICAL'&&b.expected_state===a.expected_state&&canonicalJSON(a.provisional_gold_topics)===canonicalJSON(b.provisional_gold_topics),'invariance declaration');
  must(p.independent_scenarios===0,'pair cannot mint independent scenarios');pairByMembers.set([a.id,b.id].sort().join('\0'),p);
 }
 must(rows.filter(r=>r.kind?.startsWith('context')).length===membership.size,'orphan context input');
 const flagRelations=flags.map(f=>{const a=byId.get(f.left),b=byId.get(f.right),p=pairByMembers.get([f.left,f.right].sort().join('\0'));must(a&&b&&p&&f.same_scenario===true&&f.cross_split===false&&!f.exact_form,'unexplained or misclassified public review flag');return {left:f.left,right:f.right,pair_id:p.id,packet_path:f.packet_path,classification:'STRUCTURAL_PAIR_MATCH_ONLY_SEMANTIC_REVIEW_PENDING'};});
 const ordinary=rows.filter(r=>!r.kind),safety=rows.filter(r=>r.kind),perTopic=new Map(topics.map(t=>[t.id,{zh:0,en:0,mixed:0}]));for(const r of ordinary){must(r.expected_state==='ASSIGNED'&&r.provisional_gold_topics.length===1&&r.topic_id===r.provisional_gold_topics[0],'ordinary source not single');perTopic.get(r.topic_id)[r.language]++;}
 const languageShortfall=Object.fromEntries(langs.map(l=>[l,[...perTopic.values()].reduce((sum,c)=>sum+Math.max(0,ORDINARY_QUOTAS[l]-c[l]),0)]));
 const ordinaryShortfall=[...perTopic.values()].reduce((sum,c)=>sum+Math.max(0,ORDINARY_QUOTAS.per_topic-langs.reduce((n,l)=>n+c[l],0)),0);
 const safetyCounts={control_rows:safety.filter(r=>r.kind==='control').length,context_required_pairs:pairs.filter(p=>p.kind==='context_required').length,context_invariance_pairs:pairs.filter(p=>p.kind==='context_invariance').length,multi_rows:safety.filter(r=>r.kind==='multi').length};
 const safetyShortfall=Object.fromEntries(Object.keys(zero).map(k=>[k,Math.max(0,SAFETY_QUOTAS[k]-safetyCounts[k])]));
 // Connected components use provenance closures, not arbitrary row or packet counts.
 const parent=rows.map((_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},seen=new Map();
 for(const [i,r]of rows.entries())for(const key of ['writer_cohort','source_family','scenario_family','template_family','paraphrase_family','translation_family','contrast_family']){if(!r[key])continue;const token=key+'\0'+r[key],old=seen.get(token);if(old!==undefined)parent[root(i)]=root(old);else seen.set(token,i);}
 const components=new Map();rows.forEach((r,i)=>{const id=root(i),splits=components.get(id)??new Set();splits.add(r.split);components.set(id,splits);});
 const literalNames=topics.flatMap(t=>[norm(t.name_zh),norm(t.name_en)]),namePresence=split=>{const subset=ordinary.filter(r=>r.split===split),count=subset.filter(r=>literalNames.some(n=>norm(r.current).includes(n))).length;return {rows:subset.length,literal_presence_rows:count,fraction:subset.length?count/subset.length:null,classification:'LITERAL_SUBSTRING_PROXY_INCLUDES_NATURAL_MENTIONS_NOT_ECHO_MECHANISM_ADJUDICATION',formal_name_echo_limit:.1,adjudication:'NOT_ADJUDICATED_NO_PASS'};};
 const coarse=rows.filter(r=>r.provisional_evidence_spans.some(s=>s.role==='CURRENT_GOAL'&&s.source==='current'&&s.start===0&&s.end===r.current.length&&s.text===r.current)).length;
 const duplicates=[];for(const k of ['bundle_sha256','nfc_sha256','nfkc_sha256']){const hashes=new Map();for(const r of rows){const prior=hashes.get(r.fingerprints[k]);if(prior)duplicates.push({form:k,left:prior.id,right:r.id});else hashes.set(r.fingerprints[k],r);}}
 return {schema:'ZMR-DEV-SOURCE-AUDIT-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',classification:'STRUCTURAL_SOURCE_AUDIT_NOT_INDEPENDENT_REVIEW',rows:rows.length,ordinary_rows:ordinary.length,safety_physical_rows:safety.length,context_pairs:pairs.length,full144_ordinary_topics:[...perTopic.values()].filter(c=>langs.every(l=>c[l]>0)).length,
  formal_ordinary_shortfall:{rows:ordinaryShortfall,languages:languageShortfall,required_per_topic:ORDINARY_QUOTAS},safety_counts:safetyCounts,formal_safety_shortfall:safetyShortfall,
  declared_lineage_components:components.size,cross_split_components:[...components.values()].filter(s=>s.size>1).length,declared_scenario_family_count:new Set(rows.map(r=>r.scenario_family)).size,independent_scenarios_credited:0,
  exact_normalized_bundle_duplicates:duplicates,public_review_flags:flags.length,structurally_explained_pair_flags:flagRelations.length,flag_relations:flagRelations,independent_semantic_flag_reviews:0,
  whole_current_goal_span_rows:coarse,role_span_semantic_review:'NOT_PROVISIONED_NO_PASS',empty_excluded_set_rows:rows.filter(r=>r.excluded_topics.length===0).length,excluded_set_semantic_review:'NOT_PROVISIONED_NO_PASS',source_license_reviews:'NOT_PROVISIONED',independent_gold_reviews:0,mechanism_holdout_review:'NOT_ADJUDICATED_NO_TRAIN_MECHANISM_JOIN',
  literal_name_presence:{TUNE_PROVISIONAL:namePresence('TUNE_PROVISIONAL'),CAL_PROVISIONAL:namePresence('CAL_PROVISIONAL')},packet_exposure_claims:packetClaims,
  grouped_uncertainty:'UNAVAILABLE_SINGLE_WRITER_LINEAGE_COMPONENT',qualification_credit_rows:0,semantic_evaluations:0,calibration_admission:'HOLD_SOURCE_GOLD_MECHANISM_REVIEW_AND_ACCOUNTING',data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',sealed_fingerprints_available:false,no_sealed_overlap_claim:false};
}
