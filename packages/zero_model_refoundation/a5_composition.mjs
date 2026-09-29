/** A5 development-only finite-state composition over a full144 A3 fallback. */
import {routeA3} from './a3.mjs';
import {parseA5Scope} from './a5_scope.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const assigned=x=>x?.state==='ASSIGNED'&&Array.isArray(x.topics)&&x.topics.length===1;
const validThreshold=x=>Number.isFinite(x)&&x>=0;
const spanText=(text,span)=>text.slice(span.start,span.end).trim();

/**
 * Only explicit correction or two separately parsed action clauses can add
 * a Topic. Each proposed Topic must be independently supported by full144 A3.
 * Quoted or malformed scope can only preserve the fallback or DEFER.
 */
export function routeA5Composition(index,input,{catalog_sha256,
  full_min_score=.02,full_min_margin=.02,
  segment_min_score=.08,segment_min_margin=.05}={}){
  if(![full_min_score,full_min_margin,segment_min_score,segment_min_margin]
    .every(validThreshold))return defer('BAD_CONFIG');
  const scope=parseA5Scope(input);
  if(scope.status==='UNPARSED_PROFILE_OVERFLOW')return defer('A5_PROFILE_OVERFLOW');
  if(scope.status==='UNBALANCED_QUOTE')return defer('A5_UNBALANCED_QUOTE');
  const full=routeA3(index,input,{catalog_sha256,
    min_score:full_min_score,min_margin:full_min_margin});
  if(!assigned(full)&&!['LOW_OR_AMBIGUOUS_EVIDENCE','OOV'].includes(full.reason))
    return full;
  if(scope.status!=='DIAGNOSTIC_ONLY')return full;
  const active=scope.cues.filter(cue=>!cue.in_quote);
  const corrections=scope.role_candidates.filter(x=>x.role==='CURRENT_CANDIDATE');
  const replaced=scope.role_candidates.filter(x=>x.role==='REPLACED_CANDIDATE');
  const negated=active.some(cue=>cue.type==='NEGATION_MARKER');
  const scoreSegment=current=>routeA3(index,{current,title:'',recent:[]},
    {catalog_sha256,min_score:segment_min_score,min_margin:segment_min_margin});

  if(corrections.length===1&&replaced.length===1&&negated&&
    scope.quote_spans.length===0){
    const prior=spanText(input.current,replaced[0]);
    const replacement=spanText(input.current,corrections[0]);
    if(!prior||!replacement)return full;
    const oldScore=scoreSegment(prior),newScore=scoreSegment(replacement);
    if(assigned(oldScore)&&assigned(newScore)&&
      oldScore.topics[0]!==newScore.topics[0])
      return {...newScore,reason:'A5_EXPLICIT_CORRECTION',
        scope_source:'current-correction'};
    if(assigned(full)&&assigned(oldScore)&&
      full.topics[0]===oldScore.topics[0]&&!assigned(newScore))
      return defer('A5_CORRECTION_UNSUPPORTED');
    return full;
  }

  if(scope.quote_spans.length){
    const outside=input.current.split('').map((ch,i)=>scope.quote_spans.some(q=>
      i>=q.start&&i<q.end)?' ':ch).join('').trim();
    if(!outside)return defer('A5_QUOTED_ONLY');
    const unquoted=scoreSegment(outside);
    if(assigned(full)&&(!assigned(unquoted)||
      full.topics[0]!==unquoted.topics[0]))return defer('A5_QUOTE_CONFLICT');
    return full;
  }

  if(negated||active.some(cue=>cue.type==='CORRECTION_MARKER'))return full;
  const actions=scope.cues.filter(cue=>cue.type==='ACTION'&&!cue.in_quote);
  if(scope.clauses.length!==2||actions.length!==2||
    actions[0].clause_index===actions[1].clause_index)return full;
  const decisions=scope.clauses.map(clause=>scoreSegment(
    input.current.slice(clause.start,clause.end).trim()));
  if(decisions.every(assigned)&&decisions[0].topics[0]!==decisions[1].topics[0])
    return {state:'ASSIGNED',topics:decisions.map(x=>x.topics[0]).sort(),
      reason:'A5_TWO_EXPLICIT_ACTION_CLAUSES',scope_source:'current-clauses'};
  return full;
}
