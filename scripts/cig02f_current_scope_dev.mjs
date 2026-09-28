// Fresh same-writer public/synthetic engineering controls, not independent TEST.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createMinimalTopicRouter} from '../runtime/compositional_intent_graph_v1/minimal_topic_router.mjs';
const indexPath=process.argv[2]??'.cig02e-index.json';
const maskPath='artifacts/compositional-intent-graph-v1/CIG-02_SOURCE_READINESS_FREEZE.json';
const indexBytes=fs.readFileSync(indexPath),maskBytes=fs.readFileSync(maskPath);
const index=JSON.parse(indexBytes),mask=JSON.parse(maskBytes);
const router=createMinimalTopicRouter(index,mask);
const byId=new Map(index.topics.map(t=>[t.topic_id,t]));
const counts={positive_direct:{ASSIGNED:0,DEFER:0},negative_scope:{ASSIGNED:0,DEFER:0},
  context_mismatches:0,repeat_mismatches:0};
const cases=[];
for(const row of mask.topics.filter(t=>t.readiness==='SPARSE')){
  const topic=byId.get(row.topic_id),name=topic.names.en,zh=topic.names.zh;
  const probes=[
    {kind:'positive_direct',current:'I want to explore '+name+'.'},
    {kind:'positive_direct',current:'Could you help me with '+name+'?'},
    {kind:'negative_scope',current:'Please do not help me with '+name,reason:'NEGATED_CURRENT_SCOPE'},
    {kind:'negative_scope',current:"Please don't help me with "+name,reason:'NEGATED_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'我不想处理'+zh,reason:'NEGATED_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'Please read the quote "'+name+'" aloud.',reason:'QUOTED_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'请朗读「'+zh+'」',reason:'QUOTED_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'My friend says they want to explore '+name+'.',reason:'REPORTED_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'If I want to explore '+name+', what would happen?',reason:'CONDITIONAL_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'Please explain whether I should want to explore '+name+'.',reason:'CONDITIONAL_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'Please read this note. I want to explore '+name+'.',reason:'MULTI_SENTENCE_CURRENT_SCOPE'},
    {kind:'negative_scope',current:'A plan to explore '+name+' was mentioned.',reason:'UNSUPPORTED_CURRENT_GOAL_SCOPE'}
  ];
  for(const probe of probes){
    const result=router.classify({current:probe.current});
    if(probe.kind==='positive_direct')assert.deepEqual(result.topics,[row.topic_id],probe.current);
    else assert.deepEqual(result,{topics:[],state:'DEFER',reason:probe.reason},probe.current);
    counts[probe.kind][result.state]++;
    if(JSON.stringify(result)!==JSON.stringify(router.classify({current:probe.current,context:'Please help me with '+name})))counts.context_mismatches++;
    if(JSON.stringify(result)!==JSON.stringify(router.classify({current:probe.current})))counts.repeat_mismatches++;
    cases.push({topic_id:row.topic_id,...probe,result});
  }
}
assert.equal(counts.negative_scope.ASSIGNED,0);
assert.equal(counts.context_mismatches,0);
assert.equal(counts.repeat_mismatches,0);
const runtimePaths=['minimal_topic_router.mjs','frame_grounder.mjs','goal_parser.mjs','current_goal_scope.mjs'].map(p=>'runtime/compositional_intent_graph_v1/'+p);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const runtimeHashes=Object.fromEntries(runtimePaths.map(p=>[p,sha(fs.readFileSync(p))]));
const footprint=indexBytes.length+maskBytes.length+runtimePaths.reduce((n,p)=>n+fs.statSync(p).size,0);
assert.ok(indexBytes.length+maskBytes.length<=1048576);
assert.ok(footprint<=2097152);
const result={format:'CIG02F_CURRENT_SCOPE_DIAGNOSTIC_V1',classification:'SAME_WRITER_PUBLIC_SYNTHETIC_ENGINEERING_NOT_CAPABILITY',
  provenance:{authored_after_baseline:'03756742a39a9e4b74fc089ff7c849bf829ac6f7',source_mask_sha256:sha(maskBytes),index_sha256:sha(indexBytes),runtime_sha256:runtimeHashes},
  counts,cases,index_bytes:indexBytes.length,source_mask_bytes:maskBytes.length,index_and_mask_bytes:indexBytes.length+maskBytes.length,router_plus_index_bytes:footprint,
  independent_gold_rows:0,public_natural_dev_qualified:false,capability_floor_assessed:false,
  memory_or_latency_certified:false,cig02_frozen:false,cig03_started:false};
fs.writeFileSync('.cig02f-current-scope-result.json',JSON.stringify(result,null,2)+'\n');
console.log('CIG02F_CURRENT_SCOPE_DIAGNOSTIC='+JSON.stringify({...result,cases:undefined}));
