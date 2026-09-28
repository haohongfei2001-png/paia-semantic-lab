// CIG-03 pure scorer. No imports, candidate execution, filesystem or network access.
export const GATES = Object.freeze({assigned_precision:0.95,single_label_auto_coverage:0.70,full144_macro_recall:0.70,controls_false_assignment:0.02,context_harm:0});
const fail = code => { throw new Error(code); };
const same = (a,b) => a.length===b.length && [...a].sort().every((x,i)=>x===[...b].sort()[i]);
const dec = (d,universe) => {
  if (!d || !['ASSIGN','DEFER'].includes(d.state) || !Array.isArray(d.topics) ||
      d.topics.some(x=>typeof x!=='string'||!universe.has(x)) ||
      new Set(d.topics).size!==d.topics.length ||
      (d.state==='DEFER' ? d.topics.length!==0 : d.topics.length===0) ||
      typeof d.raw_output_digest!=='string' || !/^[a-f0-9]{64}$/.test(d.raw_output_digest)) fail('INVALID_DECISION');
};
const table = (rows, expected, fields, universe) => {
  if (!Array.isArray(rows) || rows.length!==expected.length) fail('ROW_COUNT_MISMATCH');
  const m=new Map();
  for(const r of rows) {
    if (!r || typeof r.id!=='string'||m.has(r.id)||!expected.includes(r.id)) fail('INVALID_ROW_ID');
    for(const field of fields) dec(field==='self'?r:r[field],universe);
    m.set(r.id,r);
  }
  return m;
};
export function score(packet,predictions) {
  if (!packet || !Array.isArray(packet.topic_ids)||!packet.topic_ids.length ||
      new Set(packet.topic_ids).size!==packet.topic_ids.length ||
      !['single_label','context','controls'].every(k=>Array.isArray(packet[k])&&packet[k].length)) fail('INVALID_PACKET');
  const u=new Set(packet.topic_ids);
  const inputIds=[...packet.single_label.map(r=>r.id),...packet.context.flatMap(r=>[r.id+'-base',r.id+'-perturbed']),...packet.controls.map(r=>r.id)];
  if (new Set(inputIds).size!==inputIds.length) fail('DUPLICATE_INPUT_IDS');
  for(const group of ['single_label','context','controls']) for(const r of packet[group]) {
    if(!r.gold||!['ASSIGN','DEFER'].includes(r.gold.state)||!Array.isArray(r.gold.topics)||
       r.gold.topics.some(x=>!u.has(x))||new Set(r.gold.topics).size!==r.gold.topics.length||
       (r.gold.state==='DEFER'?r.gold.topics.length!==0:r.gold.topics.length===0)) fail('INVALID_GOLD');
  }
  const s=table(predictions?.single_label,packet.single_label.map(r=>r.id),['self'],u);
  const c=table(predictions?.context,packet.context.map(r=>r.id),['base','perturbed'],u);
  const k=table(predictions?.controls,packet.controls.map(r=>r.id),['self'],u);
  const rep=table(predictions?.repeats,inputIds,['first','second'],u);
  let assigned=0,correctAssigned=0,singleAssigned=0,singleCorrectAssigned=0,controlAssigned=0,contextHarm=0,repeatMismatch=0;
  const hits=new Map(packet.topic_ids.map(t=>[t,{total:0,correct:0}]));
  const consume=(d,g)=>{if(d.state==='ASSIGN'){assigned++;if(g.state==='ASSIGN'&&same(d.topics,g.topics))correctAssigned++;}};
  const inputs=new Map();
  for(const r of packet.single_label){const d=s.get(r.id);consume(d,r.gold);inputs.set(r.id,d);if(d.state==='ASSIGN'){singleAssigned++;if(same(d.topics,r.gold.topics))singleCorrectAssigned++;}
    if(r.gold.state!=='ASSIGN'||r.gold.topics.length!==1) fail('SINGLE_LABEL_GOLD_REQUIRED');
    const h=hits.get(r.gold.topics[0]);h.total++;if(d.state==='ASSIGN'&&same(d.topics,r.gold.topics))h.correct++;
  }
  for(const r of packet.context){const d=c.get(r.id);consume(d.base,r.gold);consume(d.perturbed,r.gold);inputs.set(r.id+'-base',d.base);inputs.set(r.id+'-perturbed',d.perturbed);
    if(d.base.raw_output_digest!==d.perturbed.raw_output_digest)contextHarm++;
  }
  for(const r of packet.controls){const d=k.get(r.id);if(r.gold.state!=='DEFER')fail('CONTROL_GOLD_REQUIRED');consume(d,r.gold);inputs.set(r.id,d);if(d.state==='ASSIGN')controlAssigned++;}
  for(const [id,r] of rep){const initial=inputs.get(id);if(r.first.raw_output_digest!==initial.raw_output_digest||r.first.state!==initial.state||!same(r.first.topics,initial.topics)||
    r.first.raw_output_digest!==r.second.raw_output_digest||r.first.state!==r.second.state||!same(r.first.topics,r.second.topics))repeatMismatch++;}
  const macro=[...hits.values()].reduce((sum,h)=>sum+(h.total?h.correct/h.total:0),0)/hits.size;
  const metrics={assigned_precision:singleAssigned?singleCorrectAssigned/singleAssigned:0,single_label_auto_coverage:singleAssigned/packet.single_label.length,
    full144_macro_recall:macro,controls_false_assignment:controlAssigned/packet.controls.length,context_harm:contextHarm,deterministic_repeat:repeatMismatch===0?'PASS':'FAIL'};
  const gates={assigned_precision:metrics.assigned_precision>=GATES.assigned_precision,single_label_auto_coverage:metrics.single_label_auto_coverage>=GATES.single_label_auto_coverage,
    full144_macro_recall:macro>=GATES.full144_macro_recall,controls_false_assignment:metrics.controls_false_assignment<=GATES.controls_false_assignment,
    context_harm:contextHarm===0,deterministic_repeat:repeatMismatch===0};
  return {schema_version:'cig03-score-v1',metrics,gates,passed:Object.values(gates).every(Boolean),
    counts:{single_label:packet.single_label.length,context_pairs:packet.context.length,controls:packet.controls.length,inputs:inputIds.length,
      topics:hits.size,assigned,single_assigned:singleAssigned,single_correct_assigned:singleCorrectAssigned,correct_assigned:correctAssigned,control_assigned:controlAssigned,repeat_mismatches:repeatMismatch},
    diagnostics:{overall_assigned_precision:assigned?correctAssigned/assigned:0},metric_units:{assigned_precision:'exact-topic-set correct ASSIGN single decisions / ASSIGN single decisions; zero ASSIGN => 0',
      single_label_auto_coverage:'ASSIGN single decisions / all single cases',full144_macro_recall:'mean per-Topic exact single-label recall over full frozen Topic set; DEFER/wrong/multi assignment misses',
      controls_false_assignment:'control cases with any ASSIGN / all DEFER controls',context_harm:'pairs with unequal SHA256 of complete native JSON output',
      deterministic_repeat:'all native inputs repeated; initial, first and second complete native-output digest/state/topic-set match'}};
}
