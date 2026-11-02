import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {BOT_PLAYERS,readBots,stepBot,botRouteSamples,simulateBotJourney,botBossBenchmarks} from '../../dev-server/trail/bot-lab';
import {newDevWorld,DEV_BALANCE} from '../src/game/dev-world';
import {SPAWN_RULES} from '../src/game/world-spawns';
import {WORLD_REGIONS} from '../src/game/world-regions';
import {LANDMARKS} from '../src/game/landmarks';
import {groundDistance} from '../src/map/geodesy';
import {trailApi} from '../../dev-server/trail/api';
import {PROD_SCOPE} from '../../dev-server/trail/service-scope';
import {ROUTE_ASSET_PATH} from '../../dev-server/trail/route-assets';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {database} from './sqlite-world';
const now=Date.now(),a=LANDMARKS.find(p=>p.landmarkId==='sippula-trail')!,point={latitude:a.latitude!,longitude:a.longitude!},points=[point,{latitude:point.latitude+.006,longitude:point.longitude}];
const assets={async fetch(request:Request){const path=new URL(request.url).pathname.slice(ROUTE_ASSET_PATH.length).replace(/\.bin$/,'.json.gz');assert.match(path,/^(manifest\.json|\d+_\d+\.json\.gz)$/);const file=new URL('fixtures/route-runtime/'+path,import.meta.url);return existsSync(file)?new Response(new Uint8Array(readFileSync(file))):new Response(null,{status:404});}};
test('five named bot profiles are isolated, fixed and reading the lab writes nothing',async()=>{
  const f=database(),before=await exportDevSnapshot(f.db as never,now),lab=await readBots(f.db as never);
  assert.equal(lab.bots.length,5);assert.equal(new Set(lab.bots.map(b=>b.id)).size,5);assert.ok(lab.bots.every(b=>b.name.startsWith('BOT · ')&&b.rounds===0));assert.equal(lab.teamBosses,null);assert.equal(lab.realPlayerWrites,0);assert.equal((await exportDevSnapshot(f.db as never,now)).digest,before.digest);f.sql.close();
});
test('bot route sampling preserves mapped bends, spacing and explicit limits',()=>{
  const bend={latitude:point.latitude+.003,longitude:point.longitude},end={latitude:bend.latitude,longitude:bend.longitude+.006},sampled=botRouteSamples([point,bend,end]);assert.equal(sampled.truncated,false);assert.deepEqual(sampled.samples.at(-1),end);
  assert.ok(sampled.samples.every((p,i)=>!i||groundDistance(sampled.samples[i-1],p)<=12.001));assert.ok(sampled.samples.every(p=>p.longitude===point.longitude||p.latitude===bend.latitude));assert.equal(botRouteSamples([point,end],3).samples.length,3);assert.equal(botRouteSamples([point,end],3).truncated,true);
});
test('bot journey uses actual reducer gold, collection and XP without mutating input; revisits cannot gain new-tile gold',()=>{
  const original=newDevWorld(),before=JSON.stringify(original),run=()=>simulateBotJourney(original,BOT_PLAYERS[1],points,1,now,DEV_BALANCE,SPAWN_RULES,WORLD_REGIONS),first=run(),repeat=run();
  assert.equal(JSON.stringify(original),before);assert.deepEqual(first.report,repeat.report);assert.equal(first.report.rejected,0);assert.ok(first.report.walkedMeters>500);assert.equal(first.report.gold,first.report.newTiles+Math.floor(first.report.walkedMeters/250));assert.equal(first.report.attempts,first.report.finds+first.report.misses);assert.ok(first.report.xp.endurance>0);assert.equal(first.report.bosses?.length,4);
  const next=simulateBotJourney(first.world,BOT_PLAYERS[1],points,2,now,DEV_BALANCE,SPAWN_RULES,WORLD_REGIONS);assert.equal(next.report.newTiles,0);assert.equal(next.world.game.collection.length,new Set(next.world.game.collection.map(r=>r.id)).size);assert.equal(next.world.game.adventure?.status,'stopped');assert.equal(next.world.game.path.length,0);
});
test('boss benchmarks retain tier/party requirements and do not invent victory or qualification',()=>{
  const solo=botBossBenchmarks([{id:'one',meters:5000,tiles:3}]);assert.equal(solo[0].victory,false);assert.equal(solo[0].players[0].qualified,true);assert.equal(solo[3].players[0].qualified,false);
  const team=botBossBenchmarks(BOT_PLAYERS.map(p=>({id:p.id,meters:5000,tiles:3})));assert.equal(team[0].victory,true);assert.equal(team[0].worldWrites,0);assert.equal(team[3].victory,false);assert.ok(team.every(b=>b.players.length===5));
});
test('bot mapped journeys persist only their isolated lab, including exact old retries and snapshot coverage',async()=>{
  const f=database(),db=f.db as never,before=await exportDevSnapshot(db,now),one=await stepBot(db,assets,'admin',{id:'fixture-action-one',bot:'bot-rantalantie',revision:0},now);
  assert.equal(one.revision,1);const bot=one.bots.find(b=>b.id==='bot-rantalantie')!;assert.equal(bot.reports[0].status,'completed');assert.ok(bot.reports[0].walkedMeters>700);assert.equal(bot.reports[0].rejected,0);
  await stepBot(db,assets,'admin',{id:'fixture-action-two',bot:'bot-rantalantie',revision:1},now);const replay=await stepBot(db,assets,'admin',{id:'fixture-action-one',bot:'bot-rantalantie',revision:0},now);assert.equal(replay.replayed,true);assert.equal(replay.revision,2);assert.equal(replay.bots.find(b=>b.id==='bot-rantalantie')!.rounds,2);
  await assert.rejects(stepBot(db,assets,'admin',{id:'fixture-stale-id',bot:'bot-rantalantie',revision:0},now),/changed/);const after=await exportDevSnapshot(db,now);for(const table of Object.keys(before.tables)as(keyof typeof before.tables)[])if(table!=='trail_configs'&&table!=='trail_integrity')assert.deepEqual(after.tables[table],before.tables[table]);assert.ok(after.tables.trail_configs.some(r=>r.id==='bot-lab-v1'));f.sql.close();
});
test('unavailable bot routes remain failures with zero effort; failed storage preserves the lab',async()=>{
  const f=database(),db=f.db as never,result=await stepBot(db,undefined,'admin',{id:'fixture-unavailable',bot:'bot-haukkala',revision:0},now),report=result.bots[0].reports[0];assert.equal(report.status,'unavailable');assert.equal(report.walkedMeters,0);assert.equal(report.gold,0);assert.equal(report.bosses,undefined);
  const before=await exportDevSnapshot(db,now),failing={...f.db,async batch(){throw new Error('Synthetic write failure');}};await assert.rejects(stepBot(failing as never,undefined,'admin',{id:'fixture-failed-store',bot:'bot-sippula',revision:1},now),/changed while running/);assert.equal((await exportDevSnapshot(db,now)).digest,before.digest);f.sql.close();
});
test('bot API is dev/admin/same-origin only and respects paused maintenance',async()=>{
  const f=database(),db=f.db as never;for(const role of ['admin','player'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(role,role,role,now);
  const call=(owner:string,origin='https://dev.invalid',env:Record<string,unknown>={})=>trailApi(new Request('https://dev.invalid/api/trail/admin/bots',{method:'POST',headers:{'oai-authenticated-user-id':owner,origin,'Content-Type':'application/json'},body:JSON.stringify({id:'fixture-api-action',bot:'bot-sippula',revision:0})}),{DB:db,TRAIL_ENV:'development',...env});
  assert.equal((await call('player')).status,403);assert.equal((await call('admin','https://evil.invalid')).status,403);assert.equal((await call('admin',undefined,{TRAIL_ENV:'production',TRAIL_PROJECT_ID:PROD_SCOPE.projectId})).status,404);assert.equal((await call('admin')).status,200);
  f.sql.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('maintenance',1,?,'admin',?)").run(JSON.stringify({revision:1,paused:true,reason:'planned-update',changedAt:now}),now);assert.equal((await call('admin')).status,503);f.sql.close();
});
