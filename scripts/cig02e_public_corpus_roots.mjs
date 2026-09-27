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

export function validateRootInventory(inventory,counts,sha256) {
 if(!Array.isArray(inventory)||typeof sha256!=="function")throw new Error("INVALID_INVENTORY");
 if(counts.pairs!==240||inventory.length!==counts.extractable)throw new Error("INVENTORY_COUNT_MISMATCH");
 const rows=new Set();let previous=0;
 for(const r of inventory) {
  if(Object.keys(r).sort().join("|")!=="accepted_gold|full_instruction_certified|instruction_sha256|nominated_topic|root|row")throw new Error("UNEXPECTED_ROOT_FIELDS");
  if(!Number.isInteger(r.row)||r.row<=previous||r.row>counts.pairs||rows.has(r.row))throw new Error("INVALID_SOURCE_ROW_IDENTITY");
  rows.add(r.row);previous=r.row;
  if(typeof r.root!=="string"||!r.root.trim()||r.root.length>4000||sha256(r.root)!==r.instruction_sha256)throw new Error("INVALID_ROOT_IDENTITY");
  if(r.nominated_topic!==null||r.accepted_gold!==false||r.full_instruction_certified!==false)throw new Error("SOURCE_PROMOTION_FORBIDDEN");
 }
 if(new Set(inventory.map(r=>r.root)).size!==counts.distinct)throw new Error("DISTINCT_ROOT_COUNT_MISMATCH");
 return true;
}
