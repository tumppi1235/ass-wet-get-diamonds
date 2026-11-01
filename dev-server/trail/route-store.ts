import type {D1Database} from '@cloudflare/workers-types';
import {LANDMARKS} from '../../mobile/src/game/landmarks';
import {newDevWorld,type DevWorld} from '../../mobile/src/game/dev-world';
import {planLazyMappedRoute,routeClosureCheck} from '../../mobile/src/game/mapped-route';
import {loadRegions} from './region-store';
import {WorldError} from './world-error';
import {openLazyRouteNetwork,RouteAssetError,type RouteAssets,ROUTE_POLICY} from './route-assets';
import {groundDistance} from '../../mobile/src/map/geodesy';
import type {RoutePlan,RoutePlanInput} from '../../mobile/src/game/route-plan';
export type RouteInput=RoutePlanInput;
let planning=false; // one bounded graph allocation at a time per Worker isolate
/** Zero-write plan from an owner-scoped fresh fix OR explicitly chosen public catalog preview.
 * Never materializes spawns, reveals hidden artefacts, starts activities or grants XP.
 */
export async function adventureRoute(db:D1Database,assets:RouteAssets|undefined,owner:string,input:RouteInput,at?:number):Promise<RoutePlan>{
  const now=at??Date.now();
  if(!input||typeof input.from!=='string'||typeof input.to!=='string'||!['foot','bicycle'].includes(input.movement)||!Number.isSafeInteger(input.maxMeters)||input.maxMeters<250||input.maxMeters>50000||!['known-paths','step-free'].includes(input.access))throw new WorldError(400,'Choose Foot/Bicycle, a public destination and a 0.25–50 km distance budget');
  const destination=LANDMARKS.find(p=>p.landmarkId===input.to);if(!destination?.latitude||!destination.longitude)throw new WorldError(400,'Choose a public catalog destination');
  const row=await db.prepare('SELECT state FROM trail_players WHERE id=?').bind(owner).first<{state:string}>(),world=row?JSON.parse(row.state)as DevWorld:newDevWorld();
  const preview=input.from!=='gps',origin=preview?LANDMARKS.find(p=>p.landmarkId===input.from):world.previous;
  if(!origin||origin.latitude==null||origin.longitude==null)throw new WorldError(400,preview?'Choose a public catalog preview origin':'Use Me to obtain a fresh accurate location');
  if(!preview&&(!world.latestGpsValid||!world.previous||world.previous.accuracy>25||now<world.previous.timestamp||now-world.previous.timestamp>=15000))throw new WorldError(409,'Use Me to obtain a fresh accurate location');
  const regions=await loadRegions(db),base={generatedAt:now,preview,originName:preview?'Public catalog preview':'Your accepted GPS fix',destination:destination.landmark||destination.name||'Public destination',policy:ROUTE_POLICY,regionsRevision:regions.revision,awardsWritten:0 as const,preferences:{from:input.from,to:input.to,movement:input.movement,maxMeters:input.maxMeters,access:input.access}};
  if(input.access==='step-free')return{...base,result:{status:'unavailable',reason:'access-unverified'}};
  if(planning)return{...base,result:{status:'unavailable',reason:'busy'}};
  planning=true;
  try{
    const start={latitude:origin.latitude,longitude:origin.longitude},end={latitude:destination.latitude,longitude:destination.longitude};
    if(groundDistance(start,end)>50000)throw new RouteAssetError('graph-limit');
    const network=await openLazyRouteNetwork(assets,start,end);
    const currentRegions=await loadRegions(db),finishedAt=at??Date.now();
    if(!preview&&world.previous&&finishedAt-world.previous.timestamp>=15000)throw new WorldError(409,'Use Me to refresh your location and plan again');
    let result=await planLazyMappedRoute(network,{start,end,movement:input.movement,maxMeters:input.maxMeters,access:input.access,blocked:routeClosureCheck(currentRegions,finishedAt)});
    const finalRegions=await loadRegions(db),completedAt=at??Date.now(),blocked=routeClosureCheck(finalRegions,completedAt);
    if(!preview&&world.previous&&completedAt-world.previous.timestamp>=15000)throw new WorldError(409,'Use Me to refresh your location and plan again');
    if(result.status==='ready'){const points=result.points;if(points.some((point,i)=>i>0&&blocked(points[i-1],point)))result={status:'unavailable',reason:'disconnected'};}
    return{...base,generatedAt:completedAt,regionsRevision:finalRegions.revision,sourceDate:network.sourceDate,source:network.source,coverage:network.coverage,result};
  }catch(error){if(error instanceof RouteAssetError)return{...base,result:{status:'unavailable',reason:error.reason}};throw error;}finally{planning=false;}
}
