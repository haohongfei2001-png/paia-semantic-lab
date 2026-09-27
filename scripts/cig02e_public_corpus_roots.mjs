export const HUMAN = "\n\nHuman:";
export const ASSISTANT = "\n\nAssistant:";
export function rootFromTranscript(text, maxChars=4000) {
 if(typeof text!=="string"||!text.startsWith(HUMAN))return {reason:"MISSING_ROOT_HUMAN_PREFIX"};
 const end=text.indexOf(ASSISTANT,HUMAN.length);
 if(end<0)return {reason:"MISSING_ASSISTANT_BOUNDARY"};
 const root=text.slice(HUMAN.length,end);
 if(root.includes(HUMAN))return {reason:"AMBIGUOUS_NESTED_HUMAN_PREFIX"};
 if(!root.trim())return {reason:"EMPTY_ROOT"};
 if(root.length>maxChars)return {reason:"ROOT_TOO_LONG_NO_TRUNCATION"};
 return {root};
}
export function extractSharedRoot(pair,maxChars=4000) {
 if(!pair||typeof pair!=="object"||Array.isArray(pair))return {reason:"INVALID_PAIR"};
 const a=rootFromTranscript(pair.chosen,maxChars),b=rootFromTranscript(pair.rejected,maxChars);
 if(a.reason||b.reason)return {reason:a.reason||b.reason};
 if(a.root!==b.root)return {reason:"ROOT_BRANCH_MISMATCH"};
 return {root:a.root,classification:"UPSTREAM_DELIMITER_ROLE_SOURCE_ONLY"};
}
export function selectRoots(rows,topics,maxPerTopic=3) {
 const seen=new Set(),counts=new Map(topics.map(t=>[t.topic_id,0])),selected=[];
 for(const row of rows) {
  if(seen.has(row.root))continue;
  seen.add(row.root);
  const hints=topics.filter(t=>new RegExp(t.retrieval_hint,"i").test(row.root)&&counts.get(t.topic_id)<maxPerTopic).map(t=>t.topic_id);
  if(!hints.length)continue;
  hints.forEach(t=>counts.set(t,counts.get(t)+1));
  selected.push({...row,retrieval_hints:hints,nominated_topic:null,accepted_gold:false});
 }
 return selected;
}
