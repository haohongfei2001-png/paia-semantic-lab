/** A6 final bounded repair: record-only scope and independent A2 support for explicit goals. */
import {routeA2} from './a2.mjs';
import {activeRequestCurrent,splitExplicitGoals,routeA6R1} from './a6_complement_r1.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const recordOnly=[
  /(?:只需|仅需|只要).{0,12}(?:留存|归档|记录|保存)/u,
  /(?:仅供参考|只是状态(?:记录|更新)|不需(?:要)?后续动作)/u,
  /\b(?:for reference only|record only|just (?:a|the) status (?:update|record)|no follow-up action)\b/iu
];
const laterRequest=/[。；.!?;]\s*(?:请|帮我|我想|我需要|想要|please\b|could you\b|i need\b)/iu;

/** An explicit new task after the record-only clause remains active. */
export function explicitRecordOnly(current){
  if(typeof current!=='string')return false;
  const text=current.normalize('NFKC');
  const matches=recordOnly.map(x=>x.exec(text)).filter(Boolean);
  if(!matches.length)return false;
  const at=Math.min(...matches.map(x=>x.index));
  return !laterRequest.test(text.slice(at));
}

export function routeA6R2(a3Index,a2Index,input,options={}){
  const baseline=routeA6R1(a3Index,a2Index,input,options);
  if(['INDEX_CLOSURE_MISMATCH','BAD_INPUT','BAD_CONFIG','PROFILE_OVERFLOW']
    .includes(baseline.reason))return baseline;
  if(explicitRecordOnly(input.current))return defer('A6_R2_RECORD_ONLY_NO_REQUEST');
  const current=activeRequestCurrent(input.current);
  const split=splitExplicitGoals(current);
  if(!split||split.error||baseline.state==='ASSIGNED')return baseline;
  const {catalog_sha256,a2_alpha=.5,a2_min_score=0,
    a2_min_margin=.5}=options;
  const topics=[];
  for(const text of split.goals){
    const p=routeA2(a2Index,{current:text,title:'',recent:[]},
      {catalog_sha256,alpha:a2_alpha,min_score:a2_min_score,
        min_margin:a2_min_margin});
    if(p.state!=='ASSIGNED'||p.topics.length!==1||
      !Number.isFinite(p.score)||p.score<2||
      !Number.isFinite(p.margin)||p.margin<.5)
      return defer('A6_R2_MULTI_A2_EVIDENCE_INSUFFICIENT');
    topics.push(p.topics[0]);
  }
  if(topics[0]===topics[1])return defer('A6_R2_MULTI_SAME_TOPIC');
  return {state:'ASSIGNED',topics,
    reason:'A6_R2_EXPLICIT_TWO_GOAL_A2_INDEPENDENT',
    evidence_sources:['current-span-1','current-span-2']};
}
