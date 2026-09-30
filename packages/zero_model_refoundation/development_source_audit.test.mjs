import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';
import {auditDevelopmentSources,ORDINARY_QUOTAS,SAFETY_QUOTAS} from './development_source_audit.mjs';
import {canonicalJSON} from './contracts.mjs';
const ROOT=new URL('../../',import.meta.url),D='data/zero_model_refoundation/development/';
const read=p=>readFile(new URL(p,ROOT)),json=async p=>JSON.parse(await read(p)),sha=x=>createHash('sha256').update(x).digest('hex');
const resultPath='docs/zero-model-refoundation-v1/ZMR-03_DEV_V04_SOURCE_AUDIT_RESULT.json';
async function frozenSources(){const result=await json(resultPath),catalog=await read('catalog/system_topic_catalog_v0.2.yaml'),m=await json(D+'provisional_ordinary_dev_v0.4_manifest.json');assert.equal(sha(catalog),m.catalog_sha256);
 const expected=[...m.splits.TUNE_PROVISIONAL.slices,...m.splits.CAL_PROVISIONAL.slices,...m.safety_slices],packets=[];assert.deepEqual(result.source_packets.map(x=>x.path),expected.map(x=>x.path));
 for(const e of expected){assert(e.path.startsWith(D+'provisional_'));const bytes=await read(e.path),pin=result.source_packets.find(x=>x.path===e.path);assert.equal(sha(bytes),e.sha256);assert.equal(pin.sha256,e.sha256);assert.equal(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),pin.git_blob);packets.push({path:e.path,data:JSON.parse(bytes)});}
 return {result,manifest:m,args:{topics:parsePinnedCatalog(catalog),packets,catalog_sha256:m.catalog_sha256}};
}

test('source audit reproduces1200 frozen DEV inputs and formal quota deficits without qualifying writer evidence',async()=>{
 const {args,result,manifest}=await frozenSources(),actual=auditDevelopmentSources(args);assert.equal(canonicalJSON(actual),canonicalJSON(result.audit));assert.equal(canonicalJSON(actual),canonicalJSON(auditDevelopmentSources(args)));
 assert.deepEqual(result.engineering_dependencies.map(x=>x.path),['packages/zero_model_refoundation/development_source_audit.mjs','packages/zero_model_refoundation/contracts.mjs','packages/zero_model_refoundation/fingerprints.mjs']);for(const dep of result.engineering_dependencies)assert.equal(sha(await read(dep.path)),dep.sha256);
 assert.equal(actual.rows,1200);assert.equal(actual.ordinary_rows,864);assert.equal(actual.safety_physical_rows,336);assert.equal(actual.context_pairs,96);assert.equal(actual.full144_ordinary_topics,144);
 assert.deepEqual(actual.formal_ordinary_shortfall,{rows:864,languages:{zh:576,en:288,mixed:0},required_per_topic:{per_topic:12,zh:6,en:4,mixed:2}});assert.deepEqual(actual.formal_safety_shortfall,{control_rows:204,context_required_pairs:96,context_invariance_pairs:96,multi_rows:96});
 assert.equal(actual.declared_lineage_components,1);assert.equal(actual.cross_split_components,1);assert.equal(actual.qualification_credit_rows,0);assert.equal(actual.independent_scenarios_credited,0);assert.equal(actual.independent_gold_reviews,0);assert.equal(actual.semantic_evaluations,0);assert.equal(actual.data_qualification,'NOT_QUALIFIED');assert.equal(actual.capability_verdict,'UNTESTED');assert.equal(actual.resource_verdict,'NOT_QUALIFIED');assert.equal(actual.no_sealed_overlap_claim,false);assert.equal(manifest.splits.CAL_PROVISIONAL.candidate_prediction_exposures,0);
 assert.equal(actual.whole_current_goal_span_rows,1056);assert.equal(actual.empty_excluded_set_rows,1200);assert.equal(actual.role_span_semantic_review,'NOT_PROVISIONED_NO_PASS');assert.equal(actual.literal_name_presence.CAL_PROVISIONAL.literal_presence_rows,142);assert.equal(actual.literal_name_presence.CAL_PROVISIONAL.adjudication,'NOT_ADJUDICATED_NO_PASS');assert.equal(actual.literal_name_presence.CAL_PROVISIONAL.formal_name_echo_limit,.1);
});

test('source audit explains43 flag references by real pair graph without deduplicating variants or inventing semantic review',async()=>{
 const {args}=await frozenSources(),a=auditDevelopmentSources(args);assert.equal(a.public_review_flags,43);assert.equal(a.structurally_explained_pair_flags,43);assert.equal(a.flag_relations.length,43);assert(a.flag_relations.every(f=>f.classification==='STRUCTURAL_PAIR_MATCH_ONLY_SEMANTIC_REVIEW_PENDING'));assert.equal(a.independent_semantic_flag_reviews,0);assert.deepEqual(a.exact_normalized_bundle_duplicates,[]);
 const changed=structuredClone(args);const withFlags=changed.packets.find(p=>p.data.public_screen?.flags.length);withFlags.data.public_screen.flags[0].right=changed.packets[0].data.rows[0].id;assert.throws(()=>auditDevelopmentSources(changed),/unexplained or misclassified/);
 const orphan=structuredClone(args);orphan.packets.find(p=>p.data.pairs?.length).data.pairs.pop();assert.throws(()=>auditDevelopmentSources(orphan),/unexplained|orphan/);
});

test('source audit rejects hidden positive credit, predictions, damaged provenance, altered bundles and wrong offsets',async()=>{
 const {args}=await frozenSources();for(const [change,error]of [
  [a=>a.packets[0].data.qualification_credit_rows=1,/cannot claim independence/],
  [a=>a.packets.at(-1).data.candidate_prediction_exposures=1,/pre-prediction/],
  [a=>a.packets[0].data.rows[0].source_id='',/source provenance/],
  [a=>a.packets[0].data.rows[0].current+='x',/fingerprint/],
  [a=>a.packets[0].data.rows[0].provisional_evidence_spans[0].end--,/UTF16/],
  [a=>a.topics.pop(),/full144/],
  [a=>a.packets[0].data.rows[0].excluded_topics=[a.packets[0].data.rows[0].topic_id],/exclusions/],
  [a=>a.packets.at(-1).data.rows.find(r=>r.kind==='multi').provisional_gold_topics.pop(),/multi needs multiple/],
  [a=>a.packets.at(-1).data.rows[0].kind='unknown',/unknown safety layer/],
  [a=>a.packets[0].data.rows[0].provisional_evidence_spans=[],/missing provisional roles/]
 ]){const mutated=structuredClone(args);change(mutated);assert.throws(()=>auditDevelopmentSources(mutated),error);}
 assert.deepEqual(ORDINARY_QUOTAS,{per_topic:12,zh:6,en:4,mixed:2});assert.deepEqual(SAFETY_QUOTAS,{control_rows:300,context_required_pairs:144,context_invariance_pairs:144,multi_rows:144});
});

test('full native bundle fingerprints distinguish same-current pair variants',async()=>{
 const {args}=await frozenSources(),s=args.packets.find(p=>p.data.pairs?.length).data,p=s.pairs[0],a=s.rows.find(r=>r.id===p.base_id),b=s.rows.find(r=>r.id===p.variant_id);assert.equal(a.current,b.current);assert.equal(a.fingerprints.current_sha256,b.fingerprints.current_sha256);assert.notEqual(a.fingerprints.bundle_sha256,b.fingerprints.bundle_sha256);
 const mutated=structuredClone(args),data=mutated.packets.find(p=>p.data.pairs?.length).data,variant=data.rows.find(r=>r.id===data.pairs[0].variant_id);variant.recent=[...data.rows.find(r=>r.id===data.pairs[0].base_id).recent];variant.fingerprints=fingerprintBundle({current:variant.current,title:variant.title,recent:variant.recent});assert.throws(()=>auditDevelopmentSources(mutated),/concrete context deletion/);
});
