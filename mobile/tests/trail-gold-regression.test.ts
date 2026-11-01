import {test} from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import {requestAdventure,endAdventure,applyExplorationFix} from '../src/game/adventure';
import {beginQuest} from '../src/game/landmarks';
import {LocationSession} from '../src/location/session';
import type {LocationFix} from '../src/location/tracker';
import {appendTrail,compactTrail} from '../src/game/trail';
import {trailData} from '../src/map/vector-data';
import {creditWalkingGold,restoreResources} from '../src/game/resources';

test('a new quest removes previous route fragments without clearing exploration or gold',()=>{
  const s=G.initial();s.path=[{x:0,y:0},{x:10,y:0},{x:500,y:10,breakBefore:true},{x:520,y:20}];s.gold=7;s.goldMetres=180;s.visits={'0,0':2};
  requestAdventure(s,1000);assert.equal(s.path.length,0);assert.equal(s.gold,7);assert.equal(s.goldMetres,180);assert.equal(s.visits['0,0'],2);
  s.path.push({x:20,y:30});requestAdventure(s,2000);assert.equal(s.path.length,1,'starting an already active adventure must not erase its route');
  endAdventure(s,3000);beginQuest(s);assert.deepEqual(s.path,[],'demo quests also start with a clean route');assert.equal(s.goldMetres,180);
});

test('short GPS watcher reconnects preserve the continuous trail and walking gold',async()=>{
  let now=1_000_000;const callbacks:((f:LocationFix)=>void)[]=[],s=G.initial();
  const session=new LocationSession(async callback=>{callbacks.push(callback);return{remove(){}};},()=>{},f=>applyExplorationFix(s,f),()=>now);
  const emit=(x:number)=>{const p=G.geo(x,125);callbacks.at(-1)!({latitude:p.lat,longitude:p.lon,timestamp:now,accuracy:5,speed:1});};
  requestAdventure(s,now);await session.start();emit(125);
  // Each reconnect happens before the 8m distance threshold. Previously every
  // replacement discarded the anchor, resulting in zero mileage and no line.
  for(let i=1;i<=120;i++){session.suspend();now+=2500;session.resume();await Promise.resolve();emit(125+i*3);}
  assert.ok(s.meters>350&&s.meters<=361,`received ${s.meters} metres`);
  assert.equal(trailData(s).features.length,1);assert.ok(Math.abs(s.path[0].x-125)<1e-6);assert.ok(s.path.at(-1)!.x>484);
  const tileGold=Object.keys(s.visits).length;
  assert.equal(s.gold,tileGold+Math.floor(s.meters/250));
  assert.ok(Math.abs(s.goldMetres-s.meters%250)<1e-6);
  const distance=s.meters;session.suspend();now+=31000;session.resume();await Promise.resolve();emit(900);
  assert.equal(s.meters,distance,'a long gap must not earn missing mileage');assert.equal(s.path.at(-1)!.breakBefore,true);
  session.stop();
});

test('the live trail includes accepted sub-threshold movement and keeps long-quest beginnings',()=>{
  const s=G.initial();requestAdventure(s,1000);
  const fix=(x:number,time:number)=>{const geo=G.geo(x,125);applyExplorationFix(s,{position:{x,y:125,latitude:geo.lat,longitude:geo.lon,accuracy:5,timestamp:time,precise:true,inside:true},eligible:true,distance:0,startSegment:false,reason:'accurate'});};
  fix(125,1000);fix(127,2000);assert.equal(s.path.at(-1)!.x,127);assert.equal(s.meters,0,'drawing a point does not grant walking rewards');
  for(let i=0;i<6500;i++)appendTrail(s,{x:128+i,y:125});
  assert.equal(s.path[0].x,125);assert.equal(s.path.at(-1)!.x,6627);assert.ok(s.path.length<6000);
  const segmented=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:100,y:100,breakBefore:true},{x:110,y:100},{x:120,y:100}];
  assert.deepEqual(compactTrail(segmented),[segmented[0],segmented[1],segmented[2],segmented[3],segmented[5]]);
});

test('walking gold carries fractional distance across outings and reload without rounding loss',()=>{
  let s=G.initial();s.visits={'0,0':1};s.gold=4;creditWalkingGold(s,249.75);requestAdventure(s,1000);endAdventure(s,2000);
  s=restoreResources(JSON.parse(JSON.stringify(s)));creditWalkingGold(s,.25);assert.equal(s.gold,5);assert.equal(s.goldMetres,0);
  for(let i=0;i<1000;i++)creditWalkingGold(s,.25);assert.equal(s.gold,6);assert.equal(s.goldMetres,0);
});
