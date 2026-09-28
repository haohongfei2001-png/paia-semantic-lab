import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createMinimalTopicRouter} from '../runtime/compositional_intent_graph_v1/minimal_topic_router.mjs';
const indexPath=process.argv[2]??'.cig02e-index.json';
const freezePath='artifacts/compositional-intent-graph-v1/CIG-02_SOURCE_READINESS_FREEZE.json';
const indexBytes=fs.readFileSync(indexPath),freezeBytes=fs.readFileSync(freezePath);
const index=JSON.parse(indexBytes),freeze=JSON.parse(freezeBytes);
const router=createMinimalTopicRouter(index,freeze);
const byId=new Map(index.topics.map(t=>[t.topic_id,t]));
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
function contains(span,phrase){
  if(!phrase)return false;
  if(/^[\x00-\x7f]+$/u.test(phrase)){
    const escaped=phrase.replace(/[.*+?^$()|[\]{}\\]/gu,'\\$&');
    return new RegExp('(^|[^a-z0-9])'+escaped+'($|[^a-z0-9])','u').test(span);
  }
  return span.includes(phrase);
}
const formalNameEchoes=[];
const counts={formal:{ASSIGNED:0,DEFER:0},typed:{ASSIGNED:0,DEFER:0},masked_exact:{ASSIGNED:0,DEFER:0},name_free_typed:{ASSIGNED:0,DEFER:0},context_mismatches:0,repeat_mismatches:0};
for(const row of freeze.topics){
  const topic=byId.get(row.topic_id);
  const current='Please help me with '+topic.names.en;
  const plain=router.classify({current});
  const withContext=router.classify({current,context:'An unrelated topic appeared earlier.'});
  if(JSON.stringify(plain)!==JSON.stringify(withContext))counts.context_mismatches++;
  if(JSON.stringify(plain)!==JSON.stringify(router.classify({current})))counts.repeat_mismatches++;
  if(plain.state==='ASSIGNED'&&(row.readiness!=='SPARSE'||plain.topics[0]!==row.topic_id||plain.evidence?.rule!=='EXACT_FORMAL_NAME'))
    throw Error('unsupported formal assignment');
  const bucket=row.readiness==='DEFER'?counts.masked_exact:counts.formal;
  bucket[plain.state]++;
  if(row.readiness==='DEFER'&&plain.state!=='DEFER')throw Error('masked Topic assigned');
  if(row.readiness==='SPARSE'){
    const typedCurrent='Please '+topic.roles.ACTION.en[0]+' '+topic.roles.OBJECT.en[0];
    const typed=router.classify({current:typedCurrent});
    const span=normalize(typedCurrent);
    const nameHitIds=index.topics.filter(candidate=>
      Object.values(candidate.names).some(name=>contains(span,normalize(name))))
      .map(candidate=>candidate.topic_id);
    if(nameHitIds.length)formalNameEchoes.push({probe_topic_id:row.topic_id,name_hit_topic_ids:nameHitIds,state:typed.state,assigned_topic_id:typed.topics[0]??null});
    else counts.name_free_typed[typed.state]++;
    if(typed.state==='ASSIGNED'&&(typed.evidence?.rule!=='EXACT_FORMAL_NAME'||nameHitIds.length!==1||typed.topics[0]!==nameHitIds[0]||typed.topics[0]!==row.topic_id))
      throw Error('unsupported typed-role probe assignment');
    counts.typed[typed.state]++;
  }
}
const bytes=freezeBytes.length+[indexPath,'runtime/compositional_intent_graph_v1/frame_grounder.mjs','runtime/compositional_intent_graph_v1/goal_parser.mjs','runtime/compositional_intent_graph_v1/minimal_topic_router.mjs','runtime/compositional_intent_graph_v1/current_goal_scope.mjs'].reduce((n,p)=>n+fs.statSync(p).size,0);
if(indexBytes.length+freezeBytes.length>1048576||bytes>2097152||counts.context_mismatches||counts.repeat_mismatches||counts.name_free_typed.ASSIGNED)throw Error('engineering safety gate');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const result={format:'CIG02F_MINIMAL_ROUTER_SYNTHETIC_DIAGNOSTIC_V1',classification:'SAME_SOURCE_SYNTHETIC_ENGINEERING_NOT_CAPABILITY',source_readiness_counts:freeze.counts,probe_counts:counts,typed_probe_formal_name_echoes:formalNameEchoes,probes_generated_from_public_formal_names_and_frames:true,independent_gold_rows:0,public_natural_dev_qualified:false,full_catalog_capability_floor_assessed:false,source_mask_sha256:sha(freezeBytes),index_sha256:sha(indexBytes),index_bytes:indexBytes.length,source_mask_bytes:freezeBytes.length,index_and_mask_bytes:indexBytes.length+freezeBytes.length,router_and_index_bytes:bytes,product_neural_assets_bytes:0,semantic_network_calls:0,cig02_frozen:false,cig03_started:false};
fs.writeFileSync('.cig02f-minimal-result.json',JSON.stringify(result,null,2)+'\n');
console.log('CIG02F_MINIMAL_ROUTER_SYNTHETIC_DIAGNOSTIC='+JSON.stringify(result));
