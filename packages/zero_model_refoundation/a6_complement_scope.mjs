/** A6 development hybrid: current-only no-request guard, A3 and A2 complement evidence. */
import {routeA3} from './a3.mjs';
import {routeA2} from './a2.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
const noRequest=[
  /\b(?:no (?:action|task|request|need to|need for)|nothing to (?:do|prepare)|not an instruction)\b/iu,
  /\b(?:only an? acknowledg(?:e)?ment|just (?:noting|acknowledging)|only a passing thought|already closed)\b/iu,
  /(?:不需要|不必|不用(?:再)?(?:处理|准备|分类|规划|安排)|不是现在需要执行的任务|不需要执行)/u,
  /(?:只是(?:告诉|确认|更新|记录)|已(?:归档|阅|收到)|讨论已结束|只是.*确认已阅)/u
];
const laterRequest=/[。；.!?;]\s*(?:请|帮我|我想|我需要|想要|please\b|could you\b|i need\b)/iu;
const correction=/(?:而是|改成|更正为|\binstead\b|\brather than\b)/iu;

/** Scope guard sees current only and preserves explicit later tasks or corrections. */
export function explicitNoRequest(current){
  if(typeof current!=='string')return false;
  const text=current.normalize('NFKC');
  if(correction.test(text))return false;
  const hits=noRequest.map(pattern=>pattern.exec(text)).filter(Boolean);
  const first=hits.length?Math.min(...hits.map(hit=>hit.index)):-1;
  return first>=0&&!laterRequest.test(text.slice(first));
}

const assigned=p=>p?.state==='ASSIGNED'&&Array.isArray(p.topics)&&p.topics.length===1;
const ordinaryDefer=p=>p?.state==='DEFER'&&
  ['OOV','LOW_OR_AMBIGUOUS_EVIDENCE'].includes(p.reason);

/** Finite decision combiner; score scales never get compared across objectives. */
export function combineComplementEvidence(a3,a2,{rescue_min_score=2,
  rescue_min_margin=2}={}){
  if(!Number.isFinite(rescue_min_score)||rescue_min_score<0||
    !Number.isFinite(rescue_min_margin)||rescue_min_margin<0)
    return defer('BAD_CONFIG');
  if(assigned(a3)){
    if(assigned(a2))return a3.topics[0]===a2.topics[0]?
      {...a3,reason:'A6_COMPLEMENT_AGREEMENT',evidence_source:'A3_AND_A2'}:
      defer('A6_CLASS_COMPLEMENT_CONFLICT');
    return ordinaryDefer(a2)?a3:defer('A6_COMPLEMENT_UNAVAILABLE');
  }
  if(!ordinaryDefer(a3))return a3?.state==='DEFER'?a3:defer('A6_INVALID_BASE');
  if(assigned(a2)&&Number.isFinite(a2.score)&&Number.isFinite(a2.margin)&&
    a2.score>=rescue_min_score&&a2.margin>=rescue_min_margin)
    return {...a2,reason:'A6_STRONG_COMPLEMENT_RESCUE',
      evidence_source:'A2_FULL144_AFTER_A3_DEFER'};
  return a3;
}

/** Both indexes are finite TRAIN-only full144 artifacts; any closure mismatch fails closed. */
export function routeA6ComplementScope(a3Index,a2Index,input,{catalog_sha256,
  a3_min_score=.02,a3_min_margin=.02,a2_alpha=.5,a2_min_score=0,
  a2_min_margin=.5,rescue_min_score=2,rescue_min_margin=2}={}){
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
  if(![a3_min_score,a3_min_margin,a2_alpha,a2_min_score,a2_min_margin,
    rescue_min_score,rescue_min_margin].every(x=>Number.isFinite(x))||
    a3_min_score<0||a3_min_margin<0||a2_alpha<=0||a2_min_margin<0||
    rescue_min_score<0||rescue_min_margin<0)return defer('BAD_CONFIG');
  if(explicitNoRequest(input.current))return defer('A6_EXPLICIT_NO_REQUEST');
  const a3=routeA3(a3Index,input,{catalog_sha256,
    min_score:a3_min_score,min_margin:a3_min_margin});
  if(!assigned(a3)&&!ordinaryDefer(a3))return a3;
  const a2=routeA2(a2Index,input,{catalog_sha256,alpha:a2_alpha,
    min_score:a2_min_score,min_margin:a2_min_margin});
  return combineComplementEvidence(a3,a2,{rescue_min_score,rescue_min_margin});
}
