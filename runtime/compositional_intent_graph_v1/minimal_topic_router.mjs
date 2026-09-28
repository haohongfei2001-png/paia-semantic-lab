import {createFrameGrounder} from './frame_grounder.mjs';
import {currentGoalScopeReason} from './current_goal_scope.mjs';

const defer=reason=>({topics:[],state:'DEFER',reason});
export function createMinimalTopicRouter(index,readiness){
  if(index?.format!=='cig02e-typed-frame-index-v1'||index.topic_count!==144||
     !Array.isArray(index.topics)||index.topics.length!==144)throw Error('invalid full-Catalog index');
  if(readiness?.format!=='CIG02_SOURCE_READINESS_FREEZE_V1'||
     readiness.source_only_frozen!==true||readiness.cig02_frozen!==false||
     readiness.cig03_started!==false||readiness.topic_count!==144||
     !Array.isArray(readiness.topics)||readiness.topics.length!==144)
    throw Error('invalid source readiness freeze');
  const indexIds=new Set(index.topics.map(t=>t.topic_id));
  if(indexIds.size!==144)throw Error('duplicate index Topic');
  const mask=new Map();
  for(const t of readiness.topics){
    if(!indexIds.has(t.topic_id)||mask.has(t.topic_id)||!['READY','SPARSE','DEFER'].includes(t.readiness))
      throw Error('source mask/Catalog mismatch');
    if(t.readiness==='READY' && !(t.accepted_gold_rows>0))throw Error('unsupported READY evidence');
    if(t.readiness==='SPARSE' && (!Array.isArray(t.prospective_source_rows)||!t.prospective_source_rows.length||t.accepted_gold_rows!==0))
      throw Error('unsupported SPARSE evidence');
    if(t.readiness==='DEFER' && (t.prospective_source_rows?.length||t.accepted_gold_rows!==0))
      throw Error('unsupported DEFER evidence');
    mask.set(t.topic_id,t.readiness);
  }
  const counted=Object.fromEntries(['READY','SPARSE','DEFER'].map(k=>[k,[...mask.values()].filter(x=>x===k).length]));
  if(mask.size!==144||JSON.stringify(counted)!==JSON.stringify(readiness.counts))throw Error('source mask counts changed');
  const grounder=createFrameGrounder(index);
  function classify(input){
    const scopeReason=currentGoalScopeReason(input?.current);
    if(scopeReason)return defer(scopeReason);
    const result=grounder.classify(input);
    if(result.state!=='ASSIGNED')return result;
    if(result.topics.length!==1)return defer('COMPETING_TOPICS');
    const level=mask.get(result.topics[0]);
    if(level==='DEFER')return defer('SOURCE_READINESS_DEFER');
    if(level==='SPARSE' && result.evidence?.rule!=='EXACT_FORMAL_NAME')
      return defer('SPARSE_REQUIRES_FORMAL_NAME');
    return {...result,source_readiness:level};
  }
  return {classify};
}
