import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildA2} from './a2_compile.mjs';
import {buildH1Domain} from './h1_domain_compile.mjs';
import {routeA2} from './a2.mjs';
import {scoreH1Flat,rankH1Domains,routeH1FlatScope,
  routeH1RecallSafe,rankH1CompiledDomains,routeH1R1} from './h1_recall_safe.mjs';

test('H1 domain ranking retains all 18 eight-Topic domains',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-h1-rank-'));
  try{
    const build=await buildA2({mode:'char',output:join(dir,'a2.json')});
    const index=JSON.parse(await readFile(build.output));
    const catalog_sha256=index.catalog_sha256;
    const raw=scoreH1Flat(index,'Please organize the permit renewal dates.',{catalog_sha256});
    assert(raw&&raw.matched_features>0);
    const coarse=rankH1Domains(index,raw.scores);
    assert.equal(coarse.ranked.length,18);
    assert.equal(new Set(coarse.ranked).size,18);
    const flat=routeA2(index,{current:'Please organize the permit renewal dates.',
      title:'',recent:[]},{catalog_sha256,alpha:.5,min_score:0,min_margin:.5});
    if(flat.state==='ASSIGNED'){
      const ordered=Array.from({length:144},(_,i)=>i).sort((a,b)=>
        raw.scores[b]-raw.scores[a]||
        (index.topic_ids[a]<index.topic_ids[b]?-1:index.topic_ids[a]>index.topic_ids[b]?1:0));
      assert.equal(index.topic_ids[ordered[0]],flat.topics[0]);
    }
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('H1-R1 compiled domains preserve 18x8 closure, flat recovery and safety',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-h1-r1-test-'));
  try{
    const a2Build=await buildA2({mode:'char',output:join(dir,'a2.json')});
    const domainBuild=await buildH1Domain({output:join(dir,'domain.json')});
    const a2=JSON.parse(await readFile(a2Build.output));
    const domain=JSON.parse(await readFile(domainBuild.output));
    assert.equal(domain.domain_ids.length,18);
    assert.deepEqual(domain.topic_ids,a2.topic_ids);
    assert.equal(domain.train_sha256,a2.train_sha256);
    assert(a2Build.index_bytes+domainBuild.index_bytes<=1048576);
    const ordinary={current:'Please organize the permit renewal dates.',
      title:'',recent:[]};
    const ranking=rankH1CompiledDomains(domain,ordinary.current,
      {catalog_sha256:a2.catalog_sha256,train_sha256:a2.train_sha256});
    assert.equal(ranking.ranked.length,18);
    assert.deepEqual(routeH1R1(a2,domain,ordinary,{catalog_sha256:a2.catalog_sha256}),
      routeH1R1(a2,domain,ordinary,{catalog_sha256:a2.catalog_sha256}));
    const flat=routeH1FlatScope(a2,ordinary,{catalog_sha256:a2.catalog_sha256});
    const broken={...domain,train_sha256:'a'.repeat(64)};
    if(flat.state==='ASSIGNED')assert.equal(routeH1R1(a2,broken,ordinary,
      {catalog_sha256:a2.catalog_sha256}).reason,'H1_R1_INDEX_CLOSURE_MISMATCH');
    assert.equal(routeH1R1(a2,domain,{current:'No action needed; this is only a record.',
      title:'',recent:[]},{catalog_sha256:a2.catalog_sha256}).state,'DEFER');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('H1 retains full144 flat recovery, no-request safety, determinism and static caps',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zmr-h1-route-'));
  try{
    const build=await buildA2({mode:'char',output:join(dir,'a2.json')});
    const index=JSON.parse(await readFile(build.output));
    const catalog_sha256=index.catalog_sha256;
    assert.equal(index.topic_ids.length,144);
    assert(build.index_bytes<=1048576);
    const source=await Promise.all(['a1.mjs','a2.mjs','a6_complement_scope.mjs',
      'a6_complement_r1.mjs','a6_complement_r2.mjs','h1_recall_safe.mjs']
      .map(n=>readFile(new URL(n,import.meta.url))));
    assert(build.index_bytes+source.reduce((n,b)=>n+b.length,0)<=2097152);
    const control={current:'This note is for reference only; no follow-up action.',
      title:'Please act',recent:['Please act']};
    assert.equal(routeH1RecallSafe(index,control,{catalog_sha256}).reason,
      'H1_EXPLICIT_NO_REQUEST');
    const ordinary={current:'Please organize the permit renewal dates.',
      title:'',recent:[]};
    const first=routeH1RecallSafe(index,ordinary,{catalog_sha256});
    assert.deepEqual(first,routeH1RecallSafe(index,ordinary,{catalog_sha256}));
    assert(['ASSIGNED','DEFER'].includes(first.state));
    assert(first.topics.every(topic=>index.topic_ids.includes(topic)));
    assert.equal(routeH1FlatScope(index,ordinary,{catalog_sha256:'b'.repeat(64)}).reason,
      'INDEX_CLOSURE_MISMATCH');
    assert.equal(routeH1RecallSafe(index,{...ordinary,recent:[4]},
      {catalog_sha256}).reason,'BAD_INPUT_OR_PROFILE_OVERFLOW');
  }finally{await rm(dir,{recursive:true,force:true});}
});
