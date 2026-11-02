import {test} from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/haukkala-access.json';
import {walkingRouteChoice} from '../src/game/route-retry';
import {planMappedRoute,planLazyMappedRoute,type MappedEdge} from '../src/game/mapped-route';
import type {RoutePlan} from '../src/game/route-plan';
const plan:RoutePlan={generatedAt:1,preview:true,originName:'Public catalog preview',destination:'Haukkala',policy:'finland-paths-dev-1',regionsRevision:'test',awardsWritten:0,preferences:{from:'church-park',to:'haukkala-gate',movement:'bicycle',access:'known-paths',maxMeters:20000},result:{status:'unavailable',reason:'disconnected'}};

test('TR-094 retry makes an explicit walking draft while preserving public/GPS origin, budget and access',()=>{
  const before=JSON.stringify(plan),choice=walkingRouteChoice(plan);
  assert.deepEqual(choice,{...plan.preferences,movement:'foot'});assert.equal(JSON.stringify(plan),before);
  const gps={...plan,preview:false,preferences:{...plan.preferences!,from:'gps'}};assert.equal(walkingRouteChoice(gps)?.from,'gps');
  assert.equal(walkingRouteChoice(undefined),undefined);
  for(const reason of ['busy','graph-limit','data-unavailable','data-invalid','distance-limit','access-unverified']as const)assert.equal(walkingRouteChoice({...plan,result:{status:'unavailable',reason}}),undefined);
  assert.equal(walkingRouteChoice({...plan,preferences:{...plan.preferences!,access:'step-free'}}),undefined);
  assert.equal(walkingRouteChoice({...plan,preferences:{...plan.preferences!,movement:'foot'}}),undefined);
});

test('TR-094 real Haukkala geometry retains its foot-only connector in eager and lazy mode',async()=>{
  const edges=fixture.edges as unknown as MappedEdge[],target=edges.flatMap(e=>e.points).find(p=>p[0]===2372433703)!;
  const options={start:{latitude:62.271751,longitude:25.6961095},end:{latitude:target[1]/1e7,longitude:target[2]/1e7},movement:'bicycle' as const,access:'known-paths' as const,maxMeters:1000};
  const before=JSON.stringify(fixture),bicycle=planMappedRoute(edges,options);assert.deepEqual(bicycle,{status:'unavailable',reason:'disconnected'});
  const walking=planMappedRoute(edges,{...options,movement:'foot'});assert.equal(walking.status,'ready');if(walking.status==='ready'){assert.ok(walking.wayIds.includes(228572859));assert.ok(walking.meters>0);assert.ok(walking.startOffsetMeters<1);}
  const loader={async *loadNear(){yield* edges;}};assert.deepEqual(await planLazyMappedRoute(loader,options),bicycle);assert.deepEqual(await planLazyMappedRoute(loader,{...options,movement:'foot'}),walking);
  assert.equal(JSON.stringify(fixture),before);assert.ok(edges.filter(e=>e.way===228572859).every(e=>e.f===1&&e.b===1));
});
