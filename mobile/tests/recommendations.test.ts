import {test} from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import {newDevWorld,reduceDevEvent,DEV_BALANCE} from '../src/game/dev-world';
import {recommendAdventure,type RecommendationPreferences} from '../src/game/recommendations';
import {WORLD_REGIONS,type WorldRegions} from '../src/game/world-regions';
import {LANDMARKS} from '../src/game/landmarks';
import {database} from './sqlite-world';
import {adventureIdeas} from '../../dev-server/trail/recommendation-store';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {trailApi} from '../../dev-server/trail/api';
const now=1000000,place=LANDMARKS[0],point=G.xy(place.latitude!,place.longitude!),prefs:RecommendationPreferences={goal:'endurance',movement:'foot',meters:3000,terrain:'any',access:'known-paths'};
const fresh=()=>{const world=newDevWorld();world.previous={...point,latitude:place.latitude!,longitude:place.longitude!,accuracy:4,timestamp:now,inside:true,precise:true};world.latestGpsValid=true;return world;};

test('TR-092/093/095 non-route plans project current ordinary XP/levels and saved fractional credit without mutating or starting gameplay',()=>{
  for(const movement of ['foot','bicycle']as const){const world=fresh();world.xpRemainder=DEV_BALANCE.enduranceMetersPerXp-.25;world.game.progression!.xp.endurance=24;const before=JSON.stringify(world),result=recommendAdventure(world,DEV_BALANCE,{...prefs,movement},[],WORLD_REGIONS,now);
    assert.equal(result.awardsWritten,0);assert.equal(JSON.stringify(world),before);assert.equal(world.game.adventure,undefined);assert.equal(result.xp.endurance,Math.floor((world.xpRemainder+prefs.meters*(movement==='foot'?DEV_BALANCE.footFactor:DEV_BALANCE.bicycleFactor))/DEV_BALANCE.enduranceMetersPerXp));assert.equal(result.levels.find(r=>r.attribute==='endurance')!.before,1);assert.ok(result.levels.find(r=>r.attribute==='endurance')!.after>1);
  }
  const world=fresh();for(const[goal,key,amount]of [['exploration','exploration',DEV_BALANCE.tileXp],['agility','agility',DEV_BALANCE.regionXp],['perception','perception',DEV_BALANCE.findXp]]as const){const result=recommendAdventure(world,DEV_BALANCE,{...prefs,goal},[],WORLD_REGIONS,now);assert.equal(result.xp[key],amount);assert.ok(result.assumptions.length>=2);}
  for(const goal of ['power','fellowship']as const){const result=recommendAdventure(world,DEV_BALANCE,{...prefs,goal},LANDMARKS,WORLD_REGIONS,now);assert.ok(Object.values(result.xp).every(x=>x===0));assert.equal(result.places.length,0);}
  const changed=recommendAdventure(world,{...DEV_BALANCE,revision:'experiment-changed',enduranceMetersPerXp:250},{...prefs},[],WORLD_REGIONS,now);assert.equal(changed.balanceRevision,'experiment-changed');assert.equal(changed.xp.endurance,12);
});

test('TR-093/101/110 nearby new-tile and regional ideas respect personal history, freshness, active closures and known terrain without inventing routes or access',()=>{
  const world=fresh(),p={...prefs,goal:'exploration' as const},one=recommendAdventure(world,DEV_BALANCE,p,[place],WORLD_REGIONS,now);assert.equal(one.places.length,1);assert.equal(one.places[0].terrain,'unknown');assert.equal(one.places[0].minimumReturnMeters,0);assert.equal(one.places[0].source,place.source);assert.ok(!('route' in one));
  const tile=one.places[0].tile;world.rewardedTiles={[tile]:true};assert.equal(recommendAdventure(world,DEV_BALANCE,p,[place],WORLD_REGIONS,now).places.length,0,'map reset cannot make paid history new');world.rewardedTiles={};world.game.visits[tile]=1;assert.equal(recommendAdventure(world,DEV_BALANCE,p,[place],WORLD_REGIONS,now).places.length,0);world.game.visits={};
  const regional=G.key(Math.floor(point.x/2000),Math.floor(point.y/2000));world.regions[regional]=true;assert.equal(recommendAdventure(world,DEV_BALANCE,{...p,goal:'agility'},[place],WORLD_REGIONS,now).places.length,0);world.regions={};
  assert.equal(recommendAdventure(world,DEV_BALANCE,{...p,access:'step-free'},[place],WORLD_REGIONS,now).places.length,0);assert.equal(recommendAdventure(world,DEV_BALANCE,{...p,terrain:'trail'},[place],WORLD_REGIONS,now).places.length,0);
  const region:WorldRegions={...WORLD_REGIONS,regions:[{id:'trail',name:'Explicit test terrain',south:place.latitude!-.01,north:place.latitude!+.01,west:place.longitude!-.01,east:place.longitude!+.01,terrain:'trail',weather:'clear',blocked:false,startsAt:0,endsAt:now+1,rarityFactor:1}]};
  assert.equal(recommendAdventure(world,DEV_BALANCE,{...p,terrain:'trail'},[place],region,now).places.length,1);region.regions[0].blocked=true;assert.equal(recommendAdventure(world,DEV_BALANCE,p,[place],region,now).places.length,0);assert.equal(recommendAdventure(world,DEV_BALANCE,p,[place],region,now+1).places.length,1);
  assert.equal(recommendAdventure(world,DEV_BALANCE,p,[place],WORLD_REGIONS,now+15000).locationUsed,false);assert.equal(recommendAdventure(newDevWorld(),DEV_BALANCE,p,[place],WORLD_REGIONS,now).places.length,0);world.latestGpsValid=false;assert.equal(recommendAdventure(world,DEV_BALANCE,p,[place],WORLD_REGIONS,now).places.length,0);
});

test('TR-095 Endurance estimate agrees with the accepted GPS reducer, including fractional Bicycle effort rather than a plan bonus',()=>{
  for(const movement of ['foot','bicycle']as const){let world=reduceDevEvent(newDevWorld(),{kind:'start',movement},now-1000,DEV_BALANCE,undefined,'test-activity').world;world.xpRemainder=12.75;
    world=reduceDevEvent(world,{kind:'gps',fix:{latitude:place.latitude!,longitude:place.longitude!,accuracy:4,timestamp:now}},now).world;
    const baseline=JSON.parse(JSON.stringify(world)),next=reduceDevEvent(world,{kind:'gps',fix:{latitude:place.latitude!+.0001,longitude:place.longitude!,accuracy:4,timestamp:now+10000}},now+10000),meters=next.receipt.activity!.meters;
    // Use a longer conditional distance in the public planner; test the exact earning arithmetic separately at this tiny measured segment.
    const factor=movement==='foot'?DEV_BALANCE.footFactor:DEV_BALANCE.bicycleFactor;assert.equal(next.receipt.awards.endurance||0,Math.floor((baseline.xpRemainder+meters*factor)/DEV_BALANCE.enduranceMetersPerXp));
    const estimate=recommendAdventure(baseline,DEV_BALANCE,{...prefs,movement,meters:1000},[],WORLD_REGIONS,now);assert.equal(estimate.xp.endurance,Math.floor((baseline.xpRemainder+1000*factor)/DEV_BALANCE.enduranceMetersPerXp));
  }
});

test('TR-092 shared planning reads only the authenticated owner and current rules, with no lazy spawns, player creation, reservations or rewards',async()=>{
  const f=database(),db=f.db as never;for(const id of ['p1','p2'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(id,id,'player',now);
  const world=fresh();world.game.progression!.xp.endurance=10000;f.sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,?,?)').run('p2',JSON.stringify(world),1,now);const before=await exportDevSnapshot(db,now),result=await adventureIdeas(db,'p1',prefs,now);
  assert.equal(result.levels.find(r=>r.attribute==='endurance')!.before,1);assert.equal(result.locationUsed,false);assert.equal((await exportDevSnapshot(db,now)).digest,before.digest);
  const request=(id:string,origin:string,input:unknown)=>trailApi(new Request('https://dev.invalid/api/trail/ideas',{method:'POST',headers:{'oai-authenticated-user-id':id,origin,'Content-Type':'application/json'},body:JSON.stringify(input)}),{DB:db,TRAIL_ENV:'development'});
  assert.equal((await request('p1','https://dev.invalid',prefs)).status,200);assert.equal((await request('p1','https://other.invalid',prefs)).status,403);assert.equal((await request('missing','https://dev.invalid',prefs)).status,404);assert.equal((await request('p1','https://dev.invalid',{...prefs,meters:-1})).status,400);assert.equal((await request('p1','https://dev.invalid',{...prefs,goal:'teleport'})).status,400);assert.equal((await request('p1','https://dev.invalid',{...prefs,terrain:'paved-guaranteed'})).status,400);assert.equal((await exportDevSnapshot(db,now)).digest,before.digest);f.sql.close();
});
