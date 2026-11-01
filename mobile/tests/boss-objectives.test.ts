import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {BOSS_RULES,simulateEncounter} from '../src/game/bosses';
import {validateBossObjectives,explorationObjective} from '../src/game/boss-objectives';
import {placeBoss,saveBossRules} from '../../dev-server/trail/boss-store';
import {applyWorldEvent,loadWorld} from '../../dev-server/trail/world-store';
import {applyEncounterAction} from '../../dev-server/trail/encounter-store';
import {summarizeActivity} from '../../dev-server/trail/activity-store';
import type {EncounterAction} from '../src/game/encounters';
import G from '../src/game/engine';
import {contributionForecast} from '../src/game/boss-field';

test('TR-137/138 exploration is optional for legacy bosses, validated and cannot be replaced by distance or bonuses',()=>{
  assert.equal(validateBossObjectives(undefined),undefined);
  for(const value of [null,{},[],{uniqueTiles:-1},{uniqueTiles:1.5},{uniqueTiles:201},{uniqueTiles:'2'},{uniqueTiles:2,elevation:10}])assert.throws(()=>validateBossObjectives(value));
  const input={uniqueTiles:2},copy=validateBossObjectives(input)!;copy.uniqueTiles=3;assert.equal(input.uniqueTiles,2);
  assert.equal(explorationObjective({},undefined).met,true);
  for(const count of [undefined,NaN,-1,1,1.5])assert.equal(explorationObjective({objectives:{uniqueTiles:2}},count).met,false);
  const activity={owner:'a',activityId:'activity:1',meters:100000,movement:'foot' as const,bossTileVisited:true,activityStartedAt:0,activityEndedAt:1000};
  assert.equal(simulateEncounter('Lesser',1,[activity],{weakness:'foot',weaknessBonus:1}).victory,true);
  assert.equal(simulateEncounter('Lesser',1,[activity],{weakness:'foot',weaknessBonus:1,objectives:{uniqueTiles:2}}).victory,false);
  assert.equal(simulateEncounter('Lesser',1,[{...activity,uniqueTiles:2}],{weakness:'foot',weaknessBonus:1,objectives:{uniqueTiles:2}}).victory,true);
  const party=simulateEncounter('Lesser',2,[{...activity,uniqueTiles:1},{...activity,owner:'b',activityId:'activity:2',uniqueTiles:2}],{weakness:'foot',weaknessBonus:1,objectives:{uniqueTiles:2}});
  assert.equal(party.victory,true);assert.deepEqual(party.players.map(p=>p.qualified),[false,true]);
});

async function setup(required:number){
  const {db,sql}=database(),binding=db as never;let now=1000000,sequence=0;
  sql.prepare("INSERT INTO trail_members(id,display_name,role,created_at) VALUES('a','A','admin',?)").run(now);
  await saveBossRules(binding,'a',{...BOSS_RULES,targets:{...BOSS_RULES.targets,Lesser:[.1,.1,.1,.1,.1]}},BOSS_RULES.revision);
  const input={designId:'metsanvartija',tier:'Lesser' as const,placeId:'haukkala-gate',startsAt:now-1000,endsAt:now+86400000,weaknessBonus:0,objectives:{uniqueTiles:required}};
  const boss=(await placeBoss(binding,'a',input,now)).boss;
  const [i,j]=boss.tileId.split(',').map(Number),point={x:i*250+125,y:j*250+125};
  const world=async(event:Parameters<typeof applyWorldEvent>[4])=>{now+=5000;return applyWorldEvent(binding,'a','world:objective:'+ ++sequence,(await loadWorld(binding,'a',now)).revision,event,now);};
  const gps=async(x:number,accuracy=5)=>{const geo=G.geo(point.x+x,point.y);return world({kind:'gps',fix:{latitude:geo.lat,longitude:geo.lon,accuracy,timestamp:now+5000,speed:1}});};
  const act=(action:EncounterAction,id='encounter:objective:'+ ++sequence)=>applyEncounterAction(binding,'a',id,action,now);
  await gps(0);const draft=(await act({kind:'create',bossId:boss.id,members:[]})).view!;
  const active=(await act({kind:'activate',encounterId:draft.encounter.id,revision:draft.revision})).view!;
  const walk=async(far:boolean)=>{const started=await world({kind:'start',movement:'foot'});await gps(0);for(let x=20;x<=120;x+=20)await gps(x);if(far)for(let x=120;x<=300;x+=20)await gps(x);await gps(1000,500);await gps(far?300:120);await world({kind:'stop'});return{id:started.receipt.activity!.id};};
  return{sql,binding,boss,input,active,world,gps,act,walk,now:()=>now};
}

test('TR-137 server activity tiles are distinct, post-activation, same-activity and exclude invalid GPS/other histories',async()=>{
  const f=await setup(2),activity=await f.walk(true);
  const summary=await summarizeActivity(f.binding,'a',activity.id,f.boss.tileId,f.active.encounter.startedAt!,f.active.encounter.deadline!,f.now());
  assert.equal(summary.uniqueTiles,2);assert.equal(summary.bossTileVisited,true);
  assert.ok(summary.meters>=290&&summary.meters<310);
  const count=f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n;
  await summarizeActivity(f.binding,'a',activity.id,f.boss.tileId,f.active.encounter.startedAt!,f.active.encounter.deadline!,f.now());
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,count,'preview creates no activity receipts');
  const late=await summarizeActivity(f.binding,'a',activity.id,f.boss.tileId,summary.endedAt-5000,f.active.encounter.deadline!,f.now());
  assert.equal(late.uniqueTiles,1,'only the final in-window tile counts');assert.equal(late.bossTileVisited,false,'the earlier boss tile cannot leak into a later window');
});

test('TR-137 qualifying exploration wins once; snapshotted objectives and authoritative loot eligibility survive replay',async()=>{
  const f=await setup(2),activity=await f.walk(true);
  f.input.objectives.uniqueTiles=200;assert.equal(f.boss.objectives!.uniqueTiles,2);
  const summary=await summarizeActivity(f.binding,'a',activity.id,f.boss.tileId,f.active.encounter.startedAt!,f.active.encounter.deadline!,f.now());
  assert.equal(contributionForecast(f.active.encounter,'a',summary).qualified,true);
  assert.equal(contributionForecast(f.active.encounter,'a',{...summary,uniqueTiles:undefined}).qualified,false,'missing preview evidence is not assumed');
  const action={kind:'contribute' as const,encounterId:f.active.encounter.id,revision:f.active.revision,activityId:activity.id};
  const won=await f.act(action,'objective:submission:1');assert.equal(won.view!.encounter.state,'won');assert.equal(won.view!.encounter.contributions.a.uniqueTiles,2);assert.equal(won.view!.encounter.contributions.a.qualified,true);
  assert.equal((await f.act(action,'objective:submission:1')).replayed,true);
  const claim={kind:'claim-loot' as const,encounterId:f.active.encounter.id,revision:won.view!.revision};
  await f.act(claim,'objective:loot:1');await f.act(claim,'objective:loot:1');
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,1);
});

test('TR-137 excess distance/zero HP with insufficient exploration fails and cannot award loot',async()=>{
  const f=await setup(2),activity=await f.walk(false);
  const result=await f.act({kind:'contribute',encounterId:f.active.encounter.id,revision:f.active.revision,activityId:activity.id});
  const e=result.view!.encounter;assert.equal(e.contributions.a.uniqueTiles,1);assert.equal(e.contributions.a.qualified,false);assert.equal(e.remainingHp,0);assert.equal(e.state,'failed');
  await assert.rejects(()=>f.act({kind:'claim-loot',encounterId:e.id,revision:result.view!.revision}),/qualifying contribution/);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,0);
});
