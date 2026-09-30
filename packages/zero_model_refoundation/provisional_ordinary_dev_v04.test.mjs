import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';
const ROOT=new URL('../../',import.meta.url),D='data/zero_model_refoundation/development/';
const read=p=>readFile(new URL(p,ROOT));const json=async p=>JSON.parse(await read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const PUBLIC_PRIOR=['train_v0.1','train_v0.2','train_v0.3','tune_v0.1','cal_v0.1','a7_dev_v0.1','a4_triads_v0.1','a4_train_v0.1','a4_challenge_v0.1','a4_positive_challenge_v0.1','a5_challenge_v0.1','a5_repair_dev_v0.1','a5_r1_challenge_v0.1','a6_complement_challenge_v0.1','a6_r1_repair_dev_v0.1','a6_r2_challenge_v0.1','challenge_v0.1','challenge_v0.2','challenge_v0.3','challenge_v0.4','challenge_v0.5','challenge_v0.6','safety_seed_v0.1','safety_seed_v0.2','safety_seed_v0.3','safety_seed_v0.4','role_challenge_v0.1','h1_recall_dev_v0.1','a5_chart_dev_v0.1','a4_role_dev_v0.1','a1_balanced_dev_v0.1','train_v0.4_slice1','train_v0.4_slice2','train_v0.4_slice3','train_v0.4_slice4','train_v0.4_slice5'];
const norm=x=>x.normalize('NFKC').toLowerCase();
const grams=x=>{const c=Array.from(norm(x)),s=new Set();for(let i=0;i+3<=c.length;i++)s.add(c.slice(i,i+3).join(''));return s;};
const fp=r=>({id:r.id,hash:fingerprintBundle({current:r.current,title:r.title??'',recent:r.recent??[]}).bundle_sha256,current:norm(r.current),grams:grams(r.current),scenario:r.scenario_family,template:r.template_family});

test('DEV-v04 pins ordinary coverage and refuses to credit unwritten safety or independent qualification',async()=>{
 const cb=await read('catalog/system_topic_catalog_v0.2.yaml'),topics=parsePinnedCatalog(cb);
 const p=await json(D+'provisional_ordinary_dev_v0.4_plan.json'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json'),c=await json(D+'provisional_tune_v0.4_slice1.json');
 assert.equal(p.catalog_sha256,sha(cb));assert.equal(m.catalog_sha256,sha(cb));assert.equal(c.catalog_sha256,sha(cb));
 assert.equal(m.plan_sha256,sha(await read(m.plan_path)));assert.equal(m.splits.TUNE_PROVISIONAL.slices[0].sha256,sha(await read(m.splits.TUNE_PROVISIONAL.slices[0].path)));
 assert.deepEqual(p.cards.map(x=>x.topic_id),topics.map(x=>x.id));assert.equal(p.cards.length,144);
 assert(p.cards.every(x=>x.qualification_credit_rows===0&&x.split_assignments.length===2&&x.split_assignments.every(s=>s.languages.join(',')==='zh,en,mixed')));
 assert.equal(p.target_ordinary_rows,864);assert.deepEqual(p.target_rows_by_split,{TUNE_PROVISIONAL:432,CAL_PROVISIONAL:432});
 assert.equal(p.formal_ordinary_dev_quota_per_topic,12);assert.equal(p.development_ordinary_rows_per_topic,6);assert.equal(p.formal_quota_status,'NOT_SATISFIED_BY_THIS_DEVELOPMENT_TARGET');
 assert.equal(p.target_safety_rows_total,336);assert.equal(p.safety_status,'PLANNED_NOT_AUTHORED');
 const domains=new Map();for(const t of topics){if(!domains.has(t.domain))domains.set(t.domain,t.id);}
 assert.deepEqual([...new Set(c.rows.map(x=>x.topic_id))],[...domains.values()]);
 for(const o of [p,m,c])assert.equal(o.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
 assert.equal(m.status,'ORDINARY_TUNE_CAL_FULL144_SAFETY_INCOMPLETE_NOT_QUALIFIED');
 const s=m.splits.TUNE_PROVISIONAL;assert.equal(s.rows,432);assert.equal(c.rows.length,54);assert.equal(s.topics,144);assert.equal(s.missing_topics,0);assert.equal(s.remaining_ordinary_rows,0);
 assert.deepEqual(s.language_counts,{zh:144,en:144,mixed:144});assert.equal(m.splits.CAL_PROVISIONAL.rows,432);assert.equal(m.splits.CAL_PROVISIONAL.topics,144);assert.equal(m.splits.CAL_PROVISIONAL.missing_topics,0);assert.equal(m.splits.CAL_PROVISIONAL.remaining_ordinary_rows,0);assert.equal(m.splits.CAL_PROVISIONAL.slices.length,2);
 assert(Object.values(m.safety_rows).every(n=>n===0));assert.equal(m.semantic_evaluations,0);assert.equal(m.independent_rows,0);assert.equal(m.source_review.independent,false);
 assert.equal(m.source_review.latent_scenario_distinctness,'UNREVIEWED');assert.equal(m.source_review.independent_gold_review,'NOT_PROVISIONED');
 assert.equal(m.formal_cross_split_writer_conflict,true);assert.equal(m.lineage_component_count,1);assert.equal(m.grouped_validation,'UNAVAILABLE_SINGLE_WRITER_LINEAGE_COMPONENT');
 assert.equal(m.stable_competition_admission,'HOLD_PENDING_ACCOUNTING_RECONCILIATION');assert.equal(m.calibration_admission,'NOT_ADMITTED_PARTIAL_DATA');
 assert.equal(m.data_qualification,'NOT_QUALIFIED');assert.equal(m.capability_verdict,'UNTESTED');assert.equal(m.resource_verdict,'NOT_QUALIFIED');
 const status=await json('status/ZERO_MODEL_REFOUNDATION_STATUS.json');assert.equal(status.rounds['ZMR-03'].ordinary_dev_v04_tune_rows,s.rows);assert.equal(status.rounds['ZMR-03'].ordinary_dev_v04_semantic_evaluations,0);assert.equal(status.rounds['ZMR-03'].ordinary_dev_v04_independent_rows,0);
 assert.equal(status.rounds['ZMR-06'].remaining_stable_configuration_allowance,null);assert.equal(status.capability_verdict,'UNTESTED');assert.equal(status.resource_verdict,'NOT_QUALIFIED');
});

test('CAL slice1 preserves its original54-input freeze; full144 TUNE stays immutable and calibration stays unadmitted',async()=>{
 const c=await json(D+'provisional_cal_v0.4_slice1.json'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json'),base=(await json(D+'provisional_tune_v0.4_slice1.json')).rows[0],topics=parsePinnedCatalog(await read('catalog/system_topic_catalog_v0.2.yaml'));
 const domains=new Map();for(const t of topics)if(!domains.has(t.domain))domains.set(t.domain,t.id);assert.deepEqual([...new Set(c.rows.map(r=>r.topic_id))],[...domains.values()]);
 assert.equal(c.schema,'ZMR-PROVISIONAL-CAL-V04-SLICE-1');assert.equal(c.rows.length,54);assert.equal(c.row_count,54);assert.equal(c.topic_count,18);assert.equal(c.missing_topics,126);assert.equal(c.domain_count,18);assert.equal(c.topic_universe,144);
 assert.equal(c.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(c.qualification_credit_rows,0);assert.equal(c.independent_source_cohorts,0);assert.equal(c.candidate_prediction_exposures,0);assert.equal(c.evaluation_status,'UNRUN_NO_ROUTER_PREDICTIONS');assert.equal(c.intake_status,'PARTIAL_PUBLIC_CAL_V04_FROZEN_NOT_CALIBRATION_ADMITTED');
 const tune=m.splits.TUNE_PROVISIONAL;assert.equal(tune.rows,432);assert.equal(tune.topics,144);assert.equal(tune.slices.length,5);const pins=['0f8206c34c0b401f5fe407e7cba16fc99ef1410f4c3afd582bd222847dd9e594','8f151986e57e3b2a2fdec23ec878e1a7587af8ada7121905ac6f812f935a777d','dc80858b254dd5d7b77949e81b559a94721b317801a1b24bcd8642b95728a4a6','0689ab4b5d91304f673af05da49ab26295bc601b8d3a2cdd34cd7eec2582deec','f4b74e0de1f21db4abb0d9487d860943766136d1af729465ca409c12bd5cabf5'];
 const ids=new Set();for(const [i,e] of tune.slices.entries()){assert.equal(e.sha256,pins[i]);assert.equal(sha(await read(e.path)),pins[i]);for(const r of (await json(e.path)).rows)ids.add(r.id);}
 const langs={},coverage=new Map();for(const r of c.rows){assert(!ids.has(r.id));ids.add(r.id);assert.equal(r.id,r.row_id);assert.equal(r.split,'CAL_PROVISIONAL');assert.equal(r.exposure,'PUBLIC_CAL');assert.equal(r.source_id,'writer-cal-v04-slice1-20260930');assert.equal(r.authoring_batch,'ZMR-DEV-V04-CAL-SLICE1-20260930');assert.equal(r.frozen_at,'2026-09-30T11:30:06Z');
  for(const f of ['writer_id','writer_cohort','source_family','source_license_status','generation_id','qualification_credit_rows','annotation_state','review_status','identifiability_state','boundary_review_status','span_offset_unit','catalog_sha256'])assert.equal(r[f],base[f]);
  assert.equal(r.scenario_id,r.id);assert.equal(r.scenario_family,r.id);assert.equal(r.template_family,r.id);assert.equal(r.translation_family,null);assert.equal(r.paraphrase_family,null);assert.equal(r.expected_state,'ASSIGNED');assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);assert.deepEqual(r.excluded_topics,[]);assert.equal(r.title,'');assert.deepEqual(r.recent,[]);assert(r.current.length>=30);
  assert.equal(r.provisional_evidence_spans.length,2);assert(r.provisional_evidence_spans.some(s=>s.role==='OBJECT'&&s.text.length<r.current.length));for(const s of r.provisional_evidence_spans){assert.equal(s.source,'current');assert(s.start>=0&&s.end>s.start&&s.end<=r.current.length);assert.equal(r.current.slice(s.start,s.end),s.text);}assert.deepEqual(r.fingerprints,fingerprintBundle({current:r.current,title:r.title,recent:r.recent}));
  assert(['zh','en','mixed'].includes(r.language));if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));langs[r.language]=(langs[r.language]??0)+1;const ls=coverage.get(r.topic_id)??new Set();assert(!ls.has(r.language));ls.add(r.language);coverage.set(r.topic_id,ls);
 }
 assert.deepEqual(langs,{zh:18,en:18,mixed:18});assert.deepEqual(langs,c.language_counts);assert.equal(coverage.size,18);assert([...coverage.values()].every(s=>s.size===3));const cal=m.splits.CAL_PROVISIONAL;assert.equal(cal.slices.length,2);assert.equal(cal.slices[0].sha256,'37f960b2beb3788a8629f15be931e494a51f4d5dc3ab95458768c8d7d678b9e5');assert.equal(cal.slices[0].sha256,sha(await read(cal.slices[0].path)));assert.equal(cal.slices[0].rows,c.rows.length);assert.equal(c.topic_count,coverage.size);assert.equal(c.missing_topics,144-coverage.size);assert.equal(cal.exposure,'PUBLIC_CAL');assert.equal(cal.candidate_prediction_exposures,0);assert.equal(cal.evaluation_status,'UNRUN_NO_ROUTER_PREDICTIONS');assert.equal(m.calibration_admission,'NOT_ADMITTED_PARTIAL_DATA');
 const status=await json('status/ZERO_MODEL_REFOUNDATION_STATUS.json');assert.equal(status.rounds['ZMR-03'].ordinary_dev_v04_cal_rows,cal.rows);assert.equal(status.rounds['ZMR-03'].ordinary_dev_v04_cal_missing_topics,cal.missing_topics);assert.equal(status.rounds['ZMR-03'].ordinary_dev_v04_cal_candidate_prediction_exposures,0);
 const seen=[];for(const n of [...PUBLIC_PRIOR,'tune_v0.4_slice1','tune_v0.4_slice2','tune_v0.4_slice3','tune_v0.4_slice4','tune_v0.4_slice5'])for(const r of (await json(D+'provisional_'+n+'.json')).rows??[])if(typeof r.current==='string')seen.push(fp(r));assert.equal(seen.length,2890);
 const flags=[];for(const r of c.rows){const now=fp(r);for(const old of seen){assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);let common=0;for(const g of now.grams)if(old.grams.has(g))common++;const similarity=common/(now.grams.size+old.grams.size-common||1);if(now.hash===old.hash||now.current===old.current||similarity>=.55)flags.push({left:old.id,right:now.id,similarity});}seen.push(now);}
 const screen=m.public_overlap_screens[5];assert.equal(screen.slice,'cal-slice1');assert.equal(screen.prior_explicit_public_rows,2890);assert.deepEqual(screen.flags,flags);assert.deepEqual(flags,[]);assert.equal(screen.sealed_test_fingerprints_available,false);assert.equal(screen.no_sealed_test_overlap_claim,false);
});

test('remaining378 original CAL inputs complete432/full144 ordinary authoring with zero prediction exposure and explicit quality limits',async()=>{
 const c=await json(D+'provisional_cal_v0.4_remaining.json'),first=await json(D+'provisional_cal_v0.4_slice1.json'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json'),topics=parsePinnedCatalog(await read('catalog/system_topic_catalog_v0.2.yaml'));
 const priorIds=new Set(first.rows.map(r=>r.topic_id));assert.deepEqual([...new Set(c.rows.map(r=>r.topic_id))],topics.filter(t=>!priorIds.has(t.id)).map(t=>t.id));assert.equal(c.schema,'ZMR-PROVISIONAL-CAL-V04-REMAINING');assert.equal(c.row_count,378);assert.equal(c.rows.length,378);assert.equal(c.topic_count,126);assert.equal(c.missing_topics,18);assert.equal(c.domain_count,18);assert.equal(c.topic_universe,144);
 assert.equal(c.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(c.qualification_credit_rows,0);assert.equal(c.independent_source_cohorts,0);assert.equal(c.candidate_prediction_exposures,0);assert.equal(c.intake_status,'PUBLIC_CAL_V04_REMAINING_FROZEN_NOT_CALIBRATION_ADMITTED');assert.equal(c.evaluation_status,'UNRUN_NO_ROUTER_PREDICTIONS');
 assert.equal(c.version,'0.4.1-cal-remaining');const revision=c.pre_intake_revision;assert.equal(revision.round,1);assert.equal(revision.maximum_pre_prediction_intake_revisions,2);assert.equal(revision.public_duplicate_review_flag.threshold,.55);assert.equal(revision.router_repairs_spent,0);assert.equal(revision.candidate_prediction_exposures,0);assert.equal(revision.original_dataset_sha256,'8834555f51b5ccfd9aa659ea7cd5d86f03aa04f311d40cfe116a0c964215db01');
 const restored=structuredClone(c);restored.version=revision.original_version;for(const r of restored.rows)r.frozen_at=revision.original_frozen_at;restored.rows[restored.rows.findIndex(r=>r.id===revision.rejected_original_row.id)]=structuredClone(revision.rejected_original_row);delete restored.pre_intake_revision;assert.equal(sha(JSON.stringify(restored,null,2)+'\n'),revision.original_dataset_sha256);assert.equal(m.pre_intake_revisions[0].revised_sha256,sha(await read(D+'provisional_cal_v0.4_remaining.json')));
 const ids=new Set(first.rows.map(r=>r.id)),langs={},coverage=new Map();for(const r of c.rows){assert(!ids.has(r.id));ids.add(r.id);assert.equal(r.id,r.row_id);assert.equal(r.source_id,'writer-cal-v04-remaining-20260930');assert.equal(r.authoring_batch,'ZMR-DEV-V04-CAL-REMAINING-20260930');assert.equal(r.frozen_at,'2026-09-30T12:12:51Z');
  for(const f of ['split','exposure','writer_id','writer_cohort','source_family','source_license_status','generation_id','qualification_credit_rows','annotation_state','review_status','identifiability_state','boundary_review_status','span_offset_unit','catalog_sha256'])assert.equal(r[f],first.rows[0][f]);
  assert.equal(r.scenario_id,r.id);assert.equal(r.scenario_family,r.id);assert.equal(r.template_family,r.id);assert.equal(r.translation_family,null);assert.equal(r.paraphrase_family,null);assert.equal(r.expected_state,'ASSIGNED');assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);assert.deepEqual(r.excluded_topics,[]);assert.equal(r.title,'');assert.deepEqual(r.recent,[]);assert(r.current.length>=30);
  assert.equal(r.provisional_evidence_spans.length,2);assert(r.provisional_evidence_spans.some(s=>s.role==='OBJECT'&&s.text.length<r.current.length));for(const s of r.provisional_evidence_spans){assert.equal(s.source,'current');assert(s.start>=0&&s.end>s.start&&s.end<=r.current.length);assert.equal(r.current.slice(s.start,s.end),s.text);}assert.deepEqual(r.fingerprints,fingerprintBundle({current:r.current,title:r.title,recent:r.recent}));assert(['zh','en','mixed'].includes(r.language));if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));langs[r.language]=(langs[r.language]??0)+1;
 }
 assert.deepEqual(langs,{zh:126,en:126,mixed:126});assert.deepEqual(langs,c.language_counts);const all=[...first.rows,...c.rows],fullLang={};for(const r of all){const ls=coverage.get(r.topic_id)??new Set();assert(!ls.has(r.language));ls.add(r.language);coverage.set(r.topic_id,ls);fullLang[r.language]=(fullLang[r.language]??0)+1;}
 assert.equal(all.length,432);assert.equal(coverage.size,144);assert.deepEqual([...coverage.keys()].sort(),topics.map(t=>t.id).sort());assert([...coverage.values()].every(s=>s.size===3));assert.deepEqual(fullLang,{zh:144,en:144,mixed:144});const cal=m.splits.CAL_PROVISIONAL;assert.equal(cal.slices.length,2);assert.equal(cal.slices[1].path,D+'provisional_cal_v0.4_remaining.json');assert.equal(cal.slices[1].rows,378);assert.equal(cal.slices[1].sha256,sha(await read(cal.slices[1].path)));assert.equal(cal.rows,all.length);assert.equal(cal.topics,coverage.size);assert.equal(cal.missing_topics,144-coverage.size);assert.equal(cal.remaining_ordinary_rows,432-all.length);assert.deepEqual(cal.language_counts,fullLang);assert.equal(cal.candidate_prediction_exposures,0);assert.equal(m.calibration_admission,'NOT_ADMITTED_PARTIAL_DATA');assert(Object.values(m.safety_rows).every(n=>n===0));assert.equal(m.semantic_evaluations,0);
 const names=topics.flatMap(t=>[t.name_zh,t.name_en]).map(norm),literal=all.filter(r=>names.some(n=>norm(r.current).includes(n))).length,audit=m.source_review.literal_formal_name_presence;assert.equal(literal,142);assert.equal(audit.literal_presence_rows,literal);assert.equal(audit.rows,all.length);assert.equal(audit.fraction,literal/all.length);assert.equal(audit.formal_name_echo_limit,.1);assert.equal(audit.formal_name_echo_status,'NOT_ADJUDICATED_NO_PASS');assert.equal(audit.independent_review,false);assert.equal(audit.classification,'LITERAL_SUBSTRING_PROXY_INCLUDES_NATURAL_MENTIONS_NOT_ECHO_MECHANISM_ADJUDICATION');assert(m.qualification_conflicts.includes('NAME_ECHO_AND_HELD_OUT_MECHANISMS_NOT_ADJUDICATED'));
 const status=await json('status/ZERO_MODEL_REFOUNDATION_STATUS.json'),r=status.rounds['ZMR-03'];assert.equal(r.ordinary_dev_v04_status,m.status);assert.equal(r.ordinary_dev_v04_cal_rows,cal.rows);assert.equal(r.ordinary_dev_v04_cal_topics,cal.topics);assert.equal(r.ordinary_dev_v04_cal_missing_topics,cal.missing_topics);assert.equal(r.ordinary_dev_v04_cal_remaining_rows,cal.remaining_ordinary_rows);assert.equal(r.ordinary_dev_v04_cal_literal_name_presence_rows,literal);assert.equal(r.ordinary_dev_v04_cal_candidate_prediction_exposures,0);
 const seen=[];for(const n of [...PUBLIC_PRIOR,'tune_v0.4_slice1','tune_v0.4_slice2','tune_v0.4_slice3','tune_v0.4_slice4','tune_v0.4_slice5','cal_v0.4_slice1'])for(const r of (await json(D+'provisional_'+n+'.json')).rows??[])if(typeof r.current==='string')seen.push(fp(r));assert.equal(seen.length,2944);
 const flags=[];for(const r of c.rows){const now=fp(r);for(const old of seen){assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);let common=0;for(const g of now.grams)if(old.grams.has(g))common++;const similarity=common/(now.grams.size+old.grams.size-common||1);if(now.hash===old.hash||now.current===old.current||similarity>=.55)flags.push({left:old.id,right:now.id,similarity});}seen.push(now);}
 const screen=m.public_overlap_screens[6];assert.equal(screen.slice,'cal-remaining');assert.equal(screen.prior_explicit_public_rows,2944);assert.deepEqual(screen.flags,flags);assert.deepEqual(flags,[]);assert.equal(screen.sealed_test_fingerprints_available,false);assert.equal(screen.no_sealed_test_overlap_claim,false);
});

test('all54 inputs retain source/lineage, explicit unreviewed object spans and UTF16 fingerprints before predictions',async()=>{
 const c=await json(D+'provisional_tune_v0.4_slice1.json');const seen=new Set(),langs={},coverage=new Map();
 for(const r of c.rows){assert.equal(r.id,r.row_id);assert(!seen.has(r.id));seen.add(r.id);
  assert.equal(r.split,'TUNE_PROVISIONAL');assert.equal(r.exposure,'PUBLIC_TUNE');assert.equal(r.writer_id,'candidate-writer');assert.equal(r.writer_cohort,'candidate-writer-G0');assert.equal(r.source_family,'candidate-writer-G0');
  assert.equal(r.source_id,'writer-tune-v04-slice1-20260930');assert.equal(r.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');assert.equal(r.generation_id,'G0_DEV');assert.equal(r.qualification_credit_rows,0);
  assert.equal(r.scenario_id,r.id);assert.equal(r.scenario_family,r.id);assert.equal(r.template_family,r.id);assert.equal(r.translation_family,null);assert.equal(r.paraphrase_family,null);
  assert.equal(r.review_status,'UNREVIEWED_PROVISIONAL');assert.equal(r.annotation_state,'CANDIDATE_WRITER_UNREVIEWED');assert.equal(r.identifiability_state,'CANDIDATE_WRITER_PROVISIONAL_NOT_ADJUDICATED');
  assert.equal(r.expected_state,'ASSIGNED');assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);assert.deepEqual(r.excluded_topics,[]);assert.equal(r.boundary_review_status,'NEAR_NEIGHBOR_EXCLUSIONS_NOT_INDEPENDENTLY_REVIEWED');
  assert(r.current.length>=30);assert.equal(r.title,'');assert.deepEqual(r.recent,[]);assert.equal(r.span_offset_unit,'UTF16_CODE_UNITS');assert.equal(r.provisional_evidence_spans.length,2);
  for(const span of r.provisional_evidence_spans){assert.equal(span.source,'current');assert(span.start>=0&&span.end>span.start&&span.end<=r.current.length);assert.equal(r.current.slice(span.start,span.end),span.text);}
  assert(r.provisional_evidence_spans.some(s=>s.role==='OBJECT'&&s.text.length<r.current.length));
  assert.deepEqual(r.fingerprints,fingerprintBundle({current:r.current,title:r.title,recent:r.recent}));
  if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));
  assert(['zh','en','mixed'].includes(r.language));langs[r.language]=(langs[r.language]??0)+1;
  const set=coverage.get(r.topic_id)??new Set();assert(!set.has(r.language));set.add(r.language);coverage.set(r.topic_id,set);
 }
 assert.equal(coverage.size,18);assert([...coverage.values()].every(s=>s.size===3));assert.deepEqual(langs,c.language_counts);
});

test('fresh TUNE public-only duplicate review flags are reproducible; blind overlap and independence remain unknown',async()=>{
 const names=PUBLIC_PRIOR;
 const seen=[];for(const n of names){const c=await json(D+'provisional_'+n+'.json');for(const r of c.rows??[])if(typeof r.current==='string')seen.push(fp(r));}
 const m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json');assert.equal(seen.length,2458);assert.equal(m.public_overlap_screens[0].prior_explicit_public_rows,seen.length);
 const flags=[];for(const r of (await json(D+'provisional_tune_v0.4_slice1.json')).rows){const now=fp(r);
  for(const old of seen){assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);
   let common=0;for(const t of now.grams)if(old.grams.has(t))common++;
   const similarity=common/(now.grams.size+old.grams.size-common||1);
   if(now.hash===old.hash||now.current===old.current||similarity>=.55)flags.push({left:old.id,right:now.id,similarity});
  }seen.push(now);
 }
 assert.deepEqual(flags,m.public_overlap_screens[0].flags);assert.deepEqual(flags,[]);
 assert.equal(m.public_overlap_screens[0].sealed_test_fingerprints_available,false);assert.equal(m.public_overlap_screens[0].no_sealed_test_overlap_claim,false);
});

test('slice2 adds54 source-tracked inputs without mutating frozen slice1 or claiming full coverage',async()=>{
 const c=await json(D+'provisional_tune_v0.4_slice2.json'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json'),first=await json(D+'provisional_tune_v0.4_slice1.json');
 assert.equal(m.splits.TUNE_PROVISIONAL.slices.length,5);assert.equal(m.splits.TUNE_PROVISIONAL.slices[0].sha256,'0f8206c34c0b401f5fe407e7cba16fc99ef1410f4c3afd582bd222847dd9e594');
 const entry=m.splits.TUNE_PROVISIONAL.slices[1];assert.equal(entry.path,D+'provisional_tune_v0.4_slice2.json');assert.equal(entry.sha256,sha(await read(entry.path)));assert.equal(entry.rows,54);
 const topics=parsePinnedCatalog(await read('catalog/system_topic_catalog_v0.2.yaml')),domains=new Map();for(const t of topics){const a=domains.get(t.domain)??[];a.push(t.id);domains.set(t.domain,a);}
 assert.deepEqual([...new Set(c.rows.map(r=>r.topic_id))],[...domains.values()].map(a=>a[1]));
 assert.equal(c.schema,'ZMR-PROVISIONAL-TUNE-V04-SLICE-2');assert.equal(c.row_count,54);assert.equal(c.rows.length,54);assert.equal(c.topic_count,18);assert.equal(c.missing_topics,126);
 assert.equal(c.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(c.intake_status,'PARTIAL_PUBLIC_TUNE_V04_FROZEN_NOT_EVALUATION_ADMITTED');assert.equal(c.evaluation_status,'UNRUN_NO_ROUTER_PREDICTIONS');assert.equal(c.qualification_credit_rows,0);
 const ids=new Set(first.rows.map(r=>r.id)),lang={};for(const r of c.rows){assert(!ids.has(r.id));ids.add(r.id);assert.equal(r.id,r.row_id);assert.equal(r.source_id,'writer-tune-v04-slice2-20260930');assert.equal(r.authoring_batch,'ZMR-DEV-V04-TUNE-SLICE2-20260930');
  for(const field of ['split','exposure','writer_id','writer_cohort','source_family','source_license_status','generation_id','qualification_credit_rows','annotation_state','review_status','identifiability_state','boundary_review_status','span_offset_unit','catalog_sha256'])assert.equal(r[field],first.rows[0][field]);
  assert.equal(r.scenario_id,r.id);assert.equal(r.scenario_family,r.id);assert.equal(r.template_family,r.id);assert.equal(r.translation_family,null);assert.equal(r.paraphrase_family,null);
  assert.equal(r.expected_state,'ASSIGNED');assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);assert.deepEqual(r.excluded_topics,[]);assert.equal(r.title,'');assert.deepEqual(r.recent,[]);assert(r.current.length>=30);
  assert.equal(r.provisional_evidence_spans.length,2);for(const span of r.provisional_evidence_spans){assert.equal(span.source,'current');assert(span.start>=0&&span.end>span.start&&span.end<=r.current.length);assert.equal(r.current.slice(span.start,span.end),span.text);}
  assert.deepEqual(r.fingerprints,fingerprintBundle({current:r.current,title:r.title,recent:r.recent}));assert(['zh','en','mixed'].includes(r.language));if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));lang[r.language]=(lang[r.language]??0)+1;
 }
 assert.deepEqual(lang,{zh:18,en:18,mixed:18});assert.deepEqual(lang,c.language_counts);
 const all=[...first.rows,...c.rows];assert.equal(all.length,108);assert.equal(new Set(all.map(r=>r.topic_id)).size,36);const coverage=new Map();for(const r of all){const a=coverage.get(r.topic_id)??new Set();assert(!a.has(r.language));a.add(r.language);coverage.set(r.topic_id,a);}assert([...coverage.values()].every(s=>s.size===3));
 const seen=[];for(const n of [...PUBLIC_PRIOR,'tune_v0.4_slice1'])for(const r of (await json(D+'provisional_'+n+'.json')).rows??[])if(typeof r.current==='string')seen.push(fp(r));assert.equal(seen.length,2512);
 const flags=[];for(const r of c.rows){const now=fp(r);for(const old of seen){assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);let common=0;for(const t of now.grams)if(old.grams.has(t))common++;const similarity=common/(now.grams.size+old.grams.size-common||1);if(now.hash===old.hash||now.current===old.current||similarity>=.55)flags.push({left:old.id,right:now.id,similarity});}seen.push(now);}
 assert.deepEqual(flags,[]);const screen=m.public_overlap_screens[1];assert.equal(screen.prior_explicit_public_rows,2512);assert.deepEqual(screen.flags,flags);assert.equal(screen.sealed_test_fingerprints_available,false);assert.equal(screen.no_sealed_test_overlap_claim,false);
});

test('slice3 adds108 original inputs for36 Topics; immutable prior slices, actual cumulative gaps and public screen remain honest',async()=>{
 const c=await json(D+'provisional_tune_v0.4_slice3.json'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json'),first=await json(D+'provisional_tune_v0.4_slice1.json'),second=await json(D+'provisional_tune_v0.4_slice2.json');
 const entries=m.splits.TUNE_PROVISIONAL.slices;assert.equal(entries.length,5);
 assert.equal(entries[0].sha256,'0f8206c34c0b401f5fe407e7cba16fc99ef1410f4c3afd582bd222847dd9e594');assert.equal(entries[1].sha256,'8f151986e57e3b2a2fdec23ec878e1a7587af8ada7121905ac6f812f935a777d');
 for(const e of entries)assert.equal(e.sha256,sha(await read(e.path)));assert.equal(entries[2].path,D+'provisional_tune_v0.4_slice3.json');assert.equal(entries[2].rows,108);
 const topics=parsePinnedCatalog(await read('catalog/system_topic_catalog_v0.2.yaml')),domains=new Map();for(const t of topics){const a=domains.get(t.domain)??[];a.push(t.id);domains.set(t.domain,a);}
 assert.deepEqual([...new Set(c.rows.map(r=>r.topic_id))],[...domains.values()].flatMap(a=>a.slice(2,4)));
 assert.equal(c.schema,'ZMR-PROVISIONAL-TUNE-V04-SLICE-3');assert.equal(c.row_count,108);assert.equal(c.rows.length,108);assert.equal(c.topic_count,36);assert.equal(c.missing_topics,108);assert.equal(c.domain_count,18);assert.equal(c.topic_universe,144);
 assert.equal(c.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(c.intake_status,'PARTIAL_PUBLIC_TUNE_V04_FROZEN_NOT_EVALUATION_ADMITTED');assert.equal(c.evaluation_status,'UNRUN_NO_ROUTER_PREDICTIONS');assert.equal(c.qualification_credit_rows,0);assert.equal(c.independent_source_cohorts,0);
 const old=[...first.rows,...second.rows],ids=new Set(old.map(r=>r.id)),lang={};
 for(const r of c.rows){assert(!ids.has(r.id));ids.add(r.id);assert.equal(r.id,r.row_id);assert.equal(r.source_id,'writer-tune-v04-slice3-20260930');assert.equal(r.authoring_batch,'ZMR-DEV-V04-TUNE-SLICE3-20260930');
  for(const field of ['split','exposure','writer_id','writer_cohort','source_family','source_license_status','generation_id','qualification_credit_rows','annotation_state','review_status','identifiability_state','boundary_review_status','span_offset_unit','catalog_sha256'])assert.equal(r[field],first.rows[0][field]);
  assert.equal(r.scenario_id,r.id);assert.equal(r.scenario_family,r.id);assert.equal(r.template_family,r.id);assert.equal(r.translation_family,null);assert.equal(r.paraphrase_family,null);
  assert.equal(r.expected_state,'ASSIGNED');assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);assert.deepEqual(r.excluded_topics,[]);assert.equal(r.title,'');assert.deepEqual(r.recent,[]);assert(r.current.length>=30);
  assert.equal(r.provisional_evidence_spans.length,2);assert(r.provisional_evidence_spans.some(s=>s.role==='OBJECT'&&s.text.length<r.current.length));for(const span of r.provisional_evidence_spans){assert.equal(span.source,'current');assert(span.start>=0&&span.end>span.start&&span.end<=r.current.length);assert.equal(r.current.slice(span.start,span.end),span.text);}
  assert.deepEqual(r.fingerprints,fingerprintBundle({current:r.current,title:r.title,recent:r.recent}));assert(['zh','en','mixed'].includes(r.language));if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));lang[r.language]=(lang[r.language]??0)+1;
 }
 assert.deepEqual(lang,{zh:36,en:36,mixed:36});assert.deepEqual(lang,c.language_counts);
 const all=[...old,...c.rows],coverage=new Map(),counts={};for(const r of all){const set=coverage.get(r.topic_id)??new Set();assert(!set.has(r.language));set.add(r.language);coverage.set(r.topic_id,set);counts[r.language]=(counts[r.language]??0)+1;}
 assert.equal(all.length,216);assert.equal(coverage.size,72);assert([...coverage.values()].every(s=>s.size===3));assert.deepEqual(counts,{zh:72,en:72,mixed:72});assert.equal(144-coverage.size,72);assert.equal(432-all.length,216);
 const seen=[];for(const n of [...PUBLIC_PRIOR,'tune_v0.4_slice1','tune_v0.4_slice2'])for(const r of (await json(D+'provisional_'+n+'.json')).rows??[])if(typeof r.current==='string')seen.push(fp(r));assert.equal(seen.length,2566);
 const flags=[];for(const r of c.rows){const now=fp(r);for(const old of seen){assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);let common=0;for(const t of now.grams)if(old.grams.has(t))common++;const similarity=common/(now.grams.size+old.grams.size-common||1);if(now.hash===old.hash||now.current===old.current||similarity>=.55)flags.push({left:old.id,right:now.id,similarity});}seen.push(now);}
 assert.deepEqual(flags,[]);const screen=m.public_overlap_screens[2];assert.equal(screen.prior_explicit_public_rows,2566);assert.deepEqual(screen.flags,flags);assert.equal(screen.sealed_test_fingerprints_available,false);assert.equal(screen.no_sealed_test_overlap_claim,false);
});

test('slice4 adds108 original inputs for36 Topics; all frozen predecessors and cumulative108-topic gaps remain explicit',async()=>{
 const c=await json(D+'provisional_tune_v0.4_slice4.json'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json'),first=await json(D+'provisional_tune_v0.4_slice1.json'),second=await json(D+'provisional_tune_v0.4_slice2.json'),third=await json(D+'provisional_tune_v0.4_slice3.json');
 const entries=m.splits.TUNE_PROVISIONAL.slices;assert.equal(entries.length,5);
 assert.equal(entries[0].sha256,'0f8206c34c0b401f5fe407e7cba16fc99ef1410f4c3afd582bd222847dd9e594');assert.equal(entries[1].sha256,'8f151986e57e3b2a2fdec23ec878e1a7587af8ada7121905ac6f812f935a777d');
 assert.equal(entries[2].sha256,'dc80858b254dd5d7b77949e81b559a94721b317801a1b24bcd8642b95728a4a6');
 for(const e of entries)assert.equal(e.sha256,sha(await read(e.path)));assert.equal(entries[3].path,D+'provisional_tune_v0.4_slice4.json');assert.equal(entries[3].rows,108);
 const topics=parsePinnedCatalog(await read('catalog/system_topic_catalog_v0.2.yaml')),domains=new Map();for(const t of topics){const a=domains.get(t.domain)??[];a.push(t.id);domains.set(t.domain,a);}
 assert.deepEqual([...new Set(c.rows.map(r=>r.topic_id))],[...domains.values()].flatMap(a=>a.slice(4,6)));
 assert.equal(c.schema,'ZMR-PROVISIONAL-TUNE-V04-SLICE-4');assert.equal(c.row_count,108);assert.equal(c.rows.length,108);assert.equal(c.topic_count,36);assert.equal(c.missing_topics,108);assert.equal(c.domain_count,18);assert.equal(c.topic_universe,144);
 assert.equal(c.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(c.intake_status,'PARTIAL_PUBLIC_TUNE_V04_FROZEN_NOT_EVALUATION_ADMITTED');assert.equal(c.evaluation_status,'UNRUN_NO_ROUTER_PREDICTIONS');assert.equal(c.qualification_credit_rows,0);assert.equal(c.independent_source_cohorts,0);
 const old=[...first.rows,...second.rows,...third.rows],ids=new Set(old.map(r=>r.id)),lang={};
 for(const r of c.rows){assert(!ids.has(r.id));ids.add(r.id);assert.equal(r.id,r.row_id);assert.equal(r.source_id,'writer-tune-v04-slice4-20260930');assert.equal(r.authoring_batch,'ZMR-DEV-V04-TUNE-SLICE4-20260930');
  for(const field of ['split','exposure','writer_id','writer_cohort','source_family','source_license_status','generation_id','qualification_credit_rows','annotation_state','review_status','identifiability_state','boundary_review_status','span_offset_unit','catalog_sha256'])assert.equal(r[field],first.rows[0][field]);
  assert.equal(r.scenario_id,r.id);assert.equal(r.scenario_family,r.id);assert.equal(r.template_family,r.id);assert.equal(r.translation_family,null);assert.equal(r.paraphrase_family,null);
  assert.equal(r.expected_state,'ASSIGNED');assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);assert.deepEqual(r.excluded_topics,[]);assert.equal(r.title,'');assert.deepEqual(r.recent,[]);assert(r.current.length>=30);
  assert.equal(r.provisional_evidence_spans.length,2);assert(r.provisional_evidence_spans.some(s=>s.role==='OBJECT'&&s.text.length<r.current.length));for(const span of r.provisional_evidence_spans){assert.equal(span.source,'current');assert(span.start>=0&&span.end>span.start&&span.end<=r.current.length);assert.equal(r.current.slice(span.start,span.end),span.text);}
  assert.deepEqual(r.fingerprints,fingerprintBundle({current:r.current,title:r.title,recent:r.recent}));assert(['zh','en','mixed'].includes(r.language));if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));lang[r.language]=(lang[r.language]??0)+1;
 }
 assert.deepEqual(lang,{zh:36,en:36,mixed:36});assert.deepEqual(lang,c.language_counts);
 const all=[...old,...c.rows],coverage=new Map(),counts={};for(const r of all){const set=coverage.get(r.topic_id)??new Set();assert(!set.has(r.language));set.add(r.language);coverage.set(r.topic_id,set);counts[r.language]=(counts[r.language]??0)+1;}
 assert.equal(all.length,324);assert.equal(coverage.size,108);assert([...coverage.values()].every(s=>s.size===3));assert.deepEqual(counts,{zh:108,en:108,mixed:108});assert.equal(144-coverage.size,36);assert.equal(432-all.length,108);
 const seen=[];for(const n of [...PUBLIC_PRIOR,'tune_v0.4_slice1','tune_v0.4_slice2','tune_v0.4_slice3'])for(const r of (await json(D+'provisional_'+n+'.json')).rows??[])if(typeof r.current==='string')seen.push(fp(r));assert.equal(seen.length,2674);
 const flags=[];for(const r of c.rows){const now=fp(r);for(const old of seen){assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);let common=0;for(const t of now.grams)if(old.grams.has(t))common++;const similarity=common/(now.grams.size+old.grams.size-common||1);if(now.hash===old.hash||now.current===old.current||similarity>=.55)flags.push({left:old.id,right:now.id,similarity});}seen.push(now);}
 assert.deepEqual(flags,[]);const screen=m.public_overlap_screens[3];assert.equal(screen.prior_explicit_public_rows,2674);assert.deepEqual(screen.flags,flags);assert.equal(screen.sealed_test_fingerprints_available,false);assert.equal(screen.no_sealed_test_overlap_claim,false);
});

test('slice5 completes ordinary432-input/full144 TUNE authoring; CAL, safety and qualification remain incomplete',async()=>{
 const c=await json(D+'provisional_tune_v0.4_slice5.json'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json'),first=await json(D+'provisional_tune_v0.4_slice1.json'),second=await json(D+'provisional_tune_v0.4_slice2.json'),third=await json(D+'provisional_tune_v0.4_slice3.json'),fourth=await json(D+'provisional_tune_v0.4_slice4.json');
 const entries=m.splits.TUNE_PROVISIONAL.slices;assert.equal(entries.length,5);
 assert.equal(entries[0].sha256,'0f8206c34c0b401f5fe407e7cba16fc99ef1410f4c3afd582bd222847dd9e594');assert.equal(entries[1].sha256,'8f151986e57e3b2a2fdec23ec878e1a7587af8ada7121905ac6f812f935a777d');
 assert.equal(entries[2].sha256,'dc80858b254dd5d7b77949e81b559a94721b317801a1b24bcd8642b95728a4a6');
 assert.equal(entries[3].sha256,'0689ab4b5d91304f673af05da49ab26295bc601b8d3a2cdd34cd7eec2582deec');
 for(const e of entries)assert.equal(e.sha256,sha(await read(e.path)));assert.equal(entries[4].path,D+'provisional_tune_v0.4_slice5.json');assert.equal(entries[4].rows,108);
 const topics=parsePinnedCatalog(await read('catalog/system_topic_catalog_v0.2.yaml')),domains=new Map();for(const t of topics){const a=domains.get(t.domain)??[];a.push(t.id);domains.set(t.domain,a);}
 assert.deepEqual([...new Set(c.rows.map(r=>r.topic_id))],[...domains.values()].flatMap(a=>a.slice(6,8)));
 assert.equal(c.schema,'ZMR-PROVISIONAL-TUNE-V04-SLICE-5');assert.equal(c.row_count,108);assert.equal(c.rows.length,108);assert.equal(c.topic_count,36);assert.equal(c.missing_topics,108);assert.equal(c.domain_count,18);assert.equal(c.topic_universe,144);
 assert.equal(c.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');assert.equal(c.intake_status,'PARTIAL_PUBLIC_TUNE_V04_FROZEN_NOT_EVALUATION_ADMITTED');assert.equal(c.evaluation_status,'UNRUN_NO_ROUTER_PREDICTIONS');assert.equal(c.qualification_credit_rows,0);assert.equal(c.independent_source_cohorts,0);
 const old=[...first.rows,...second.rows,...third.rows,...fourth.rows],ids=new Set(old.map(r=>r.id)),lang={};
 for(const r of c.rows){assert(!ids.has(r.id));ids.add(r.id);assert.equal(r.id,r.row_id);assert.equal(r.source_id,'writer-tune-v04-slice5-20260930');assert.equal(r.authoring_batch,'ZMR-DEV-V04-TUNE-SLICE5-20260930');
  for(const field of ['split','exposure','writer_id','writer_cohort','source_family','source_license_status','generation_id','qualification_credit_rows','annotation_state','review_status','identifiability_state','boundary_review_status','span_offset_unit','catalog_sha256'])assert.equal(r[field],first.rows[0][field]);
  assert.equal(r.scenario_id,r.id);assert.equal(r.scenario_family,r.id);assert.equal(r.template_family,r.id);assert.equal(r.translation_family,null);assert.equal(r.paraphrase_family,null);
  assert.equal(r.expected_state,'ASSIGNED');assert.deepEqual(r.provisional_gold_topics,[r.topic_id]);assert.deepEqual(r.excluded_topics,[]);assert.equal(r.title,'');assert.deepEqual(r.recent,[]);assert(r.current.length>=30);
  assert.equal(r.provisional_evidence_spans.length,2);assert(r.provisional_evidence_spans.some(s=>s.role==='OBJECT'&&s.text.length<r.current.length));for(const span of r.provisional_evidence_spans){assert.equal(span.source,'current');assert(span.start>=0&&span.end>span.start&&span.end<=r.current.length);assert.equal(r.current.slice(span.start,span.end),span.text);}
  assert.deepEqual(r.fingerprints,fingerprintBundle({current:r.current,title:r.title,recent:r.recent}));assert(['zh','en','mixed'].includes(r.language));if(r.language==='mixed')assert(/\p{Script=Han}/u.test(r.current)&&/[A-Za-z]/u.test(r.current));lang[r.language]=(lang[r.language]??0)+1;
 }
 assert.deepEqual(lang,{zh:36,en:36,mixed:36});assert.deepEqual(lang,c.language_counts);
 const all=[...old,...c.rows],coverage=new Map(),counts={};for(const r of all){const set=coverage.get(r.topic_id)??new Set();assert(!set.has(r.language));set.add(r.language);coverage.set(r.topic_id,set);counts[r.language]=(counts[r.language]??0)+1;}
 assert.equal(all.length,432);assert.equal(coverage.size,144);assert.deepEqual([...coverage.keys()].sort(),topics.map(t=>t.id).sort());assert([...coverage.values()].every(s=>s.size===3));assert.deepEqual(counts,m.splits.TUNE_PROVISIONAL.language_counts);assert.equal(144-coverage.size,m.splits.TUNE_PROVISIONAL.missing_topics);assert.equal(432-all.length,m.splits.TUNE_PROVISIONAL.remaining_ordinary_rows);
 const seen=[];for(const n of [...PUBLIC_PRIOR,'tune_v0.4_slice1','tune_v0.4_slice2','tune_v0.4_slice3','tune_v0.4_slice4'])for(const r of (await json(D+'provisional_'+n+'.json')).rows??[])if(typeof r.current==='string')seen.push(fp(r));assert.equal(seen.length,2782);
 const flags=[];for(const r of c.rows){const now=fp(r);for(const old of seen){assert.notEqual(now.scenario,old.scenario);assert.notEqual(now.template,old.template);let common=0;for(const t of now.grams)if(old.grams.has(t))common++;const similarity=common/(now.grams.size+old.grams.size-common||1);if(now.hash===old.hash||now.current===old.current||similarity>=.55)flags.push({left:old.id,right:now.id,similarity});}seen.push(now);}
 assert.deepEqual(flags,[]);const screen=m.public_overlap_screens[4];assert.equal(screen.prior_explicit_public_rows,2782);assert.deepEqual(screen.flags,flags);assert.equal(screen.sealed_test_fingerprints_available,false);assert.equal(screen.no_sealed_test_overlap_claim,false);
});
