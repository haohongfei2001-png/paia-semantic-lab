/** Browser-compatible current-only A1 variant; no implicit context or multilabel. */
import {routeA1} from './a1.mjs';
const defer=reason=>({state:'DEFER',topics:[],reason});
export function routeA1Balanced(index,input,{catalog_sha256}={}){
  if(index?.selector?.id!=='A1_TOPIC_LANGUAGE_FEATURE_RESERVATION'||
    index.selector.per_topic_language!==20||index.selector.feature_cap!==6000||
    index.mode!=='char'||index.max_features!==6000||!Array.isArray(index.postings)||index.postings.length>6000)
    return defer('A1_BALANCED_INVALID_SELECTOR');
  if(!input||typeof input.current!=='string'||typeof input.title!=='string'||!Array.isArray(input.recent)||input.recent.length>32||!input.recent.every(x=>typeof x==='string')||
    [input.current,input.title,...input.recent].reduce((n,x)=>n+Array.from(x).length,0)>8192)
    return defer('A1_BALANCED_BAD_INPUT_OR_PROFILE_OVERFLOW');
  return routeA1(index,input,{catalog_sha256,method:'tfidf',min_score:.15,min_margin:.02});
}
