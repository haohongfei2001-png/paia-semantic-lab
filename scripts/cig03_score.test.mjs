import test from 'node:test';
import assert from 'node:assert/strict';
import { score } from './cig03_score.mjs';
const A='stub.alpha',B='stub.beta',d0='0'.repeat(64),d1='1'.repeat(64);
function fixture(){
 const packet={topic_ids:[A,B],single_label:[{id:'s1',gold:{state:'ASSIGN',topics:[A]}},{id:'s2',gold:{state:'ASSIGN',topics:[B]}}],
 context:[{id:'c1',gold:{state:'ASSIGN',topics:[A]}}],controls:[{id:'k1',gold:{state:'DEFER',topics:[]}}]};
 const D=(state,topics,raw_output_digest=d0)=>({state,topics,raw_output_digest});
 const predictions={single_label:[{id:'s1',...D('ASSIGN',[A])},{id:'s2',...D('ASSIGN',[B])}],context:[{id:'c1',base:D('ASSIGN',[A]),perturbed:D('ASSIGN',[A])}],
 controls:[{id:'k1',...D('DEFER',[])}],repeats:[]};
 sync(predictions);return {packet,predictions};
}
function sync(p){p.repeats=[...p.single_label.map(r=>({id:r.id,first:{...r},second:{...r}})),...p.context.flatMap(r=>[{id:r.id+'-base',first:{...r.base},second:{...r.base}},{id:r.id+'-perturbed',first:{...r.perturbed},second:{...r.perturbed}}]),...p.controls.map(r=>({id:r.id,first:{...r},second:{...r}}))];}
test('perfect semantic-free stub',()=>{const {packet,predictions}=fixture();assert.equal(score(packet,predictions).passed,true);});
test('zero assignments precision is zero',()=>{const {packet,predictions:p}=fixture();for(const r of p.single_label)Object.assign(r,{state:'DEFER',topics:[]});for(const r of p.context){r.base={state:'DEFER',topics:[],raw_output_digest:d0};r.perturbed={...r.base};}sync(p);const r=score(packet,p);assert.equal(r.metrics.assigned_precision,0);assert.equal(r.metrics.full144_macro_recall,0);assert.equal(r.passed,false);});
test('wrong and multi-topic assign count as misses',()=>{const {packet,predictions:p}=fixture();p.single_label[0].topics=[A,B];sync(p);const r=score(packet,p);assert.equal(r.metrics.full144_macro_recall,.5);assert.equal(r.metrics.assigned_precision,.5);});
test('unsupported control assignment penalizes safety without changing single precision',()=>{const {packet,predictions:p}=fixture();Object.assign(p.controls[0],{state:'ASSIGN',topics:[A]});sync(p);const r=score(packet,p);assert.equal(r.metrics.controls_false_assignment,1);assert.equal(r.metrics.assigned_precision,1);assert.equal(r.diagnostics.overall_assigned_precision,.8);});
test('context compares complete output digest despite equal topic sets',()=>{const {packet,predictions:p}=fixture();p.context[0].perturbed.raw_output_digest=d1;sync(p);assert.equal(score(packet,p).metrics.context_harm,1);});
test('repeat includes defer and detects native digest difference',()=>{const {packet,predictions:p}=fixture();p.repeats.at(-1).second.raw_output_digest=d1;assert.equal(score(packet,p).metrics.deterministic_repeat,'FAIL');});
test('repeat initial must match scored observation',()=>{const {packet,predictions:p}=fixture();p.repeats[0].first.raw_output_digest=d1;p.repeats[0].second.raw_output_digest=d1;assert.equal(score(packet,p).metrics.deterministic_repeat,'FAIL');});
test('missing duplicate or malformed prediction rejected safely',()=>{for(const mode of ['missing','duplicate','invalid']){const {packet,predictions:p}=fixture();if(mode==='missing')p.repeats.pop();if(mode==='duplicate')p.single_label[1].id='s1';if(mode==='invalid')p.single_label[0].raw_output_digest='bad';assert.throws(()=>score(packet,p),Error);}});
test('macro keeps uncovered universe Topics in denominator',()=>{const {packet,predictions}=fixture();packet.topic_ids.push('stub.gamma');assert.equal(score(packet,predictions).metrics.full144_macro_recall,2/3);});
