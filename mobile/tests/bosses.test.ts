import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {BOSS_RULES,BOSS_DESIGNS,BOSS_TIERS,bossRequirements,bossDamage,simulateEncounter,validateBossRules,type BossContribution} from '../src/game/bosses';
import {trailApi} from '../../dev-server/trail/api';
import {applyWorldEvent} from '../../dev-server/trail/world-store';
import {summarizeActivity,listCompletedActivities} from '../../dev-server/trail/activity-store';
import G from '../src/game/engine';

test('TR-044/131/132 activity evidence is server-derived, idempotent, window-bounded and excludes discovery, gaps and old mileage',async()=>{
  const{db,sql}=database(),binding=db as never;let now=1000000,revision=0;
  sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('walker','Walker','player',now);
  const event=async(id:string,input:Parameters<typeof applyWorldEvent>[4])=>{const result=await applyWorldEvent(binding,'walker',id,revision,input,now);revision=result.revision;return result;};
  const geo=(x:number)=>G.geo(x,125),fix=(x:number,accuracy=5)=>({kind:'gps' as const,fix:{latitude:geo(x).lat,longitude:geo(x).lon,accuracy,timestamp:now+.75,speed:1}});
  await event('discovery:only:1',fix(0));assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_events WHERE activity_id IS NOT NULL').get()!.n,0);
  now+=1000;const start=await event('activity:start:1',{kind:'start',movement:'foot'}),activityId=start.receipt.activity!.id;assert.equal(activityId,'activity:activity:start:1');
  now+=5000;await event('activity:gps:1',fix(0));now+=5000;await event('activity:gps:2',fix(20));const windowStart=now+1;
  now+=5000;const boundary=await event('activity:gps:3',fix(40));assert.ok(boundary.receipt.activity!.distanceStartedAt<windowStart);
  now+=5000;const accepted=await event('activity:gps:4',fix(60));assert.ok(accepted.receipt.activity!.meters>19);
  const duplicate=await applyWorldEvent(binding,'walker','activity:gps:4',revision-1,fix(60),now);assert.equal(duplicate.replayed,true);assert.equal(duplicate.revision,revision);
  now+=5000;const coarse=await event('activity:coarse:5',fix(500,500));assert.equal(coarse.receipt.activity,undefined);
  now+=60000;const gap=await event('activity:gap:6',fix(1000));assert.equal(gap.receipt.activity!.meters,0);assert.equal(gap.receipt.activity!.observedSeconds,0);
  await assert.rejects(()=>summarizeActivity(binding,'walker',activityId,'0,0',windowStart,now+3600000,now),/Complete one recorded/);
  now+=1000;await event('activity:stop:1',{kind:'stop'});const summary=await summarizeActivity(binding,'walker',activityId,'0,0',windowStart,now+3600000,now);
  assert.equal(summary.source,'browser-gps');assert.equal(summary.bossTileVisited,true);assert.ok(Math.abs(summary.meters-accepted.receipt.activity!.meters)<.001);assert.equal(summary.eligibleStartedAt,windowStart);assert.equal((await listCompletedActivities(binding,'walker',now)).activities.length,1);
  assert.equal((await listCompletedActivities(binding,'stranger',now)).activities.length,0);assert.ok(sql.prepare('SELECT result FROM trail_events WHERE activity_id IS NOT NULL').all().every(row=>!String(row.result).includes('latitude')));
  now+=1000;const second=await event('activity:start:2',{kind:'start',movement:'foot'});assert.notEqual(second.receipt.activity!.id,activityId);
});

test('TR-043/050/060/061/062/065/066 tier targets retain solo/party endurance and five-player limits',()=>{
  assert.equal(BOSS_DESIGNS.length,4);assert.equal(new Set(BOSS_DESIGNS.map(b=>b.signature)).size,4);assert.equal(bossRequirements('Greater',1).targetKmPerPerson,50);assert.equal(bossRequirements('Mythical',1).targetKmPerPerson,75);assert.equal(bossRequirements('Mythical',5).targetKmPerPerson,50);
  for(const tier of BOSS_TIERS){let previous=0;for(let size=1;size<=5;size++){const r=bossRequirements(tier,size);assert.ok(r.hp>=previous);previous=r.hp;assert.equal(r.windowHours,24);}}
  assert.throws(()=>bossRequirements('Lesser',6));assert.throws(()=>bossRequirements('Lesser',0));
  assert.throws(()=>validateBossRules({...BOSS_RULES,revision:null as never}),/Invalid/);
  const copy=validateBossRules(BOSS_RULES);copy.targets.Lesser[0]=1;assert.equal(BOSS_RULES.targets.Lesser[0],20,'editing a validated copy cannot change default policy');
  assert.throws(()=>validateBossRules({...BOSS_RULES,targets:{...BOSS_RULES.targets,Greater:[25,20,15,12,10]}}),/floors/);
});

test('TR-044/046/060/067/069/070/124 combat uses physical activity, capped modifiers and individual minimums without character damage',()=>{
  const neutral={weakness:'foot' as const,weaknessBonus:0};
  assert.equal(bossDamage(50000,'foot',neutral).hp,100);assert.equal(bossDamage(125000,'bicycle',neutral).hp,100);
  const boosted=bossDamage(1000,'foot',{weakness:'foot',weaknessBonus:100});assert.equal(boosted.bonus,.1);assert.equal(boosted.equivalentKm,1,'bonuses do not invent qualifying endurance');
  const c:BossContribution={owner:'a',activityId:'activity:1',meters:50000,movement:'foot',bossTileVisited:true,activityStartedAt:0,activityEndedAt:8*3600000};
  assert.equal(simulateEncounter('Greater',1,[c],neutral).victory,true);assert.equal(simulateEncounter('Greater',1,[{...c,meters:1000}],neutral).victory,false);
  const mythical=Array.from({length:5},(_,i)=>({...c,owner:'p'+i,activityId:'a'+i,meters:49000}));const result=simulateEncounter('Mythical',5,mythical,{weakness:'foot',weaknessBonus:100});assert.equal(result.remainingHp,0);assert.equal(result.victory,false,'zero displayed HP cannot bypass all failed individual minimums');
  assert.throws(()=>simulateEncounter('Greater',2,[c,c],neutral),/One qualifying activity/);assert.throws(()=>simulateEncounter('Greater',1,[{...c,bossTileVisited:false}],neutral),/boss-tile visit/);assert.throws(()=>simulateEncounter('Greater',1,[{...c,activityEndedAt:25*3600000}],neutral),/window/);
  const original=JSON.stringify(c);simulateEncounter('Greater',1,[c],neutral);assert.equal(JSON.stringify(c),original);
});

test('TR-043/049/064 boss placement and policy are protected, sourced, immutable, audited and independently simulated',async()=>{
  const{db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development',TRAIL_ADMIN_EMAIL:'owner@example.invalid'};
  const call=async(owner:string,path:string,method='GET',body?:unknown)=>{const r=await trailApi(new Request('https://dev.example/api/trail/'+path,{method,headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner==='admin'?'owner@example.invalid':'player@example.invalid',origin:'https://dev.example'},...(body?{body:JSON.stringify(body)}:{})}),env);return{status:r.status,data:await r.json()};};
  await call('admin','me','POST',{displayName:'Admin'});await call('player','me','POST',{displayName:'Player'});
  assert.equal((await call('player','admin/boss-rules')).status,403);
  const input={designId:'metsanvartija',tier:'Greater',placeId:'haukkala-gate',startsAt:Date.now()-1000,endsAt:Date.now()+7*86400000,weaknessBonus:0};
  assert.equal((await call('player','admin/bosses','POST',input)).status,403);assert.equal((await call('admin','admin/bosses','POST',{...input,placeId:'unverified-water-centre'})).status,400);
  const placed=await call('admin','admin/bosses','POST',input);assert.equal(placed.status,200);assert.equal(placed.data.boss.rules.revision,BOSS_RULES.revision);assert.equal(placed.data.boss.tileId,'-11,13');
  const changed=await call('admin','admin/boss-rules','PUT',{rules:{...BOSS_RULES,windowHours:12},revision:BOSS_RULES.revision});assert.equal(changed.status,200);assert.equal((await call('admin','admin/boss-rules','PUT',{rules:BOSS_RULES,revision:BOSS_RULES.revision})).status,409);
  const stored=JSON.parse(String(sql.prepare('SELECT document FROM trail_bosses').get()!.document));assert.equal(stored.rules.windowHours,24,'new configuration cannot rewrite a placed boss policy');
  const simulation=await call('admin','admin/boss-simulation','POST',{rules:BOSS_RULES,tier:'Greater',partySize:1,boss:{weakness:'foot',weaknessBonus:0},contributions:[{owner:'synthetic',activityId:'synthetic:1',meters:50000,movement:'foot',bossTileVisited:true,activityStartedAt:0,activityEndedAt:36000000}]});assert.equal(simulation.status,200);assert.equal(simulation.data.worldWrites,0);assert.equal(simulation.data.victory,true);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_players').get()!.n,0,'simulation creates no player or encounter state');
  const nearby=await call('admin','admin/bosses?south=62.25&north=62.29&west=25.65&east=25.75');assert.equal(nearby.data.bosses.length,1);
  assert.equal((await call('admin','admin/bosses','DELETE',{id:placed.data.boss.id})).status,200);assert.ok(sql.prepare('SELECT removed_at FROM trail_bosses').get()!.removed_at);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_audit').get()!.n,3);
});
