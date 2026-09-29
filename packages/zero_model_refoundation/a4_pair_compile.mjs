/** Fixed Catalog/graph/designated-TRAIN compiler; no challenge, DEV, AS or TEST reads. */
import {readFile,lstat,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';
import {buildA3} from './a3_compile.mjs';
import {compileA4Pairs} from './a4_pairwise.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const CATALOG='catalog/system_topic_catalog_v0.2.yaml';
const GRAPH='data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json';
const PAIR_TRAIN='data/zero_model_refoundation/development/provisional_a4_train_v0.1.json';
const BASE_TRAIN='data/zero_model_refoundation/development/provisional_train_v0.2.json';
const sha=x=>createHash('sha256').update(x).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
async function regular(p){const f=resolve(ROOT,p),s=await lstat(f);
  must(s.isFile()&&!s.isSymbolicLink(),'regular fixed-path input required');
  return readFile(f);}

export async function buildA4Pairs({output=resolve(ROOT,'artifacts/zmr-v1/a4-pair-index.json')}={}){
  const cat=await regular(CATALOG),ids=parsePinnedCatalog(cat).map(x=>x.id),catalogSha=sha(cat);
  const graphBytes=await regular(GRAPH),graph=JSON.parse(graphBytes),graphSha=sha(graphBytes);
  const baseBytes=await regular(BASE_TRAIN),base=parseProvisionalTrain(baseBytes,catalogSha,ids);
  must(base.length===144&&graph.catalog_sha256===catalogSha&&graph.topic_count===144&&
    graph.no_resolver_activated===true,'invalid Catalog graph or base TRAIN');
  const trainBytes=await regular(PAIR_TRAIN),train=JSON.parse(trainBytes);
  must(train.schema==='ZMR-A4-PROVISIONAL-TRAIN-1'&&
    train.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&
    train.catalog_sha256===catalogSha&&train.boundary_graph_sha256===graphSha&&
    train.qualification_credit_rows===0&&train.independent_source_cohorts===0&&
    train.resolver_activated===false&&train.row_count===20&&
    train.labeled_rows===16&&train.unresolved_ambiguous_rows===4&&
    JSON.stringify(train.edge_ranks)===JSON.stringify([1,3,5,8])&&
    Array.isArray(train.rows)&&train.rows.length===20,'invalid designated pair TRAIN');
  const pairs=[];
  for(let i=0;i<4;i++){
    const rank=train.edge_ranks[i],edge=graph.edges[rank-1],rows=train.rows.slice(i*5,i*5+5);
    must(edge.rank===rank&&rows.length===5,'invalid graph edge');
    for(let j=0;j<5;j++){
      const row=rows[j],role=j<2?'LEFT':j<4?'RIGHT':'AMBIGUOUS';
      must(row.graph_rank===rank&&row.role===role&&
        row.left_topic_id===edge.left_topic_id&&
        row.right_topic_id===edge.right_topic_id&&
        row.writer_id==='candidate-writer'&&
        row.source_id==='writer-a4-train-20260929'&&
        row.source_license_status==='ORIGINAL_CANDIDATE_WRITER_PROVISIONAL'&&
        row.review_status==='UNREVIEWED_PROVISIONAL'&&
        row.split==='TRAIN_PROVISIONAL'&&row.exposure==='PUBLIC_TRAIN'&&
        row.contrast_family===`a4-train-contrast-${String(rank).padStart(2,'0')}`&&
        (role==='AMBIGUOUS'?row.provisional_topic_id===null&&
          row.provisional_gold_topics.length===0:
          row.provisional_topic_id===(role==='LEFT'?edge.left_topic_id:edge.right_topic_id)&&
          row.provisional_gold_topics.length===1&&
          row.provisional_gold_topics[0]===row.provisional_topic_id),
        'invalid designated pair TRAIN row');
    }
    pairs.push({rank,left_topic_id:edge.left_topic_id,
      right_topic_id:edge.right_topic_id,cases:rows});
  }
  const index=compileA4Pairs({topic_ids:ids,pairs,catalog_sha256:catalogSha,
    graph_sha256:graphSha,pair_train_sha256:sha(trainBytes),base_train_sha256:sha(baseBytes)});
  const bytes=Buffer.from(JSON.stringify(index)+'\n');
  const temp=await mkdtemp(join(tmpdir(),'zmr-a4-static-'));
  let baseBuild;
  try{baseBuild=await buildA3({mode:'char',output:join(temp,'a3-char.json')});}
  finally{await rm(temp,{recursive:true,force:true});}
  const totalIndexBytes=baseBuild.index_bytes+bytes.length;
  const runtimeBytes=(await regular('packages/zero_model_refoundation/a1.mjs')).length+
    (await regular('packages/zero_model_refoundation/a3.mjs')).length+
    (await regular('packages/zero_model_refoundation/a4_pairwise.mjs')).length;
  must(totalIndexBytes<=1048576,'A4 combined index exceeds 1 MiB');
  must(totalIndexBytes+runtimeBytes<=2097152,'A4 combined runtime plus index exceeds 2 MiB');
  await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);
  return {classification:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
    capability_verdict:'UNTESTED',resource_verdict:'NOT_QUALIFIED',
    topic_count:144,graph_pairs:4,designated_train_rows:20,
    catalog_sha256:catalogSha,graph_sha256:graphSha,
    pair_train_sha256:sha(trainBytes),base_train_sha256:sha(baseBytes),
    pair_index_sha256:sha(bytes),pair_index_bytes:bytes.length,
    base_index_bytes:baseBuild.index_bytes,total_index_bytes:totalIndexBytes,
    runtime_plus_total_index_bytes:totalIndexBytes+runtimeBytes,output};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await buildA4Pairs()));
