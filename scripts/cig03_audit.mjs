import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {validatePacket} from './cig03_validate.mjs';
const ref='2c218ccfb478f9538cc30b5e50e5f07291ae422b';
const packetPath='fixtures/cig_v1/cig03_independent_test_v1.json';
const corePaths=[packetPath,'scripts/cig03_score.mjs','scripts/cig03_validate.mjs','scripts/cig03_score.test.mjs','scripts/cig03_validate.test.mjs','scripts/cig03_audit.mjs','.github/workflows/cig03-independent-test-schema.yml'];
function identity(path){const b=readFileSync(path);return {path,git_blob_sha:execFileSync('git',['hash-object',path],{encoding:'utf8'}).trim(),sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length};}
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const norm=x=>x.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
function sourceStrings(v){const out=[];const keys=new Set(['current','current_input','input_text','text','utterance','request']);const walk=x=>{
 if(Array.isArray(x)){for(const y of x)walk(y);return;}
 if(!x||typeof x!=='object')return;
 for(const [k,y]of Object.entries(x)){if(keys.has(k)&&typeof y==='string')out.push(y);else if(k==='input'&&typeof y==='string')out.push(y);else if(y&&typeof y==='object'&&!['gold','rationale','predictions','results','diagnostics'].includes(k))walk(y);}
};walk(v);return out;}
function strings(v){if(typeof v==='string')return [v];if(Array.isArray(v))return v.flatMap(strings);if(v&&typeof v==='object')return Object.values(v).flatMap(strings);return [];}
let exit=0,receipt={schema_version:'cig03-curation-audit-v1',test_started:false,candidate_executed:false,source_ref:ref};
try{
 const p=read(packetPath);
 const catalog=readFileSync('catalog/system_topic_catalog_v0.2.yaml','utf8');
 const topicIds=[...catalog.matchAll(/^  - topic_id: (\S+)/gm)].map(x=>x[1]).sort();
 const validation=validatePacket(p,{topicIds,expectedRef:ref});
 const vocabulary=[];
 for(let i=1;i<=6;i++){const shard=read('semantic_profiles/v0.1/system_topics_shard_0'+i+'.json');for(const x of shard.profiles){vocabulary.push(...strings(x.canonical_names),...strings(x.lexical_anchors));}}
 const terms=[...new Set(vocabulary.map(norm).filter(x=>x.length>=2))].sort((a,b)=>b.length-a.length);
 const skeleton=x=>{let y=norm(x);for(const t of terms)y=y.split(t).join(' scope ');return y.replace(/\d+/g,' number ').replace(/\s+/g,' ').trim();};
 const testInputs=[...p.single_label,...p.context,...p.controls].map(x=>x.current);
 const devPaths=['fixtures/cig_v1/cig02g_train_v1.json','fixtures/cig_v1/cig02g_dev_v1.json'];
 let devStrings=[];for(const path of devPaths)devStrings.push(...sourceStrings(read(path)));
 const overlaps={exact:0,normalized:0,template_skeleton:0};
 const sets=[new Set(devStrings),new Set(devStrings.map(norm)),new Set(devStrings.map(skeleton))];
 for(const text of testInputs){if(sets[0].has(text))overlaps.exact++;if(sets[1].has(norm(text)))overlaps.normalized++;if(sets[2].has(skeleton(text)))overlaps.template_skeleton++;}
 const ownNorm=testInputs.map(norm),internalDuplicates=ownNorm.length-new Set(ownNorm).size;
 const disjointPass=devStrings.length>0&&Object.values(overlaps).every(x=>x===0)&&internalDuplicates===0;
 const files=corePaths.map(identity);
 let freeze={present:false,passed:true};
 try{
   const m=read('docs/compositional-intent-graph-v1/CIG-03_TEST_FREEZE_MANIFEST.json');
   const checks=m.files.map(pin=>{const current=files.find(f=>f.path===pin.path);return !!current&&current.git_blob_sha===pin.git_blob_sha&&current.sha256===pin.sha256;});
   freeze={present:true,passed:checks.length===corePaths.length&&checks.every(Boolean)&&m.candidate.source_ref===ref&&m.test_started===false};
 }catch(e){if(e.code!=='ENOENT')freeze={present:true,passed:false};}
 receipt={...receipt,passed:validation.passed&&disjointPass&&freeze.passed,validation,
   disjointness:{passed:disjointPass,method:'exact text; NFKC lower-case punctuation/whitespace normalized; normalized template skeleton with published Catalog/Profile names and lexical anchors replaced, then numbers normalized',
     development_strings_extracted:devStrings.length,test_currents:testInputs.length,overlap_counts:overlaps,internal_normalized_duplicates:internalDuplicates,
     limitation:'mechanical equality audit only, not proof of zero semantic or lexical overlap; shared public vocabulary inevitable; no row feedback'},
   files,development_file_identities:devPaths.map(identity),formal_source_identities:['catalog/system_topic_catalog_v0.2.yaml','semantic_profiles/v0.1/manifest.json',...Array.from({length:6},(_,i)=>'semantic_profiles/v0.1/system_topics_shard_0'+(i+1)+'.json')].map(identity),freeze};
 if(!receipt.passed)exit=1;
}catch{receipt={...receipt,passed:false,error:'SAFE_AUDIT_FAILURE'};exit=1;}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/cig03-curation-audit.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
process.exitCode=exit;
