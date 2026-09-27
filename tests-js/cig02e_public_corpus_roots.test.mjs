import test from "node:test";
import assert from "node:assert/strict";
import {extractSharedRoot,selectRoots,validateRootInventory} from "../scripts/cig02e_public_corpus_roots.mjs";
const pair=(root,answer)=>({chosen:"\n\nHuman:"+root+"\n\nAssistant:"+answer,rejected:"\n\nHuman:"+root+"\n\nAssistant:other answer"});
test("shared first root preserves source whitespace; assistant and continuation are excluded",()=>{
 const p=pair("  How do I study?  ","a\n\nHuman:fake later question\n\nAssistant:later");
 assert.deepEqual(extractSharedRoot(p),{root:"  How do I study?  ",classification:"UPSTREAM_DELIMITER_ROLE_SOURCE_ONLY"});
 p.chosen=p.chosen.replace("a\n\nHuman:fake later question\n\nAssistant:later","unrelated reply");
 assert.equal(extractSharedRoot(p).root,"  How do I study?  ");
});
test("branch inconsistency, missing boundary and ambiguous nested role fail closed",()=>{
 assert.equal(extractSharedRoot({chosen:"\n\nHuman:a\n\nAssistant:x",rejected:"\n\nHuman:b\n\nAssistant:x"}).reason,"ROOT_BRANCH_MISMATCH");
 assert.equal(extractSharedRoot({chosen:"\n\nHuman:a",rejected:"\n\nHuman:a"}).reason,"MISSING_ASSISTANT_BOUNDARY");
 assert.equal(extractSharedRoot(pair("x\n\nHuman:y","x")).reason,"AMBIGUOUS_NESTED_HUMAN_PREFIX");
 assert.equal(extractSharedRoot(pair("  ","x")).reason,"EMPTY_ROOT");
 assert.equal(extractSharedRoot(pair("12345","x"),4).reason,"ROOT_TOO_LONG_NO_TRUNCATION");
});
test("retrieval is bounded, deduplicated, and never manufactures nominated gold",()=>{
 const selected=selectRoots([{row:1,root:"study one"},{row:2,root:"study one"},{row:3,root:"study two"},{row:4,root:"other"}],[{topic_id:"t",retrieval_hint:"study"}],1);
 assert.equal(selected.length,1);assert.equal(selected[0].row,1);
 assert.equal(selected[0].nominated_topic,null);assert.equal(selected[0].accepted_gold,false);
});

test("complete root inventory preserves duplicate texts under different source IDs without gold promotion",()=>{
 const hash=s=>"identity:"+s,root=" same root ";
 const inventory=[1,2].map(row=>({row,root,instruction_sha256:hash(root),nominated_topic:null,accepted_gold:false,full_instruction_certified:false}));
 assert.equal(validateRootInventory(inventory,{pairs:240,extractable:2,distinct:1},hash),true);
 for(const [change,reason] of [
  [r=>r[1].row=1,"INVALID_SOURCE_ROW_IDENTITY"],
  [r=>r[0].instruction_sha256="stale","INVALID_ROOT_IDENTITY"],
  [r=>r[0].accepted_gold=true,"SOURCE_PROMOTION_FORBIDDEN"],
  [r=>r[0].assistant_output="must not leak","UNEXPECTED_ROOT_FIELDS"],
  [r=>r[0].full_instruction_certified=true,"SOURCE_PROMOTION_FORBIDDEN"]
 ]) {
  const bad=JSON.parse(JSON.stringify(inventory));change(bad);
  assert.throws(()=>validateRootInventory(bad,{pairs:240,extractable:2,distinct:1},hash),new RegExp(reason));
 }
 assert.throws(()=>validateRootInventory(inventory,{pairs:241,extractable:2,distinct:1},hash),/INVENTORY_COUNT_MISMATCH/);
 assert.throws(()=>validateRootInventory(inventory,{pairs:240,extractable:2,distinct:2},hash),/DISTINCT_ROOT_COUNT_MISMATCH/);
});
