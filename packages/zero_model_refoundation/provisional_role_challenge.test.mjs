import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePinnedCatalog} from './a1_compile.mjs';
import {fingerprintBundle} from './fingerprints.mjs';

const ROOT=new URL('../../',import.meta.url);
const read=path=>readFile(new URL(path,ROOT));
const bundle=row=>({current:row.current,title:row.title??'',recent:row.recent??[]});

test('fresh role challenge is frozen, same-writer, unrun, and lineage-grouped',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const catalogSha=createHash('sha256').update(catalog).digest('hex');
  const ids=new Set(parsePinnedCatalog(catalog).map(t=>t.id));
  const data=JSON.parse(await read('data/zero_model_refoundation/development/provisional_role_challenge_v0.1.json'));
  assert.equal(data.schema,'ZMR-PROVISIONAL-ROLE-CHALLENGE-1');
  assert.equal(data.evidence_class,'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE');
  assert.equal(data.catalog_sha256,catalogSha);
  assert.equal(data.qualification_credit_rows,0);
  assert.equal(data.independent_source_cohorts,0);
  assert.equal(data.intake_status,'PUBLIC_ROLE_SCOPE_FROZEN_UNRUN');
  assert.equal(data.evaluation_status,'UNRUN');
  assert.equal(data.row_count,18);
  assert.equal(data.scenario_count,6);
  const groups=new Map(),fingerprints=new Set(),languages={zh:0,en:0,mixed:0};
  for(const row of data.rows) {
    assert.equal(row.catalog_sha256,catalogSha);
    assert.equal(row.split,'CHALLENGE_ROLE_PROVISIONAL');
    assert.equal(row.gold_origin,'CANDIDATE_WRITER_PROVISIONAL_UNREVIEWED');
    assert.equal(row.writer_id,'candidate-writer');
    assert.equal(row.source_license_status,'ORIGINAL_CANDIDATE_WRITER_PROVISIONAL');
    assert.equal(row.review_status,'UNREVIEWED_PROVISIONAL');
    assert.equal(row.exposure,'PUBLIC_EXPOSED_CHALLENGE');
    assert(['POSITIVE','CONTRAST','AMBIGUOUS'].includes(row.variant));
    assert(ids.has(row.forbidden_topics[0]));
    assert.equal(row.gold_topics.length,row.expected_state==='ASSIGNED'?1:0);
    assert(row.gold_topics.every(id=>ids.has(id)&&!row.forbidden_topics.includes(id)));
    assert.equal(row.evidence_spans.length,1);
    assert.equal(row.evidence_spans[0].source,'current');
    assert(row.evidence_spans[0].start>=0&&
      row.evidence_spans[0].end<=row.current.length&&
      row.evidence_spans[0].end>row.evidence_spans[0].start);
    const hash=fingerprintBundle(bundle(row)).bundle_sha256;
    assert(!fingerprints.has(hash));fingerprints.add(hash);
    languages[row.language]++;
    groups.set(row.scenario_id,[...(groups.get(row.scenario_id)??[]),row]);
  }
  assert.deepEqual(languages,{zh:6,en:6,mixed:6});
  assert.equal(groups.size,6);
  for(const rows of groups.values()) {
    assert.deepEqual(new Set(rows.map(r=>r.variant)),new Set(['POSITIVE','CONTRAST','AMBIGUOUS']));
    assert.equal(new Set(rows.map(r=>r.contrast_family)).size,1);
    assert.equal(new Set(rows.map(r=>r.template_family)).size,1);
  }
});
