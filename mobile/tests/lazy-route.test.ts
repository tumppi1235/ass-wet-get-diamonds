import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {planMappedRoute,planLazyMappedRoute,type MappedEdge,type LazyRouteLoader} from '../src/game/mapped-route';
import {openLazyRouteNetwork,ROUTE_ASSET_PATH} from '../../dev-server/trail/route-assets';
import {groundDistance} from '../src/map/geodesy';
const points=Array.from({length:35},(_,i)=>({nodeId:i+1,latitude:62.123+i*.008,longitude:25.123+i*.018}));
const edges:MappedEdge[]=points.slice(1).map((p,i)=>({id:'test:'+i,way:i+1,f:3,b:3,meters:0,tags:{},points:[[points[i].nodeId,Math.round(points[i].latitude*1e7),Math.round(points[i].longitude*1e7)],[p.nodeId,Math.round(p.latitude*1e7),Math.round(p.longitude*1e7)]]}));
const options={start:points[0],end:points.at(-1)!,movement:'foot' as const,access:'known-paths' as const,maxMeters:50000};
function fixture(source=edges){const requests:{latitude:number;longitude:number}[]=[];const loader:LazyRouteLoader={async *loadNear(point,radius){requests.push(point);for(const edge of source)if(edge.points.some(p=>groundDistance(point,{latitude:p[1]/1e7,longitude:p[2]/1e7})<=Math.max(.02,radius)))yield edge;}};return{loader,requests};}
test('TR-094/101 incremental A* matches complete topology across a large diagonal without loading a whole rectangle',async()=>{
  const f=fixture(),expected=planMappedRoute(edges,options),actual=await planLazyMappedRoute(f.loader,options);assert.deepEqual(actual,expected);assert.equal(actual.status,'ready');assert.ok(f.requests.length<=points.length+2);if(actual.status==='ready'){assert.equal(actual.points.length,35);assert.ok(actual.meters>25000);}
});
test('TR-094/101 lazy search preserves direction, closure, missing-access and node-identity constraints',async()=>{
  const blocked={...options,blocked:(a:{latitude:number})=>a.latitude>points[10].latitude&&a.latitude<points[12].latitude};assert.deepEqual(await planLazyMappedRoute(fixture().loader,blocked),planMappedRoute(edges,blocked));
  const oneWay=edges.map(e=>({...e,b:0})),reverse={...options,start:options.end,end:options.start};assert.deepEqual(await planLazyMappedRoute(fixture(oneWay).loader,reverse),planMappedRoute(oneWay,reverse));
  const f=fixture();assert.deepEqual(await planLazyMappedRoute(f.loader,{...options,access:'step-free'}),{status:'unavailable',reason:'access-unverified'});assert.equal(f.requests.length,0);
  const missing=edges.filter((_,i)=>i!==15);assert.deepEqual(await planLazyMappedRoute(fixture(missing).loader,options),{status:'unavailable',reason:'disconnected'});
  await assert.rejects(planLazyMappedRoute({async *loadNear(){yield edges[0];yield{...edges[0],f:1};}},options),/Conflicting/);
});
test('TR-094/101 real compact assets load each touched cell once, retain checksum guards and enforce a request-wide cell budget',async()=>{
  const requests:string[]=[],assets={async fetch(request:Request){const name=new URL(request.url).pathname.slice(ROUTE_ASSET_PATH.length);requests.push(name);const file=new URL('fixtures/route-runtime/'+name.replace(/\.bin$/,'.json.gz'),import.meta.url);return existsSync(file)?new Response(readFileSync(file)):new Response(null,{status:404});}};
  const network=await openLazyRouteNetwork(assets),point={latitude:62.117,longitude:27.084};
  for await(const _ of network.loadNear(point,100)){/* decode the real local chunk */}
  const after=requests.length;for await(const _ of network.loadNear(point,0)){/* already loaded */}assert.equal(requests.length,after);assert.equal(network.coverage,'lazy-network');assert.ok(network.statistics().cells<=4);
  await assert.rejects((async()=>{for(let i=0;i<100;i++)for await(const _ of network.loadNear({latitude:.123+i*.051,longitude:.123},0)){/* bounded absent cells, no country data fetched */}})(),/graph-limit/);assert.ok(network.statistics().cells<=80);
  await assert.rejects(openLazyRouteNetwork({async fetch(){return new Response(new Uint8Array([0]));}}),/data-invalid/);
});
