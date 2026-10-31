import {test} from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import {LANDMARKS} from '../src/game/landmarks';
import {legacySpawn,spawnVisibleTo,validateSpawn} from '../src/game/spawns';
import {ensureLifetime,recordExplorationEvidence,recordArtifactEvidence,lifetimeSummary} from '../src/game/achievements';
import {newProgression,validateProgression,xpForLevel,levelProgress,ATTRIBUTES} from '../src/game/progression';
import {progressionConfig} from '../src/config/progression';
import {requestAdventure,endAdventure,applyExplorationFix} from '../src/game/adventure';
import {restoreDevelopmentState} from '../src/game/development-state';
import {APP_ENV} from '../src/config/environment';
import type {TrackedFix} from '../src/location/tracker';

function fix(at:number,x=10,distance=0,startSegment=false):TrackedFix{
  const geo=G.geo(x,125);return{eligible:true,distance,startSegment,reason:'accurate',position:{x,y:125,latitude:geo.lat,longitude:geo.lon,accuracy:5,timestamp:at,inside:true,precise:true}};
}
test('TR-002 legacy spawn adapters preserve every landmark tile, identity, rarity and coordinates',()=>{
  const before=JSON.stringify(LANDMARKS),spawns=LANDMARKS.map(legacySpawn);
  assert.equal(new Set(spawns.map(s=>s.id)).size,LANDMARKS.length);
  for(const [index,s]of spawns.entries()){
    assert.equal(s.tileId,LANDMARKS[index].id);assert.equal(s.rarity,LANDMARKS[index].rarity);
    assert.equal(s.position.latitude,LANDMARKS[index].latitude);assert.equal(s.position.longitude,LANDMARKS[index].longitude);
    assert.equal(s.createdAt,null,'unknown historical date is not invented');
  }
  assert.equal(JSON.stringify(LANDMARKS),before);
});
test('TR-002 new spawn versions, tile position, expiry and personal ownership are validated',()=>{
  const base={...legacySpawn(LANDMARKS[0]),origin:'world' as const,createdAt:1000};
  const dynamic=validateSpawn({...base,id:'spawn-2',kind:'dynamic',expiresAt:2000});
  assert.equal(spawnVisibleTo(dynamic,'player',999),false);assert.equal(spawnVisibleTo(dynamic,'player',1000),true);assert.equal(spawnVisibleTo(dynamic,'player',2000),false);
  const personal=validateSpawn({...base,id:'personal-1',kind:'personal-first-visit',origin:'personal',ownerId:'alice'});
  assert.equal(spawnVisibleTo(personal,'alice',1000),true);assert.equal(spawnVisibleTo(personal,'bob',1000),false);
  for(const patch of [{version:2},{tileId:'99999,99999'},{createdAt:null},{expiresAt:999},{kind:'dynamic',expiresAt:null},{kind:'personal-first-visit'},{rarity:'Unknown'},{position:{latitude:NaN,longitude:1}}])assert.throws(()=>validateSpawn({...base,...patch}));
});
test('TR-078 migration preserves existing inventory, gold and claims without inventing historical effort',()=>{
  const s=G.initial();s.gold=17;s.claimGoldSpent=9;s.visits['0,0']=5;s.collection.push({...LANDMARKS[0]});s.meters=9999;
  const before=JSON.stringify(s);const l=ensureLifetime(s,1000),again=ensureLifetime(s,2000);
  assert.equal(l,again);assert.equal(l.meters,0);assert.equal(l.tiles['0,0'].source,'legacy');assert.equal(l.finds[LANDMARKS[0].id].at,null);
  const {lifetime,...preserved}=s;assert.ok(lifetime);assert.equal(JSON.stringify(preserved),before);
});
test('TR-078 lifetime evidence counts valid segments once, across quests, without suspension distance/time',()=>{
  let s=G.initial();requestAdventure(s,1000);s.adventure!.pendingStart=false;ensureLifetime(s,1000);
  recordExplorationEvidence(s,fix(1000,10,0,true),true);recordExplorationEvidence(s,fix(6000,20,10),true);
  recordExplorationEvidence(s,fix(6000,20,10),true);assert.equal(s.lifetime!.meters,10);
  s=JSON.parse(JSON.stringify(s));recordExplorationEvidence(s,fix(3_606_000,300,999,true),true);
  assert.equal(s.lifetime!.meters,10);assert.equal(s.lifetime!.observedSeconds,5);
  recordExplorationEvidence(s,fix(3_611_000,310,10),true);assert.equal(s.lifetime!.meters,20);
  endAdventure(s,3_612_000);requestAdventure(s,3_620_000);s.adventure!.pendingStart=false;
  recordExplorationEvidence(s,fix(3_620_000,310,0,true),true);recordExplorationEvidence(s,fix(3_625_000,320,10),true);
  assert.equal(s.lifetime!.meters,30);assert.equal(s.lifetime!.observedSeconds,15);assert.equal(lifetimeSummary(s.lifetime!).adventures,2);
});
test('TR-078 Discovery records reached tiles and genuine finds, never workout effort or duplicate finds',()=>{
  const s=G.initial();recordExplorationEvidence(s,fix(1000,10,100),false);recordExplorationEvidence(s,fix(2000,260,250),false);
  assert.equal(lifetimeSummary(s.lifetime!).verifiedTiles,2);assert.equal(s.lifetime!.meters,0);assert.equal(s.lifetime!.observedSeconds,0);
  const r=LANDMARKS[0];recordArtifactEvidence(s,r,2000);assert.equal(lifetimeSummary(s.lifetime!).verifiedFinds,0);
  s.collection.push(r);recordArtifactEvidence(s,r,2000);recordArtifactEvidence(s,r,3000);
  assert.equal(lifetimeSummary(s.lifetime!).verifiedFinds,1);assert.equal(s.lifetime!.finds[r.id].at,2000);
  recordExplorationEvidence(s,{...fix(4000,510,250),eligible:false},false);assert.equal(lifetimeSummary(s.lifetime!).verifiedTiles,2);
});
test('TR-051/087 all six independent XP totals survive reload; quadratic levels are exact at boundaries',()=>{
  const p=newProgression();assert.equal(ATTRIBUTES.length,6);p.xp.exploration=100;p.xp.agility=25;
  const saved=validateProgression(JSON.parse(JSON.stringify(p)));assert.equal(saved.xp.power,0);assert.equal(saved.xp.exploration,100);assert.equal(saved.xp.agility,25);
  for(let level=1;level<=1000;level++){
    const threshold=xpForLevel(level);assert.equal(threshold,25*(level-1)**2);assert.equal(levelProgress(threshold).level,level);
    if(threshold)assert.equal(levelProgress(threshold-1).level,level-1);
  }
  assert.equal(levelProgress(24).remainingXp,1);assert.equal(levelProgress(25).fraction,0);assert.equal(levelProgress(100,100).level,2);
  for(const invalid of [-1,NaN,Infinity,1.5])assert.throws(()=>levelProgress(invalid));
  assert.throws(()=>xpForLevel(0));assert.throws(()=>levelProgress(10,0));assert.throws(()=>validateProgression({...p,xp:{...p.xp,power:-1}}));
  assert.ok(Number.isSafeInteger(levelProgress(Number.MAX_SAFE_INTEGER).level));
});
test('TR-115 progression configuration is independently scoped; changing a copy cannot alter production',()=>{
  const dev=progressionConfig('development');dev.coefficient=100;
  assert.equal(progressionConfig('production').coefficient,25);assert.equal(progressionConfig('development').coefficient,25);
});
test('development foundations remain disabled in production and do not infer XP from gold or demo records',()=>{
  const s=G.initial();s.gold=123;restoreDevelopmentState(s,1000);requestAdventure(s,1000);applyExplorationFix(s,fix(1000,10,0,true));
  if(APP_ENV==='development'){
    assert.ok(s.lifetime);assert.ok(s.progression);assert.equal(lifetimeSummary(s.lifetime!).verifiedTiles,1);
    assert.deepEqual(Object.values(s.progression!.xp),[0,0,0,0,0,0]);
    const before=JSON.stringify(s.lifetime);G.move(s,10,0);assert.equal(JSON.stringify(s.lifetime),before,'demo engine never writes GPS evidence');
  }else{assert.equal(s.lifetime,undefined);assert.equal(s.progression,undefined);}
});
