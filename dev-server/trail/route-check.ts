import type {D1Database} from '@cloudflare/workers-types';
import type {RouteAssets} from './route-assets';
import {adventureRoute} from './route-store';
import {ROUTE_CHECK_CASES} from './route-check-cases';
import {WorldError} from './world-error';
/** Admin-only dev diagnostic: the same bounded planner, with no persistence. */
export async function checkPublicRoute(db:D1Database,assets:RouteAssets|undefined,owner:string,input:{caseId?:unknown;movement?:unknown},at?:number){
  const chosen=ROUTE_CHECK_CASES.find(c=>c.id===input.caseId);
  if(!chosen||!['foot','bicycle'].includes(input.movement as string)||Object.keys(input).some(k=>k!=='caseId'&&k!=='movement'))throw new WorldError(400,'Choose a fixed public route and Foot or Bicycle');
  const movement=input.movement as 'foot'|'bicycle',usage={cells:0,decodedBytes:0};let assetRequests=0;
  const binding=assets?{fetch(request:Request){assetRequests++;return assets.fetch(request);}}:undefined;
  const plan=await adventureRoute(db,binding,owner,{from:chosen.from,to:chosen.to,movement,access:'known-paths',maxMeters:50000},at,usage);
  const result=plan.result.status==='ready'?{status:plan.result.status,meters:plan.result.meters,points:plan.result.points.length,startOffsetMeters:plan.result.startOffsetMeters,endOffsetMeters:plan.result.endOffsetMeters}:plan.result;
  return{caseId:chosen.id,name:chosen.name,movement,from:chosen.from,to:chosen.to,policy:plan.policy,sourceDate:plan.sourceDate,regionsRevision:plan.regionsRevision,coverage:plan.coverage,result,usage:{...usage,assetRequests},awardsWritten:0 as const};
}
