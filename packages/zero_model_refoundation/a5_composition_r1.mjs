/** A5-R1 development repair: finite-state explicit no-request guard. */
import {routeA5Composition} from './a5_composition.mjs';

const defer=reason=>({state:'DEFER',topics:[],reason});
const noRequest=[
  /\b(?:no (?:action|task|request|need to|need for)|nothing to (?:do|prepare)|not an instruction)\b/iu,
  /\b(?:only an? acknowledg(?:e)?ment|just (?:noting|acknowledging)|only a passing thought|already closed)\b/iu,
  /(?:不需要|不必|不用(?:再)?(?:处理|准备|分类|规划|安排)|不是现在需要执行的任务|不需要执行)/u,
  /(?:只是(?:告诉|确认|更新|记录)|已(?:归档|阅|收到)|讨论已结束|只是.*确认已阅)/u
];
const laterRequest=/[。；.!?;]\s*(?:请|帮我|我想|我需要|想要|please\b|could you\b|i need\b)/iu;
const correction=/(?:而是|改成|更正为|\binstead\b|\brather than\b)/iu;

export function routeA5CompositionR1(index,input,options={}){
  if(input&&typeof input.current==='string'){
    const current=input.current.normalize('NFKC');
    if(!correction.test(current)){
      const hits=noRequest.map(pattern=>pattern.exec(current)).filter(Boolean);
      const first=hits.length?Math.min(...hits.map(hit=>hit.index)):-1;
      if(first>=0&&!laterRequest.test(current.slice(first)))
        return defer('A5_R1_EXPLICIT_NO_REQUEST');
    }
  }
  return routeA5Composition(index,input,options);
}
