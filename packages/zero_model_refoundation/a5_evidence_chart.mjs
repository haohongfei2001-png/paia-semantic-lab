/** A5/A6 development-only finite evidence chart over full144 A3, no semantic service. */
import {routeA3} from './a3.mjs';
import {explicitNoRequest} from './a6_complement_scope.mjs';
import {explicitRecordOnly} from './a6_complement_r2.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const assigned=x=>x?.state==='ASSIGNED'&&Array.isArray(x.topics)&&x.topics.length===1;
const inputOf=current=>({current,title:'',recent:[]});
const validInput=x=>x&&typeof x.current==='string'&&typeof x.title==='string'&&
  Array.isArray(x.recent)&&x.recent.length<=32&&
  x.recent.every(y=>typeof y==='string')&&
  [x.current,x.title,...x.recent].reduce((n,y)=>n+Array.from(y).length,0)<=8192;
const continuation=/^(?:沿用|接着|照上条|按刚才|就刚才|继续|for that same|for the same|continue that|please finish the same|please finish the checklist for the same)/iu;
const background=/(?:只是|仅是|仅供|只是参考|only background|only as background|was quoted for context|is only background)/iu;
const request=/(?:请|帮我|计划|整理|拟|列出|准备|make|draft|plan|prepare|organize|list|help me)/iu;
const multiCue=/(?:分别|两件事|同时|另列|再列|以及|并且|two separate|separate checklist|separately|and a separate|and one for|and, separately)/iu;
const terminalNoRequest=/(?:no new request|no action needed|nothing to [a-z ]+ now|do not (?:create|draft|plan)|不需要[^。.!?]*|无需[^。.!?]*|不要再[^。.!?]*|没有新的[^。.!?]*请求)[。.!?\s]*$/iu;
const boundary=/(?:[，,;；。.!?]\s*|\s+and\s+|\s+also\s+|同时|另外|另列|再列|再|以及|并且)/giu;

export const explicitA5NoRequest=current=>
  typeof current==='string'&&
  (explicitNoRequest(current)||explicitRecordOnly(current)||
    terminalNoRequest.test(current));

/** Deterministic bounded chart alternatives, preserving original current source offsets. */
export function chartSplits(current){
  if(typeof current!=='string')return [];
  const out=[];const seen=new Set();
  for(const m of current.matchAll(boundary)){
    const left=current.slice(0,m.index).trim();
    const right=current.slice(m.index+m[0].length).trim();
    if(!left||!right||Array.from(left).length<6||Array.from(right).length<6)continue;
    const key=`${m.index}:${m[0].length}`;
    if(seen.has(key))continue;seen.add(key);
    out.push({left,right,start:m.index,end:m.index+m[0].length,
      marker:m[0]});
    if(out.length===12)break;
  }
  return out;
}

/** A chart may add labels only from two separately scored current spans. */
export function routeA5EvidenceChart(index,input,{catalog_sha256,
  flat_min_score=.02,flat_min_margin=.02,
  slot_min_score=.08,slot_min_margin=.05,
  context_min_score=.08,context_min_margin=.05}={}){
  if(![flat_min_score,flat_min_margin,slot_min_score,slot_min_margin,
    context_min_score,context_min_margin]
    .every(x=>Number.isFinite(x)&&x>=0))return defer('A5_CHART_BAD_CONFIG');
  if(!validInput(input))return defer('A5_CHART_BAD_INPUT_OR_PROFILE_OVERFLOW');
  const flat=routeA3(index,input,{catalog_sha256,
    min_score:flat_min_score,min_margin:flat_min_margin});
  if(['INVALID_INDEX','CATALOG_MISMATCH','BAD_INPUT','BAD_CONFIG'].includes(flat.reason))
    return flat;
  const current=input.current.trim();
  if(explicitA5NoRequest(current))
    return defer('A5_CHART_EXPLICIT_NO_REQUEST');
  const scoreSlot=text=>routeA3(index,inputOf(text),{catalog_sha256,
    min_score:slot_min_score,min_margin:slot_min_margin});
  const splits=chartSplits(current);

  // An explicit background marker keeps the first span from supplying a Topic.
  const backgrounds=splits.filter(x=>background.test(x.left)&&request.test(x.right));
  if(backgrounds.length){
    const candidates=backgrounds.map(x=>({split:x,route:scoreSlot(x.right)}))
      .filter(x=>assigned(x.route));
    candidates.sort((a,b)=>
      (b.route.score+b.route.margin)-(a.route.score+a.route.margin)||
      a.split.start-b.split.start);
    if(!candidates.length)return defer('A5_CHART_BACKGROUND_NO_GOAL_EVIDENCE');
    const best=candidates[0].route;
    return {...best,reason:'A5_CHART_CURRENT_GOAL_AFTER_BACKGROUND',
      evidence_sources:['current-goal-span'],
      background_span_end:candidates[0].split.end};
  }

  // The two goals must be explicit; arbitrary top-2 Topics never create a set.
  if(multiCue.test(current)){
    const candidates=[];
    for(const split of splits){
      const left=scoreSlot(split.left),right=scoreSlot(split.right);
      if(!assigned(left)||!assigned(right)||left.topics[0]===right.topics[0])continue;
      const score=Math.min(left.score+left.margin,right.score+right.margin);
      candidates.push({split,left,right,score});
    }
    candidates.sort((a,b)=>b.score-a.score||a.split.start-b.split.start);
    if(candidates.length){
      const best=candidates[0];
      return {state:'ASSIGNED',topics:[best.left.topics[0],best.right.topics[0]].sort(),
        reason:'A5_CHART_TWO_INDEPENDENT_GOAL_SPANS',
        evidence_sources:['current-goal-span-1','current-goal-span-2'],
        chart_boundary:[best.split.start,best.split.end],
        slot_scores:[best.left.score,best.right.score]};
    }
    return defer('A5_CHART_MULTI_EVIDENCE_INSUFFICIENT');
  }

  // Recent context is available only for an explicit current continuation.
  if(continuation.test(current)&&input.recent.length){
    const previous=scoreSlot(input.recent.at(-1));
    if(assigned(previous)){
      if(assigned(flat)&&flat.topics[0]!==previous.topics[0])
        return defer('A5_CHART_CURRENT_CONTEXT_CONFLICT');
      if(!assigned(flat)&&['LOW_OR_AMBIGUOUS_EVIDENCE','OOV'].includes(flat.reason))
        return {state:'ASSIGNED',topics:[previous.topics[0]],
          reason:'A5_CHART_EXPLICIT_CONTINUATION',
          evidence_sources:['current-continuation','recent-last-goal'],
          current_only_reason:flat.reason};
    }
  }
  return flat;
}
