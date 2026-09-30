import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalJSON} from './contracts.mjs';
import {assertDevelopmentCompetition} from './competition_budget.mjs';
import {auditHistoricalDefaults,parseLiteralOptions} from './historical_defaults_audit.mjs';
const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
async function fixture(){
 const receipt=JSON.parse(await read('docs/zero-model-refoundation-v1/ZMR-06_HISTORICAL_DEFAULTS_AUDIT_RESULT.json'));
 const rb=await read(receipt.recipe_path);assert.equal(sha(rb),receipt.recipe_sha256);const recipe=JSON.parse(rb);
 const ab=await read(recipe.identity_audit_path);assert.equal(blob(ab),recipe.identity_audit_git_blob);assert.equal(sha(ab),recipe.identity_audit_sha256);
 const sources={};for(const d of recipe.code_dependencies){assert(/^packages\/zero_model_refoundation\/[a-z0-9_]+\.mjs$/.test(d.path));const b=await read(d.path);assert.equal(blob(b),d.git_blob);assert.equal(sha(b),d.sha256);sources[d.path]=b.toString();}
 for(const d of receipt.engineering_dependencies)assert.equal(sha(await read(d.path)),d.sha256);
 return {receipt,args:{identity_audit:JSON.parse(ab).audit,entries:recipe.entries,sources}};
}
test('actual14 entry declarations and53 configs show explicit parameters and23 direct identities without budget clearance',async()=>{
 const {receipt,args}=await fixture(),a=auditHistoricalDefaults(args);assert.equal(canonicalJSON(a),canonicalJSON(receipt.audit));assert.equal(canonicalJSON(a),canonicalJSON(auditHistoricalDefaults(args)));
 assert.equal(a.reviewed_runtime_entries,14);assert.equal(a.non_A0_configuration_mentions,53);assert.equal(a.raw_static_identity_count,29);assert.equal(a.normalized_direct_route_index_options_identities,23);assert.equal(a.default_parameter_values_applied,0);assert.equal(a.configuration_mentions_with_omitted_feature_mode,18);
 for(const group of a.alias_groups){const members=a.mentions.filter(x=>x.normalized_static_identity_sha256===group.sha256);assert.equal(new Set(members.map(x=>x.route_root+':'+x.route_symbol)).size,1);}
 const byRoute=n=>a.mentions.filter(x=>x.route_symbol===n).map(x=>x.normalized_static_identity_sha256);
 assert(!byRoute('routeC1').some(x=>byRoute('routeC1R1').includes(x)));assert(!byRoute('routeA5Composition').some(x=>byRoute('routeA5CompositionR1').includes(x)));assert(!byRoute('routeA6R1').some(x=>byRoute('routeA6R2').includes(x)));
 assert.equal(a.stable_configuration_allowance_remaining,null);assert.equal(a.semantic_evaluations,0);assert.equal(a.source_packet_reads,0);assert.equal(a.independent_generation_credit,0);assert.equal(a.capability_verdict,'UNTESTED');assert.equal(a.resource_verdict,'NOT_QUALIFIED');assert.throws(()=>assertDevelopmentCompetition({},a),/historical accounting unreconciled/);
});
test('literal parsing rejects dynamic code, unsafe keys and nonfinite values without executing source',()=>{
 assert.deepEqual(parseLiteralOptions("catalog_sha256,method='tfidf',min_score=.15,min_margin=.02"),{fields:['catalog_sha256','method','min_score','min_margin'],defaults:{method:'tfidf',min_score:.15,min_margin:.02},required:['catalog_sha256']});
 for(const d of ['score=doWork()','score=Infinity','score=NaN','score=1e999','...opts','score=1,score=2','__proto__=1','constructor=1',"method='tfidf',x=process.exit()"]){assert.throws(()=>parseLiteralOptions(d),/dynamic, duplicate or unsafe/);}
});
test('original source and callsite identity, literal anchors and forwarding graph cannot be silently rewritten',async()=>{
 const {args}=await fixture();for(const [change,error] of [
  [x=>x.sources['packages/zero_model_refoundation/a1.mjs']+='changed',/source mismatch/],
  [x=>x.sources['packages/zero_model_refoundation/a12_challenge_compare.mjs']+='changed',/callsite pin/],
  [x=>x.entries[0].source_anchor+='changed',/entry anchor/],
  [x=>x.entries[0].declaration='catalog_sha256,min_score=doWork()',/entry anchor/],
  [x=>x.entries.find(e=>e.route_symbol==='routeA5CompositionR1').forward_anchor='return other(options);',/forwarding source anchor/],
  [x=>x.entries.find(e=>e.route_symbol==='routeA5CompositionR1').parent_key='missing',/reviewed route/],
  [x=>x.entries.find(e=>e.route_symbol==='routeA5CompositionR1').parent_key='packages/zero_model_refoundation/a5_composition_r1.mjs:routeA5CompositionR1',/default cycle/],
  [x=>x.entries.find(e=>e.route_symbol==='routeA6R2').local_anchor+='changed',/local options anchor/],
  [x=>x.entries.push({...x.entries[0]}),/duplicate reviewed/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>auditHistoricalDefaults(m),error);}
});
test('full source evidence and raw parameters remain immutable inputs rather than fabricated default or repair allocations',async()=>{
 const {args}=await fixture();const first=x=>x.identity_audit.events[0].configurations.find(c=>c.registered_family==='A1');
 for(const [change,error] of [
  [x=>first(x).parameters.extra_rule=1,/unreviewed registered/],
  [x=>first(x).parameters.min_score=NaN,/explicit parameter/],
  [x=>first(x).parameters.mode='word',/explicit mode/],
  [x=>first(x).runtime_pins[0].sha256='a'.repeat(64),/runtime pin/],
  [x=>first(x).index_receipt_bindings[0].index_sha256='bad',/index binding/],
  [x=>x.identity_audit.capability_verdict='PASS',/evidence boundary/],
  [x=>x.identity_audit.independent_generation_credit=1,/evidence boundary/],
  [x=>x.identity_audit.stable_configuration_allowance_remaining=12,/evidence boundary/]
 ]){const m=structuredClone(args);change(m);assert.throws(()=>auditHistoricalDefaults(m),error);}
});
