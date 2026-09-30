/** A4 bounded repair: full144 TRAIN-only retrieval corroborates requested output. */
import {routeA1} from './a1.mjs';
import {routeA3} from './a3.mjs';
import {projectA4Output,routeA4RoleContrast} from './a4_role_contrast.mjs';
const defer=reason=>({state:'DEFER',topics:[],reason});
const assigned=x=>x?.state==='ASSIGNED'&&x.topics?.length===1;
export function routeA4RoleContrastR1(a3,a1,input,{catalog_sha256}={}){
  try{
    if(a3?.topic_ids?.length!==144||a1?.topic_ids?.length!==144||
      a3.catalog_sha256!==a1.catalog_sha256||a3.train_sha256!==a1.train_sha256||
      JSON.stringify(a3.topic_ids)!==JSON.stringify(a1.topic_ids))
      return defer('A4_ROLE_R1_INDEX_CLOSURE');
    // Validate retrieval even when the ordinary full144 fallback is used.
    const check=routeA1(a1,input,{catalog_sha256});
    if(['INVALID_INDEX','CATALOG_MISMATCH','BAD_INPUT','BAD_CONFIG'].includes(check.reason))return check;
    const base=routeA4RoleContrast(a3,input,{catalog_sha256});
    if(['A4_ROLE_EXPLICIT_NO_REQUEST','A4_ROLE_UNRESOLVED_GOAL',
      'A4_ROLE_BAD_INPUT_OR_PROFILE_OVERFLOW','A4_ROLE_BAD_CONFIG',
      'INVALID_INDEX','CATALOG_MISMATCH','BAD_INPUT','BAD_CONFIG'].includes(base.reason))return base;
    const projection=projectA4Output(input.current.trim());
    if(!projection)return base;
    const goal={current:projection.goal.text,title:'',recent:[]};
    const retrieval=routeA1(a1,goal,{catalog_sha256,method:'tfidf',min_score:.15,min_margin:.02});
    if(!assigned(retrieval))return base;
    const discriminative=routeA3(a3,goal,{catalog_sha256,min_score:.08,min_margin:.05});
    if(assigned(discriminative)&&discriminative.topics[0]!==retrieval.topics[0])
      return defer('A4_ROLE_R1_GOAL_DISAGREEMENT');
    return {...retrieval,reason:'A4_ROLE_R1_RETRIEVAL_OUTPUT_EVIDENCE',
      evidence_source:'current-goal-span',goal_span:[projection.goal.start,projection.goal.end],
      source_span:[projection.source.start,projection.source.end]};
  }catch{return defer('A4_ROLE_R1_INDEX_CLOSURE');}
}
