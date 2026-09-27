import test from "node:test";
import assert from "node:assert/strict";
import {extractSharedRoot,selectRoots} from "../scripts/cig02e_public_corpus_roots.mjs";
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
