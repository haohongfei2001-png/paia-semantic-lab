/** A6 bounded repair 1: A2-primary evidence with explicit current scope and separately supported goals. */
import {routeA2} from './a2.mjs';
import {routeA3} from './a3.mjs';
import {explicitNoRequest} from './a6_complement_scope.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
const assigned=p=>p?.state==='ASSIGNED'&&Array.isArray(p.topics)&&p.topics.length===1;
const ordinaryDefer=p=>p?.state==='DEFER'&&
  ['OOV','LOW_OR_AMBIGUOUS_EVIDENCE'].includes(p.reason);
const laterRequest=/[。；.!?;]\s*(?:请|帮我|我想|我需要|想要|please\b|could you\b|i need\b)/giu;
const inactivePrefix=/(?:先别|先不处理|旧版.*先不处理|no further|earlier .* closed|已结束)/iu;
const continuation=/(?:这一步|这个环节|这些人|那些人|那个设置|这项|接着|继续|this step|that step|that setup|those people|that part|continue (?:that|this))/iu;
const splitMarker=/(?:，|；|;|,)\s*(?:并|并且|另外|同时|以及|还要|also\b|and also\b)|\s+and\s+(?=(?:troubleshoot|prioritize|plan|draft|write|compare|organize|prepare|outline|design)\b)/giu;
const quoted=/[“”「」『』"']/u;

/** Preserve a later positive request after an explicitly cancelled earlier task. */
export function activeRequestCurrent(current){
  if(typeof current!=='string')return null;
  const matches=[...current.matchAll(laterRequest)];
  if(matches.length&&inactivePrefix.test(current.slice(0,matches.at(-1).index)))
    return current.slice(matches.at(-1).index+1).trim();
  return current;
}

/** Split only explicit two-task coordination; implicit multiple intents defer to future candidates. */
export function splitExplicitGoals(current){
  if(typeof current!=='string'||quoted.test(current))return null;
  const markers=[...current.matchAll(splitMarker)];
  if(!markers.length)return null;
  if(markers.length!==1)return {error:'MULTI_UNSUPPORTED_ARITY'};
  const at=markers[0].index;
  const goals=[current.slice(0,at).trim(),current.slice(at+markers[0][0].length).trim()];
  return goals.some(x=>!x)?{error:'MULTI_EMPTY_GOAL'}:{goals};
}

/** A3 may veto conflicting A2 evidence; it never supplies a fallback assignment. */
export function combineA2Primary(a2,a3){
  if(!assigned(a2))return ordinaryDefer(a2)?defer('A6_R1_A2_INSUFFICIENT'):
    a2?.state==='DEFER'?a2:defer('A6_R1_INVALID_PRIMARY');
  if(assigned(a3)&&a3.topics[0]!==a2.topics[0])return defer('A6_R1_A2_A3_CONFLICT');
  if(!assigned(a3)&&!ordinaryDefer(a3))return defer('A6_R1_VETO_UNAVAILABLE');
  return {...a2,reason:assigned(a3)?'A6_R1_AGREED':'A6_R1_A2_PRIMARY',
    evidence_source:assigned(a3)?'A2_AND_A3':'A2_FULL144'};
}

/** All predictions use fixed full144 TRAIN indexes. No result is a capability certification. */
export function routeA6R1(a3Index,a2Index,input,{catalog_sha256,
  a2_alpha=.5,a2_min_score=0,a2_min_margin=.5,
  a3_min_score=.02,a3_min_margin=.02}={}){
  if(!digest(catalog_sha256)||!a3Index||!a2Index||
    a3Index.catalog_sha256!==catalog_sha256||
    a2Index.catalog_sha256!==catalog_sha256||
    a3Index.train_sha256!==a2Index.train_sha256||
    a3Index.mode!=='char'||a2Index.mode!=='char'||
    !Array.isArray(a3Index.topic_ids)||a3Index.topic_ids.length!==144||
    JSON.stringify(a3Index.topic_ids)!==JSON.stringify(a2Index.topic_ids))
    return defer('INDEX_CLOSURE_MISMATCH');
  if(!input||typeof input.current!=='string'||typeof input.title!=='string'||
    !Array.isArray(input.recent)||!input.recent.every(x=>typeof x==='string'))
    return defer('BAD_INPUT');
  if(![a2_alpha,a2_min_score,a2_min_margin,a3_min_score,a3_min_margin]
    .every(Number.isFinite)||a2_alpha<=0||a2_min_margin<0||
    a3_min_score<0||a3_min_margin<0)return defer('BAD_CONFIG');
  if(input.recent.length>32||
    [input.current,input.title,...input.recent].reduce((n,x)=>n+Array.from(x).length,0)>8192)
    return defer('PROFILE_OVERFLOW');
  if(explicitNoRequest(input.current))return defer('A6_R1_EXPLICIT_NO_REQUEST');
  const current=activeRequestCurrent(input.current);
  const route=text=>{
    const x={current:text,title:'',recent:[]};
    const a2=routeA2(a2Index,x,{catalog_sha256,alpha:a2_alpha,
      min_score:a2_min_score,min_margin:a2_min_margin});
    const a3=routeA3(a3Index,x,{catalog_sha256,
      min_score:a3_min_score,min_margin:a3_min_margin});
    return combineA2Primary(a2,a3);
  };
  const split=splitExplicitGoals(current);
  if(split){
    if(split.error)return defer(split.error);
    const goals=split.goals.map(route);
    if(!goals.every(assigned)||goals[0].topics[0]===goals[1].topics[0])
      return defer('A6_R1_MULTI_EVIDENCE_INSUFFICIENT');
    return {state:'ASSIGNED',topics:goals.map(x=>x.topics[0]),
      reason:'A6_R1_EXPLICIT_TWO_GOAL',
      evidence_sources:['current-span-1','current-span-2']};
  }
  const currentOnly=route(current);
  if(!continuation.test(current)||!input.recent.length)return currentOnly;
  const previous=input.recent.at(-1),prior=route(previous),
    combined=route(`${previous}\n${current}`);
  if(!assigned(prior)||!assigned(combined)||
    prior.topics[0]!==combined.topics[0])return defer('A6_R1_CONTEXT_EVIDENCE_INSUFFICIENT');
  if(assigned(currentOnly)&&currentOnly.topics[0]!==combined.topics[0])
    return defer('A6_R1_CURRENT_CONTEXT_CONFLICT');
  return {state:'ASSIGNED',topics:[combined.topics[0]],
    reason:'A6_R1_REQUIRED_RECENT_CONTEXT',
    evidence_sources:['recent-last','current']};
}
