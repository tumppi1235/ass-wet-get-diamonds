import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planMappedRoute,routeClosureCheck,type MappedEdge,type MappedNode} from '../src/game/mapped-route';
import {groundDistance} from '../src/map/geodesy';
import {WORLD_REGIONS,type WorldRegions} from '../src/game/world-regions';

const a:MappedNode=[1,620000000,250000000],b:MappedNode=[2,620001000,250002000],c:MappedNode=[3,620002000,250000000],d:MappedNode=[4,620004000,250000000];
const geo=(p:MappedNode)=>({latitude:p[1]/1e7,longitude:p[2]/1e7});
const edge=(id:number,points:MappedNode[],f=3,back=3):MappedEdge=>({id:`${id}:0`,way:id,f,b:back,meters:0,tags:{highway:'path'},points});
const options={start:geo(a),end:geo(d),movement:'foot' as const,maxMeters:1000,access:'known-paths' as const};

test('TR-094 route follows every original bend/junction and deduplicates chunk seams',()=>{
  const edges=[edge(1,[a,b,c]),edge(2,[c,d])],result=planMappedRoute([...edges,edges[0]],options);
  assert.equal(result.status,'ready');if(result.status!=='ready')return;
  assert.equal(result.kind,'planned-map-route');assert.deepEqual(result.points.map(p=>p.nodeId),[1,2,3,4]);assert.deepEqual(result.wayIds,[1,2]);
  assert.equal(result.meters,groundDistance(geo(a),geo(b))+groundDistance(geo(b),geo(c))+groundDistance(geo(c),geo(d)));
  assert.ok(result.meters>groundDistance(geo(a),geo(d)));assert.equal(result.startOffsetMeters,0);assert.equal(result.endOffsetMeters,0);
  assert.ok(!('xp' in result));assert.ok(!('activity' in result));
});

test('TR-094 mode/direction/closures never become an inaccessible fallback',()=>{
  const edges=[edge(1,[a,b,c],1,0),edge(2,[c,d],1,1)];
  assert.equal(planMappedRoute(edges,options).status,'ready');
  assert.deepEqual(planMappedRoute(edges,{...options,start:geo(d),end:geo(a)}),{status:'unavailable',reason:'disconnected'});
  assert.deepEqual(planMappedRoute(edges,{...options,movement:'bicycle'}),{status:'unavailable',reason:'start-unmapped'});
  // Caller can block a segment crossing a closed area even when both endpoints are outside it.
  const touched:number[][]=[];const closed=planMappedRoute(edges,{...options,blocked:(x,y)=>{touched.push([x.latitude,y.latitude]);return x.latitude===geo(b).latitude;}});
  assert.equal(closed.status,'unavailable');assert.ok(touched.some(([x,y])=>x===geo(b).latitude&&y===geo(c).latitude));
});

test('TR-094 equal crossing coordinates do not join different node identities',()=>{
  const otherC:MappedNode=[30,c[1],c[2]],result=planMappedRoute([edge(1,[a,b,c]),edge(2,[otherC,d])],options);
  assert.deepEqual(result,{status:'unavailable',reason:'disconnected'});
  const loop=planMappedRoute([edge(1,[a,b,c,a]),edge(2,[c,d])],options);assert.equal(loop.status,'ready');
  const detour:MappedNode=[40,620003000,250100000];
  const shortest=planMappedRoute([edge(5,[a,detour,d]),edge(6,[a,b,c,d])],options);
  assert.equal(shortest.status,'ready');if(shortest.status==='ready')assert.deepEqual(shortest.wayIds,[6],'A* improves an earlier discovered expensive path');
});

test('TR-101 unsupported access, unmapped starts, range and graph bounds are explicit',()=>{
  const edges=[edge(1,[a,b,c,d])];
  assert.deepEqual(planMappedRoute(edges,{...options,access:'step-free'}),{status:'unavailable',reason:'access-unverified'});
  assert.deepEqual(planMappedRoute(edges,{...options,start:{latitude:63,longitude:25}}),{status:'unavailable',reason:'start-unmapped'});
  assert.deepEqual(planMappedRoute(edges,{...options,end:{latitude:63,longitude:25}}),{status:'unavailable',reason:'end-unmapped'});
  const far:MappedNode=[5,620100000,250000000];assert.deepEqual(planMappedRoute([edge(1,[a,far])],{...options,end:geo(far),maxMeters:250}),{status:'unavailable',reason:'distance-limit'});
  assert.deepEqual(planMappedRoute(Array.from({length:30001},()=>edges[0]),options),{status:'unavailable',reason:'graph-limit'});
  const offset=planMappedRoute(edges,{...options,start:{...geo(a),longitude:25.00001}});assert.equal(offset.status,'ready');if(offset.status==='ready'){assert.deepEqual(offset.points[0],{...geo(a),nodeId:1});assert.ok(offset.startOffsetMeters>0);}
});

test('TR-094 malformed or conflicting graph data fails closed',()=>{
  const one=edge(1,[a,b,c]),duplicate={...one,points:[a,d]};assert.throws(()=>planMappedRoute([one,duplicate],options),/Conflicting mapped edge/);
  assert.throws(()=>planMappedRoute([one,edge(2,[[3,630000000,250000000],d])],options),/Conflicting mapped node/);
  assert.throws(()=>planMappedRoute([edge(1,[a,[2,NaN,250000000]])],options),/Invalid mapped coordinate/);
  assert.throws(()=>planMappedRoute([edge(1,[a,a])],options),/Invalid mapped segment/);
  assert.throws(()=>planMappedRoute([one],{...options,maxMeters:Infinity}),/Invalid route preferences/);
});

test('TR-094 live region closure checks catch interior crossings and honour exact active windows',()=>{
  const now=1000,regions:WorldRegions={...WORLD_REGIONS,regions:[{id:'closure',name:'Synthetic closure',south:62.00005,north:62.00015,west:24.99999,east:25.00001,blocked:true,terrain:'urban',weather:'clear',startsAt:now,endsAt:now+1,rarityFactor:1}]};
  const edges=[edge(1,[a,c,d])];
  assert.equal(routeClosureCheck(regions,now)(geo(a),geo(c)),true,'both endpoints are outside');
  assert.equal(routeClosureCheck(regions,now-1)(geo(a),geo(c)),false);
  assert.equal(routeClosureCheck(regions,now+1)(geo(a),geo(c)),false);
  assert.equal(planMappedRoute(edges,{...options,blocked:routeClosureCheck(regions,now)}).status,'unavailable');
  const touching=routeClosureCheck(regions,now);assert.equal(touching({latitude:62.00005,longitude:24.99999},{latitude:62.00005,longitude:24.99999}),true);
  assert.equal(touching({latitude:62.1,longitude:25},{latitude:62.2,longitude:25}),false);
  regions.regions[0].blocked=false;assert.equal(touching(geo(a),geo(c)),true,'request snapshot cannot change under search');
  assert.equal(routeClosureCheck(regions,now)(geo(a),geo(c)),false);
  assert.throws(()=>routeClosureCheck({...regions,regions:[{...regions.regions[0],north:61}]},now));
});
