import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {loadRouteEdges,ROUTE_ASSET_PATH,type RouteAssets} from '../../dev-server/trail/route-assets';
import {adventureRoute,type RouteInput} from '../../dev-server/trail/route-store';
import {planMappedRoute} from '../src/game/mapped-route';
import {LANDMARKS,searchCatalog,catalogLabel} from '../src/game/landmarks';
import {newDevWorld} from '../src/game/dev-world';
import {WORLD_REGIONS} from '../src/game/world-regions';
import {database} from './sqlite-world';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {trailApi} from '../../dev-server/trail/api';
const places=LANDMARKS.filter(p=>p.landmarkId?.startsWith('haukivuori-rantalantie-')),a=places[0],b=places[1],now=1000000;
const geographic=(p:typeof a)=>({latitude:p.latitude!,longitude:p.longitude!});
const input:RouteInput={from:a.landmarkId!,to:b.landmarkId!,movement:'foot',access:'known-paths',maxMeters:5000};
function assets(change?:(name:string,bytes:Uint8Array<ArrayBuffer>)=>Response){const requests:string[]=[];const binding:RouteAssets={async fetch(request){const url=new URL(request.url);requests.push(url.href);assert.ok(['https://route-assets.invalid','https://dev.invalid'].includes(url.origin));assert.ok(url.pathname.startsWith(ROUTE_ASSET_PATH));assert.equal(url.search,'');const name=url.pathname.slice(ROUTE_ASSET_PATH.length);assert.match(name,/^(manifest\.json|\d+_\d+\.bin)$/);const path=new URL('fixtures/route-runtime/'+name.replace(/\.bin$/,'.json.gz'),import.meta.url);if(!existsSync(path))return new Response(null,{status:404});const bytes=new Uint8Array(readFileSync(path));return change?change(name,bytes):new Response(bytes);}};return{binding,requests};}

test('TR-094 phone catalog search finds original Jyväskylä landmarks as well as national locality labels',()=>{
  const local=searchCatalog('Jyväskylä');assert.ok(local.length>0&&local.length<=6);assert.ok(local.every(p=>catalogLabel(p).includes('Jyväskylä')));
  const rantalantie=searchCatalog('Rantalantie');assert.ok(rantalantie.length>0&&rantalantie.length<=6);assert.ok(rantalantie.every(p=>catalogLabel(p).includes('Haukivuori')));assert.equal(searchCatalog('J').length,0);assert.equal(searchCatalog('unknown-synthetic-place').length,0);
});

test('TR-094 immutable bounded loader verifies real source chunks and never requests location-bearing external URLs',async()=>{
  const f=assets(),loaded=await loadRouteEdges(f.binding,geographic(a),geographic(b)),route=planMappedRoute(loaded.edges,{start:geographic(a),end:geographic(b),movement:'foot',access:'known-paths',maxMeters:5000});
  assert.equal(route.status,'ready');if(route.status==='ready'){assert.equal(route.points.length,28);assert.ok(Math.abs(route.meters-807.7545974)<.001);assert.deepEqual(route.wayIds,[1156889836]);}
  assert.equal(loaded.sourceDate,'2026-10-30T21:24:51Z');assert.equal(f.requests.length,3);assert.equal(loaded.coverage,'bounded-envelope');
  await assert.rejects(loadRouteEdges(undefined,geographic(a),geographic(b)),/data-unavailable/);
  await assert.rejects(loadRouteEdges(assets((name,bytes)=>new Response(name==='manifest.json'?new Uint8Array([1]):bytes)).binding,geographic(a),geographic(b)),/data-invalid/);
  await assert.rejects(loadRouteEdges(assets((name,bytes)=>new Response(name.endsWith('.bin')?bytes.slice(0,-1):bytes)).binding,geographic(a),geographic(b)),/data-invalid/);
  await assert.rejects(loadRouteEdges(assets().binding,geographic(a),{latitude:69,longitude:30}),/graph-limit/);
  const huge=assets((name,bytes)=>new Response(name==='manifest.json'?new Uint8Array(2*1024*1024+1):bytes));await assert.rejects(loadRouteEdges(huge.binding,geographic(a),geographic(b)),/graph-limit/);
});

test('TR-094 route API is owner-authenticated, same-origin and zero-write with genuine public preview data',async()=>{
  const f=database(),db=f.db as never;f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('p1','Synthetic player','player',now);
  const before=await exportDevSnapshot(db,now),binding=assets().binding;
  const request=(owner:string,origin:string,body:unknown=input)=>trailApi(new Request('https://dev.invalid/api/trail/route',{method:'POST',headers:{'oai-authenticated-user-id':owner,origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{DB:db,ASSETS:binding,TRAIL_ENV:'development'});
  const response=await request('p1','https://dev.invalid');assert.equal(response.status,200);const result=await response.json();assert.equal(result.preview,true);assert.equal(result.result.status,'ready');assert.equal(result.awardsWritten,0);
  assert.equal((await request('p1','https://other.invalid')).status,403);assert.equal((await request('missing','https://dev.invalid')).status,404);assert.equal((await request('','https://dev.invalid')).status,401);
  assert.equal((await request('p1','https://dev.invalid',{...input,from:'gps'})).status,400);assert.equal((await request('p1','https://dev.invalid',{...input,to:'hidden-spawn-arbitrary'})).status,400);assert.equal((await request('p1','https://dev.invalid',{...input,maxMeters:-1})).status,400);
  const unavailable=await adventureRoute(db,undefined,'p1',input,now);assert.equal(unavailable.result.status,'unavailable');if(unavailable.result.status==='unavailable')assert.equal(unavailable.result.reason,'data-unavailable');
  const stepFree=await adventureRoute(db,undefined,'p1',{...input,access:'step-free'},now);assert.equal(stepFree.result.status,'unavailable');if(stepFree.result.status==='unavailable')assert.equal(stepFree.result.reason,'access-unverified');
  assert.equal((await exportDevSnapshot(db,now)).digest,before.digest);f.sql.close();
});

test('TR-094 GPS plans use only the owner fresh fix and closed interiors block plans without wallet/activity changes',async()=>{
  const f=database(),db=f.db as never;for(const owner of ['p1','p2'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(owner,owner,'player',now);
  const world=newDevWorld();world.previous={...geographic(a),x:0,y:0,inside:true,precise:true,accuracy:4,timestamp:now};world.latestGpsValid=true;
  f.sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,?,?)').run('p2',JSON.stringify(world),1,now);
  await assert.rejects(adventureRoute(db,assets().binding,'p1',{...input,from:'gps'},now),/fresh accurate location/);
  const loaded=await adventureRoute(db,assets().binding,'p2',{...input,from:'gps'},now);assert.equal(loaded.preview,false);assert.equal(loaded.result.status,'ready');
  await assert.rejects(adventureRoute(db,assets().binding,'p2',{...input,from:'gps'},now+15000),/fresh accurate location/);
  const regions={...WORLD_REGIONS,revision:'test-route-closure',regions:[{id:'close',name:'Synthetic route closure',south:62.115,north:62.122,west:27.079,east:27.085,terrain:'urban',weather:'clear',blocked:true,startsAt:0,endsAt:now+1,rarityFactor:1}]};
  f.sql.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,?,?,?,?)').run('world-regions',1,JSON.stringify(regions),'p1',now);
  const before=await exportDevSnapshot(db,now),closed=await adventureRoute(db,assets().binding,'p2',input,now);assert.equal(closed.result.status,'unavailable');assert.equal(closed.regionsRevision,regions.revision);assert.equal((await exportDevSnapshot(db,now)).digest,before.digest);f.sql.close();
});

test('TR-094 concurrent plans have a bounded busy response and release allocations after failure',async()=>{
  const f=database(),db=f.db as never;let release!:()=>void,entered!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve;}),started=new Promise<void>(resolve=>{entered=resolve;});
  const source=assets().binding,held:RouteAssets={async fetch(request){entered();await waiting;return source.fetch(request);}};
  const first=adventureRoute(db,held,'p1',input,now);await started;
  const second=await adventureRoute(db,source,'p2',input,now);assert.equal(second.result.status,'unavailable');if(second.result.status==='unavailable')assert.equal(second.result.reason,'busy');
  release();assert.equal((await first).result.status,'ready');
  const broken:RouteAssets={async fetch(){throw new Error('Synthetic read failure');}};await assert.rejects(adventureRoute(db,broken,'p1',input,now),/Synthetic read failure/);
  assert.equal((await adventureRoute(db,source,'p1',input,now)).result.status,'ready');f.sql.close();
});

test('TR-094 closures edited during asset loading are re-read before route search',async()=>{
  const f=database(),db=f.db as never;f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('admin','Fixture admin','admin',now);
  const regions={...WORLD_REGIONS,revision:'late-route-closure',regions:[{id:'close',name:'Late fixture closure',south:62.115,north:62.122,west:27.079,east:27.085,terrain:'urban',weather:'clear',blocked:true,startsAt:0,endsAt:now+1,rarityFactor:1}]};
  const changed=assets((name,bytes)=>{if(name==='manifest.json')f.sql.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,?,?,?,?)').run('world-regions',1,JSON.stringify(regions),'admin',now);return new Response(bytes);});
  const result=await adventureRoute(db,changed.binding,'p1',input,now);assert.equal(result.regionsRevision,regions.revision);assert.equal(result.result.status,'unavailable');assert.equal(f.sql.prepare('SELECT count(*) AS n FROM trail_players').get()!.n,0);f.sql.close();
});
