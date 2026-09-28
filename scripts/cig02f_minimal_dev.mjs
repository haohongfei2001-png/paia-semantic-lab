import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createMinimalTopicRouter} from '../runtime/compositional_intent_graph_v1/minimal_topic_router.mjs';
const indexPath=process.argv[2]??'.cig02e-index.json';
const freezePath='artifacts/compositional-intent-graph-v1/CIG-02_SOURCE_READINESS_FREEZE.json';
const indexBytes=fs.readFileSync(indexPath),freezeBytes=fs.readFileSync(freezePath);
const index=JSON.parse(indexBytes),freeze=JSON.parse(freezeBytes);
const router=createMinimalTopicRouter(index,freeze);
const byId=new Map(index.topics.map(t=>[t.topic_id,t]));
const counts={formal:{ASSIGNED:0,DEFER:0},typed:{ASSIGNED:0,DEFER:0},masked_exact:{ASSIGNED:0,DEFER:0},context_mismatches:0,repeat_mismatches:0};
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
    const typed=router.classify({current:'Please '+topic.roles.ACTION.en[0]+' '+topic.roles.OBJECT.en[0]});
    if(typed.state==='ASSIGNED'&&typed.evidence?.rule!=='EXACT_FORMAL_NAME')
      throw Error('typed-only sparse assignment');
    counts.typed[typed.state]++;
  }
}
const bytes=[indexPath,'runtime/compositional_intent_graph_v1/frame_grounder.mjs','runtime/compositional_intent_graph_v1/goal_parser.mjs','runtime/compositional_intent_graph_v1/minimal_topic_router.mjs'].reduce((n,p)=>n+fs.statSync(p).size,0);
if(indexBytes.length>1048576||bytes>2097152||counts.context_mismatches||counts.repeat_mismatches)throw Error('engineering safety gate');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const result={format:'CIG02F_MINIMAL_ROUTER_SYNTHETIC_DIAGNOSTIC_V1',classification:'SAME_SOURCE_SYNTHETIC_ENGINEERING_NOT_CAPABILITY',source_readiness_counts:freeze.counts,probe_counts:counts,probes_generated_from_public_formal_names_and_frames:true,independent_gold_rows:0,public_natural_dev_qualified:false,full_catalog_capability_floor_assessed:false,source_mask_sha256:sha(freezeBytes),index_sha256:sha(indexBytes),index_bytes:indexBytes.length,router_and_index_bytes:bytes,product_neural_assets_bytes:0,semantic_network_calls:0,cig02_frozen:false,cig03_started:false};
fs.writeFileSync('.cig02f-minimal-result.json',JSON.stringify(result,null,2)+'\n');
console.log('CIG02F_MINIMAL_ROUTER_SYNTHETIC_DIAGNOSTIC='+JSON.stringify(result));
