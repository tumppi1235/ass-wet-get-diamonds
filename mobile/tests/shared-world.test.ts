import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {newDevWorld,reduceDevEvent,type DevEvent,DEV_BALANCE} from '../src/game/dev-world';
import G from '../src/game/engine';
import {trailApi} from '../../dev-server/trail/api';
import {SharedWorldClient} from '../src/accounts/shared-world';
import {LANDMARKS,captureTarget} from '../src/game/landmarks';
import {generateWorldSpawn,firstVisitSpawn,SPAWN_RULES,weightedRarity,detectionMeters} from '../src/game/world-spawns';
import {hydrateSpawns,querySpawns,nearbyBounds,removeSpawn,placeSpawn} from '../../dev-server/trail/spawn-store';
import {applyWorldEvent} from '../../dev-server/trail/world-store';
import {spawnVisibleTo} from '../src/game/spawns';
import {relicData} from '../src/map/vector-data';
import {RawLocationSession} from '../src/location/raw-session';
import {editPlayer} from '../../dev-server/trail/player-admin';
import {emergingArchetype} from '../src/game/archetypes';
import {estimateProgression,simulateHistory,scenarioHistory,PROGRESSION_SCENARIOS} from '../src/game/reward-rates';
import {levelProgress} from '../src/game/progression';
import {WORLD_REGIONS,rulesForPlace,blockedAt,validateRegions,type WorldRegion} from '../src/game/world-regions';
import {loadRegions,saveRegions,queryDensity} from '../../dev-server/trail/region-store';

test('TR-006/007/029 region terrain/weather/time modifiers are deterministic, capped, versioned and block restricted placements',()=>{
  const place=LANDMARKS[0],at=Date.UTC(2026,0,10,0),region:WorldRegion={id:'test-forest',name:'Test forest',south:place.latitude!-.01,north:place.latitude!+.01,west:place.longitude!-.01,east:place.longitude!+.01,terrain:'woodland',weather:'rain',blocked:false,startsAt:at-1000,endsAt:at+3600000,rarityFactor:2};
  const config={...WORLD_REGIONS,revision:'regions-test-2',regions:[region],winterFactor:2,nightFactor:2,rainFactor:2,woodlandFactor:2};
  const adjusted=rulesForPlace(place,at,SPAWN_RULES,config)!;assert.equal(adjusted.weights.Rare,SPAWN_RULES.weights.Rare*10,'combined modifier is capped');assert.deepEqual(adjusted,rulesForPlace(place,at,SPAWN_RULES,config));
  assert.notEqual(generateWorldSpawn(place,at,adjusted).id,generateWorldSpawn(place,at,SPAWN_RULES).id);
  assert.notEqual(rulesForPlace(place,at,SPAWN_RULES,config)!.context,rulesForPlace(place,region.endsAt,SPAWN_RULES,config)!.context,'event phases cannot give the same identity different weights');
  const restricted={...config,regions:[{...region,blocked:true}]};assert.equal(rulesForPlace(place,at,SPAWN_RULES,restricted),null);assert.equal(blockedAt({latitude:place.latitude!,longitude:place.longitude!},at,restricted),true);
  assert.equal(blockedAt({latitude:place.latitude!,longitude:place.longitude!},region.endsAt,restricted),false);
  assert.throws(()=>validateRegions({...config,regions:[region,region]}),/unique/);assert.throws(()=>validateRegions({...config,winterFactor:100}),/0.1 and 5/);
});

test('TR-029/030/042 shared regions are protected and blocked areas invalidate collection; density uses unique indexed cells',async()=>{
  const{db,sql}=database(),binding=db as never,now=Date.now(),place=LANDMARKS[0];
  for(const owner of ['one','two']){
    sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(owner,owner,'player',now);
    await applyWorldEvent(binding,owner,owner+':region:gps',0,{kind:'gps',fix:{latitude:place.latitude!,longitude:place.longitude!,timestamp:now,accuracy:5,speed:0}},now);
  }
  const bounds=nearbyBounds(place.latitude!,place.longitude!),counts=await queryDensity(binding,bounds);assert.equal(counts.density.find(r=>r.tile===place.id)!.players,2);assert.equal((await queryDensity(binding,bounds,'one')).density.find(r=>r.tile===place.id)!.players,1);assert.equal(counts.geojson.features[0].geometry.type,'Polygon');
  const region:WorldRegion={id:'closed-path',name:'Restricted test path',...bounds,terrain:'trail',weather:'clear',blocked:true,rarityFactor:1,startsAt:now-1000,endsAt:now+86400000};
  const saved=await saveRegions(binding,'admin',{...WORLD_REGIONS,regions:[region]},WORLD_REGIONS.revision);assert.notEqual(saved.configuration.revision,WORLD_REGIONS.revision);assert.equal((await loadRegions(binding)).regions[0].name,region.name);
  await assert.rejects(()=>saveRegions(binding,'admin',WORLD_REGIONS,WORLD_REGIONS.revision),/changed/);
  const before=sql.prepare('SELECT state FROM trail_players WHERE id=?').get('one')!.state as string,world=JSON.parse(before);await hydrateSpawns(binding,'one',world,now);assert.equal(Object.keys(world.game.revealed).length,0);
  const attempt=await applyWorldEvent(binding,'one','blocked:capture:1',1,{kind:'capture'},now);assert.equal(attempt.receipt.accepted,false);assert.equal(attempt.world.game.collection.length,0);
  await assert.rejects(()=>placeSpawn(binding,'admin',{...generateWorldSpawn(place,now),id:'manual:blocked-test',createdAt:now,expiresAt:now+100000},now),/blocked for placement/);
  const response=await trailApi(new Request('https://dev.example/api/trail/admin/regions',{headers:{'oai-authenticated-user-id':'one'}}),{DB:binding,TRAIL_ENV:'development'});assert.equal(response.status,403);
  assert.ok(sql.prepare('EXPLAIN QUERY PLAN SELECT tile FROM trail_visits WHERE cell_i>=? AND cell_i<=? AND cell_j>=? AND cell_j<=?').all(-20,20,0,30).some(r=>String(r.detail).includes('visit_bounds')));
});

test('TR-006 region changes racing a capture roll back its inventory, receipt and claim ledger atomically',async()=>{
  const{db,sql}=database(),binding=db as never,place=LANDMARKS[0],now=Date.now();sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('race','Race','player',now);
  const world=newDevWorld(),p=G.xy(place.latitude!,place.longitude!);world.previous={...p,latitude:place.latitude!,longitude:place.longitude!,timestamp:now,accuracy:5,inside:true,precise:true};world.latestGpsValid=true;world.game.x=p.x;world.game.y=p.y;world.game.energy=100000;await hydrateSpawns(binding,'race',world,now);
  sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,0,?)').run('race',JSON.stringify(world),now);
  const batch=db.batch.bind(db),rng=mock.method(globalThis.crypto,'getRandomValues',(values:Uint32Array)=>{values.fill(0);return values;});let changed=false;
  db.batch=async statements=>{if(!changed){changed=true;sql.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,1,?,?,?)').run('world-regions',JSON.stringify({...WORLD_REGIONS,revision:'regions-racing-change'}),'admin',now);}return batch(statements);};
  try{await assert.rejects(()=>applyWorldEvent(binding,'race','capture:region:race',0,{kind:'capture'},now),/changed during/);}finally{rng.mock.restore();}
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_spawn_claims').get()!.n,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,0);assert.equal(JSON.parse(String(sql.prepare('SELECT state FROM trail_players WHERE id=?').get('race')!.state)).game.collection.length,0);
});

test('TR-030 geographic index migration backfills existing tile IDs without losing visitor history',()=>{
  const sql=new DatabaseSync(':memory:'),folder=new URL('../../dev-server/drizzle/',import.meta.url),files=readdirSync(folder).filter(x=>x.endsWith('.sql')).sort();for(const file of files.slice(0,3))sql.exec(readFileSync(new URL(file,folder),'utf8'));
  sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('old','Old','player',1);sql.prepare('INSERT INTO trail_visits(tile,owner,first_at,last_at) VALUES(?,?,?,?)').run('-11,13','old',10,20);
  sql.exec(readFileSync(new URL(files[3],folder),'utf8'));const row=sql.prepare('SELECT * FROM trail_visits').get()!;assert.equal(row.cell_i,-11);assert.equal(row.cell_j,13);assert.equal(row.first_at,10);assert.equal(row.last_at,20);assert.equal(row.owner,'old');
});

test('TR-003/004/008/015/016/018 deterministic world windows, personal rolls and capped density stay independent',()=>{
  const place=LANDMARKS[0],now=Date.now(),a=generateWorldSpawn(place,now),b=generateWorldSpawn(place,now);
  assert.deepEqual(a,b);assert.notEqual(generateWorldSpawn(place,a.expiresAt!).id,a.id);assert.equal(spawnVisibleTo(a,'any',a.expiresAt!),false);
  assert.equal(firstVisitSpawn(place,'one',now,{...SPAWN_RULES,firstVisitChance:0}),null);
  const personal=firstVisitSpawn(place,'one',now,{...SPAWN_RULES,firstVisitChance:1})!;
  assert.equal(spawnVisibleTo(personal,'two',now),false);assert.equal(spawnVisibleTo(personal,'one',now),true);
  assert.equal(firstVisitSpawn(place,'one',now+1,{...SPAWN_RULES,firstVisitChance:1})!.id,personal.id,'one personal identity per player/tile');
  assert.notEqual(firstVisitSpawn(place,'two',now,{...SPAWN_RULES,firstVisitChance:1})!.id,personal.id);
  assert.equal(detectionMeters(0),2000);assert.equal(detectionMeters(20),300);assert.equal(detectionMeters(100000),300);
  for(const rarity of ['Common','Rare','Legendary']as const)assert.equal(weightedRarity('same',{...SPAWN_RULES,weights:{Common:0,Rare:0,Legendary:0,[rarity]:1}}),rarity);
  const counts={Common:0,Rare:0,Legendary:0};for(let i=0;i<10000;i++)counts[weightedRarity('seed:'+i)]++;
  assert.ok(counts.Common>6500&&counts.Common<8500);assert.ok(counts.Legendary>100&&counts.Legendary<600);
});

test('TR-009/010/017/030 shared spawns capture atomically, replay once, retire safely and use bounded pages',async()=>{
  const{db,sql}=database(),databaseBinding=db as never,now=Date.now(),place=LANDMARKS[0];
  sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('player','P','player',now);
  const world=newDevWorld(),point=G.xy(place.latitude!,place.longitude!);world.previous={...point,latitude:place.latitude!,longitude:place.longitude!,accuracy:5,timestamp:now,inside:true,precise:true};world.latestGpsValid=true;world.game.x=point.x;world.game.y=point.y;world.game.energy=100000;
  await hydrateSpawns(databaseBinding,'player',world,now);
  assert.ok(world.game.sharedSpawnsOnly);const target=captureTarget(world.game,point)!;assert.ok(target?.id.startsWith('world:'));
  assert.ok(Object.keys(world.game.revealed).length<LANDMARKS.length);assert.equal(relicData(world.game,point).features.length,Object.keys(world.game.revealed).length,'map must not leak full legacy catalog into shared view');
  sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,0,?)').run('player',JSON.stringify(world),now);
  const rng=mock.method(globalThis.crypto,'getRandomValues',(values:Uint32Array)=>{values.fill(0);return values;});
  try{
    const result=await applyWorldEvent(databaseBinding,'player','spawn:capture:1',0,{kind:'capture'},now);
    assert.equal(result.receipt.collected,target.id);assert.equal(result.world.game.collection.length,1);
    const replay=await applyWorldEvent(databaseBinding,'player','spawn:capture:1',0,{kind:'capture'},now);assert.equal(replay.replayed,true);assert.equal(replay.world.game.collection.length,1);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_spawn_claims').get()!.n,1);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,1);
  }finally{rng.mock.restore();}
  const bounds=nearbyBounds(place.latitude!,place.longitude!),first=await querySpawns(databaseBinding,'player',bounds,now,'',2,false);assert.ok(first.spawns.length<=2);assert.ok(first.next);
  const second=await querySpawns(databaseBinding,'player',bounds,now,first.next!,2,false);assert.ok(!second.spawns.some(x=>first.spawns.some(y=>x.spawn.id===y.spawn.id)));
  assert.ok(![...first.spawns,...second.spawns].some(x=>x.spawn.id===target.id),'claimed items leave available queries');
  assert.ok((await querySpawns(databaseBinding,'player',bounds,now,'',100,true)).spawns.some(x=>x.spawn.id===target.id),'admin inspection retains world records collected by this player');
  const retiring=first.spawns[0].spawn;await removeSpawn(databaseBinding,'owner',retiring.id,now);await hydrateSpawns(databaseBinding,'player',world,now);assert.equal(world.game.revealed[retiring.id],undefined);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_audit').get()!.n,1);assert.equal((await querySpawns(databaseBinding,'player',bounds,now,'',100,true)).spawns.some(x=>x.spawn.id===retiring.id),false);
  await assert.rejects(()=>querySpawns(databaseBinding,'player',bounds,now,'',101),/Invalid spawn page/);
});

test('TR-011/033/036/037 spawn admin validates positions, permissions, simulation isolation and rules revision',async()=>{
  const{db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development',TRAIL_ADMIN_EMAIL:'owner@example.invalid'};
  const call=async(owner:string,path:string,method='GET',input?:unknown)=>{const response=await trailApi(new Request('https://dev.example/api/trail/'+path,{method,headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner==='admin'?'owner@example.invalid':'player@example.invalid',origin:'https://dev.example'},...(input!==undefined?{body:JSON.stringify(input)}:{})}),env);return{status:response.status,data:await response.json()};};
  await call('admin','me','POST',{displayName:'Owner'});await call('player','me','POST',{displayName:'P'});
  const params={latitude:62.241,longitude:25.747,artifactType:'Rune',rarity:'Rare'};
  assert.equal((await call('player','admin/spawns','POST',params)).status,403);
  assert.equal((await call('admin','admin/spawns','POST',{...params,latitude:NaN})).status,400);
  assert.equal((await call('admin','admin/spawns','POST',{...params,latitude:0,longitude:0})).status,400);
  const sim=await call('admin','admin/spawn-simulation','POST',{rules:SPAWN_RULES,at:Date.now()});assert.equal(sim.data.writes,0);assert.equal(sim.data.count,501);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_spawns').get()!.n,0);
  const placed=await call('admin','admin/spawns','POST',params);assert.equal(placed.status,200);
  assert.equal((await call('player','admin/spawns','DELETE',{id:placed.data.spawn.id})).status,403);
  assert.equal((await call('admin','admin/spawns','DELETE',{id:placed.data.spawn.id})).status,200);
  assert.equal((await call('admin','admin/spawns?south=59&north=71&west=19&east=32')).status,400);
  const changed=await call('admin','admin/spawn-rules','PUT',{rules:{...SPAWN_RULES,firstVisitChance:1},revision:SPAWN_RULES.revision});assert.equal(changed.status,200);
  assert.equal((await call('admin','admin/spawn-rules','PUT',{rules:SPAWN_RULES,revision:SPAWN_RULES.revision})).status,409);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_audit').get()!.n,3);
  const tooLarge=await call('admin','admin/spawn-simulation','POST',{padding:'X'.repeat(131073)});assert.equal(tooLarge.status,413);
});

test('TR-015/016 first personal visits are independent from global density and never reroll after returning',async()=>{
  const{db,sql}=database(),binding=db as never,place=LANDMARKS[0],now=Date.now();
  sql.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,1,?,?,?)').run('spawns',JSON.stringify({...SPAWN_RULES,firstVisitChance:1}),'admin',now);
  for(const owner of ['first','newcomer']){
    sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(owner,owner,'player',now);
    const gps={kind:'gps' as const,fix:{latitude:place.latitude!,longitude:place.longitude!,timestamp:now,accuracy:5,speed:0}};
    const initial=await applyWorldEvent(binding,owner,owner+':first:visit',0,gps,now);assert.equal(initial.receipt.awards.exploration,5);
    const again=await applyWorldEvent(binding,owner,owner+':return:visit',1,{...gps,fix:{...gps.fix,timestamp:now+1000}},now+1000);assert.equal(again.receipt.awards.exploration,undefined);
    assert.equal(Object.values(again.world.game.revealed).filter(r=>r?.id.startsWith('personal:')).length,1);
  }
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM trail_spawns WHERE owner IS NOT NULL").get()!.n,2);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_visits WHERE tile=?').get(place.id)!.n,2);
});

test('TR-146/153 shared raw GPS transport recovers after suspension and stalls without applying foot-only reward rules',async()=>{
  let now=100000,starts=0,removals=0,received=0;const callbacks:((f:import('../src/location/tracker').LocationFix)=>void)[]=[];
  const session=new RawLocationSession(async fix=>{starts++;callbacks.push(fix);return{remove(){removals++;}};},()=>received++,()=>{},()=>now);
  await session.start();callbacks[0]({latitude:62.24,longitude:25.74,timestamp:now,speed:12,accuracy:5});assert.equal(received,1,'bike transport is not filtered as walking');
  session.suspend();callbacks[0]({latitude:62.24,longitude:25.74,timestamp:now,speed:12,accuracy:5});assert.equal(received,1);
  now+=5000;session.resume();await Promise.resolve();assert.equal(starts,2);assert.equal(removals,1);
  callbacks[0]({latitude:62.24,longitude:25.74,timestamp:now,accuracy:5});assert.equal(received,1,'late replaced callback is ignored');
  now+=30000;session.tick();await Promise.resolve();assert.equal(starts,3);session.stop();assert.equal(removals,3);
});

test('TR-034/035/057/118 admin player edits are scoped, validated, backed up and recoverable without changing other accounts',async()=>{
  const{db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development',TRAIL_ADMIN_EMAIL:'owner@example.invalid'};
  const call=async(owner:string,path:string,input?:unknown)=>{const r=await trailApi(new Request('https://dev.example/api/trail/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner==='admin'?'owner@example.invalid':'player@example.invalid',origin:'https://dev.example'},...(input?{body:JSON.stringify(input)}:{})}),env);return{status:r.status,data:await r.json()};};
  for(const owner of ['admin','first','second'])await call(owner,'me',{displayName:owner});
  const second=await call('second','world');const detail=await call('admin','admin/player?id=first');assert.equal(detail.status,200);
  assert.equal((await call('first','admin/player?id=second')).status,403);
  const result=await call('admin','admin/players?q=fir');assert.deepEqual(result.data.players.map((p:{id:string})=>p.id),['first']);
  const edit=(revision:number,action:string,extra={})=>call('admin','admin/player',{owner:'first',revision,action,...extra});
  assert.equal((await edit(0,'inventory-add',{type:'Unknown',rarity:'Rare'})).status,400);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_backups').get()!.n,0);
  const granted=await edit(0,'inventory-add',{type:'Rune',rarity:'Rare'});assert.equal(granted.status,200);assert.equal(granted.data.world.game.collection.length,1);assert.equal(granted.data.world.game.progression.xp.perception,0);
  const itemId=granted.data.world.game.collection[0].id;
  const modified=await edit(1,'inventory-edit',{itemId,type:'Crown',rarity:'Legendary'});assert.equal(modified.data.world.game.collection[0].name,'Crown');
  const removed=await edit(2,'inventory-remove',{itemId});assert.equal(removed.data.world.game.collection.length,0);
  const restored=await edit(3,'restore',{backupId:removed.data.backupId});assert.equal(restored.data.world.game.collection[0].name,'Crown');
  assert.equal((await edit(3,'backup')).status,409,'stale admin views cannot overwrite a live player');
  assert.equal((await edit(4,'attributes',{xp:{exploration:-1}})).status,400);
  const xp={exploration:100,power:50,agility:10,endurance:25,perception:5,fellowship:0};const attributes=await edit(4,'attributes',{xp});assert.deepEqual(attributes.data.world.game.progression.xp,xp);
  const other=await call('second','world');assert.deepEqual(other.data,second.data);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_backups WHERE owner=?').get('second')!.n,0);
  const rows=sql.prepare('SELECT details FROM trail_audit').all();assert.equal(rows.length,5);assert.ok(rows.every(r=>JSON.parse(String(r.details)).backupId));
  assert.equal((await call('first','admin/player',{owner:'second',revision:0,action:'reset-exploration'})).status,403);
});

test('TR-039 exploration resets retain paid rewards and permanent world evidence; unsafe wallet restoration is refused',async()=>{
  const{db,sql}=database(),binding=db as never,now=Date.now();
  sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('one','One','player',now);
  const state=newDevWorld();state.game.gold=10;state.game.visits={'0,0':1};state.game.progression!.xp.exploration=5;
  sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,0,?)').run('one',JSON.stringify(state),now);
  sql.prepare('INSERT INTO trail_visits(tile,owner,first_at,last_at) VALUES(?,?,?,?)').run('0,0','one',now,now);
  sql.prepare('INSERT INTO trail_claims(tile,owner,price,revision,updated_at) VALUES(?,?,?,1,?)').run('0,0','one',3,now);
  const reset=await editPlayer(binding,'admin','one',0,'reset-exploration',{},now);assert.equal(reset.world.game.gold,10);assert.deepEqual(reset.world.game.visits,{});
  assert.equal(sql.prepare('SELECT price FROM trail_claims WHERE tile=?').get('0,0')!.price,3,'global price and ownership survive map reset');
  const geo=G.geo(125,125),visit=await applyWorldEvent(binding,'one','return:after:reset',1,{kind:'gps',fix:{latitude:geo.lat,longitude:geo.lon,accuracy:5,timestamp:now,speed:0}},now);
  assert.equal(visit.receipt.awards.exploration,undefined);assert.equal(visit.world.game.gold,10);
  const changed=JSON.parse(sql.prepare('SELECT state FROM trail_players WHERE id=?').get('one')!.state as string);changed.game.gold=9;sql.prepare('UPDATE trail_players SET state=? WHERE id=?').run(JSON.stringify(changed),'one');
  await assert.rejects(()=>editPlayer(binding,'admin','one',2,'restore',{backupId:reset.backupId},now),/Wallet or world claims changed/);
  assert.equal(sql.prepare('SELECT revision FROM trail_players WHERE id=?').get('one')!.revision,2,'rejected recovery changes nothing');
});

test('TR-056 emerging archetypes describe independent attribute levels without changing progression',()=>{
  const world=newDevWorld(),progression=world.game.progression!;assert.equal(emergingArchetype(progression),'New explorer');
  progression.xp.exploration=100;const before=JSON.stringify(progression);assert.equal(emergingArchetype(progression),'Pathfinder');assert.equal(JSON.stringify(progression),before);
  progression.xp.power=100;assert.equal(emergingArchetype(progression),'All-round explorer');progression.xp.endurance=1000;assert.equal(emergingArchetype(progression),'Long-distance explorer');
});

test('shared saves from the first service release gain empty attributes without replacing their wallet or inventory',async()=>{
  const{db,sql}=database(),now=Date.now();sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run('legacy','Legacy','player',now);
  const world=newDevWorld();delete world.game.progression;world.game.gold=7;world.game.visits={'0,0':1};
  sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,3,?)').run('legacy',JSON.stringify(world),now);
  const response=await trailApi(new Request('https://dev.example/api/trail/world',{headers:{'oai-authenticated-user-id':'legacy'}}),{DB:db as never,TRAIL_ENV:'development'}),data=await response.json();
  assert.equal(data.world.game.gold,7);assert.deepEqual(data.world.game.visits,{'0,0':1});assert.equal(data.revision,3);assert.equal(Object.values(data.world.game.progression.xp).every(v=>v===0),true);
});

test('TR-085/090/095 progression estimates use the same arithmetic as accepted Foot/Bicycle server evidence',()=>{
  for(const movement of ['foot','bicycle']as const){
    let world=reduceDevEvent(newDevWorld(),{kind:'start',movement},100000).world,now=100000;
    for(let x=0;x<=1000;x+=20){now+=5000;const geo=G.geo(x,125);world=reduceDevEvent(world,{kind:'gps',fix:{latitude:geo.lat,longitude:geo.lon,timestamp:now,accuracy:5,speed:1}},now).world;}
    const snapshot=JSON.stringify(world),estimated=estimateProgression(DEV_BALANCE,{meters:world.game.meters,tiles:Object.keys(world.game.visits).length,regions:Object.keys(world.regions).length,finds:0,movement});
    assert.deepEqual(estimated.xp,world.game.progression!.xp);assert.equal(estimated.awardsWritten,0);assert.equal(JSON.stringify(world),snapshot);
  }
  const assumption={meters:10000,tiles:20,regions:2,finds:3},foot=estimateProgression(DEV_BALANCE,{...assumption,movement:'foot'}),bike=estimateProgression(DEV_BALANCE,{...assumption,movement:'bicycle'});
  assert.equal(foot.xp.endurance,40);assert.equal(bike.xp.endurance,16);assert.equal(foot.xp.exploration,bike.xp.exploration);assert.equal(foot.xp.power,0);assert.equal(foot.xp.fellowship,0);
  assert.throws(()=>estimateProgression(DEV_BALANCE,{...assumption,tiles:-1,movement:'foot'}));
});

test('TR-089 curve edits are versioned and change level projection without rewriting earned XP or production defaults',async()=>{
  const{db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development',TRAIL_ADMIN_EMAIL:'owner@example.invalid'};
  const call=async(path:string,method='GET',body?:unknown)=>{const r=await trailApi(new Request('https://dev.example/api/trail/'+path,{method,headers:{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'owner@example.invalid',origin:'https://dev.example'},...(body?{body:JSON.stringify(body)}:{})}),env);return{status:r.status,data:await r.json()};};
  await call('me','POST',{displayName:'Admin'});const legacy={...DEV_BALANCE}as Partial<typeof DEV_BALANCE>;delete legacy.curveCoefficient;
  sql.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,1,?,?,?)').run('active-balance',JSON.stringify(legacy),'admin',Date.now());
  assert.equal((await call('balance')).data.balance.curveCoefficient,25);
  const initial=await call('world');initial.data.world.game.progression.xp.exploration=100;sql.prepare('UPDATE trail_players SET state=? WHERE id=?').run(JSON.stringify(initial.data.world),'admin');
  assert.equal((await call('admin/balance','PUT',{balance:{...DEV_BALANCE,curveCoefficient:0},revision:1})).status,409);
  const changed=await call('admin/balance','PUT',{balance:{...DEV_BALANCE,curveCoefficient:100},revision:1});assert.equal(changed.status,200);
  const state=(await call('world')).data;assert.equal(state.world.game.progression.xp.exploration,100);assert.equal(state.world.curveCoefficient,100);assert.equal(levelProgress(100,state.world.curveCoefficient).level,2);assert.equal(DEV_BALANCE.curveCoefficient,25);
  const history=(await call('admin/balance-history')).data.history;assert.equal(history[0].balance.curveCoefficient,100);assert.equal(history[history.length-1].balance.curveCoefficient,25);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM trail_configs WHERE id='balance:2'").get()!.n,1);
});

test('TR-085/090 history simulations preserve effort fractions and deduplicate activity, tile, region and find identities',()=>{
  const event={id:'activity:1',at:1,meters:200,tiles:['tile:1'],regions:['region:1'],finds:['find:1'],movement:'foot' as const};
  const replay=simulateHistory(DEV_BALANCE,[event,event,{...event,id:'activity:2',at:2}]);assert.equal(replay.activities,2);assert.equal(replay.xp.endurance,1);assert.equal(replay.xp.exploration,5);assert.equal(replay.xp.perception,10);assert.equal(replay.awardsWritten,0);
  assert.throws(()=>simulateHistory(DEV_BALANCE,[event,{...event,meters:400}]),/identity changed/);
  for(const s of PROGRESSION_SCENARIOS)for(const movement of ['foot','bicycle']as const){const replayed=simulateHistory(DEV_BALANCE,scenarioHistory(s,movement)),aggregate=estimateProgression(DEV_BALANCE,{...s,movement});assert.deepEqual(replayed.xp,aggregate.xp);assert.equal(replayed.steps.length,s.activities);}
});

function database(){
  const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
  const folder=new URL('../../dev-server/drizzle/',import.meta.url);for(const file of readdirSync(folder).filter(x=>x.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,folder),'utf8'));
  const prepare=(query:string)=>{let values:unknown[]=[];const statement={bind(...args:unknown[]){values=args;return statement;},async first(){return sql.prepare(query).get(...values as never[])??null;},async all(){return{results:sql.prepare(query).all(...values as never[])};},async run(){return{success:true,meta:sql.prepare(query).run(...values as never[])};}};return statement;};
  return{sql,db:{prepare,async batch(statements:ReturnType<typeof prepare>[]){sql.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}}};
}
test('TR-113/119 shared API requires identity, own-origin writes, server roles and a dev-only database',async()=>{
  const {db}=database(),env={DB:db as never,TRAIL_ENV:'development',TRAIL_ADMIN_EMAIL:'owner@example.invalid'};
  const call=(path:string,method='GET',input?:unknown,subject?:string,email?:string)=>trailApi(new Request('https://dev.example/api/trail/'+path,{method,headers:{...(subject?{'oai-authenticated-user-id':subject}:{}),...(email?{'oai-authenticated-user-email':email}:{}),origin:'https://dev.example','Content-Type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)})}),env);
  assert.equal((await call('health')).status,200);assert.equal((await call('world')).status,401);
  assert.equal((await call('me','POST',{displayName:'Owner'},'owner','owner@example.invalid')).status,200);
  const player=await call('me','POST',{displayName:'Player',role:'admin'},'player');assert.equal((await player.json()).user.role,'player');
  assert.equal((await call('admin/players','GET',undefined,'player')).status,403);
  assert.equal((await call('admin/balance-history','GET',undefined,'player')).status,403);
  assert.equal((await call('admin/players','GET',undefined,'owner')).status,200);
  assert.equal((await trailApi(new Request('https://dev.example/api/trail/me',{method:'PATCH',headers:{'oai-authenticated-user-id':'player',origin:'https://evil.example'},body:'{}'}),env)).status,403);
  assert.equal((await trailApi(new Request('https://dev.example/api/trail/health'),{...env,TRAIL_ENV:'production'})).status,503);
  const proxy=await trailApi(new Request('https://internal-worker.example/api/trail/me',{method:'POST',headers:{'oai-authenticated-user-id':'proxy',origin:'https://dev.example'},body:JSON.stringify({displayName:'Proxy test'})}),{...env,TRAIL_PUBLIC_ORIGIN:'https://dev.example'});
  assert.equal(proxy.status,200,'hosted proxy origin is checked against its explicit public origin');
  assert.equal((await call('me','POST',null,'stranger')).status,400);
  const a=await(await call('world','GET',undefined,'owner')).json(),b=await(await call('world','GET',undefined,'player')).json();
  assert.equal(a.revision,0);assert.equal(b.revision,0);assert.equal(a.world.game.gold,0);
});

test('TR-079/083 shared event ledger replays safely, rejects stale devices and rolls back a failed compare-and-swap',async()=>{
  const {db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development'};
  const call=async(path:string,input?:unknown)=>{const response=await trailApi(new Request('https://dev.example/api/trail/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':'player',origin:'https://dev.example'},...(input?{body:JSON.stringify(input)}:{})}),env);return{status:response.status,data:await response.json()};};
  await call('me',{displayName:'Player'});
  const start={id:'event:start:1',revision:0,event:{kind:'start',movement:'foot'}};
  assert.equal((await call('events',start)).status,200);
  const duplicate=await call('events',start);assert.equal(duplicate.data.replayed,true);assert.equal(duplicate.data.revision,1);
  assert.equal((await call('events',{...start,event:{kind:'stop'}})).status,409);
  assert.equal((await call('events',{id:'event:stop:2',revision:0,event:{kind:'stop'}})).status,409);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,1);
  sql.exec("BEGIN; UPDATE trail_players SET revision=2 WHERE id='player'");
  assert.throws(()=>sql.exec("UPDATE trail_players SET revision=revision+1 WHERE id='player' AND revision=0; INSERT INTO trail_integrity(id,valid) VALUES('world-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"));sql.exec('ROLLBACK');
  assert.equal((await call('world')).data.revision,1,'failed atomic update cannot corrupt player state');
});

test('TR-121/123/125 explicit Foot/Bicycle events retain full discovery but apply different effort, without coarse/gap XP',()=>{
  const run=(movement:'foot'|'bicycle')=>{let world=newDevWorld(),now=1_000_000;world=reduceDevEvent(world,{kind:'start',movement},now).world;
    const gps=(x:number,accuracy=5,advance=5000)=>{now+=advance;const geo=G.geo(x,125);const event:DevEvent={kind:'gps',fix:{latitude:geo.lat,longitude:geo.lon,accuracy,timestamp:now,speed:1}};const result=reduceDevEvent(world,event,now);world=result.world;return result.receipt;};
    gps(0);for(let x=20;x<=1000;x+=20)gps(x);
    const before=world.game.progression!.xp.endurance,meters=world.game.meters;gps(1500,500);assert.equal(world.latestGpsValid,false);assert.equal(world.game.meters,meters);
    assert.equal(reduceDevEvent(world,{kind:'capture'},now).receipt.accepted,false);
    gps(2000,5,60000);assert.equal(world.game.meters,meters,'no rewards across a long gap');assert.equal(world.game.progression!.xp.endurance,before);
    assert.throws(()=>reduceDevEvent(world,{kind:'start',movement:movement==='foot'?'bicycle':'foot'},now));return world;
  };
  const foot=run('foot'),bike=run('bicycle');
  assert.equal(foot.game.progression!.xp.exploration,bike.game.progression!.xp.exploration);
  assert.equal(foot.game.progression!.xp.agility,bike.game.progression!.xp.agility);
  assert.ok(foot.game.progression!.xp.endurance>bike.game.progression!.xp.endurance);
  assert.equal(foot.configRevision,DEV_BALANCE.revision);
});

test('TR-083/119 a lost response retries the same persisted event after reload, without sharing another account’s pending data',async()=>{
  const {db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development'},values=new Map<string,string>();
  const storage={async getItem(key:string){return values.get(key)??null;},async setItem(key:string,value:string){values.set(key,value);},async removeItem(key:string){values.delete(key);}};
  let loseResponse=false;
  const request=(owner:string)=>(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await trailApi(new Request('https://dev.example'+String(input),{...init,headers:{...init?.headers,'oai-authenticated-user-id':owner,origin:'https://dev.example'}}),env);
    if(loseResponse&&String(input).endsWith('/events')){loseResponse=false;throw new Error('Connection lost after commit');}return response;
  })as typeof fetch;
  const a=new SharedWorldClient(storage,request('a'));await a.join('Explorer A');
  loseResponse=true;await assert.rejects(a.dispatch({kind:'start',movement:'foot'},0));assert.equal(await a.pending(),true);
  const b=new SharedWorldClient(storage,request('b'));await b.join('Explorer B');assert.equal(await b.pending(),false);
  const reloaded=new SharedWorldClient(storage,request('a'));await reloaded.profile();const replay=await reloaded.retry();
  assert.equal(replay.replayed,true);assert.equal(replay.revision,1);assert.equal(await reloaded.pending(),false);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM trail_events WHERE owner='a'").get()!.n,1);
  assert.equal((await b.load()).revision,0);
});

test('shared tile purchases spend exactly once, increase the global price and never pay the previous owner',async()=>{
  const {db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development'};
  const call=async(owner:string,path:string,input?:unknown)=>{const response=await trailApi(new Request('https://dev.example/api/trail/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':owner,origin:'https://dev.example'},...(input?{body:JSON.stringify(input)}:{})}),env);return{status:response.status,data:await response.json()};};
  for(const owner of ['a','b']){await call(owner,'me',{displayName:owner});await call(owner,'world');const world=newDevWorld();world.game.gold=5;world.game.visits={'0,0':1};sql.prepare('UPDATE trail_players SET state=? WHERE id=?').run(JSON.stringify(world),owner);}
  const purchase={id:'purchase:tile:a',revision:0,event:{kind:'claim',tile:'0,0',price:1}};
  assert.equal((await call('a','events',purchase)).data.world.game.gold,4);
  const duplicate=await call('a','events',purchase);assert.equal(duplicate.data.world.game.gold,4);assert.equal(duplicate.data.replayed,true);
  assert.equal((await call('b','events',{id:'purchase:tile:bad',revision:0,event:{kind:'claim',tile:'0,0',price:1}})).status,409);
  assert.equal((await call('b','world')).data.world.game.gold,5,'a stale price spends nothing');
  const transfer=await call('b','events',{id:'purchase:tile:b',revision:0,event:{kind:'claim',tile:'0,0',price:2}});assert.equal(transfer.data.world.game.gold,3);
  assert.equal((await call('a','world')).data.world.game.gold,4,'previous owner receives no transfer gold');
  assert.equal((await call('b','events',{id:'purchase:own:bad',revision:1,event:{kind:'claim',tile:'0,0',price:3}})).status,409);
  const claim=(await call('a','claims')).data.claims[0];assert.equal(claim.owner,'b');assert.equal(claim.price,2);
});

test('shared browser client keeps the native fetch receiver instead of invoking it as an account method',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=(function(this:unknown){assert.equal(this,globalThis);return Promise.resolve(Response.json({user:{id:'native-fetch-owner'}}));})as typeof fetch;
  try{const client=new SharedWorldClient({async getItem(){return null;},async setItem(){},async removeItem(){}});assert.equal((await client.profile()).id,'native-fetch-owner');}
  finally{globalThis.fetch=previous;}
});

test('TR-033/040/115 balance edits are authorized, validated, versioned and never re-award old events',async()=>{
  const {db,sql}=database(),env={DB:db as never,TRAIL_ENV:'development',TRAIL_ADMIN_EMAIL:'owner@example.invalid'};
  const call=async(owner:string,path:string,method='GET',input?:unknown)=>{const response=await trailApi(new Request('https://dev.example/api/trail/'+path,{method,headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner==='admin'?'owner@example.invalid':'player@example.invalid',origin:'https://dev.example'},...(input?{body:JSON.stringify(input)}:{})}),env);return{status:response.status,data:await response.json()};};
  await call('admin','me','POST',{displayName:'Owner'});await call('player','me','POST',{displayName:'Player'});
  const next={balance:{...DEV_BALANCE,tileXp:9},revision:0};
  assert.equal((await call('player','admin/balance','PUT',next)).status,403);
  assert.equal((await call('admin','admin/balance','PUT',{...next,balance:{...next.balance,tileXp:-2}})).status,409);
  const saved=await call('admin','admin/balance','PUT',next);assert.equal(saved.status,200);assert.equal(saved.data.balance.revision,'dev-custom-1');
  assert.equal((await call('admin','admin/balance','PUT',next)).status,409);
  const now=Date.now(),geo=G.geo(125,125),event={id:'gps:balance:once',revision:0,event:{kind:'gps',fix:{latitude:geo.lat,longitude:geo.lon,accuracy:5,timestamp:now,speed:0}}};
  const first=await call('player','events','POST',event);assert.equal(first.data.world.game.progression.xp.exploration,9);
  await call('admin','admin/balance','PUT',{balance:{...DEV_BALANCE,tileXp:50},revision:1});
  const replay=await call('player','events','POST',event);assert.equal(replay.data.replayed,true);assert.equal(replay.data.world.game.progression.xp.exploration,9);assert.equal(replay.data.receipt.balanceRevision,'dev-custom-1');
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM trail_audit').get()!.n,2);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM trail_configs WHERE id LIKE 'balance:%'").get()!.n,2);
});
