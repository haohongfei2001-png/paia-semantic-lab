/** ZMR-04 bounded A6 development hybrid: full144 A3 plus optional A5 goal check. */
import {routeA3} from './a3.mjs';
import {parseA5Scope} from './a5_scope.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const validAssignment=result=>result?.state==='ASSIGNED'&&
  Array.isArray(result.topics)&&result.topics.length===1;

/** No role-only mode: the unchanged full input is always scored first. */
export function routeA6(index,input,{catalog_sha256,
  full_min_score=.02,full_min_margin=.02,
  goal_min_score=.08,goal_min_margin=.05}={}) {
  if(![full_min_score,full_min_margin,goal_min_score,goal_min_margin]
    .every(value=>Number.isFinite(value)&&value>=0)) return defer('BAD_CONFIG');
  const full=routeA3(index,input,{catalog_sha256,
    min_score:full_min_score,min_margin:full_min_margin});
  if(!validAssignment(full)&&!['LOW_OR_AMBIGUOUS_EVIDENCE','OOV'].includes(full.reason))
    return full;
  const scope=parseA5Scope(input);
  if(scope.status!=='DIAGNOSTIC_ONLY') return full;
  const active=scope.cues.filter(cue=>!cue.in_quote);
  if(active.some(cue=>['NEGATION_MARKER','CORRECTION_MARKER'].includes(cue.type))) return full;
  const goals=scope.role_candidates.filter(span=>span.role==='GOAL_CANDIDATE');
  if(goals.length!==1) return full;
  const goal=goals[0],current=input.current.slice(goal.start,goal.end);
  if(!current.trim()) return full;
  const focused=routeA3(index,{...input,current},{catalog_sha256,
    min_score:goal_min_score,min_margin:goal_min_margin});
  if(!validAssignment(focused)) return full;
  if(validAssignment(full)) {
    if(full.topics[0]!==focused.topics[0]) return defer('A6_FULL_GOAL_CONFLICT');
    return {...full,reason:'A6_FULL_GOAL_AGREE',scope_source:'current-goal'};
  }
  return {...focused,reason:'A6_GOAL_WITH_FULL_INPUT_DEFER',
    scope_source:'current-goal',full_input_reason:full.reason};
}
