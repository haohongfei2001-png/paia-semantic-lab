import { extractGoal } from "./goal_parser.mjs";
import { createCatalogNameGrounder } from "./catalog_name_grounder.mjs";

const stop=new Set(["a","an","and","are","as","at","be","by","can","could","do","for","from","help",
  "how","i","in","is","it","me","my","need","of","on","or","please","should","the","to","want",
  "what","when","where","which","with","would","you","your"]);
const lower=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim();
function stem(token) {
  if (token.length>5 && token.endsWith("ies")) return token.slice(0,-3)+"y";
  if (token.length>5 && token.endsWith("ing")) return token.slice(0,-3);
  if (token.length>4 && token.endsWith("ed")) return token.slice(0,-2);
  if (token.length>4 && token.endsWith("s")) return token.slice(0,-1);
  return token;
}
function tokens(value) {
  const text=lower(value);
  const english=[...text.matchAll(/[a-z][a-z0-9-]*/gu)].map(match=>stem(match[0]))
    .filter(token=>token.length>=3&&!stop.has(token));
  const chinese=[...text.matchAll(/[\p{Script=Han}]+/gu)].flatMap(match=>{
    const chars=[...match[0]],out=[];
    for(let i=0;i<chars.length-1;i++)out.push(chars[i]+chars[i+1]);
    return out;
  });
  return new Set([...english,...chinese]);
}
const requestForm=/(?:[?？]|^\s*(?:please|can you|could you|how|what|when|where|which|why|i need|i want|help me|请|帮我|怎么|如何|我想|我需要|能否|能不能))/iu;
const incidental=/(?:only quoting|just an example|hypothetical|只是例子|只是背景|不用分类|没有需要处理)/iu;

export function createGradedGrounder(index,policy="balanced") {
  if(index?.format!=="cig02c-typed-catalog-name-index-v1"||index.topics?.length!==144)throw Error("invalid index");
  if(!["strict","balanced"].includes(policy))throw Error("unknown policy");
  const exact=createCatalogNameGrounder(index,policy);
  const prepared=index.topics.map(topic=>({
    topic_id:topic.topic_id,
    object:new Set(topic.atoms.OBJECT.flatMap(atom=>[...tokens(atom.value)])),
    outcome:new Set(topic.atoms.OUTCOME.flatMap(atom=>[...tokens(atom.value)]))
  }));
  const df=new Map();
  for(const topic of prepared)for(const token of new Set([...topic.object,...topic.outcome]))
    df.set(token,(df.get(token)??0)+1);
  const weight=token=>Math.log2(145/(1+(df.get(token)??144)));
  function classify(input) {
    const current=String(input?.current??"").trim();
    if(!current||incidental.test(current))return {topics:[],state:"DEFER"};
    const exactResult=exact.classify(input);
    if(exactResult.topics.length)return exactResult;
    const goal=extractGoal(current);
    if(!goal&&!requestForm.test(current))return {topics:[],state:"DEFER"};
    const observed=tokens(goal?.span??current);
    if(!observed.size)return {topics:[],state:"DEFER"};
    const ranked=[];
    for(const topic of prepared) {
      let objectScore=0,outcomeScore=0,objectHits=0;
      for(const token of observed) {
        const w=weight(token);
        if(w<=0.35)continue;
        if(topic.object.has(token)){objectScore+=w;objectHits++;}
        else if(topic.outcome.has(token))outcomeScore+=w*0.55;
      }
      if(objectHits)ranked.push({topic_id:topic.topic_id,score:objectScore+outcomeScore,objectHits});
    }
    ranked.sort((a,b)=>b.score-a.score||a.topic_id.localeCompare(b.topic_id));
    const best=ranked[0],second=ranked[1];
    if(!best)return {topics:[],state:"DEFER"};
    const floor=policy==="strict"?5:3.5,margin=policy==="strict"?2.5:1.5;
    if(best.score<floor||(second&&best.score-second.score<margin))return {topics:[],state:"DEFER"};
    return {topics:[best.topic_id],state:"ASSIGNED",goal_source:goal?"EXPLICIT_GOAL_SPAN":"CURRENT_REQUEST",
      evidence:{source:"GLOBAL_TYPED_TOKEN_OVERLAP",score:best.score,object_hits:best.objectHits}};
  }
  return {classify};
}
