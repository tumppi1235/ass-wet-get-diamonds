import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulateCollection,type CollectionScenario} from '../src/game/collection-simulation';
import {SPAWN_RULES,generateWorldSpawn,firstVisitSpawn} from '../src/game/world-spawns';
import {WORLD_REGIONS} from '../src/game/world-regions';
import {LANDMARKS} from '../src/game/landmarks';
import G from '../src/game/engine';
import {database} from './sqlite-world';
import {insertSpawn} from '../../dev-server/trail/spawn-store';
import {spawnAnalytics} from '../../dev-server/trail/spawn-analytics';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {trailApi} from '../../dev-server/trail/api';
const place=LANDMARKS[0],scenario:CollectionScenario={at:1000000,samples:200,seed:'actual-rule-parity',energyMeters:2000,walkedMeters:5000,weather:'clear',viewDistanceMeters:1000,uniqueVisitors:0,attemptAt:'own-tile',accurate:true};

test('TR-038 collection laboratory repeats actual search probabilities without mutating rules, granting live rewards or duplicate attempts',()=>{
  const rules={...SPAWN_RULES,firstVisitChance:0},before=JSON.stringify({rules,regions:WORLD_REGIONS}),result=simulateCollection(place,scenario,rules,WORLD_REGIONS);
  assert.deepEqual(simulateCollection(place,scenario,rules,WORLD_REGIONS),result);assert.equal(JSON.stringify({rules,regions:WORLD_REGIONS}),before);assert.equal(result.writes,0);assert.equal(result.counts.attempts,200);assert.equal(result.counts.successes+result.counts.misses,200);assert.equal(result.counts.repeatedAttemptsRejected,200);
  assert.equal(result.counts.worldSpawns,1,'independent personal claims do not multiply the shared world appearance');
  const rarity=result.worldRarity!;assert.ok(Math.abs(result.rarities[rarity].expectedSuccesses-200*G.chance(scenario.energyMeters,scenario.weather,rarity,scenario.walkedMeters))<1e-9);
  const harder=simulateCollection(place,{...scenario,energyMeters:10000,walkedMeters:100000,weather:'snow'},rules,WORLD_REGIONS);assert.ok(harder.rarities[rarity].expectedSuccesses>=result.rarities[rarity].expectedSuccesses);assert.ok(harder.counts.successes>=result.counts.successes);assert.ok(harder.rarities[rarity].expectedSuccesses<=200*.9+1e-9);
  const personal=simulateCollection(place,scenario,{...rules,firstVisitChance:1},WORLD_REGIONS);assert.equal(personal.counts.personalDrops,200);assert.equal(personal.counts.attempts,400);assert.equal(personal.counts.repeatedAttemptsRejected,200);
});

test('TR-018/019/038 simulated visibility never bypasses own-tile, accuracy, density or closure rules',()=>{
  const rules={...SPAWN_RULES,firstVisitChance:0};
  const distant=simulateCollection(place,{...scenario,attemptAt:'view-point'},rules,WORLD_REGIONS);assert.equal(distant.counts.visibleFromView,200);assert.equal(distant.counts.attempts,0);
  const dense=simulateCollection(place,{...scenario,uniqueVisitors:1000},rules,WORLD_REGIONS);assert.equal(dense.rangeMeters,SPAWN_RULES.minimumDetectionMeters);assert.equal(dense.counts.visibleFromView,0);assert.equal(dense.counts.attempts,200,'own-tile hydration stays available despite a shorter detection radius');
  const coarse=simulateCollection(place,{...scenario,accurate:false},rules,WORLD_REGIONS);assert.equal(coarse.counts.attempts,0);assert.equal(coarse.counts.successes,0);
  const blocked=simulateCollection(place,scenario,rules,{...WORLD_REGIONS,regions:[{id:'closed',name:'Closed test path',south:place.latitude!-.01,north:place.latitude!+.01,west:place.longitude!-.01,east:place.longitude!+.01,terrain:'trail',weather:'clear',blocked:true,startsAt:0,endsAt:2000000,rarityFactor:1}]});assert.equal(blocked.blocked,true);assert.equal(blocked.counts.worldSpawns,0);assert.equal(blocked.counts.attempts,0);
  assert.throws(()=>simulateCollection(place,{...scenario,samples:501},rules,WORLD_REGIONS));
});

test('TR-012 recorded regional cohorts separate appearance counts, balance revisions and unknown reward receipts without world writes',async()=>{
  const f=database(),db=f.db as never,now=10*86400000+1000000;
  for(const id of ['p1','p2'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(id,id,'player',now);
  const a=generateWorldSpawn(place,now,{...SPAWN_RULES,revision:'spawn-alpha'}),b=generateWorldSpawn(place,now,{...SPAWN_RULES,revision:'spawn-bravo'}),old=generateWorldSpawn(place,now-2*86400000,{...SPAWN_RULES,revision:'spawn-old'}),manual={...a,id:'manual:analytics',createdAt:now-1000},expired={...a,id:'manual:expired',expiresAt:now-1},personal=firstVisitSpawn(place,'p1',now,{...SPAWN_RULES,firstVisitChance:1})!;
  for(const spawn of [a,b,old,manual,expired,personal])await insertSpawn(db,spawn).run();f.sql.prepare('UPDATE trail_spawns SET removed_at=? WHERE id=?').run(now,b.id);
  for(const[owner,balance,xp]of [['p1','balance-alpha',10],['p2','balance-bravo',15]]as const){const event='claim:'+owner;f.sql.prepare('INSERT INTO trail_events(owner,id,kind,result,request_hash,created_at) VALUES(?,?,?,?,?,?)').run(owner,event,'capture',JSON.stringify({awards:{perception:xp},balanceRevision:balance}),'fixture',now);f.sql.prepare('INSERT INTO trail_spawn_claims(spawn,owner,event,created_at) VALUES(?,?,?,?)').run(a.id,owner,event,now);}
  f.sql.prepare('INSERT INTO trail_spawn_claims(spawn,owner,event,created_at) VALUES(?,?,?,?)').run(manual.id,'p1','missing-old-receipt',now);
  f.sql.prepare('INSERT INTO trail_spawn_claims(spawn,owner,event,created_at) VALUES(?,?,?,?)').run(manual.id,'p2','future-receipt',now+1);
  const before=await exportDevSnapshot(db,now),stats=await spawnAnalytics(db,{south:place.latitude!-.01,north:place.latitude!+.01,west:place.longitude!-.01,east:place.longitude!+.01},1,now);
  assert.equal(stats.writes,0);assert.equal(stats.appearances.reduce((n,r)=>n+r.instances,0),5);assert.equal(stats.appearances.reduce((n,r)=>n+r.active,0),3);assert.equal(stats.appearances.find(r=>r.spawnRevision==='spawn-alpha')!.instances,1,'two claimants do not double the world-instance count');
  assert.equal(stats.durationDays,1);
  assert.equal(stats.rewards.reduce((n,r)=>n+r.claims,0),3);assert.equal(stats.rewards.reduce((n,r)=>n+r.perceptionXp,0),25);assert.equal(stats.rewards.reduce((n,r)=>n+r.missingReceipts,0),1);assert.deepEqual(stats.rewards.filter(r=>r.spawnRevision==='spawn-alpha').map(r=>r.balanceRevision).sort(),['balance-alpha','balance-bravo']);
  assert.equal((await exportDevSnapshot(db,now)).digest,before.digest);await assert.rejects(()=>spawnAnalytics(db,stats.bounds,32,now),/1–31 days/);
  for(let i=0;i<101;i++)await insertSpawn(db,generateWorldSpawn(place,now,{...SPAWN_RULES,revision:'group-'+i})).run();const bounded=await spawnAnalytics(db,stats.bounds,1,now);assert.equal(bounded.appearances.length,100);assert.equal(bounded.truncated,true);
});

test('TR-032/038 analytics and collection simulation require admin, own-origin writes and bounded inputs; simulations persist nothing',async()=>{
  const f=database(),db=f.db as never,env={DB:db,TRAIL_ENV:'development'};for(const id of ['admin','player'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(id,id,id,0);
  const call=(owner:string,path:string,input?:unknown,origin='https://dev.example')=>trailApi(new Request('https://dev.example/api/trail/admin/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':owner,origin},...(input?{body:JSON.stringify(input)}:{})}),env),body={placeId:place.landmarkId,scenario,rules:SPAWN_RULES};
  const before=await exportDevSnapshot(db,1000);assert.equal((await call('player','collection-simulation',body)).status,403);assert.equal((await call('admin','collection-simulation',body,'https://foreign.example')).status,403);
  const response=await call('admin','collection-simulation',body);assert.equal(response.status,200);assert.equal((await response.json()).writes,0);assert.equal((await call('admin','collection-simulation',{...body,scenario:{...scenario,samples:501}})).status,400);
  const query='spawn-analytics?south=62.2&north=62.3&west=25.6&east=25.8&days=7';assert.equal((await call('player',query)).status,403);assert.equal((await call('admin',query)).status,200);assert.equal((await call('admin',query.replace('days=7','days=100'))).status,400);
  assert.equal((await exportDevSnapshot(db,1000)).digest,before.digest,'neither simulation nor analytics materializes lazy spawns or changes private state');
});
