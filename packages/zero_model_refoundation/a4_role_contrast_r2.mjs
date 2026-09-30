/** Last bounded A4 role repair: terminal negative task reopening is a control. */
import {routeA4RoleContrastR1} from './a4_role_contrast_r1.mjs';
const closedTask=/(?:please\s+)?do\s+not\s+(?:reopen|resume|restart)\s+[^.;!?]{1,96}[.!?\s]*$/iu;
export function routeA4RoleContrastR2(a3,a1,input,config={}){
  const base=routeA4RoleContrastR1(a3,a1,input,config);
  // Invalid input/index/config must retain its diagnostic rather than become a control.
  if(base.state==='ASSIGNED'&&closedTask.test(input.current.trim()))
    return {state:'DEFER',topics:[],reason:'A4_ROLE_R2_TERMINAL_CLOSED_TASK'};
  return base;
}
