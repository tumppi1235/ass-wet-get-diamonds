import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {BOSS_RULES,BOSS_DESIGNS,BOSS_TIERS,bossRequirements,bossDamage,simulateEncounter,validateBossRules,type BossContribution} from '../src/game/bosses';
import {trailApi} from '../../dev-server/trail/api';

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
