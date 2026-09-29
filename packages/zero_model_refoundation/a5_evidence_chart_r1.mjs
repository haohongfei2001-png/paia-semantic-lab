/** First bounded A5 chart repair: independent A2 corroboration for new current-span outputs. */
import {routeA2} from './a2.mjs';
import {routeA5EvidenceChart} from './a5_evidence_chart.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const sameSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));

export function routeA5ChartR1(a3Index,a2Index,input,{catalog_sha256}={}){
  if(!a3Index||!a2Index||a3Index.schema!=='ZMR-A3-DEV-1'||
    a2Index.schema!=='ZMR-A2-DEV-1'||
    a3Index.catalog_sha256!==catalog_sha256||
    a2Index.catalog_sha256!==catalog_sha256||
    a3Index.train_sha256!==a2Index.train_sha256||
    a3Index.topic_ids?.length!==144||a2Index.topic_ids?.length!==144||
    a3Index.topic_ids.join('\n')!==a2Index.topic_ids.join('\n'))
    return defer('A5_CHART_R1_INDEX_CLOSURE_MISMATCH');
  const chart=routeA5EvidenceChart(a3Index,input,{catalog_sha256});
  if(chart.state!=='ASSIGNED')return chart;
  const reasons=new Set(['A5_CHART_CURRENT_GOAL_AFTER_BACKGROUND',
    'A5_CHART_TWO_INDEPENDENT_GOAL_SPANS']);
  if(!reasons.has(chart.reason))return chart;
  const score=text=>routeA2(a2Index,{current:text,title:'',recent:[]},
    {catalog_sha256,alpha:.5,min_score:0,min_margin:.5});
  let spans;
  if(chart.reason==='A5_CHART_CURRENT_GOAL_AFTER_BACKGROUND'){
    spans=[input.current.slice(chart.background_span_end).trim()];
  }else{
    const [start,end]=chart.chart_boundary;
    spans=[input.current.slice(0,start).trim(),input.current.slice(end).trim()];
  }
  const corroboration=spans.map(score);
  if(corroboration.some(x=>x.state!=='ASSIGNED'||x.topics.length!==1)||
    !sameSet(corroboration.map(x=>x.topics[0]),chart.topics))
    return defer('A5_CHART_R1_UNCORROBORATED_GOAL');
  return {...chart,reason:'A5_CHART_R1_CORROBORATED_GOALS',
    corroboration_source:'A2_FULL144_FIXED_TRAIN'};
}
