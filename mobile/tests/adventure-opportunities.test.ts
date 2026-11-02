import test from 'node:test';
import assert from 'node:assert/strict';
import {freshOpportunityOrigin,opportunityIdeas} from '../src/game/adventure-opportunities';
import {newDevWorld} from '../src/game/dev-world';
import {BOSS_RULES,type Boss} from '../src/game/bosses';
import {LANDMARKS} from '../src/game/landmarks';
import {WORLD_REGIONS} from '../src/game/world-regions';
import {legacySpawn} from '../src/game/spawns';
import {spawnRelic} from '../src/game/world-spawns';
import G from '../src/game/engine';
import {database} from './sqlite-world';
import {insertSpawn} from '../../dev-server/trail/spawn-store';
import {placeBoss,retireBoss} from '../../dev-server/trail/boss-store';
import {adventureIdeas} from '../../dev-server/trail/recommendation-store';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import type {RecommendationPreferences} from '../src/game/recommendations';
const now=1000000,place=LANDMARKS[0],point=G.xy(place.latitude!,place.longitude!),origin={latitude:place.latitude!,longitude:place.longitude!,name:'public path',preview:false};
const prefs:RecommendationPreferences={goal:'fellowship',movement:'foot',meters:3000,terrain:'any',access:'known-paths'};
const boss:Boss={version:1,id:'boss:one',designId:'kivenkulkija',name:'Kivenkulkija',tier:'Lesser',tileId:place.id,latitude:place.latitude!,longitude:place.longitude!,source:place.source!,startsAt:now-1,endsAt:now+1000,signature:'Wayfarer Compass',artifactType:'Compass',weakness:'foot',weaknessBonus:0,rules:BOSS_RULES,objectives:{uniqueTiles:8}};
function fresh(){const w=newDevWorld();w.previous={...point,latitude:origin.latitude,longitude:origin.longitude,accuracy:5,timestamp:now,inside:true,precise:true};w.latestGpsValid=true;return w;}

test('TR-096 GPS opportunities fail closed on stale/inaccurate/future/absent location without assuming a town centre',()=>{
  const w=fresh();assert.ok(freshOpportunityOrigin(w,now));assert.equal(freshOpportunityOrigin(w,now+15000),null);assert.equal(freshOpportunityOrigin(w,now-1),null);
  w.latestGpsValid=false;assert.equal(freshOpportunityOrigin(w,now),null);w.latestGpsValid=true;w.previous!.accuracy=100;assert.equal(freshOpportunityOrigin(w,now),null);assert.equal(freshOpportunityOrigin(newDevWorld(),now),null);
  assert.equal(opportunityIdeas(w,prefs,null,[boss],[],LANDMARKS,WORLD_REGIONS,now).items.length,0);
});

test('TR-096 discovered-only artefacts, closures, availability, terrain/access and exact public route coordinates remain separate',()=>{
  const w=fresh(),known={...place,id:'known'},hidden={...place,id:'hidden'};w.game.revealed[known.id]=known;
  const before=JSON.stringify(w),result=opportunityIdeas(w,prefs,origin,[boss],[known,hidden],LANDMARKS,WORLD_REGIONS,now);
  assert.equal(result.items.length,2);assert.equal(result.items.find(x=>x.kind==='artefact')!.id,'known');assert.ok(result.items.every(x=>x.routePlaceId===place.landmarkId));assert.match(result.items[0].detail,/8 distinct tiles/);
  assert.equal(JSON.stringify(w),before);w.game.searched.known=true;assert.equal(opportunityIdeas(w,prefs,origin,[],[known],LANDMARKS,WORLD_REGIONS,now).items.length,0);w.game.searched={};w.game.collection.push(known);assert.equal(opportunityIdeas(w,prefs,origin,[],[known],LANDMARKS,WORLD_REGIONS,now).items.length,0);
  const blocked={...WORLD_REGIONS,regions:[{id:'closed',name:'closed',south:origin.latitude-.01,north:origin.latitude+.01,west:origin.longitude-.01,east:origin.longitude+.01,terrain:'trail' as const,weather:'clear' as const,blocked:true,startsAt:0,endsAt:now+1,rarityFactor:1}]};
  assert.equal(opportunityIdeas(fresh(),prefs,origin,[boss],[],LANDMARKS,blocked,now).items.length,0);
  for(const p of [{...prefs,access:'step-free' as const},{...prefs,terrain:'woodland' as const}])assert.equal(opportunityIdeas(w,p,origin,[boss],[],LANDMARKS,WORLD_REGIONS,now).items.length,0);
  assert.equal(opportunityIdeas(w,prefs,origin,[boss],[],LANDMARKS,WORLD_REGIONS,boss.endsAt).items.length,0);
  const moved={...boss,latitude:boss.latitude+.00001};assert.equal(opportunityIdeas(w,prefs,origin,[moved],[],LANDMARKS,WORLD_REGIONS,now).items[0].routePlaceId,undefined,'no guessed destination connector');
});

test('TR-096 public previews show bosses only, bounded selections retain physical requirements and never promise encounter completion',()=>{
  const w=fresh(),known={...place,id:'known'};w.game.revealed.known=known;
  const bosses=Array.from({length:6},(_,i)=>({...boss,id:'boss:'+i}));
  const result=opportunityIdeas(w,{...prefs,movement:'bicycle'},{...origin,preview:true},bosses,[known],LANDMARKS,WORLD_REGIONS,now);
  assert.equal(result.items.length,3);assert.equal(result.truncated,true);assert.ok(result.items.every(x=>x.kind==='boss'));assert.match(result.items[0].detail,/50.0 Bicycle km/);assert.equal(result.awardsWritten,0);
  assert.equal(opportunityIdeas(w,prefs,{...origin,latitude:origin.latitude+.5},[boss],[],LANDMARKS,WORLD_REGIONS,now).items.length,0,'distance budget excludes remote suggestions');
});

test('TR-096 shared API reads owner-visible current records only; no lazy generation, player creation or game writes',async()=>{
  const f=database(),db=f.db as never,w=fresh();for(const owner of ['a','b'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(owner,owner,owner==='a'?'admin':'player',now);
  const visible={...legacySpawn(place),createdAt:now-1},hidden={...visible,id:'hidden'},other={...visible,id:'other',kind:'personal-first-visit' as const,origin:'personal' as const,ownerId:'b',createdAt:now-1},expired={...visible,id:'expired',expiresAt:now},claimed={...visible,id:'claimed'},removed={...visible,id:'removed'};
  for(const spawn of [visible,hidden,other,expired,claimed,removed])await insertSpawn(db,spawn).run();
  f.sql.prepare('INSERT INTO trail_spawn_claims(spawn,owner,event,created_at) VALUES(?,?,?,?)').run(claimed.id,'a','claimed:event',now);f.sql.prepare('UPDATE trail_spawns SET removed_at=? WHERE id=?').run(now,removed.id);
  for(const spawn of [visible,other,expired,claimed,removed])w.game.revealed[spawn.id]=spawnRelic(spawn);
  f.sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,0,?)').run('a',JSON.stringify(w),now);
  const placed=(await placeBoss(db,'a',{designId:'kivenkulkija',tier:'Lesser',placeId:place.landmarkId!,startsAt:now-1,endsAt:now+1000,weaknessBonus:0,objectives:{uniqueTiles:8}},now)).boss;
  const snapshot=async()=>JSON.stringify(await exportDevSnapshot(db,now)),before=await snapshot();
  const a=await adventureIdeas(db,'a',prefs,now);assert.deepEqual(a.opportunities.items.filter(x=>x.kind==='artefact').map(x=>x.id),[visible.id]);assert.equal(a.opportunities.items.filter(x=>x.kind==='boss').length,1);
  assert.equal((await adventureIdeas(db,'b',prefs,now)).opportunities.items.length,0);
  const preview=await adventureIdeas(db,'b',{...prefs,opportunityOrigin:place.landmarkId!},now);assert.equal(preview.opportunities.items.length,1);assert.equal(preview.opportunities.items[0].kind,'boss');assert.equal(preview.opportunities.origin!.preview,true);
  await assert.rejects(()=>adventureIdeas(db,'a',{...prefs,opportunityOrigin:'not-a-public-path'},now),/public boss-preview origin/);
  assert.equal(await snapshot(),before,'includes no spawned rows, profiles, reservations, activities or rewards');
  await retireBoss(db,'a',placed.id,now);assert.equal((await adventureIdeas(db,'a',{...prefs,opportunityOrigin:place.landmarkId!},now)).opportunities.items.length,0);
});
