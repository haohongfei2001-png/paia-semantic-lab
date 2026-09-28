// Pure structural validation, separate from candidate code. All errors are row-free.
export function validatePacket(p, { topicIds, expectedRef, minimum={single_label:288,context:72,controls:36}, production=true }={}) {
 const issues=new Set(); const add=c=>issues.add(c);
 if(!p||p.schema_version!=='cig03-independent-test-v1')return {passed:false,issues:['SCHEMA_VERSION']};
 if(!Array.isArray(topicIds)||new Set(topicIds).size!==topicIds.length)add('FORMAL_UNIVERSE');
 const universe=new Set(topicIds||[]);
 if(!Array.isArray(p.topic_ids)||p.topic_ids.length!==universe.size||p.topic_ids.some(t=>!universe.has(t))||new Set(p.topic_ids).size!==p.topic_ids.length)add('TOPIC_SET');
 if(production&&universe.size!==144)add('FULL144_REQUIRED');
 if(!p.metadata||p.metadata.test_started!==false||p.metadata.candidate_source_ref!==expectedRef||!p.metadata.authorship?.includes('single isolated agent'))add('ATTESTATION');
 const ids=new Set(),coverage=new Map([...universe].map(t=>[t,0])),languages={},types={},domains={};
 for(const group of ['single_label','context','controls']){
   languages[group]={zh:0,en:0};
   if(!Array.isArray(p[group])||p[group].length<(minimum[group]||0)){add('ALLOCATION');continue;}
   for(const r of p[group]){
     if(!r||typeof r.id!=='string'||!/^z[0-9]{6}$/.test(r.id)||ids.has(r.id))add('OPAQUE_ID');ids.add(r?.id);
     if(typeof r?.current!=='string'||!r.current.trim()||typeof r.rationale!=='string'||r.rationale.length<12)add('TEXT_OR_RATIONALE');
     if(!['zh','en'].includes(r?.language))add('LANGUAGE');else languages[group][r.language]++;
     const g=r?.gold;
     if(!g||!['ASSIGN','DEFER'].includes(g.state)||!Array.isArray(g.topics)||g.topics.some(t=>!universe.has(t))||new Set(g.topics).size!==g.topics.length||(g.state==='DEFER'?g.topics.length!==0:g.topics.length===0)){add('GOLD');continue;}
     const v=r.provenance;
     if(!v||v.source_kind!=='NEW_AUTHORED_SYNTHETIC'||v.source_ref!==expectedRef||v.catalog_path!=='catalog/system_topic_catalog_v0.2.yaml'||
       !Array.isArray(v.formal_topic_ids)||JSON.stringify(v.formal_topic_ids)!==JSON.stringify(g.topics)||!Array.isArray(v.profile_paths)||
       v.profile_paths.some(x=>!/^semantic_profiles\/v0\.1\/system_topics_shard_0[1-6]\.json$/.test(x))||typeof v.evidence!=='string')add('PROVENANCE');
     if(group==='single_label'){if(g.state!=='ASSIGN'||g.topics.length!==1)add('SINGLE_GOLD');else coverage.set(g.topics[0],coverage.get(g.topics[0])+1);}
     if(group==='context'){
       if(g.state!=='ASSIGN'||g.topics.length!==1)add('CONTEXT_GOLD');
       if(!r.context||!Array.isArray(r.context.recent_inputs)||!r.context.recent_inputs.length||r.context.recent_inputs.some(x=>typeof x!=='string'||!x.trim())||
         !Array.isArray(r.context.activity_topic_ids)||r.context.activity_topic_ids.some(t=>!universe.has(t)))add('CONTEXT_SCHEMA');
       if(g.topics.length===1){const d=g.topics[0].split('.')[1];domains[d]=(domains[d]||0)+1;}
     }
     if(group==='controls'){if(g.state!=='DEFER'||g.topics.length)add('CONTROL_GOLD');if(!['multi_goal','ambiguous','insufficient','non_topic'].includes(r.control_type))add('CONTROL_TYPE');types[r.control_type]=(types[r.control_type]||0)+1;}
   }
 }
 if([...coverage.values()].some(n=>n<2))add('PER_TOPIC_COVERAGE');
 if(production){
   if(Object.values(languages).some(x=>x.zh!==x.en))add('LANGUAGE_ALLOCATION');
   if(Object.values(types).some(x=>x<9)||Object.keys(types).length!==4)add('CONTROL_ALLOCATION');
   if(Object.keys(domains).length!==18||Object.values(domains).some(n=>n<4))add('DOMAIN_ALLOCATION');
 }
 return {passed:issues.size===0,issues:[...issues].sort(),counts:{single_label:p.single_label?.length||0,context_pairs:p.context?.length||0,controls:p.controls?.length||0,topics:universe.size,covered_topics:[...coverage.values()].filter(n=>n>=2).length,minimum_per_topic:Math.min(...coverage.values()),languages,controls_by_type:types,context_domains:Object.keys(domains).length}};
}
