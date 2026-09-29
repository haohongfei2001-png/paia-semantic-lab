import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scorePointLayers } from './scoring.mjs';
import { auditIntake } from './intake.mjs';
import { groupedRateBound, full144MacroBound } from './uncertainty.mjs';
import { claimEvaluation } from './ledger.mjs';
import { fingerprintBundle, screenNearDuplicates } from './fingerprints.mjs';

// Opaque fabricated IDs and metadata only. No natural-language semantic cases.
const ids = Array.from({length: 144}, (_, i) => 'T' + String(i).padStart(3, '0'));
const assign = (...topics) => ({state: topics.length ? 'ASSIGNED' : 'DEFER', topics});
const language = i => ['zh', 'en', 'mixed'][i % 3];
function complete() {
  return {
    single: ids.flatMap((id, j) => [0, 1, 2].map(i => ({id:`s${j}-${i}`, language:['zh','en','mixed'][i],
      gold:id, prediction:assign(id)}))),
    controls: [{id:'c', language:'zh', expected_state:'DEFER', prediction:assign()}],
    multi: [{id:'m', language:'en', gold:ids.slice(0,2), prediction:assign(...ids.slice(0,2))}],
    context_required: [{id:'r', language:'mixed', gold:[ids[0]], prediction:assign(ids[0]),
      without_gold:[], without_prediction:assign(), swapped_gold:[], swapped_prediction:assign()}],
    context_invariance: [{id:'i', language:'zh', gold:[ids[0]], prediction:assign(ids[0]),
      variant_prediction:assign(ids[0])}],
    repeats: [{id:'d', first:assign(ids[0]), repeat:assign(ids[0])}]
  };
}

test('all five point layers and three full144 language denominators are required', () => {
  const result = scorePointLayers(complete(), ids);
  assert.equal(result.point_gates, true);
  assert.equal(result.certification_allowed, false);
  assert.equal(result.global_labels.precision, 1);
  assert.equal(result.single.language_macro.zh.value, 1);
  const short = complete(); short.single.splice(2, 1);
  const missing = scorePointLayers(short, ids);
  assert.equal(missing.point_gates, false);
  assert.deepEqual(missing.single.language_macro.mixed.missing, [ids[0]]);
});

test('controls, unsupported multi labels and false global precision are counted', () => {
  const data = complete();
  data.controls[0].prediction = assign(ids[8]);
  data.multi[0].prediction = assign(ids[0], ids[8]);
  const result = scorePointLayers(data, ids);
  assert.equal(result.controls.false_assignment_rate, 1);
  assert.equal(result.multi.exact_set_recall, 0);
  assert.equal(result.multi.set_precision, .5);
  assert.equal(result.global_labels.unsupported, 2);
  assert.equal(result.point_gates, false);
});

test('context ignoring and complete-output context harm cannot pass', () => {
  const ignored = complete();
  ignored.context_required[0].without_prediction = assign(ids[0]);
  assert.equal(scorePointLayers(ignored, ids).point_gates, false);
  const harmed = complete();
  harmed.context_invariance[0].variant_prediction = {...assign(ids[0]), confidence: .5};
  assert.equal(scorePointLayers(harmed, ids).context.invariant_harm, 1);
  assert.equal(scorePointLayers(harmed, ids).point_gates, false);
});

test('repeat differences fail deterministic gate', () => {
  const data=complete(); data.repeats[0].repeat=assign(ids[1]);
  const result=scorePointLayers(data,ids);
  assert.equal(result.repeats.differences,1);
  assert.equal(result.point_gates,false);
});

test('all DEFER, top1-only multi, empty controls and missing context fail closed', () => {
  const data = complete();
  data.single.forEach(row => { row.prediction = assign(); });
  data.multi[0].prediction = assign(ids[0]);
  data.controls = []; data.context_required = [];
  const result = scorePointLayers(data, ids);
  assert.equal(result.single.assigned_precision, null);
  assert.equal(result.multi.exact_set_recall, 0);
  assert.equal(result.data_status, 'DATA_INSUFFICIENT');
  assert.equal(result.point_gates, false);
});

test('illegal, duplicated and nonfinite output fields are rejected', () => {
  for (const bad of [assign(ids[0], ids[0]), assign('unknown'), {state:'DEFER',topics:[ids[0]]}]) {
    const data = complete(); data.single[0].prediction = bad;
    assert.throws(() => scorePointLayers(data, ids));
  }
  const data = complete(); data.context_invariance[0].variant_prediction = {...assign(ids[0]), confidence:Infinity};
  assert.throws(() => scorePointLayers(data, ids));
});

test('metadata-only intake refuses empty cohorts and missing quotas without inventing data', () => {
  const result = auditIntake([], ids, {catalog_sha256:'a'.repeat(64)});
  assert.equal(result.metadata_gate, false);
  assert.equal(result.data_qualification, 'NOT_QUALIFIED');
  assert.equal(result.independent_curator_signoff_required, true);
  assert(result.issues.some(x => x.code === 'TOPIC_LANGUAGE_QUOTA'));
  assert(result.issues.some(x => x.code === 'SOURCE_REVIEW_MISSING') === false);
});

test('a fabricated metadata row cannot substitute for source or gold review', () => {
  const id='r', hash='b'.repeat(64);
  const row = {id, split:'TRAIN', generation_id:'G1', catalog_sha256:'a'.repeat(64),
    layer:'SINGLE', language:'zh', gold_frozen_at:'2026-01-01T00:00:00Z', gold:{state:'ASSIGNED',topics:[ids[0]]},
    mechanisms:['opaque'], name_echo:false,
    lineage:Object.fromEntries(['writer','source','scenario','template','paraphrase','translation','contrast']
      .map(k=>[k,[id+':'+k]])),
    fingerprints:{current_sha256:hash,nfc_sha256:hash,nfkc_sha256:hash,bundle_sha256:hash}};
  const result = auditIntake([row], ids, {catalog_sha256:'a'.repeat(64),approved_licenses:['CC0']});
  assert(result.issues.some(x => x.code === 'SOURCE_REVIEW_MISSING'));
  assert(result.issues.some(x => x.code === 'INDEPENDENT_REVIEW_MISSING'));
  assert(result.issues.some(x => x.code === 'NEAR_DUPLICATE_REVIEW_MISSING'));
});

test('complete fabricated metadata can satisfy quotas while data remains unqualified', () => {
  const catalog='a'.repeat(64), all=[];
  const cohorts={TRAIN:3,DEV_TUNE:1,DEV_CAL:1,CHALLENGE_DEV:2,AS:3};
  let serial=0;
  function put(split, layer, topic, lang, mechanism) {
    const index=serial++, writer=split+':writer:'+index%cohorts[split], source=split+':source:'+index%cohorts[split];
    const topics=layer==='CONTROL'?[]:layer==='MULTI'?[topic,ids[(ids.indexOf(topic)+1)%144]]:[topic];
    const state=topics.length?'ASSIGNED':'DEFER';
    const hash=index.toString(16).padStart(64,'0');
    all.push({id:'r'+index,split,generation_id:'G1',catalog_sha256:catalog,layer,language:lang,
      gold_frozen_at:'2026-01-03T00:00:00Z',gold:{state,topics},mechanisms:[mechanism],name_echo:false,
      lineage:{writer:[writer],source:[source],scenario:['scenario:'+index],template:['template:'+index],
        paraphrase:['para:'+index],translation:['translation:'+index],contrast:['contrast:'+index]},
      source_review:{source_id:source,license:'CC0',decision:'ACCEPT',reviewer_id:'source-reviewer',
        evidence_ref:'receipt:'+index,reviewed_at:'2026-01-01T00:00:00Z'},
      reviews:['gold-reviewer-1','gold-reviewer-2'].map(reviewer_id=>({reviewer_id,state,topics,
        reviewed_at:'2026-01-02T00:00:00Z'})),
      fingerprints:{current_sha256:hash,nfc_sha256:hash,nfkc_sha256:hash,bundle_sha256:hash},
      near_duplicate_screen:{status:'REVIEWED',reviewer_id:'duplicate-reviewer',method_version:'1'}
    });
  }
  for (const [split,allocation] of Object.entries({TRAIN:[12,8,4],DEV_TUNE:[3,2,1],
    DEV_CAL:[3,2,1],CHALLENGE_DEV:[6,4,2],AS:[4,2,2]})) {
    for (const topic of ids) for (let lang=0; lang<3; lang++) for (let i=0;i<allocation[lang];i++)
      put(split,'SINGLE',topic,['zh','en','mixed'][lang],split==='TRAIN'?'m'+(i%8):'held-'+(i%2));
    for (const layer of ['CONTROL','CONTEXT_REQUIRED','CONTEXT_INVARIANCE','MULTI']) {
      const count=layer==='CONTROL' && split!=='TRAIN' ?
        (split.startsWith('DEV_')?150:300) : split.startsWith('DEV_')?72:144;
      for (let i=0;i<count;i++) put(split,layer,ids[i%144],language(i),'safety');
    }
  }
  const result=auditIntake(all,ids,{catalog_sha256:catalog,approved_licenses:['CC0'],
    candidate_first_evaluated_at:'2026-02-01T00:00:00Z'});
  assert.deepEqual(result.issues,[]);
  assert.equal(result.metadata_gate,true);
  assert.equal(result.data_qualification,'NOT_QUALIFIED');
});

test('all-correct grouped bootstrap remains non-degenerate and independence is external', () => {
  const blocks = [1,2,3].map(i=>({cohort_id:'c'+i,successes:100,trials:100}));
  const absent = groupedRateBound(blocks);
  assert.equal(absent.uncertainty_status, 'INCONCLUSIVE');
  assert.equal(absent.bootstrap_diagnostic.lower, 1);
  assert(absent.conservative_lower < 1);
  const attested = groupedRateBound(blocks,{independence_attested:true, simultaneous_tests:8});
  assert.equal(attested.uncertainty_status, 'BOUNDED_ASSUMING_INDEPENDENT_COHORTS');
  assert(attested.conservative_lower < absent.conservative_lower);
  assert.throws(()=>groupedRateBound([{cohort_id:'a',successes:0,trials:0}]));
});

test('Topic-stratified bound rejects missing stratum and all-correct cannot certify itself', () => {
  const data = [1,2,3].flatMap(i=>ids.map(id=>({cohort_id:'c'+i,topic_id:id,successes:2,trials:2})));
  const result = full144MacroBound(data,ids,{independence_attested:true});
  assert(result.conservative_lower < 1);
  assert.equal(result.effective_cohorts,3);
  assert.throws(()=>full144MacroBound(data.slice(1),ids));
});

test('fingerprints distinguish context variants while screening only flags review', () => {
  const x={current:'abc',title:'',recent:['x']}, y={current:'abc',title:'',recent:['y']};
  assert.equal(fingerprintBundle(x).current_sha256,fingerprintBundle(y).current_sha256);
  assert.notEqual(fingerprintBundle(x).bundle_sha256,fingerprintBundle(y).bundle_sha256);
  const flags=screenNearDuplicates([
    {id:'a',split:'TRAIN',scenario:'s1',input:x},
    {id:'b',split:'DEV_TUNE',scenario:'s2',input:x}
  ]).flags;
  assert.equal(flags.length,1);
  assert.equal(flags[0].cross_split,true);
  assert.equal(flags[0].exact_form,'bundle_sha256');
});

test('atomic ledger allows exactly one claim and preserves consumed-on-crash identity', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zmr-ledger-'));
  try {
    const claim = {evaluation_key:'a'.repeat(64), packet_sha256:'b'.repeat(64),
      freeze_sha256:'c'.repeat(64), runner_id:'runner', claimed_at:'2026-01-01T00:00:00Z'};
    const result = await Promise.all([claimEvaluation(dir, claim),claimEvaluation(dir, claim)]);
    assert.deepEqual(result.map(x=>x.status).sort(), ['ALREADY_CLAIMED_NO_RETRY','CLAIMED_BEFORE_ACCESS']);
    const saved = JSON.parse(await readFile(join(dir,claim.evaluation_key+'.json'),'utf8'));
    assert.equal(saved.packet_sha256,claim.packet_sha256);
    assert.equal((await claimEvaluation(dir,{...claim,packet_sha256:'d'.repeat(64)})).status,
      'ALREADY_CLAIMED_NO_RETRY');
  } finally { await rm(dir,{recursive:true,force:true}); }
});
