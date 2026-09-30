/** Separate frozen TRAIN-v0.4 development compiler. No DEV, AS, TEST or runtime scoring. */
import {readFile,lstat,mkdir,writeFile,realpath} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadFrozenTrainV04,trainV04Hash} from './train_v04.mjs';
import {compileA1} from './a1.mjs';
import {compileA2} from './a2.mjs';
import {compileA3} from './a3.mjs';
import {packA1V04} from './a1_v04_compact.mjs';
import {canonicalCompiledNumbers,COMPILED_NUMBER_ENCODING} from './compiled_numbers.mjs';
const ROOT=new URL('../../',import.meta.url);
const CLASS='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE';
const must=(ok,message)=>{if(!ok)throw new Error(message);};
// Fixed before fitting. These are engineering recipes, not promoted stable configurations.
export const TRAIN_V04_RECIPES=Object.freeze({
 A1:Object.freeze({family:'A1',mode:'char',max_features:1500,selector:'DOCUMENT_FREQUENCY_DESCENDING',objective:'TFIDF_AND_BM25_STATISTICS',quantization:'PER_CHANNEL_GLOBAL_INT16_STORAGE'}),
 A2:Object.freeze({family:'A2',mode:'char',max_features:3000,selector:'MID_FREQUENCY_DF_LOG',objective:'CLASS_COMPLEMENT_LOG_LIKELIHOOD'}),
 A3:Object.freeze({family:'A3',mode:'char',max_features:3000,keep_per_topic:48,epochs:5,selector:'DOCUMENT_FREQUENCY_ASCENDING',objective:'MULTICLASS_HINGE',quantization:'GLOBAL_INT16'})
});
const COMPILERS={A1:compileA1,A2:compileA2,A3:compileA3};
const RUNTIME={A1:['a1.mjs','a1_v04_compact.mjs'],A2:['a1.mjs','a2.mjs'],A3:['a1.mjs','a3.mjs']};
export function trainV04Recipe(family){must(Object.hasOwn(TRAIN_V04_RECIPES,family),'unregistered TRAIN-v0.4 family');return TRAIN_V04_RECIPES[family];}
export function assertTrainV04StaticBudget(indexBytes,runtimeBytes){
 must(Number.isSafeInteger(indexBytes)&&indexBytes>0&&Number.isSafeInteger(runtimeBytes)&&runtimeBytes>0,'invalid static byte counts');
 must(indexBytes<=1048576,'TRAIN-v0.4 index exceeds 1 MiB');
 must(indexBytes+runtimeBytes<=2097152,'TRAIN-v0.4 runtime+index exceeds 2 MiB');
 return 'STATIC_BYTES_WITHIN_LIMITS_NOT_RESOURCE_QUALIFIED';
}
async function sourceClosure(names){
 const result=[];
 for(const name of names){
  const path='packages/zero_model_refoundation/'+name,url=new URL(path,ROOT),stat=await lstat(url);
  must(stat.isFile()&&!stat.isSymbolicLink(),'regular explicit runtime dependency required');
  const bytes=await readFile(url);result.push({path,sha256:trainV04Hash(bytes),bytes:bytes.length});
 }
 return result;
}
/** Fixed closure and fixed settings only; an arbitrary TRAIN path or hyperparameter is not accepted. */
export async function buildTrainV04(options={}){
 must(options&&typeof options==='object'&&!Array.isArray(options)&&Object.keys(options).every(k=>['family','output'].includes(k)),'unregistered compiler override');
 const {family,output}=options,recipe=trainV04Recipe(family);
 if(output!==undefined)must(typeof output==='string'&&output.length>0,'invalid output path');
 const target=output===undefined?null:resolve(output),repository=fileURLToPath(ROOT);
 if(target!==null)must(target!==repository.slice(0,-1)&&!target.startsWith(repository),'compiler outputs must be outside repository');
 const closure=await loadFrozenTrainV04();
 const documents=Object.fromEntries(closure.topics.map(t=>[t.id,[...new Set([t.name_zh,t.name_en,...t.aliases_zh,...t.aliases_en])].join(' ')]));
 for(const row of closure.rows)documents[row.topic_id]+=' '+row.current;
 const document_sha256=trainV04Hash(JSON.stringify(documents));
 const raw=COMPILERS[family]({topic_ids:closure.topics.map(t=>t.id),documents,catalog_sha256:closure.catalog_sha256,train_sha256:closure.train_sha256,...recipe});
 const raw_index_bytes=Buffer.byteLength(JSON.stringify(canonicalCompiledNumbers(raw))+'\n');
 const index=canonicalCompiledNumbers(family==='A1'?packA1V04(raw):raw);
 const bytes=Buffer.from(JSON.stringify(index)+'\n'),runtime=await sourceClosure(RUNTIME[family]);
 const compiler_dependencies=await sourceClosure(['train_v04_compile.mjs','train_v04.mjs','a1_compile.mjs','a1.mjs','a2.mjs','a3.mjs','a1_v04_compact.mjs','compiled_numbers.mjs']);
 const runtime_bytes=runtime.reduce((n,x)=>n+x.bytes,0);
 const static_status=assertTrainV04StaticBudget(bytes.length,runtime_bytes);
 // Never overwrite the frozen input closure, existing runtime, or historical receipts.
 if(target!==null){
  await mkdir(dirname(target),{recursive:true});
  const parent=await realpath(dirname(target)),actual=resolve(parent,basename(target));
  must(actual!==repository.slice(0,-1)&&!actual.startsWith(repository),'output symlink reaches protected repository');
  await writeFile(actual,bytes,{flag:'wx'});
 }
 return {index,receipt:{schema:'ZMR-TRAIN-V04-COMPILE-1',family,recipe,recipe_sha256:trainV04Hash(JSON.stringify(recipe)),
  evidence_class:CLASS,classification:'DEV_ONLY_NOT_RESOURCE_QUALIFIED',training_unit:'ONE_AGGREGATE_DOCUMENT_PER_TOPIC',
  topic_count:144,train_rows:432,catalog_sha256:closure.catalog_sha256,train_sha256:closure.train_sha256,document_sha256,
  index_sha256:trainV04Hash(bytes),index_bytes:bytes.length,raw_index_bytes,runtime,runtime_bytes,runtime_plus_index_bytes:bytes.length+runtime_bytes,static_status,
  compiler_dependencies,compiler_sha256:trainV04Hash(JSON.stringify(compiler_dependencies)),number_encoding:COMPILED_NUMBER_ENCODING,
  independent_quota_credit:0,lineage_component_count:1,grouped_validation:closure.grouped_validation,
  feature_comparison:'NATIVE_SELECTORS_DIFFER_NOT_MATCHED_FEATURE_OBJECTIVE_ABLATION',
  semantic_evaluations:0,stable_candidate:false,capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
  measurement_exclusions:['browser_dependency_closure','cold_load','warm_latency','peak_memory','runtime_parity'],
  output:output===undefined?null:resolve(output)}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 must(process.argv.length<=4,'only registered family and optional external output allowed');
 console.log(JSON.stringify((await buildTrainV04({family:process.argv[2],...(process.argv[3]?{output:process.argv[3]}:{})})).receipt));
}
