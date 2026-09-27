import fs from "node:fs";
import {createHash} from "node:crypto";
import {createGunzip} from "node:zlib";
import {Readable} from "node:stream";
import readline from "node:readline";
import assert from "node:assert/strict";
import {extractSharedRoot,selectRoots,validateRootInventory} from "./cig02e_public_corpus_roots.mjs";
const M="artifacts/compositional-intent-graph-v1/CIG-02E_PUBLIC_CORPUS_ROOT_INTAKE.json";
const config=JSON.parse(fs.readFileSync(M,"utf8"));
const source=config.source;
assert.equal(source.repository,"anthropics/hh-rlhf");
assert.equal(source.commit,"c72f5cee8eb7b4d2ea5617657f4430d5e333af07");
assert.equal(source.path,"harmless-base/train.jsonl.gz");
assert.equal(source.git_blob_sha,"df7c90b1bbd6093bda9c996e8aab9a46fa557dcf");
assert.equal(config.limits.first_pairs,240);
assert.equal(config.limits.max_selected_per_topic,3);
assert.equal(config.test_inputs_read,0);
assert.equal(config.accepted_fixture_rows,0);
assert.equal(config.gold_rows_created,0);
assert.equal(config.assistant_text_used_for_intent,false);
assert.equal(config.cig02_frozen,false);assert.equal(config.cig03_started,false);
const response=await fetch("https://raw.githubusercontent.com/"+source.repository+"/"+source.commit+"/"+source.path,{signal:AbortSignal.timeout(30000),redirect:"error"});
assert.ok(response.ok,"Source fetch failed");
const chunks=[];let bytes=0;
for await(const chunk of response.body){
 bytes+=chunk.length;assert.ok(bytes<=config.limits.max_compressed_bytes,"Compressed limit");
 chunks.push(Buffer.from(chunk));
}
const compressed=Buffer.concat(chunks);
assert.equal(compressed.length,source.compressed_bytes);
const gitSha=createHash("sha1").update(Buffer.from("blob "+compressed.length+"\0")).update(compressed).digest("hex");
assert.equal(gitSha,source.git_blob_sha,"Pinned source identity mismatch");
const gunzip=createGunzip();let decompressedBytes=0;
gunzip.on("data",chunk=>{decompressedBytes+=chunk.length;if(decompressedBytes>config.limits.max_decompressed_bytes)gunzip.destroy(new Error("Decompression limit"));});
const stream=Readable.from([compressed]);stream.pipe(gunzip);
const lines=readline.createInterface({input:gunzip,crlfDelay:Infinity});
const roots=[],rejected={};let pairs=0;
try {
 for await(const line of lines){
  if(!line)throw new Error("Blank source row");
  const pair=JSON.parse(line);pairs++;
  const value=extractSharedRoot(pair,config.limits.max_root_chars);
  if(value.reason)rejected[value.reason]=(rejected[value.reason]||0)+1;
  else roots.push({row:pairs,root:value.root,instruction_sha256:createHash("sha256").update(value.root,"utf8").digest("hex")});
  if(pairs===config.limits.first_pairs)break;
 }
} finally {lines.close();gunzip.destroy();stream.destroy();}
assert.equal(pairs,240,"Incomplete fixed prefix");
const selected=selectRoots(roots,config.topics,config.limits.max_selected_per_topic);
const inventory=roots.map(r=>({...r,nominated_topic:null,accepted_gold:false,full_instruction_certified:false}));
validateRootInventory(inventory,{pairs,extractable:roots.length,distinct:new Set(roots.map(r=>r.root)).size},s=>createHash("sha256").update(s,"utf8").digest("hex"));
const result={source_root_inventory:inventory,classification:"BOUNDED_PUBLIC_TRAIN_ROOT_DISCOVERY_NOT_GOLD_OR_CAPABILITY",
 source,first_pairs:240,pairs_inspected:pairs,extractable_root_pairs:roots.length,rejected_roots:rejected,
 distinct_extracted_roots:new Set(roots.map(r=>r.root)).size,selected_root_records:selected,
 selected_counts:Object.fromEntries(config.topics.map(t=>[t.topic_id,selected.filter(r=>r.retrieval_hints.includes(t.topic_id)).length])),
 authorship_class:config.authorship_class,role_limitations:config.role_limitations,
 full_instruction_certified:false,accepted_fixture_rows:0,gold_rows_created:0,
 candidate_predictions_read:0,dev_scores_computed:0,capability_test_rows_read:0,cig02_frozen:false,cig03_started:false};
const prior=JSON.parse(fs.readFileSync("artifacts/compositional-intent-graph-v1/CIG-02E_HH_ROOT_SOURCE_INTAKE_OBSERVATION.json","utf8"));
for(const field of ["source","first_pairs","pairs_inspected","extractable_root_pairs","rejected_roots","distinct_extracted_roots","selected_root_records","selected_counts"])
 assert.deepEqual(result[field],prior[field],"Fixed-prefix observation changed: "+field);
const output="artifacts/compositional-intent-graph-v1/CIG-02E_HH_ROOT_SOURCE_INTAKE_RESULT.json";
fs.mkdirSync("artifacts/compositional-intent-graph-v1",{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n");
console.log("CIG02E_HH_ROOT_SOURCE_INTAKE_RESULT_JSON "+JSON.stringify(result));
