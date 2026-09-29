/** ZMR-05 C1 development mechanism: source-separated continuation and explicit two-goal routing. */
import {routeA3} from './a3.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const validAssignment=value=>value?.state==='ASSIGNED'&&Array.isArray(value.topics)&&
  value.topics.length===1;
const scalarLength=value=>Array.from(value).length;
const continuation=/^(?:这个|这段|这份|这件事|它|那个|那段|该怎么|接下来|然后|先从哪里|what about (?:this|that|it)|how (?:should|do) i (?:start|continue)|should i (?:book|reserve) it|which part|where did this)/iu;
const explicitSplit=/^(.*?)(?:，|,|;|；)\s*(?:还要|也要|再|另外|同时|and also|also|then)\s*(.+)$/iu;
const quoted=/[“”「」『』"']/u;

/** C1 makes no claim about natural-language competence; each output is full144 A3-backed. */
export function routeC1(index,input,{catalog_sha256,min_score=.02,min_margin=.02,
  context_min_score=.08,context_min_margin=.05,
  multi_min_score=.08,multi_min_margin=.05}={}){
  if(![min_score,min_margin,context_min_score,context_min_margin,
    multi_min_score,multi_min_margin].every(x=>Number.isFinite(x)&&x>=0))return defer('BAD_CONFIG');
  if(!input||typeof input.current!=='string'||typeof input.title!=='string'||
    !Array.isArray(input.recent)||!input.recent.every(x=>typeof x==='string'))return defer('BAD_INPUT');
  if(input.recent.length>32||
    [input.current,input.title,...input.recent].reduce((sum,x)=>sum+scalarLength(x),0)>8192)
    return defer('PROFILE_OVERFLOW');
  const full=routeA3(index,input,{catalog_sha256,min_score,min_margin});
  if(['INVALID_INDEX','CATALOG_MISMATCH','BAD_INPUT','BAD_CONFIG'].includes(full.reason))return full;
  const current=input.current.trim();
  const parts=!quoted.test(current)?current.match(explicitSplit):null;
  if(parts){
    const goals=[parts[1].trim(),parts[2].trim()];
    if(goals.some(x=>!x))return defer('MULTI_EMPTY_GOAL');
    if(explicitSplit.test(goals[1]))return defer('MULTI_MORE_THAN_TWO_GOALS');
    const routed=goals.map(text=>routeA3(index,{current:text,title:'',recent:[]},
      {catalog_sha256,min_score:multi_min_score,min_margin:multi_min_margin}));
    if(!routed.every(validAssignment)||routed[0].topics[0]===routed[1].topics[0])
      return defer('MULTI_EVIDENCE_INSUFFICIENT');
    return {state:'ASSIGNED',topics:routed.map(x=>x.topics[0]),
      reason:'C1_EXPLICIT_TWO_GOAL',evidence_sources:['current-span-1','current-span-2']};
  }
  if(!continuation.test(current))return full;
  const previous=input.recent.at(-1);
  if(!previous)return full;
  const contextual=routeA3(index,{current:`${previous}\n${input.current}`,title:'',recent:[]},
    {catalog_sha256,min_score:context_min_score,min_margin:context_min_margin});
  if(!validAssignment(contextual))return full;
  if(validAssignment(full)){
    if(full.topics[0]!==contextual.topics[0])return defer('CURRENT_CONTEXT_CONFLICT');
    return full;
  }
  if(!['LOW_OR_AMBIGUOUS_EVIDENCE','OOV'].includes(full.reason))return full;
  return {state:'ASSIGNED',topics:[contextual.topics[0]],
    reason:'C1_REQUIRED_RECENT_CONTEXT',evidence_sources:['current','recent-last'],
    current_only_reason:full.reason};
}
