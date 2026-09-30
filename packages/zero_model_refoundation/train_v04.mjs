/** Offline frozen provisional TRAIN loader. Metadata engineering only; no fitting or evaluation. */
import {readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
const ROOT=new URL('../../',import.meta.url),DATA='data/zero_model_refoundation/development/';
export const TRAIN_V04_MANIFEST=DATA+'provisional_train_v0.4_manifest.json';
export const TRAIN_V04_SLICES=Object.freeze([1,2,3,4,5].map(n=>DATA+`provisional_train_v0.4_slice${n}.json`));
const CATALOG='catalog/system_topic_catalog_v0.2.yaml',PLAN=DATA+'provisional_train_v0.4_plan.json';
const CATALOG_SHA='29c617a20053042205a9a04e181de95cc000d8b9b137321d0c30a5149f4cff18';
const CLASS='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',COUNTS=[54,54,108,108,108];
export const trainV04Hash=value=>createHash('sha256').update(value).digest('hex');
const must=(ok,message)=>{if(!ok)throw new Error(message);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function trainV04Identity(m){return trainV04Hash(JSON.stringify({catalog_sha256:m.catalog_sha256,plan_sha256:m.plan_sha256,slices:m.slices.map(x=>({path:x.path,sha256:x.sha256})),rows_sha256:m.rows_sha256}));}

/** Reject unapproved paths before any slice content is read. */
export function assertTrainV04Manifest(m){
 must(m?.schema==='ZMR-PROVISIONAL-TRAIN-V04-FREEZE-1','invalid frozen TRAIN schema');
 must(m.evidence_class===CLASS&&m.catalog_sha256===CATALOG_SHA,'invalid evidence/Catalog identity');
 must(m.status==='FULL144_PUBLIC_TRAIN_FROZEN_DEVELOPMENT_ONLY'&&m.evaluation_status==='UNFIT_UNEVALUATED','not a frozen unfit development TRAIN');
 must(m.compiler_admission==='DEVELOPMENT_TRAIN_ONLY_VIA_FROZEN_MANIFEST','invalid compiler admission');
 must(m.row_count===432&&m.topic_count===144&&m.missing_topics===0&&equal(m.language_counts,{zh:144,en:144,mixed:144}),'incomplete full144 development coverage');
 must(m.independent_quota_credit===0&&m.independent_source_cohorts===0&&m.writer_count===1&&m.source_batches===5&&m.lineage_component_count===1,'independence cannot be claimed');
 must(m.grouped_validation==='UNAVAILABLE_SINGLE_WRITER_LINEAGE_COMPONENT','fabricated independent group folds');
 must(m.data_qualification==='NOT_QUALIFIED'&&m.capability_verdict==='UNTESTED'&&m.resource_verdict==='NOT_QUALIFIED','qualification claim forbidden');
 must(equal(m.safety_rows,{control:0,context_required:0,context_invariance:0,multi:0}),'unprovisioned safety quota');
 must(Number.isFinite(Date.parse(m.frozen_at))&&digest(m.plan_sha256)&&digest(m.rows_sha256)&&digest(m.train_sha256),'missing freeze identity');
 must(Array.isArray(m.slices)&&m.slices.length===5,'partial slice manifest');
 m.slices.forEach((x,i)=>must(x.path===TRAIN_V04_SLICES[i]&&digest(x.sha256)&&x.rows===COUNTS[i],'unapproved slice path/order/count'));
 must(trainV04Identity(m)===m.train_sha256,'TRAIN identity mismatch');
 return m;
}

/** Validates one immutable development closure; it cannot authenticate an independent curator. */
export function validateFrozenTrainV04(manifest,catalogBytes,planBytes,sliceBytes){
 const m=assertTrainV04Manifest(manifest);
 must(trainV04Hash(catalogBytes)===CATALOG_SHA,'Catalog bytes changed');
 must(trainV04Hash(planBytes)===m.plan_sha256,'authoring plan changed');
 const topics=parsePinnedCatalog(catalogBytes),ids=new Set(topics.map(t=>t.id)),plan=JSON.parse(planBytes);
 must(plan.evidence_class===CLASS&&plan.catalog_sha256===CATALOG_SHA&&plan.target_original_base_scenarios===432&&plan.independent_quota_credit===0,'invalid bounded plan');
 must(plan.cards.length===144&&new Set(plan.cards.map(x=>x.topic_id)).size===144&&plan.cards.every(x=>ids.has(x.topic_id)),'plan universe mismatch');
 must(sliceBytes instanceof Map&&sliceBytes.size===5,'exact five slice inputs required');
 const rows=[],rowIds=new Set(),scenarios=new Set(),inputs=new Set(),coverage=new Map(),languages={zh:0,en:0,mixed:0};
 m.slices.forEach((entry,i)=>{
  const bytes=sliceBytes.get(entry.path);must(bytes&&trainV04Hash(bytes)===entry.sha256,'slice bytes changed');
  const d=JSON.parse(bytes);
  must(d.schema===`ZMR-PROVISIONAL-TRAIN-V04-SLICE-${i+1}`&&d.evidence_class===CLASS&&d.catalog_sha256===CATALOG_SHA,'slice identity mismatch');
  must(d.rows.length===COUNTS[i]&&d.row_count===COUNTS[i]&&d.evaluation_status==='UNFIT_UNEVALUATED'&&d.qualification_credit_rows===0&&d.independent_source_cohorts===0,'slice count/exposure mismatch');
  must(d.intake_status===`PUBLIC_TRAIN_V04_SLICE${i+1}_FROZEN_NOT_COMPILER_ADMITTED`,'raw partial slice cannot enter compiler');
  for(const r of d.rows){
   must(r.id===r.row_id&&!rowIds.has(r.id)&&r.id.startsWith(`train-v04-s${i+1}-`),'duplicate/mismatched row identity');rowIds.add(r.id);
   must(ids.has(r.topic_id)&&equal(r.provisional_gold_topics,[r.topic_id])&&r.expected_state==='ASSIGNED','invalid provisional label');
   must(r.catalog_sha256===CATALOG_SHA&&r.split==='TRAIN_PROVISIONAL'&&r.exposure==='PUBLIC_TRAIN'&&r.generation_id==='G0_DEV','TRAIN-only exposure required');
   must(r.writer_id==='candidate-writer'&&r.writer_cohort==='candidate-writer-G0'&&r.source_family==='candidate-writer-G0'&&r.source_id===`writer-train-v04-slice${i+1}-20260930`,'same-writer provenance mismatch');
   must(r.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL'&&r.review_status==='UNREVIEWED_PROVISIONAL'&&r.annotation_state==='CANDIDATE_WRITER_UNREVIEWED'&&r.qualification_credit_rows===0,'independent source/review credit forbidden');
   must(r.scenario_id===r.id&&r.scenario_id===r.scenario_family&&r.template_family===r.scenario_family&&!scenarios.has(r.scenario_family)&&r.paraphrase_family===null&&r.translation_family===null,'base lineage collision');scenarios.add(r.scenario_family);
   must(Number.isFinite(Date.parse(r.frozen_at))&&Date.parse(r.frozen_at)<=Date.parse(m.frozen_at),'row not frozen before closure');
   must(typeof r.current==='string'&&r.current.length>=30&&r.title===''&&Array.isArray(r.recent)&&r.recent.length===0,'invalid positive input bundle');
   const inputKey=r.current.normalize('NFKC').toLowerCase();must(!inputs.has(inputKey),'normalized input duplicate');inputs.add(inputKey);
   must(['zh','en','mixed'].includes(r.language)&&r.factors&&['action','object','qualifier'].every(k=>typeof r.factors[k]==='string'&&r.factors[k].length),'missing language/factors');
   const seen=coverage.get(r.topic_id)??new Set();must(!seen.has(r.language),'duplicate Topic language scenario');seen.add(r.language);coverage.set(r.topic_id,seen);languages[r.language]++;
   rows.push(r);
  }
 });
 must(rows.length===432&&coverage.size===144&&[...coverage.values()].every(x=>x.size===3)&&equal(languages,m.language_counts),'full144 positive coverage incomplete');
 must(trainV04Hash(JSON.stringify(rows))===m.rows_sha256,'row order/content identity mismatch');
 // All rows share the same writer and source family, so the formal lineage closure is ONE component.
 return {rows,topics,catalog_sha256:CATALOG_SHA,train_sha256:m.train_sha256,evidence_class:CLASS,independent_quota_credit:0,lineage_component_count:1,grouped_validation:m.grouped_validation};
}
async function regular(p){const url=new URL(p,ROOT),stat=await lstat(url);must(stat.isFile()&&!stat.isSymbolicLink(),'regular explicit-path input required');return readFile(url);}
export async function loadFrozenTrainV04(){
 const manifest=JSON.parse(await regular(TRAIN_V04_MANIFEST));assertTrainV04Manifest(manifest);
 const catalog=await regular(CATALOG),plan=await regular(PLAN),slices=new Map();
 for(const p of TRAIN_V04_SLICES)slices.set(p,await regular(p));
 return validateFrozenTrainV04(manifest,catalog,plan,slices);
}
