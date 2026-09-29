import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileBoundaryGraph} from './a4_boundary_graph.mjs';
import {parsePinnedCatalog,parseProvisionalTrain} from './a1_compile.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ROOT=new URL('../../',import.meta.url);
const read=path=>readFile(new URL(path,ROOT));

test('A4 provisional graph is pinned, bounded, and never activates a resolver',async()=>{
  const catalog=await read('catalog/system_topic_catalog_v0.2.yaml');
  const train=await read('data/zero_model_refoundation/development/provisional_train_v0.2.json');
  const topics=parsePinnedCatalog(catalog),catalogSha=sha(catalog);
  const rows=parseProvisionalTrain(train,catalogSha,topics.map(t=>t.id));
  const graph=compileBoundaryGraph(topics,rows,
    {catalog_sha256:catalogSha,train_sha256:sha(train)});
  const saved=JSON.parse(await read('data/zero_model_refoundation/development/provisional_boundary_graph_v0.1.json'));
  assert.deepEqual(saved,graph);
  assert.equal(graph.topic_count,144);
  assert.equal(graph.edge_count,64);
  assert.equal(graph.qualification_credit_edges,0);
  assert.equal(graph.independent_source_cohorts,0);
  assert.equal(graph.no_resolver_activated,true);
  const ids=new Set(topics.map(t=>t.id));
  const pairs=new Set();
  for(const edge of graph.edges) {
    assert(ids.has(edge.left_topic_id)&&ids.has(edge.right_topic_id));
    assert.notEqual(edge.left_topic_id,edge.right_topic_id);
    assert.equal(edge.resolver_status,'UNACTIVATED_REQUIRES_POSITIVE_NEGATIVE_AMBIGUOUS_EVIDENCE');
    assert.equal(edge.triad_evidence_count,0);
    const pair=[edge.left_topic_id,edge.right_topic_id].sort().join('|');
    assert(!pairs.has(pair)); pairs.add(pair);
  }
  assert.throws(()=>compileBoundaryGraph(topics,rows.slice(1),
    {catalog_sha256:catalogSha,train_sha256:sha(train)}),/full144/u);
});
