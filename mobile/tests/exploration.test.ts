import {test} from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import {LocationSession, type LocationWatch} from '../src/location/session';
import {PositionTracker, type LocationFix, type TrackedFix} from '../src/location/tracker';
import {requestAdventure,endAdventure,applyExplorationFix} from '../src/game/adventure';
import {LANDMARKS,relicPoint,seedLandmarks,captureAt,captureTarget} from '../src/game/landmarks';
import {trailData} from '../src/map/vector-data';

function harness(){
  let now=1_000_000;
  const calls:{fix:(fix:LocationFix)=>void;error:Parameters<LocationWatch>[1];removed:number}[]=[];
  const accepted:TrackedFix[]=[];
  const watch:LocationWatch=async(fix,error)=>{const call={fix,error,removed:0};calls.push(call);return{remove(){call.removed++;}};};
  const session=new LocationSession(watch,()=>{},fix=>accepted.push(fix),()=>now);
  const fix=(x=0,accuracy=5):LocationFix=>{const p=G.geo(x,0);return{latitude:p.lat,longitude:p.lon,accuracy,timestamp:now,speed:1};};
  return{session,calls,accepted,fix,advance(ms:number){now+=ms;},now:()=>now};
}

test('TR-146/153 foreground recovery replaces the listener once and never bridges a locked-screen gap',async()=>{
  const h=harness();await h.session.start();h.calls[0].fix(h.fix());
  assert.ok(h.session.latestFix());h.session.suspend();assert.equal(h.session.latestFix(),null);
  h.advance(3_600_000);h.session.tick();assert.equal(h.calls.length,1,'no retry loop while hidden');
  h.session.resume();h.session.resume();assert.equal(h.calls.length,2,'focus/pageshow events coalesce');
  assert.equal(h.calls[0].removed,1);h.calls[0].fix(h.fix(300));assert.equal(h.accepted.length,1,'late old callbacks ignored');
  h.calls[1].fix(h.fix(300));assert.equal(h.accepted.at(-1)!.distance,0);assert.equal(h.accepted.at(-1)!.startSegment,true);
  h.advance(5000);h.calls[1].fix(h.fix(310));assert.ok(h.accepted.at(-1)!.distance>9.9);
  h.session.stop();assert.equal(h.session.latestFix(),null);
});

test('TR-153 stale watchers and transient errors recover; denied permission requires explicit retry',async()=>{
  const h=harness();await h.session.start();h.calls[0].fix(h.fix());
  h.advance(16000);assert.equal(h.session.latestFix(),null);
  h.advance(10000);h.session.tick();h.session.tick();assert.equal(h.calls.length,2);
  h.calls[1].error({denied:false,message:'Temporary timeout'});assert.equal(h.session.snapshot().fresh,0);
  h.advance(26000);h.session.tick();assert.equal(h.calls.length,3);
  h.calls[2].error({denied:true,message:'Allow location'});assert.equal(h.session.snapshot().status,'denied');
  h.advance(26000);h.session.tick();h.session.resume();assert.equal(h.calls.length,3);
  await h.session.start();assert.equal(h.calls.length,4);
  h.calls[3].fix(h.fix(0,200));assert.equal(h.session.latestFix(),null);
  h.advance(1000);h.calls[3].fix(h.fix());assert.ok(h.session.latestFix());
  h.calls[3].fix(h.fix());assert.equal(h.session.snapshot().rejected,1);
});

test('TR-153 stopping an unresolved location request disposes its eventual watcher',async()=>{
  let release!:(value:{remove():void})=>void,removed=0;
  const session=new LocationSession(()=>new Promise(resolve=>{release=resolve;}),()=>{},()=>{});
  const pending=session.start();session.stop();release({remove(){removed++;}});await pending;
  assert.equal(removed,1);assert.equal(session.snapshot().tracking,false);
});

test('GPS callback updates do not restart the watcher',async()=>{
  const h=harness();await h.session.start();let updated=0;h.session.setOnFix(()=>updated++);
  h.calls[0].fix(h.fix());assert.equal(updated,1);assert.equal(h.calls.length,1);
});

test('TR-153 short accuracy dips hold the map steady, deny collection, and preserve an accepted route',async()=>{
  const h=harness(),game=G.initial();requestAdventure(game,h.now());
  h.session.setOnFix(fix=>applyExplorationFix(game,fix));await h.session.start();
  h.calls[0].fix(h.fix(0));const stable=h.session.snapshot().mapPosition;
  h.advance(2000);h.calls[0].fix(h.fix(400,32));
  assert.equal(h.session.snapshot().mapPosition,stable,'coarse jitter must not pan the map or compass');
  assert.equal(h.session.latestFix(),null,'a held display position cannot enable collection');
  assert.equal(game.meters,0,'inaccurate fixes cannot earn distance');
  h.advance(3000);h.calls[0].fix(h.fix(12));
  assert.ok(game.meters>10&&game.meters<13);
  assert.equal(trailData(game).features.length,1,'two good fixes form a visible route through a brief dip');
  assert.equal(game.path.at(-1)!.breakBefore,false);
  h.advance(5000);h.session.resume();assert.equal(h.calls.length,1,'ordinary focus does not restart a healthy watch');
  const walked=game.meters;
  h.advance(31000);h.calls[0].fix(h.fix(200,60));h.advance(1000);h.calls[0].fix(h.fix(300));
  assert.equal(game.meters,walked,'a long inaccurate gap cannot invent distance');
  assert.equal(game.path.at(-1)!.breakBefore,true,'long gaps start a separate route');
  assert.equal(trailData(game).features.length,1,'no line is drawn across the long gap');
});

test('TR-146/153 saved adventures resume across tiles with no reset or duplicate rewards',()=>{
  let s=G.initial();const tracker=new PositionTracker();let now=1_000_000;
  const apply=(x:number)=>{const p=G.geo(x,125),fix=tracker.accept({latitude:p.lat,longitude:p.lon,accuracy:5,timestamp:now,speed:1},now);if(fix)applyExplorationFix(s,fix);return fix;};
  requestAdventure(s,now);apply(0);const id=s.adventure!.id,outing=s.outing;
  for(let x=10;x<=260;x+=10){now+=5000;apply(x);}
  assert.equal(G.key(G.cell(s.x,s.y).i,G.cell(s.x,s.y).j),'1,0');
  assert.ok(s.meters>259);assert.ok(s.gold>=3,'distance plus new tile gold');
  const saved=JSON.stringify(s);s=JSON.parse(saved);requestAdventure(s,now);
  assert.equal(s.adventure!.id,id);assert.equal(s.outing,outing);assert.equal(JSON.stringify(s),saved);
  const gold=s.gold;const duplicate=apply(260);assert.equal(duplicate,null);
  assert.equal(s.gold,gold);endAdventure(s,now);assert.equal(s.adventure!.status,'stopped');
});

test('TR-154 Discovery follows GPS and collects within the artefact tile without recording rewards',()=>{
  const s=seedLandmarks(G.initial()),r=LANDMARKS[0];
  const points=[{x:r.i*250+1,y:r.j*250+1},{x:r.i*250+249,y:r.j*250+249}];
  const p=points.sort((a,b)=>Math.hypot(b.x-relicPoint(r).x,b.y-relicPoint(r).y)-Math.hypot(a.x-relicPoint(r).x,a.y-relicPoint(r).y))[0];
  assert.ok(Math.hypot(p.x-relicPoint(r).x,p.y-relicPoint(r).y)>70);
  const geo=G.geo(p.x,p.y),fix=new PositionTracker().accept({latitude:geo.lat,longitude:geo.lon,accuracy:5,timestamp:1000000,speed:1},1000000)!;
  assert.equal(applyExplorationFix(s,fix),true);assert.equal(captureTarget(s,s)?.id,r.id);
  assert.equal(s.gold,0);assert.equal(s.meters,0);assert.equal(captureAt(s,s,false,()=>0).status,'unavailable');
  assert.equal(captureAt(s,s,true,()=>0).status,'success');assert.equal(captureAt(s,s,true,()=>0).status,'unavailable');
  const restored=seedLandmarks(JSON.parse(JSON.stringify(s)));assert.ok(restored.collection.some(item=>item.id===r.id));
  assert.equal(captureTarget(restored,p)?.id,undefined);
});

test('TR-154 close to a marker in a different tile does not permit collection',()=>{
  const s=G.initial(),r={...LANDMARKS[0],i:0,j:0,id:'0,0',latitude:undefined,longitude:undefined};
  s.revealed={'0,0':r};assert.equal(captureTarget(s,{x:251,y:125}),undefined);
  assert.equal(captureAt(s,{x:251,y:125},true,()=>0).status,'unavailable');
});
