/** A4 development-only requested-output contrast over full144 A3 evidence. */
import {routeA3} from './a3.mjs';
import {explicitNoRequest} from './a6_complement_scope.mjs';
import {explicitRecordOnly} from './a6_complement_r2.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const assigned=x=>x?.state==='ASSIGNED'&&Array.isArray(x.topics)&&x.topics.length===1;
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const scalarLength=x=>Array.from(x).length;
const terminalNoRequest=/(?:no new (?:work|request)|do not reopen|不要继续|无需再|本条仅留存|只是背景记录)[。.!?\s]*$/iu;
const explicitUnresolved=/(?:have not chosen|may revisit|还没决定|只是在确认)[^。.!?]*[。.!?\s]*$/iu;
const englishSource=/^(?:use|treat)\s+(.{5,160}?)\s+(?:as\s+(?:source material|input|a constraint)\s+)?(?:to|for|and)\s+(.{5,160})$/iu;
const chineseSource=/^(?:参考|把)\s*(.{3,160}?)(?:，|,)(.{5,160})$/u;

export function explicitA4Scope(current){
  if(typeof current!=='string')return null;
  if(explicitNoRequest(current)||explicitRecordOnly(current)||
    terminalNoRequest.test(current))return 'A4_ROLE_EXPLICIT_NO_REQUEST';
  if(explicitUnresolved.test(current))return 'A4_ROLE_UNRESOLVED_GOAL';
  return null;
}

function validInput(input){
  return input&&typeof input.current==='string'&&typeof input.title==='string'&&
    Array.isArray(input.recent)&&input.recent.length<=32&&
    input.recent.every(x=>typeof x==='string')&&
    [input.current,input.title,...input.recent].reduce((n,x)=>n+scalarLength(x),0)<=8192;
}
const bare=current=>({current,title:'',recent:[]});

/** Bounded source/output projection; offsets refer to the original current text. */
export function projectA4Output(current){
  if(typeof current!=='string'||scalarLength(current)>8192)return null;
  const first=current.split(/[.;；。]/u)[0]?.trim();
  if(!first)return null;
  let match=first.match(englishSource),kind='EN_SOURCE_TO_OUTPUT';
  if(!match){match=first.match(chineseSource);kind='ZH_SOURCE_TO_OUTPUT';}
  if(!match)return null;
  const source=match[1].trim(),goal=match[2].trim();
  if(!source||!goal||source===goal)return null;
  const sourceStart=current.indexOf(source),goalStart=current.indexOf(goal);
  if(sourceStart<0||goalStart<=sourceStart)return null;
  return {kind,source:{text:source,start:sourceStart,end:sourceStart+source.length},
    goal:{text:goal,start:goalStart,end:goalStart+goal.length}};
}

export function routeA4RoleContrast(index,input,{catalog_sha256,
  flat_min_score=.02,flat_min_margin=.02,
  goal_min_score=.08,goal_min_margin=.05}={}){
  if(!digest(catalog_sha256)||
    ![flat_min_score,flat_min_margin,goal_min_score,goal_min_margin]
      .every(x=>Number.isFinite(x)&&x>=0))return defer('A4_ROLE_BAD_CONFIG');
  if(!validInput(input))return defer('A4_ROLE_BAD_INPUT_OR_PROFILE_OVERFLOW');
  const flat=routeA3(index,input,{catalog_sha256,
    min_score:flat_min_score,min_margin:flat_min_margin});
  if(['INVALID_INDEX','CATALOG_MISMATCH','BAD_INPUT','BAD_CONFIG'].includes(flat.reason))
    return flat;
  const current=input.current.trim();
  const scope=explicitA4Scope(current);
  if(scope)return defer(scope);
  const projection=projectA4Output(current);
  if(!projection)return flat;
  const routeGoal=routeA3(index,bare(projection.goal.text),{catalog_sha256,
    min_score:goal_min_score,min_margin:goal_min_margin});
  const routeSource=routeA3(index,bare(projection.source.text),{catalog_sha256,
    min_score:goal_min_score,min_margin:goal_min_margin});
  if(!assigned(routeGoal)){
    if(assigned(flat)&&assigned(routeSource)&&
      flat.topics[0]===routeSource.topics[0])
      return defer('A4_ROLE_SOURCE_ONLY_EVIDENCE');
    return flat;
  }
  if(assigned(routeSource)&&routeGoal.topics[0]===routeSource.topics[0])
    return flat;
  if(assigned(flat)&&flat.topics[0]===routeGoal.topics[0])
    return {...flat,reason:'A4_ROLE_GOAL_AGREEMENT'};
  return {state:'ASSIGNED',topics:[routeGoal.topics[0]],
    reason:'A4_ROLE_CURRENT_OUTPUT_EVIDENCE',
    evidence_source:'current-goal-span',
    source_span:[projection.source.start,projection.source.end],
    goal_span:[projection.goal.start,projection.goal.end],
    score:routeGoal.score,margin:routeGoal.margin};
}
