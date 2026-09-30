/** Supplied frozen public inputs only. No Router predictions, fitting or adjudication. */
import {createHash} from 'node:crypto';
import {validateFrozenTrainV04} from './train_v04.mjs';
import {reviewDigest,validateDevelopmentReviewJournal} from './development_review_journal.mjs';
import {auditDevelopmentSources} from './development_source_audit.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const sha=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>s.normalize('NFKC').toLowerCase();
const increment=(o,k)=>{o[k]=(o[k]??0)+1;};
const ordered=set=>[...set].sort();

export function auditDevelopmentMechanisms({catalogUtf8,registry,journal,packets,trainManifest,trainPlanUtf8,trainPackets}){
 must(typeof catalogUtf8==='string'&&sha(catalogUtf8)===registry.catalog_sha256,'mechanism Catalog bytes changed');
 must(Array.isArray(trainPackets)&&new Set(trainPackets.map(p=>p.path)).size===trainPackets.length,'duplicate TRAIN packet');
 const train=validateFrozenTrainV04(trainManifest,Buffer.from(catalogUtf8),Buffer.from(trainPlanUtf8),new Map(trainPackets.map(p=>[p.path,Buffer.from(p.utf8)])));
 const topics=train.topics,review=validateDevelopmentReviewJournal({registry,journal,packets,topics:topics.map(t=>t.id)});
 must(packets.length===registry.source_packets.length&&review.reviewed_rows===review.registered_source_rows&&review.review_records===review.reviewed_rows,'complete original source review required');
 const inputs=packets.map(p=>({path:p.path,data:JSON.parse(p.utf8)})),source=auditDevelopmentSources({topics,packets:inputs,catalog_sha256:registry.catalog_sha256});
 const rows=inputs.flatMap(p=>p.data.rows),ordinary=rows.filter(r=>!r.kind),reviews=new Map(journal.records.map(r=>[r.row_id,r]));
 const names=topics.flatMap(t=>[{topic_id:t.id,language:'zh',text:t.name_zh},{topic_id:t.id,language:'en',text:t.name_en}]);
 const literal={},flags=[];
 for(const split of ['TUNE_PROVISIONAL','CAL_PROVISIONAL']){
  const subset=ordinary.filter(r=>r.split===split),dispositions={},language_counts={};let presence=0,own=0,goal=0;
  for(const row of subset){
   const matches=names.filter(n=>norm(row.current).includes(norm(n.text))),r=reviews.get(row.row_id);must(r,'missing source review');
   increment(language_counts,row.language);increment(dispositions,r.disposition);
   if(!matches.length)continue;presence++;
   const own_name_present=matches.some(m=>m.topic_id===row.topic_id);
   const proposed_goal_name_present=r.proposed_annotation.provisional_evidence_spans.filter(s=>s.role==='CURRENT_GOAL').some(s=>matches.some(m=>norm(s.text).includes(norm(m.text))));
   if(own_name_present)own++;if(proposed_goal_name_present)goal++;
   flags.push({row_id:row.row_id,split,source_topic_id:row.topic_id,review_disposition:r.disposition,formal_name_matches:matches,own_name_present,proposed_goal_name_present,classification:'LITERAL_SUBSTRING_PROXY_NOT_ADJUDICATED_NAME_ECHO',proposal_acceptance:'UNACCEPTED_NO_SOURCE_OR_GATE_CHANGE'});
  }
  must(presence===source.literal_name_presence[split].literal_presence_rows,'literal source census drift');
  literal[split]={rows:subset.length,language_counts,review_dispositions:dispositions,literal_presence_rows:presence,fraction:presence/subset.length,own_name_presence_rows:own,unaccepted_goal_name_presence_rows:goal,formal_name_echo_limit:.1,adjudicated_echo_rows:null,adjudicated_fraction:null,verdict:'NOT_ADJUDICATED_NO_PASS',denominator_policy:'ALL_ORIGINAL_ORDINARY_ROWS_INCLUDING_HOLDS_AND_UNACCEPTED_PROPOSALS'};
 }
 const train_matrix={},dev_matrix={},per_topic=[];
 for(const row of train.rows){must(typeof row.mechanism==='string'&&row.mechanism.length>0,'TRAIN mechanism label required');increment(train_matrix,row.language+' / '+row.mechanism);}
 for(const row of ordinary){must(typeof row.mechanism==='string'&&row.mechanism.length>0,'DEV mechanism label required');increment(dev_matrix,row.language+' / '+row.mechanism);}
 for(const topic of topics){
  const tr=train.rows.filter(r=>r.topic_id===topic.id),dv=ordinary.filter(r=>r.topic_id===topic.id),tf=new Set(tr.map(r=>r.mechanism)),df=new Set(dv.map(r=>r.mechanism));
  per_topic.push({topic_id:topic.id,train_rows:tr.length,ordinary_dev_rows:dv.length,train_declared_mechanisms:ordered(tf),dev_declared_mechanisms:ordered(df),nominal_dev_labels_absent_from_train:ordered(new Set([...df].filter(x=>!tf.has(x)))),formal_train_minimum_base_scenarios:24,formal_train_minimum_mechanism_families:8,formal_heldout_families_minimum:2,mechanism_family_adjudication:'NOT_ADJUDICATED_LABEL_NAMES_DO_NOT_PROVE_HELDOUT_FAMILIES',independent_scenario_credit:0});
 }
 // Shared provenance closes TRAIN/TUNE/CAL into components. Row IDs do not prove independence.
 const joined=[...train.rows,...rows],parent=joined.map((_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},seen=new Map();
 joined.forEach((r,i)=>{for(const field of ['writer_cohort','source_family','scenario_family','template_family','paraphrase_family','translation_family','contrast_family'])if(r[field]){const key=field+'\0'+r[field];if(seen.has(key))parent[find(i)]=find(seen.get(key));else seen.set(key,i);}});
 const components=new Map();joined.forEach((r,i)=>{const k=find(i),c=components.get(k)??{rows:0,splits:new Set(),writers:new Set()};c.rows++;c.splits.add(r.split);c.writers.add(r.writer_cohort);components.set(k,c);});
 const lineage=[...components.values()].map(c=>({rows:c.rows,splits:ordered(c.splits),writer_cohorts:ordered(c.writers)})).sort((a,b)=>b.rows-a.rows||a.splits.join().localeCompare(b.splits.join()));
 return {schema:'ZMR-DEV-MECHANISM-AUDIT-1',evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',classification:'STRUCTURAL_NAME_MECHANISM_LINEAGE_AUDIT_NOT_INDEPENDENT_ADJUDICATION',catalog_sha256:registry.catalog_sha256,train_sha256:train.train_sha256,train_manifest_sha256:reviewDigest(trainManifest),train_plan_sha256:sha(trainPlanUtf8),train_packet_pins:trainPackets.map(p=>({path:p.path,sha256:sha(p.utf8)})),dev_packet_pins:packets.map(p=>({path:p.path,sha256:sha(p.utf8)})),journal_sha256:reviewDigest(journal),journal_tail_sha256:review.tail_sha256,source_rows:joined.length,train_rows:train.rows.length,dev_rows:rows.length,ordinary_dev_rows:ordinary.length,reviewed_dev_rows:review.reviewed_rows,review_dispositions:review.dispositions,
  literal_name_presence:literal,literal_flags:flags,train_language_mechanism_counts:train_matrix,ordinary_dev_language_mechanism_counts:dev_matrix,per_topic,
  factor_matrix:{train_rows_with_action_object_qualifier:train.rows.filter(r=>['action','object','qualifier'].every(k=>typeof r.factors?.[k]==='string'&&r.factors[k])).length,ordinary_dev_rows_with_action_object_qualifier:ordinary.filter(r=>['action','object','qualifier'].every(k=>typeof r.factors?.[k]==='string'&&r.factors[k])).length,combination_holdout_verdict:'NOT_ADJUDICATED_NO_COMPLETE_DEV_FACTOR_MATRIX'},
  lineage_components:lineage,declared_lineage_component_count:lineage.length,cross_split_components:lineage.filter(c=>c.splits.length>1).length,source_license_review:{status:'CANDIDATE_WRITER_DECLARATIONS_ONLY_NOT_INDEPENDENTLY_VERIFIED',declaration_rows:joined.filter(r=>r.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL').length,independent_reviews:0},
  source_quota_observations:{ordinary_raw_shortfall:source.formal_ordinary_shortfall,safety_raw_shortfall:source.formal_safety_shortfall,train_raw_base_scenario_shortfall:topics.reduce((n,t)=>n+Math.max(0,24-train.rows.filter(r=>r.topic_id===t.id).length),0),independent_quota_credit:0},
  review_credit:0,candidate_prediction_exposures:0,semantic_evaluations:0,source_mutations:0,new_source_intake_revisions:0,independent_mechanism_reviews:0,grouped_uncertainty:'UNAVAILABLE_SINGLE_WRITER_LINEAGE_COMPONENT',heldout_mechanism_verdict:'NOT_ADJUDICATED_NO_QUALIFIED_FAMILY_EQUIVALENCE',calibration_admission:'HOLD_SOURCE_GOLD_MECHANISM_REVIEW_AND_ACCOUNTING',data_qualification:'NOT_QUALIFIED',capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',saturation_ceiling_claim:false,sealed_overlap_claim:false,remaining_competition_allowance:null};
}
