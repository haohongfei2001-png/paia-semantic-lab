import {createHash} from 'node:crypto';
import {extractTaskMetadata, NI_METADATA_FIELDS} from './cig02e_selective_task_metadata.mjs';

const PIN = '55a365637381ce7f3748fa2eac7aef1a113bbb82';
const TRAIN_BLOB = '42dfa619f1f4c3be5f5da3546260dc7afdf3acf9';
const reject = reason => {throw new Error('TRAIN_INTAKE_REJECT: '+reason);};
const positive = n => Number.isSafeInteger(n) && n > 0;
export function validateIntakePlan(plan) {
  const s=plan.source, l=plan.limits;
  if (plan.format!=='CIG02E_PUBLIC_TRAIN_DEFINITION_FEASIBILITY_PLAN_V1' ||
      s.repository!=='allenai/natural-instructions' || s.commit!==PIN ||
      s.train_list_path!=='splits/xlingual/train_tasks.txt' || s.train_list_blob!==TRAIN_BLOB ||
      s.train_task_count!==1270 || s.selection!=='FIRST_24_NONEMPTY_LINES_IN_PUBLISHED_TRAIN_ORDER' ||
      l.max_tasks!==24 || l.requests_per_task!==1 || l.retries!==0 ||
      l.max_total_download_bytes!==134217728 || l.max_task_download_bytes!==50331648 ||
      l.max_definition_chars_per_task!==20000) reject('registered plan drift');
  if (!Array.isArray(s.selected_task_names) || s.selected_task_names.length!==24 ||
      new Set(s.selected_task_names).size!==24 ||
      s.selected_task_names.some(n=>!/^task[0-9]+_[a-zA-Z0-9_]+$/.test(n)) ||
      JSON.stringify(s.selected_paths)!==JSON.stringify(s.selected_task_names.map(n=>'tasks/'+n+'.json')))
    reject('selection shape');
  if (JSON.stringify(plan.extraction_contract.allowed_fields)!==JSON.stringify(NI_METADATA_FIELDS) ||
      plan.extraction_contract.whole_task_parse_allowed!==false ||
      plan.extraction_contract.assistant_outputs_used!==false ||
      plan.cig02_frozen!==false || plan.cig03_started!==false ||
      ['accepted_fixture_rows','gold_rows_created','candidate_predictions_read','dev_scores_computed','capability_test_rows_read'].some(k=>plan[k]!==0))
    reject('evidence boundary drift');
  return s.selected_paths;
}
export function rawSourceURL(plan,path) {
  return 'https://raw.githubusercontent.com/'+plan.source.repository+'/'+plan.source.commit+'/'+path;
}
function descriptor(d,path,maxBytes) {
  if (d.path!==path || !/^[0-9a-f]{40}$/.test(d.sha) || !positive(d.size) ||
      d.size>maxBytes || d.type!=='blob') reject('descriptor');
}

// The complete stream identity is checked before parsed metadata can leave this function.
export async function consumeVerifiedResponse(response,d,{url,budget,maxBytes,consume}) {
  async function rejectResponse(reason) { await response?.body?.cancel?.(); reject(reason); }
  if (!response?.ok || response.status!==200 || response.url!==url || response.redirected ||
      typeof response.body?.getReader!=='function') return rejectResponse('response origin/status');
  if (!positive(d.size) || d.size>maxBytes || !/^[0-9a-f]{40}$/.test(d.sha) ||
      !positive(budget.maxBytes) || !Number.isSafeInteger(budget.usedBytes) || budget.usedBytes<0)
    return rejectResponse('response limits');
  if (budget.usedBytes+d.size>budget.maxBytes) return rejectResponse('total declared byte limit');
  const reader=response.body.getReader();
  const hash=createHash('sha1').update('blob '+d.size+'\0');
  const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
  let received=0, exhausted=false, digest;
  async function* decoded() {
    try {
      while (true) {
        const {done,value}=await reader.read();
        if (done) {exhausted=true;break;}
        if (!(value instanceof Uint8Array)) reject('nonbyte chunk');
        received+=value.byteLength; budget.usedBytes+=value.byteLength;
        if (received>d.size || received>maxBytes || budget.usedBytes>budget.maxBytes) reject('received byte limit');
        hash.update(value);
        const text=decoder.decode(value,{stream:true});
        if (text) yield text;
      }
      const tail=decoder.decode();
      if (tail) yield tail;
      if (received!==d.size) reject('truncated byte count');
      digest=hash.digest('hex');
      if (digest!==d.sha) reject('Git blob mismatch');
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  }
  const stream=decoded();
  try {
    const result=await consume(stream);
    if (!exhausted || digest!==d.sha) reject('consumer did not verify complete stream');
    return {result,verifiedBlob:d.sha,receivedBytes:received};
  } finally {await stream.return();}
}

export function verifyTrainMembership(plan,names) {
  validateIntakePlan(plan);
  if (names.length!==plan.source.train_task_count ||
      JSON.stringify(names.slice(0,24))!==JSON.stringify(plan.source.selected_task_names))
    reject('fixed TRAIN membership/order');
}

export async function acquireFixedTrainDefinitions(plan,{trainDescriptor,trainResponse,taskDescriptors,fetchTask}) {
  const progress={stage:'PLAN',currentTask:null,taskRequests:0,verifiedTaskCount:0,
    sourceBytesReceived:0,trainListVerified:false};
  let budget;
  try {
  const paths=validateIntakePlan(plan), l=plan.limits;
  descriptor(trainDescriptor,plan.source.train_list_path,l.max_task_download_bytes);
  if (trainDescriptor.sha!==plan.source.train_list_blob) reject('TRAIN list identity');
  if (!Array.isArray(taskDescriptors) || taskDescriptors.length!==paths.length) reject('descriptor count');
  taskDescriptors.forEach((d,i)=>descriptor(d,paths[i],l.max_task_download_bytes));
  if (trainDescriptor.size+taskDescriptors.reduce((n,d)=>n+d.size,0)>l.max_total_download_bytes)
    reject('total planned byte limit');
  budget={maxBytes:l.max_total_download_bytes,usedBytes:0};
  progress.stage='TRAIN_LIST';
  const train=await consumeVerifiedResponse(trainResponse,trainDescriptor,{
    url:rawSourceURL(plan,trainDescriptor.path),budget,maxBytes:l.max_task_download_bytes,
    consume:async stream=>{let text='';for await(const chunk of stream){text+=chunk;if(text.length>1000000)reject('TRAIN list text limit');}return text;}
  });
  progress.trainListVerified=true;
  const names=train.result.trim().split(/\r?\n/).filter(Boolean);
  verifyTrainMembership(plan,names);
  const records=[], attempted=new Set();
  for (const d of taskDescriptors) {
    if (attempted.has(d.path)) reject('duplicate request'); attempted.add(d.path);
    // The injected transport must make one request with redirects disabled and a finite timeout.
    const url=rawSourceURL(plan,d.path);
    progress.stage='TASK_STREAM';
    progress.currentTask={path:d.path,gitBlob:d.sha,declaredBytes:d.size};
    progress.taskRequests=attempted.size;
    const response=await fetchTask(url);
    const value=await consumeVerifiedResponse(response,d,{url,budget,maxBytes:l.max_task_download_bytes,
      consume:chunks=>extractTaskMetadata(chunks,{maxInputChars:l.max_task_download_bytes,maxDefinitionChars:l.max_definition_chars_per_task})});
    progress.verifiedTaskCount++;
    records.push({path:d.path,gitBlob:value.verifiedBlob,sourceBytes:value.receivedBytes,metadata:value.result.metadata,
      skippedFields:value.result.stats.skippedTopLevelFields,excludedValueStringsDecoded:value.result.stats.excludedValueStringsDecoded,
      fullInstructionCertified:false,acceptedGold:false});
  }
  return {classification:'FIXED_PUBLIC_TRAIN_DEFINITION_EXCERPTS_NOT_GOLD_OR_CAPABILITY',records,sourceBytes:budget.usedBytes,
    taskRequests:attempted.size,retries:0,accepted_fixture_rows:0,gold_rows_created:0,candidate_predictions_read:0,
    dev_scores_computed:0,capability_test_rows_read:0,cig02_frozen:false,cig03_started:false};
  } catch(error) {
    progress.sourceBytesReceived=budget?.usedBytes ?? 0;
    // Descriptor/counters only: never retain partial parsed records, values or source snippets.
    error.intakeProgress={...progress};
    throw error;
  } finally { await trainResponse?.body?.cancel?.(); }
}
