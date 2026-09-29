/** Bounded A5 role/scope diagnostic. It does not choose or exclude any Topic. */
const SCHEMA='ZMR-A5-SCOPE-DIAGNOSTIC-1';
const LIMIT_SCALARS=8192; // Research measurement profile, not a product input policy.
const ACTION=['安排','整理','比较','记录','规划','解释','查找','设计','修复',
  'plan','organize','compare','record','explain','find','design','fix'];
const GOAL=['为了','以便','目的是','so that','in order to'];
const QUALIFIER=['只要','仅','只','不要','without','only','except'];
const NEGATION=['不要','不是','不能','不','没有','not','never','do not','don\'t'];
const CORRECTION=['改成','更正为','而是','instead','rather than','but'];
const BREAKS=new Set(['，',',','。','.','；',';','！','!','？','?','\n']);
const QUOTES=new Map([['“','”'],['「','」'],['『','』'],['"','"']]);
const word=/[\p{L}\p{N}]/u;
const ascii=/^[a-z ]+$/u;
const isWord=ch=>ch!==undefined&&word.test(ch);

function cues(text,start,end,words,type) {
  const found=[];
  const haystack=text.replace(/[A-Z]/gu,ch=>ch.toLowerCase());
  for(const token of words) {
    let from=start;
    while(from<end) {
      const at=haystack.indexOf(token,from);
      if(at<0||at+token.length>end) break;
      const boundaries=!ascii.test(token)||
        (!isWord(text[at-1])&&!isWord(text[at+token.length]));
      if(boundaries) found.push({type,token,start:at,end:at+token.length});
      from=at+token.length;
    }
  }
  return found;
}
function quoteSpans(text) {
  const stack=[],spans=[];
  for(let i=0;i<text.length;i++) {
    const ch=text[i],top=stack.at(-1);
    if(top&&ch===top.close) {spans.push({start:top.start,end:i+1});stack.pop();}
    else if(QUOTES.has(ch)) stack.push({start:i,close:QUOTES.get(ch)});
  }
  return {spans,balanced:stack.length===0};
}
function trimmedSpan(text,start,end,role,clause_index) {
  while(start<end&&/\s/u.test(text[start])) start++;
  while(end>start&&/\s/u.test(text[end-1])) end--;
  return start<end?{start,end,role,clause_index}:null;
}

/** Offsets are UTF-16 source offsets. Every role is a hypothesis, never gold. */
export function parseA5Scope(input) {
  if(!input||typeof input.current!=='string'||typeof input.title!=='string'||
    !Array.isArray(input.recent)||!input.recent.every(x=>typeof x==='string'))
    return {schema:SCHEMA,status:'UNPARSED_BAD_INPUT',fallback_required:true,
      fallback_current:null,topic_decision:null};
  const text=input.current;
  let scalarCount=0;
  for(const _ of text) if(++scalarCount>LIMIT_SCALARS)
    return {schema:SCHEMA,status:'UNPARSED_PROFILE_OVERFLOW',fallback_required:true,
      fallback_current:text,topic_decision:null};
  const quote=quoteSpans(text);
  const clauses=[];
  let start=0;
  for(let i=0;i<text.length;i++) if(BREAKS.has(text[i])) {
    if(start<i) clauses.push({start,end:i});
    start=i+1;
  }
  if(start<text.length) clauses.push({start,end:text.length});
  const marked=[],roles=[];
  for(const [clause_index,clause] of clauses.entries()) {
    const found=[...cues(text,clause.start,clause.end,ACTION,'ACTION'),
      ...cues(text,clause.start,clause.end,GOAL,'GOAL_MARKER'),
      ...cues(text,clause.start,clause.end,QUALIFIER,'QUALIFIER_MARKER'),
      ...cues(text,clause.start,clause.end,NEGATION,'NEGATION_MARKER'),
      ...cues(text,clause.start,clause.end,CORRECTION,'CORRECTION_MARKER')]
      .sort((a,b)=>a.start-b.start||b.end-a.end||
        (a.type<b.type?-1:a.type>b.type?1:0));
    const unique=[];
    for(const cue of found) if(!unique.some(other=>other.type===cue.type&&
      cue.start>=other.start&&cue.end<=other.end)) unique.push(cue);
    marked.push(...unique.map(cue=>({...cue,clause_index,
      in_quote:quote.spans.some(q=>cue.start>=q.start&&cue.end<=q.end)})));
    const active=unique.filter(cue=>!quote.spans.some(q=>cue.start>=q.start&&cue.end<=q.end));
    const correction=active.find(cue=>cue.type==='CORRECTION_MARKER'&&
      active.some(neg=>neg.type==='NEGATION_MARKER'&&neg.start<cue.start));
    if(correction) {
      const neg=active.find(cue=>cue.type==='NEGATION_MARKER'&&cue.start<correction.start);
      const old=trimmedSpan(text,neg.end,correction.start,'REPLACED_CANDIDATE',clause_index);
      const current=trimmedSpan(text,correction.end,clause.end,'CURRENT_CANDIDATE',clause_index);
      if(old) roles.push(old);
      if(current) roles.push(current);
    }
    const goal=active.find(cue=>cue.type==='GOAL_MARKER');
    if(goal) {
      const span=trimmedSpan(text,goal.end,clause.end,'GOAL_CANDIDATE',clause_index);
      if(span) roles.push(span);
    }
    const action=active.find(cue=>cue.type==='ACTION');
    if(action) {
      roles.push({start:action.start,end:action.end,role:'ACTION_CANDIDATE',clause_index});
      const object=trimmedSpan(text,action.end,goal?.start??clause.end,
        'OBJECT_OR_BACKGROUND_CANDIDATE',clause_index);
      if(object) roles.push(object);
    }
    const qualifier=active.find(cue=>cue.type==='QUALIFIER_MARKER');
    if(qualifier) {
      const span=trimmedSpan(text,qualifier.start,clause.end,'QUALIFIER_CANDIDATE',clause_index);
      if(span) roles.push(span);
    }
    if(!action&&!goal&&!correction) {
      const unresolved=trimmedSpan(text,clause.start,clause.end,'UNRESOLVED',clause_index);
      if(unresolved) roles.push(unresolved);
    }
  }
  return {schema:SCHEMA,status:quote.balanced?'DIAGNOSTIC_ONLY':'UNBALANCED_QUOTE',
    source:'current',profile_scalar_limit:LIMIT_SCALARS,
    clauses,quote_spans:quote.spans,cues:marked,role_candidates:roles,
    fallback_required:true,fallback_current:text,topic_decision:null};
}
