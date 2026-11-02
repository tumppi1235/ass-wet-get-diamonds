import type {D1Database} from '@cloudflare/workers-types';
import {newDevWorld,reduceDevEvent,type DevWorld,type DevBalance} from '../../mobile/src/game/dev-world';
import G from '../../mobile/src/game/engine';
import {LANDMARKS,captureTarget} from '../../mobile/src/game/landmarks';
import {groundDistance,type Geographic} from '../../mobile/src/map/geodesy';
import {generateWorldSpawn,firstVisitSpawn,spawnRelic,seededFraction,type SpawnRules} from '../../mobile/src/game/world-spawns';
import {rulesForPlace,type WorldRegions} from '../../mobile/src/game/world-regions';
import {DIVERSITY_RULES} from '../../mobile/src/game/diversity';
import {adventureRoute} from './route-store';
import {ROUTE_CHECK_CASES} from './route-check-cases';
import {loadBalance} from './balance-store';
import {loadSpawnRules} from './spawn-store';
import {loadRegions} from './region-store';
import {WorldError} from './world-error';
import type {RouteAssets} from './route-assets';
import {BOSS_TIERS,BOSS_RULES,simulateEncounter,type BossRules} from '../../mobile/src/game/bosses';
import {LOOT_RULES,lootChances,type LootRules} from '../../mobile/src/game/loot';
import {loadBossRules} from './boss-store';
import {loadLootRules} from './loot-store';

export const BOT_PLAYERS=[
  {id:'bot-haukkala',name:'BOT · Haukkala Hiker',route:'haukkala',weather:'clear'},
  {id:'bot-sippula',name:'BOT · Sippula Scout',route:'sippulanniemi',weather:'rain'},
  {id:'bot-rantalantie',name:'BOT · Rantalantie Rambler',route:'rantalantie',weather:'cold'},
  {id:'bot-helsinki',name:'BOT · Helsinki Explorer',route:'helsinki',weather:'clear'},
  {id:'bot-cross-city',name:'BOT · City Trail Seeker',route:'cross-city',weather:'snow'},
]as const;
type Definition=typeof BOT_PLAYERS[number];
export type BotReport={bosses?:(ReturnType<typeof botBossBenchmarks>[number]&{loot?:ReturnType<typeof lootChances>;rewardEligible?:boolean})[];round:number;at:number;status:'completed'|'sample-limit'|'unavailable';reason?:string;routeMeters:number;samples:number;accepted:number;rejected:number;walkedMeters:number;gold:number;newTiles:number;attempts:number;finds:number;misses:number;xp:Record<string,number>;balanceRevision:string;spawnRevision:string;regionsRevision:string};
type Bot={id:string;world:DevWorld;rounds:number;actions:string[];reports:BotReport[]};
type Row={revision:number;document:string};
const KEY='bot-lab-v1';
/** Hypothetical benchmark arena: roster/visit consent is assumed, not recorded. */
export function botBossBenchmarks(players:{id:string;meters:number;tiles:number}[],bossRules=BOSS_RULES){
  return BOSS_TIERS.map(tier=>({tier,...simulateEncounter(tier,players.length,players.map(p=>({owner:p.id,activityId:'simulation-'+p.id,meters:p.meters,uniqueTiles:p.tiles,movement:'foot',bossTileVisited:true,activityStartedAt:0,activityEndedAt:Math.ceil(p.meters/1.4*1000)})),{weakness:'foot',weaknessBonus:0,objectives:{uniqueTiles:0}},bossRules)}));
}
/** Interpolates only consecutive mapped geometry; never connects separate routes. */
export function botRouteSamples(points:Geographic[],limit=600){
  const samples:Geographic[]=[];if(!points.length)return{samples,truncated:false};samples.push({...points[0]});
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(groundDistance(a,b)/12));
    for(let k=1;k<=n;k++){if(samples.length>=limit)return{samples,truncated:true};const f=k/n;samples.push({latitude:a.latitude+(b.latitude-a.latitude)*f,longitude:a.longitude+(b.longitude-a.longitude)*f});}
  }return{samples,truncated:false};
}
export function simulateBotJourney(original:DevWorld,definition:Definition,points:Geographic[],round:number,at:number,balance:DevBalance,rules:SpawnRules,regions:WorldRegions,bossRules:BossRules=BOSS_RULES,lootRules:LootRules=LOOT_RULES){
  let world=JSON.parse(JSON.stringify(original))as DevWorld;
  // Only bounded bot state is retained. Player route/history tables are never used.
  world.game.path=[];world.game.revealed={};world.game.weather=definition.weather;
  let clock=Math.max(at,(world.game.lastGpsTimestamp||0)+1000),sequence=0;
  const apply=(event:Parameters<typeof reduceDevEvent>[1])=>{const result=reduceDevEvent(world,event,clock,balance,()=>seededFraction(`${definition.id}:${round}:${sequence++}`),undefined,{rules:DIVERSITY_RULES,regions});world=result.world;return result.receipt;};
  const before={gold:world.game.gold,tiles:Object.keys(world.game.visits).length,meters:world.game.meters};
  apply({kind:'start',movement:'foot'});
  const sampled=botRouteSamples(points),report:BotReport={round,at,status:sampled.truncated?'sample-limit':'completed',routeMeters:points.reduce((m,p,i)=>m+(i?groundDistance(points[i-1],p):0),0),samples:sampled.samples.length,accepted:0,rejected:0,walkedMeters:0,gold:0,newTiles:0,attempts:0,finds:0,misses:0,xp:{},balanceRevision:balance.revision,spawnRevision:rules.revision,regionsRevision:regions.revision};
  const candidates=LANDMARKS.filter(p=>p.latitude!=null&&p.longitude!=null&&sampled.samples.some((s,i)=>i%10===0&&Math.abs(s.latitude-p.latitude!)<.004&&Math.abs(s.longitude-p.longitude!)<.008)).slice(0,100);
  const spawns=candidates.flatMap(place=>{const active=rulesForPlace(place,at,rules,regions);if(!active)return[];const personal=firstVisitSpawn(place,definition.id,at,active);return[generateWorldSpawn(place,at,active),...(personal?[personal]:[])].map(spawn=>({spawn,label:place.landmark}));});
  const collectAwards=(awards:Record<string,number>)=>{for(const[k,v]of Object.entries(awards))report.xp[k]=(report.xp[k]||0)+v;};
  for(let i=0;i<sampled.samples.length;i++){
    const point=sampled.samples[i];if(i)clock+=Math.max(1000,Math.ceil(groundDistance(sampled.samples[i-1],point)/1.4*1000));
    const receipt=apply({kind:'gps',fix:{...point,timestamp:clock,accuracy:5,speed:1.4}});collectAwards(receipt.awards);
    if(!receipt.accepted){report.rejected++;continue;}report.accepted++;report.walkedMeters+=receipt.activity?.meters||0;
    const xy=G.xy(point.latitude,point.longitude);
    for(const {spawn,label}of spawns)if(spawn.tileId===receipt.tile)world.game.revealed[spawn.id]=spawnRelic(spawn,label);
    for(let n=0;n<20&&captureTarget(world.game,xy);n++){
      const r=apply({kind:'capture'});if(!r.accepted)break;report.attempts++;collectAwards(r.awards);if(r.collected)report.finds++;else report.misses++;
    }
  }
  collectAwards(apply({kind:'stop'}).awards);report.gold=world.game.gold-before.gold;report.newTiles=Object.keys(world.game.visits).length-before.tiles;
  if(report.accepted)report.bosses=botBossBenchmarks([{id:definition.id,meters:report.walkedMeters,tiles:report.newTiles}],bossRules).map(b=>({...b,loot:lootChances(b.tier,{progression:world.game.progression!,curveCoefficient:balance.curveCoefficient,equivalentKm:report.walkedMeters/1000,targetKm:b.requirement.targetKmPerPerson,qualifiedPlayers:1},lootRules),rewardEligible:b.victory&&b.players[0].qualified}));
  // The authoritative reducer already retains achievement/visit evidence; trails
  // and revealed scenery are disposable in this isolated lab, not player saves.
  world.game.path=[];world.game.revealed={};return{world,report};
}
function initial(){return BOT_PLAYERS.map(p=>({id:p.id,world:newDevWorld(),rounds:0,actions:[],reports:[]}as Bot));}
async function load(db:D1Database){const row=await db.prepare('SELECT revision,document FROM trail_configs WHERE id=?').bind(KEY).first<Row>();return{revision:row?.revision||0,bots:row?JSON.parse(row.document)as Bot[]:initial()};}
function view(state:Awaited<ReturnType<typeof load>>,bossRules=BOSS_RULES){const latest=state.bots.map(b=>({id:b.id,report:b.reports.at(-1)})),ready=latest.every(p=>p.report&&p.report.accepted>0);return{simulation:true,replayed:false,realPlayerWrites:0,revision:state.revision,teamBosses:ready?botBossBenchmarks(latest.map(p=>({id:p.id,meters:p.report!.walkedMeters,tiles:p.report!.newTiles})),bossRules):null,bots:state.bots.map(bot=>({...BOT_PLAYERS.find(p=>p.id===bot.id)!,rounds:bot.rounds,gold:bot.world.game.gold,tiles:Object.keys(bot.world.game.visits).length,finds:bot.world.game.collection.length,reports:bot.reports})),limits:{fixesPerJourney:600,reportsPerBot:20,roundsPerBot:20,catalogCandidates:100},execution:'Only runs while an administrator explicitly starts a batch; browser auto-run stops when closed.'};}
export async function readBots(db:D1Database){return view(await load(db),await loadBossRules(db));}
export async function stepBot(db:D1Database,assets:RouteAssets|undefined,actor:string,input:{id?:unknown;bot?:unknown;revision?:unknown},now=Date.now()){
  if(!input||Object.keys(input).some(k=>!['id','bot','revision'].includes(k))||typeof input.id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(input.id)||!Number.isSafeInteger(input.revision))throw new WorldError(400,'Choose a bot and current lab revision');
  const def=BOT_PLAYERS.find(p=>p.id===input.bot);if(!def)throw new WorldError(400,'Choose one of the five test bots');
  const state=await load(db),bot=state.bots.find(p=>p.id===def.id)!;if(bot.actions.includes(input.id))return{...view(state,await loadBossRules(db)),replayed:true};
  if(state.revision!==input.revision)throw new WorldError(409,'Bot lab changed; reload before running');if(bot.rounds>=20)throw new WorldError(409,'This bot has reached its 20-round test budget');
  if(Object.keys(bot.world.game.visits).length>1000||bot.world.game.collection.length>1000)throw new WorldError(409,'Bot state reached its bounded test budget');
  const chosen=ROUTE_CHECK_CASES.find(c=>c.id===def.route)!,[balance,rules,regions,bossRules,lootRules]=await Promise.all([loadBalance(db),loadSpawnRules(db),loadRegions(db),loadBossRules(db),loadLootRules(db)]);
  const plan=await adventureRoute(db,assets,'isolated-'+def.id,{from:chosen.from,to:chosen.to,movement:'foot',access:'known-paths',maxMeters:15000},now);
  if(plan.result.status==='ready'){
    const result=simulateBotJourney(bot.world,def,plan.result.points,bot.rounds+1,now,balance.balance,rules,regions,bossRules,lootRules);bot.world=result.world;bot.reports.push(result.report);
  }else bot.reports.push({round:bot.rounds+1,at:now,status:'unavailable',reason:plan.result.reason,routeMeters:0,samples:0,accepted:0,rejected:0,walkedMeters:0,gold:0,newTiles:0,attempts:0,finds:0,misses:0,xp:{},balanceRevision:balance.balance.revision,spawnRevision:rules.revision,regionsRevision:regions.revision});
  bot.rounds++;bot.actions.push(input.id);bot.reports=bot.reports.slice(-20);const document=JSON.stringify(state.bots);if(document.length>200000)throw new WorldError(409,'Bot lab storage budget reached');
  try{await db.batch([
    db.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE trail_configs.revision=?').bind(KEY,state.revision+1,document,actor,now,state.revision),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('bot-lab-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
  ]);}catch{throw new WorldError(409,'Bot lab changed while running; reload and retry');}
  state.revision++;return view(state,bossRules);
}
