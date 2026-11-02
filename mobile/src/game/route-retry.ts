import type {RoutePlan,RoutePlanInput} from './route-plan';
/** An explicit draft choice only; the player must request a new walking plan. */
export function walkingRouteChoice(plan:RoutePlan|undefined):RoutePlanInput|undefined{
  const input=plan?.preferences;
  if(!input||input.movement!=='bicycle'||input.access!=='known-paths'||plan?.result.status!=='unavailable'||!['disconnected','start-unmapped','end-unmapped'].includes(plan.result.reason))return;
  return{...input,movement:'foot'};
}
