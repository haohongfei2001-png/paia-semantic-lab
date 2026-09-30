import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TRAIN_V04_MANIFEST,TRAIN_V04_SLICES,trainV04Hash,trainV04Identity,assertTrainV04Manifest,validateFrozenTrainV04,loadFrozenTrainV04} from './train_v04.mjs';
const ROOT=new URL('../../',import.meta.url),read=p=>readFile(new URL(p,ROOT));
async function fixture(){return {m:JSON.parse(await read(TRAIN_V04_MANIFEST)),c:await read('catalog/system_topic_catalog_v0.2.yaml'),p:await read('data/zero_model_refoundation/development/provisional_train_v0.4_plan.json'),s:new Map(await Promise.all(TRAIN_V04_SLICES.map(async p=>[p,await read(p)])))};}
const check=f=>validateFrozenTrainV04(f.m,f.c,f.p,f.s);
function editSlice(f,i,edit){const path=TRAIN_V04_SLICES[i],d=JSON.parse(f.s.get(path));edit(d);const bytes=Buffer.from(JSON.stringify(d)+'\n');f.s.set(path,bytes);f.m.slices[i].sha256=trainV04Hash(bytes);const rows=TRAIN_V04_SLICES.flatMap(p=>JSON.parse(f.s.get(p)).rows);f.m.rows_sha256=trainV04Hash(JSON.stringify(rows));f.m.train_sha256=trainV04Identity(f.m);}

test('frozen positive closure preserves all144,432,language coverage and one disclosed writer component',async()=>{
 const r=await loadFrozenTrainV04();assert.equal(r.rows.length,432);assert.equal(r.topics.length,144);assert.equal(r.independent_quota_credit,0);assert.equal(r.lineage_component_count,1);assert.equal(r.grouped_validation,'UNAVAILABLE_SINGLE_WRITER_LINEAGE_COMPONENT');
 const f=await fixture();assert.equal(r.train_sha256,f.m.train_sha256);assert.equal(trainV04Hash(JSON.stringify(r.rows)),f.m.rows_sha256);
 const counts=new Map();for(const row of r.rows){const set=counts.get(row.topic_id)??new Set();set.add(row.language);counts.set(row.topic_id,set);}assert.equal(counts.size,144);assert([...counts.values()].every(s=>s.size===3));
 const status=JSON.parse(await read('status/ZERO_MODEL_REFOUNDATION_STATUS.json'));assert.equal(status.rounds['ZMR-02'].provisional_train_v04_sha256,r.train_sha256);assert.equal(status.rounds['ZMR-02'].provisional_train_v04_rows,432);assert.equal(status.data_qualification,'NOT_QUALIFIED');assert.equal(status.capability_verdict,'UNTESTED');assert.equal(status.resource_verdict,'NOT_QUALIFIED');
});
test('partial coverage, extra/unapproved paths and counterfeit qualification are rejected before reads',async()=>{
 const f=await fixture();for(const edit of [m=>m.slices.pop(),m=>m.slices[0].path='unapproved-sealed-input.json',m=>m.row_count=431,m=>m.independent_quota_credit=432,m=>m.lineage_component_count=432,m=>m.grouped_validation='INDEPENDENT_FOLDS',m=>m.capability_verdict='PASS']){const m=structuredClone(f.m);edit(m);assert.throws(()=>assertTrainV04Manifest(m));}
});
test('byte/Catalog/plan tampering is rejected instead of silently consuming a modified input',async()=>{
 let f=await fixture();f.s.set(TRAIN_V04_SLICES[0],Buffer.from('{}'));assert.throws(()=>check(f),/slice bytes changed/);
 f=await fixture();f.c=Buffer.concat([f.c,Buffer.from('\n')]);assert.throws(()=>check(f),/Catalog bytes changed/);
 f=await fixture();f.p=Buffer.concat([f.p,Buffer.from('\n')]);assert.throws(()=>check(f),/authoring plan changed/);
});
test('resealing invalid provenance or a duplicated Topic-language cannot bypass the structural guard',async()=>{
 let f=await fixture();editSlice(f,0,d=>d.rows[0].writer_id='independent-curator');assert.throws(()=>check(f),/same-writer provenance mismatch/);
 f=await fixture();editSlice(f,0,d=>{d.rows[0].topic_id=d.rows[3].topic_id;d.rows[0].provisional_gold_topics=[d.rows[3].topic_id];});assert.throws(()=>check(f),/duplicate Topic language scenario/);
 f=await fixture();editSlice(f,0,d=>d.rows[0].current=d.rows[3].current);assert.throws(()=>check(f),/normalized input duplicate/);
 f=await fixture();editSlice(f,0,d=>d.rows[0].split='DEV_CAL');assert.throws(()=>check(f),/TRAIN-only exposure required/);
 f=await fixture();editSlice(f,0,d=>d.rows[0].frozen_at='2999-01-01T00:00:00Z');assert.throws(()=>check(f),/row not frozen/);
});
