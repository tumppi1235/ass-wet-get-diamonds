import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {BOSS_RULES,type Boss} from '../src/game/bosses';
import {LOOT_RULES,lootChances,diminishingBonus,rollBossLoot} from '../src/game/loot';
import {newProgression} from '../src/game/progression';
import {LANDMARKS} from '../src/game/landmarks';
import G from '../src/game/engine';
import {saveBossRules,placeBoss} from '../../dev-server/trail/boss-store';
import {applyWorldEvent,loadWorld} from '../../dev-server/trail/world-store';
import {applyEncounterAction,viewEncounter,listEncounters} from '../../dev-server/trail/encounter-store';
import type {EncounterAction} from '../src/game/encounters';
import {trailApi} from '../../dev-server/trail/api';
import {SharedWorldClient} from '../src/accounts/shared-world';
import {summarizeActivity,allowedBossVisit} from '../../dev-server/trail/activity-store';
import {WORLD_REGIONS} from '../src/game/world-regions';
import {queryEncounters,inspectEncounter,cancelEncounter} from '../../dev-server/trail/encounter-admin';

async function fixture(now=1000000){
  const{db,sql}=database(),binding=db as never,clock={now};let sequence=0;
  for(const id of ['manager','a','b','c','d','e','f'])sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(id,id,id==='manager'?'admin':'player',clock.now);
  await saveBossRules(binding,'manager',{...BOSS_RULES,targets:{...BOSS_RULES.targets,Lesser:[.1,.1,.1,.1,.1]}},BOSS_RULES.revision);
  const boss=(await placeBoss(binding,'manager',{designId:'metsanvartija',tier:'Lesser',placeId:'haukkala-gate',startsAt:clock.now-1000,endsAt:clock.now+2*86400000,weaknessBonus:0},clock.now)).boss;
  const point=G.xy(LANDMARKS[0].latitude!,LANDMARKS[0].longitude!);
  const world=async(owner:string,event:Parameters<typeof applyWorldEvent>[4],id='world:test:'+ ++sequence)=>applyWorldEvent(binding,owner,id,(await loadWorld(binding,owner,clock.now)).revision,event,clock.now);
  const locate=async(owner:string,offset=0,accuracy=5)=>{clock.now+=1000;const p=G.geo(point.x+offset,point.y);return world(owner,{kind:'gps',fix:{latitude:p.lat,longitude:p.lon,accuracy,timestamp:clock.now,speed:1}});};
  const act=(owner:string,action:EncounterAction,id='encounter:test:'+ ++sequence)=>applyEncounterAction(binding,owner,id,action,clock.now);
  const walk=async(owner:string,meters=140,movement:'foot'|'bicycle'='foot',offset=0)=>{clock.now+=1000;const start=await world(owner,{kind:'start',movement});for(let x=0;x<=meters;x+=20){clock.now+=5000;const p=G.geo(point.x+offset+x,point.y);await world(owner,{kind:'gps',fix:{latitude:p.lat,longitude:p.lon,accuracy:5,timestamp:clock.now,speed:1}});}clock.now+=1000;await world(owner,{kind:'stop'});return start.receipt.activity!.id;};
  const create=async(owner='a',members:string[]=[])=>{const result=await act(owner,{kind:'create',bossId:boss.id,members});assert.ok(result.view);return result.view;};
  const activate=async(view:Awaited<ReturnType<typeof create>>)=>{await locate(view.encounter.creator);const result=await act(view.encounter.creator,{kind:'activate',encounterId:view.encounter.id,revision:view.revision});assert.ok(result.view);return result.view;};
  return{db,sql,binding,clock,boss,world,locate,walk,act,create,activate};
}

test('TR-129/144/145 arrival creates no timer; explicit fresh own-tile activation locks the policy and window',async()=>{
  const f=await fixture();await f.locate('a');const draft=await f.create();assert.equal(draft.encounter.state,'draft');assert.equal(draft.encounter.startedAt,null);
  f.clock.now+=16000;await assert.rejects(()=>f.act('a',{kind:'activate',encounterId:draft.encounter.id,revision:draft.revision}),/fresh accurate GPS/);
  await f.locate('a',0,100);await assert.rejects(()=>f.act('a',{kind:'activate',encounterId:draft.encounter.id,revision:draft.revision}),/fresh accurate GPS/);
  const active=await f.activate(draft);assert.equal(active.encounter.state,'active');assert.equal(active.encounter.deadline!-active.encounter.startedAt!,24*3600000);assert.equal(active.encounter.totalHp,.2);
  await assert.rejects(()=>viewEncounter(f.binding,'b',active.encounter.id,f.clock.now),/not found/);
});

test('TR-045/048/072/075/131/132 solo activity wins once and loot replay cannot duplicate gold, inventory or Fellowship',async()=>{
  const f=await fixture(),active=await f.activate(await f.create()),activityId=await f.walk('a');
  const input:EncounterAction={kind:'contribute',encounterId:active.encounter.id,revision:active.revision,activityId},won=await f.act('a',input,'contribution:solo:1');assert.ok(won.view);assert.equal(won.view.encounter.state,'won');assert.equal(won.view.encounter.contributions.a.qualified,true);
  assert.equal((await f.act('a',input,'contribution:solo:1')).replayed,true);await assert.rejects(()=>f.act('a',{...input,revision:won.view!.revision}),/one completed activity/);
  const before=await loadWorld(f.binding,'a',f.clock.now),claim:EncounterAction={kind:'claim-loot',encounterId:active.encounter.id,revision:won.view.revision},reward=await f.act('a',claim,'loot:solo:claim:1');assert.ok(reward.view?.reward);assert.ok(reward.world);
  assert.equal(reward.world.world.game.gold-before.world.game.gold,20);assert.equal(reward.world.world.game.collection.length,1);assert.equal(reward.world.world.game.progression!.xp.fellowship,0);
  const replay=await f.act('a',claim,'loot:solo:claim:1');assert.equal(replay.replayed,true);assert.equal(replay.view!.reward!.itemId,reward.view.reward.itemId);assert.equal(replay.world!.world.game.gold,reward.world.world.game.gold);
  await f.act('a',claim,'loot:solo:claim:2');assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,1);assert.equal((await loadWorld(f.binding,'a',f.clock.now)).world.game.collection.length,1);
  await assert.rejects(()=>f.act('a',{kind:'leave',encounterId:active.encounter.id,revision:won.view!.revision},'loot:solo:claim:1'),/identity was reused/);
  const second=await f.activate(await f.create());await assert.rejects(()=>f.act('a',{kind:'contribute',encounterId:second.encounter.id,revision:second.revision,activityId}),/already used/);
});

test('TR-060/068/130 party consent is explicit, draft members may leave, and an active roster cannot become cheaper',async()=>{
  const f=await fixture(),draft=await f.create('a',['b']);await f.locate('a');await assert.rejects(()=>f.act('a',{kind:'activate',encounterId:draft.encounter.id,revision:draft.revision}),/every invited member accepts/);
  const accepted=await f.act('b',{kind:'accept',encounterId:draft.encounter.id,revision:draft.revision},'accept:member:b');assert.ok(accepted.view);assert.equal(accepted.view.members.find(m=>m.id==='b')!.accepted,true);
  const active=await f.activate(accepted.view);assert.equal(active.encounter.totalHp,.4);await assert.rejects(()=>f.act('b',{kind:'leave',encounterId:active.encounter.id,revision:active.revision}),/locked after activation/);
  await assert.rejects(()=>f.create('b'),/already have a party/);await assert.rejects(()=>f.create('c',['a','b','d','e','f']),/up to four/);
  const other=await f.create('c',['d']),left=await f.act('d',{kind:'leave',encounterId:other.encounter.id,revision:other.revision},'leave:member:d');assert.equal(left.view,null);const replay=await f.act('d',{kind:'leave',encounterId:other.encounter.id,revision:other.revision},'leave:member:d');assert.equal(replay.replayed,true);assert.equal(replay.view,null);
  assert.equal((await viewEncounter(f.binding,'c',other.encounter.id,f.clock.now)).encounter.roster.length,1);
});

test('TR-045/047/072/134 group contributions use distinct activities, keep XP snapshots private and award meaningful co-op once',async()=>{
  const f=await fixture(),draft=await f.create('a',['b']),accepted=await f.act('b',{kind:'accept',encounterId:draft.encounter.id,revision:draft.revision});assert.ok(accepted.view);const active=await f.activate(accepted.view);
  const a=await f.walk('a'),partial=await f.act('a',{kind:'contribute',encounterId:active.encounter.id,revision:active.revision,activityId:a});assert.ok(partial.view);assert.equal(partial.view.encounter.state,'active');
  const publicView=await viewEncounter(f.binding,'b',active.encounter.id,f.clock.now);assert.equal(publicView.encounter.contributions.a.progression,undefined);
  const b=await f.walk('b',400,'bicycle'),won=await f.act('b',{kind:'contribute',encounterId:active.encounter.id,revision:partial.view.revision,activityId:b});assert.ok(won.view);assert.equal(won.view.encounter.state,'won');assert.equal(won.view.encounter.contributions.b.movement,'bicycle');
  for(const owner of ['a','b']){await f.act(owner,{kind:'claim-loot',encounterId:active.encounter.id,revision:won.view.revision});assert.equal((await loadWorld(f.binding,owner,f.clock.now)).world.game.progression!.xp.fellowship,25);}
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,2);
});

test('TR-132/135 invalid tile evidence cannot obtain loot; expiry resolves once',async()=>{
  const f=await fixture(),active=await f.activate(await f.create()),outside=await f.walk('a',140,'foot',1000);
  await assert.rejects(()=>f.act('a',{kind:'contribute',encounterId:active.encounter.id,revision:active.revision,activityId:outside}),/did not visit this boss tile/);
  f.clock.now=active.encounter.deadline!+1;const expired=await viewEncounter(f.binding,'a',active.encounter.id,f.clock.now);assert.equal(expired.encounter.state,'expired');await viewEncounter(f.binding,'a',active.encounter.id,f.clock.now);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='encounter.expired'").get()!.n,1);
  await assert.rejects(()=>f.act('a',{kind:'claim-loot',encounterId:active.encounter.id,revision:expired.revision}),/winning encounter/);
  const fresh=await f.create();assert.equal(fresh.encounter.state,'draft');
});

test('TR-134 individual minimum excludes carried players and a failed party releases its reserved slots',async()=>{
  const f=await fixture(),draft=await f.create('a',['b']),accepted=await f.act('b',{kind:'accept',encounterId:draft.encounter.id,revision:draft.revision});assert.ok(accepted.view);const active=await f.activate(accepted.view);
  const short=await f.walk('b',20),partial=await f.act('b',{kind:'contribute',encounterId:active.encounter.id,revision:active.revision,activityId:short});assert.ok(partial.view);assert.equal(partial.view.encounter.contributions.b.qualified,false);
  const full=await f.walk('a',200),won=await f.act('a',{kind:'contribute',encounterId:active.encounter.id,revision:partial.view.revision,activityId:full});assert.ok(won.view);assert.equal(won.view.encounter.state,'won');
  await assert.rejects(()=>f.act('b',{kind:'claim-loot',encounterId:active.encounter.id,revision:won.view!.revision}),/qualifying contribution/);
  const loot=await f.act('a',{kind:'claim-loot',encounterId:active.encounter.id,revision:won.view.revision});assert.equal(loot.view!.reward!.fellowshipXp,0,'unqualified roster slot supplies no group bonus');
  const other=await f.activate(await f.create('c')),tooShort=await f.walk('c',20),failed=await f.act('c',{kind:'contribute',encounterId:other.encounter.id,revision:other.revision,activityId:tooShort});assert.equal(failed.view!.encounter.state,'failed');assert.equal((await f.create('c')).encounter.state,'draft');
});

test('TR-045/131 activity evidence clips pre-activation distance and excludes closed access intervals',async()=>{
  const f=await fixture(),before=await f.walk('a');
  const active=await f.activate(await f.create());await assert.rejects(()=>summarizeActivity(f.binding,'a',before,f.boss.tileId,active.encounter.startedAt!,active.encounter.deadline!,f.clock.now),/Complete one recorded/);
  const activity=await f.walk('a',140),proof=await summarizeActivity(f.binding,'a',activity,f.boss.tileId,active.encounter.startedAt!,active.encounter.deadline!,f.clock.now);assert.ok(proof.meters>139&&proof.meters<141);assert.equal(proof.bossTileVisited,true);
  const region={id:'closed-path',name:'Test closure',south:f.boss.latitude-.01,north:f.boss.latitude+.01,west:f.boss.longitude-.01,east:f.boss.longitude+.01,startsAt:active.encounter.startedAt!,endsAt:f.clock.now+1000,blocked:true,terrain:'trail' as const,weather:'clear' as const,rarityFactor:1};
  const closed={...WORLD_REGIONS,regions:[region]} as typeof WORLD_REGIONS;
  assert.equal(await allowedBossVisit(f.binding,'a',activity,f.boss,active.encounter.startedAt!,f.clock.now,closed),null);
  closed.regions[0].endsAt=proof.endedAt-25000;assert.notEqual(await allowedBossVisit(f.binding,'a',activity,f.boss,active.encounter.startedAt!,f.clock.now,closed),null);
  const clipped=await summarizeActivity(f.binding,'a',activity,f.boss.tileId,proof.endedAt-17000,active.encounter.deadline!,f.clock.now);assert.ok(clipped.meters<proof.meters);assert.ok(clipped.meters<=60.001);
});

test('TR-068/083 stale consent and transactional wallet races cannot partly settle an encounter',async()=>{
  const f=await fixture(),draft=await f.create('a',['b','c']),accepted=await f.act('b',{kind:'accept',encounterId:draft.encounter.id,revision:draft.revision});assert.ok(accepted.view);
  await assert.rejects(()=>f.act('c',{kind:'accept',encounterId:draft.encounter.id,revision:draft.revision}),/Party progress changed/);assert.equal((await viewEncounter(f.binding,'a',draft.encounter.id,f.clock.now)).members.find(m=>m.id==='c')!.accepted,false);
  await f.act('a',{kind:'cancel',encounterId:draft.encounter.id,revision:accepted.view.revision});
  const active=await f.activate(await f.create()),activity=await f.walk('a'),won=await f.act('a',{kind:'contribute',encounterId:active.encounter.id,revision:active.revision,activityId:activity});assert.ok(won.view);
  const originalBatch=f.db.batch;let race=true;
  f.db.batch=async statements=>{if(race){race=false;f.sql.prepare("UPDATE trail_players SET revision=revision+1 WHERE id='a'").run();}return originalBatch(statements);};
  const before=await loadWorld(f.binding,'a',f.clock.now),action:EncounterAction={kind:'claim-loot',encounterId:active.encounter.id,revision:won.view.revision};
  await assert.rejects(()=>f.act('a',action,'loot:rollback:test'),/progress changed/);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,0);assert.equal((await loadWorld(f.binding,'a',f.clock.now)).world.game.gold,before.world.game.gold);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_encounter_actions WHERE id='loot:rollback:test'").get()!.n,0);
  await f.act('a',action,'loot:rollback:test');assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,1);
});

test('TR-119 encounter journal replays lost responses after reload and isolates other profiles and world actions',async()=>{
  const f=await fixture(Date.now()),values=new Map<string,string>(),env={DB:f.binding,TRAIL_ENV:'development'},storage={async getItem(k:string){return values.get(k)??null;},async setItem(k:string,v:string){values.set(k,v);},async removeItem(k:string){values.delete(k);}};let lose=true;
  const request=(owner:string)=>(async(input:RequestInfo|URL,init?:RequestInit)=>{const response=await trailApi(new Request('https://dev.example'+String(input),{...init,headers:{...init?.headers,'oai-authenticated-user-id':owner,origin:'https://dev.example'}}),env);if(lose&&String(input).endsWith('/encounter-actions')){lose=false;throw new Error('Lost response after commit');}return response;})as typeof fetch;
  const a=new SharedWorldClient(storage,request('a'),'development');await a.profile();await assert.rejects(()=>a.encounter({kind:'create',bossId:f.boss.id,members:[]}));assert.equal(await a.pendingEncounter(),true);assert.equal(await a.pending(),false);await assert.rejects(()=>a.dispatch({kind:'start',movement:'foot'},0),/pending action/);
  const b=new SharedWorldClient(storage,request('b'),'development');await b.profile();assert.equal(await b.pendingEncounter(),false);
  const reloaded=new SharedWorldClient(storage,request('a'),'development');await reloaded.profile();const result=await reloaded.retryEncounter();assert.equal(result.replayed,true);assert.equal(await reloaded.pendingEncounter(),false);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_encounters').get()!.n,1);
  assert.equal((await b.encounters()).encounters.length,0);assert.deepEqual((await b.partyPlayers('a')).players,[],'short searches cannot enumerate the directory');
  await assert.rejects(()=>reloaded.encounter({kind:'activate',encounterId:result.view!.encounter.id,revision:result.view!.revision}),/fresh accurate GPS/);assert.equal(await reloaded.pendingEncounter(),true,'preserve the envelope until the player explicitly resolves it');
  await reloaded.cancelPending('encounter');assert.equal(await reloaded.pendingEncounter(),false,'durable cancellation releases a rejected action without a retry loop');
});

test('TR-033/071 API requires identity, membership, own-origin writes and admin loot permissions',async()=>{
  const f=await fixture(Date.now()),env={DB:f.binding,TRAIL_ENV:'development'};
  const call=async(owner:string,path:string,method='GET',input?:unknown,origin='https://dev.example')=>{const response=await trailApi(new Request('https://dev.example/api/trail/'+path,{method,headers:{'oai-authenticated-user-id':owner,origin},...(input?{body:JSON.stringify(input)}:{})}),env);return{status:response.status,data:await response.json()};};
  assert.equal((await call('','encounters')).status,401);assert.equal((await call('a','admin/loot-rules')).status,403);
  assert.equal((await call('a','encounter-actions','POST',{id:'api:encounter:1',action:{kind:'create',bossId:f.boss.id,members:[]}},'https://evil.example')).status,403);
  assert.equal((await call('a','encounter-actions','POST',{id:'api:encounter:1',action:{kind:'contribute',encounterId:{},activityId:'missing'}})).status,400);
  const created=await call('a','encounter-actions','POST',{id:'api:encounter:1',action:{kind:'create',bossId:f.boss.id,members:[]}});assert.equal(created.status,200);
  assert.equal((await call('b','encounter?id='+created.data.view.encounter.id)).status,404);
  assert.equal((await call('b','activities')).data.activities.length,0);
  const simulation=await call('manager','admin/loot-simulation','POST',{tier:'Lesser',rules:LOOT_RULES,evidence:{progression:newProgression(),curveCoefficient:25,equivalentKm:20,targetKm:20,qualifiedPlayers:1}});assert.equal(simulation.status,200);assert.equal(simulation.data.writes,0);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,0);
  assert.equal((await call('manager','admin/loot-rules','PUT',{rules:{...LOOT_RULES,fellowshipXp:30},revision:LOOT_RULES.revision})).status,200);assert.equal((await call('manager','admin/loot-rules','PUT',{rules:LOOT_RULES,revision:LOOT_RULES.revision})).status,409);
});

test('TR-071/074/076/077/088 loot modifiers have diminishing returns, separate physical qualification and guaranteed base rewards',()=>{
  const progression=newProgression(),evidence={progression,curveCoefficient:25,equivalentKm:50,targetKm:50,qualifiedPlayers:1};
  const baseline=lootChances('Greater',evidence);assert.equal(baseline.gold,50);assert.equal(baseline.fellowshipXp,0);assert.ok(diminishingBonus(1000,.15)>.14);assert.ok(diminishingBonus(1000,.15)<.15);
  for(const key of Object.keys(progression.xp)as (keyof typeof progression.xp)[])progression.xp[key]=1000000000;
  const boosted=lootChances('Mythical',{...evidence,equivalentKm:500,targetKm:50,qualifiedPlayers:5});assert.ok(boosted.common>=.1-1e-12);assert.ok(boosted.rare+boosted.legendary+boosted.signature<=.9+1e-12);assert.equal(boosted.fellowshipXp,25);assert.ok(boosted.gold>=100);
  const boss={tier:'Greater',artifactType:'Rune',signature:'Warden Rune'}as Boss,signature=rollBossLoot(boss,evidence,LOOT_RULES,()=>0);assert.equal(signature.title,'Warden Rune');assert.equal(signature.rarity,'Legendary');assert.equal(signature.signature,true);
  const common=rollBossLoot(boss,evidence,LOOT_RULES,()=>.999);assert.equal(common.rarity,'Common');assert.ok(common.gold>=50);
});

test('TR-049 admin encounter cancellation preserves evidence, releases slots and cannot reverse victory or rerun a request',async()=>{
  const f=await fixture(),active=await f.activate(await f.create()),before=await loadWorld(f.binding,'a',f.clock.now),input={id:active.encounter.id,revision:active.revision,reason:'Local test cleanup',nonce:'admin:cancel:test'};
  const result=await cancelEncounter(f.binding,'manager',input,f.clock.now);assert.equal(result.encounter.state,'cancelled');assert.equal(result.members[0].active,false);assert.equal((await f.create()).encounter.state,'draft');
  assert.equal((await cancelEncounter(f.binding,'manager',input,f.clock.now)).replayed,true);await assert.rejects(()=>cancelEncounter(f.binding,'manager',{...input,reason:'A different request'},f.clock.now),/identity was reused/);
  const audit=f.sql.prepare("SELECT details FROM trail_audit WHERE action='encounter.admin-cancel'").get()!;assert.equal(JSON.parse(String(audit.details)).before.state,'active');assert.equal(JSON.parse(String(audit.details)).reason,input.reason);assert.deepEqual((await loadWorld(f.binding,'a',f.clock.now)).world,before.world,'cancellation changes neither wallet, inventory nor activity evidence');
  const solo=(await listEncounters(f.binding,'a',f.clock.now)).encounters.find(v=>v.encounter.state==='draft')!,next=await f.activate(solo),activity=await f.walk('a'),won=await f.act('a',{kind:'contribute',encounterId:next.encounter.id,revision:next.revision,activityId:activity});assert.equal(won.view!.encounter.state,'won');
  await assert.rejects(()=>cancelEncounter(f.binding,'manager',{id:next.encounter.id,revision:won.view!.revision,reason:'Cannot remove victory',nonce:'admin:cancel:won'},f.clock.now),/resolved encounter/);
});

test('TR-049 live encounter pages use stable keyset bounds and administration never leaks private XP',async()=>{
  const f=await fixture();for(let i=0;i<5;i++){const draft=await f.create();await cancelEncounter(f.binding,'manager',{id:draft.encounter.id,revision:draft.revision,reason:'Pagination fixture',nonce:'admin:page:'+i},f.clock.now);}
  const first=await queryEncounters(f.binding,new URLSearchParams({state:'cancelled',limit:'2'}));assert.equal(first.encounters.length,2);assert.ok(first.next);
  const second=await queryEncounters(f.binding,new URLSearchParams({state:'cancelled',limit:'2',after:first.next}));assert.equal(second.encounters.length,2);assert.equal(new Set([...first.encounters,...second.encounters].map(e=>e.id)).size,4);
  const third=await queryEncounters(f.binding,new URLSearchParams({state:'cancelled',limit:'2',after:second.next!}));assert.equal(third.encounters.length,1);assert.equal(third.next,null);
  await assert.rejects(()=>queryEncounters(f.binding,new URLSearchParams({after:'invalid'})),/Invalid encounter page/);
  const active=await f.activate(await f.create()),activity=await f.walk('a'),won=await f.act('a',{kind:'contribute',encounterId:active.encounter.id,revision:active.revision,activityId:activity});assert.ok(won.view!.encounter.contributions.a.progression);
  const inspected=await inspectEncounter(f.binding,active.encounter.id,f.clock.now);assert.equal(inspected.encounter.contributions.a.progression,undefined);assert.equal(inspected.encounter.contributions.a.curveCoefficient,undefined);
  const originalBatch=f.db.batch,draft=await f.create('b');let raced=false;f.db.batch=async statements=>{if(!raced){raced=true;f.sql.prepare('UPDATE trail_encounters SET revision=revision+1 WHERE id=?').run(draft.encounter.id);}return originalBatch(statements);};
  await assert.rejects(()=>cancelEncounter(f.binding,'manager',{id:draft.encounter.id,revision:draft.revision,reason:'Race cannot partly cancel',nonce:'admin:cancel:race'},f.clock.now),/Encounter changed/);assert.equal((await inspectEncounter(f.binding,draft.encounter.id,f.clock.now)).encounter.state,'draft');assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE id LIKE '%admin:cancel:race'").get()!.n,0);
});

test('TR-032/049 admin encounter APIs reject ordinary players and foreign origins',async()=>{
  const f=await fixture(Date.now()),env={DB:f.binding,TRAIL_ENV:'development'},draft=await f.create();
  const call=async(owner:string,path:string,body?:unknown,origin='https://dev.example')=>trailApi(new Request('https://dev.example/api/trail/admin/'+path,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':owner,origin},...(body?{body:JSON.stringify(body)}:{})}),env);
  assert.equal((await call('a','encounters')).status,403);assert.equal((await call('a','encounter?id='+draft.encounter.id)).status,403);
  const input={id:draft.encounter.id,revision:draft.revision,reason:'API cleanup test',nonce:'admin:api:cancel'};assert.equal((await call('a','encounter-cancel',input)).status,403);assert.equal((await call('manager','encounter-cancel',input,'https://evil.example')).status,403);
  assert.equal((await call('manager','encounters')).status,200);assert.equal((await call('manager','encounter-cancel',input)).status,200);
});
