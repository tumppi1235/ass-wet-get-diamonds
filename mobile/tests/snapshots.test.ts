import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,unlinkSync,rmdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {database} from './sqlite-world';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {validateSnapshot,SNAPSHOT_TABLES,SNAPSHOT_COLUMNS,MAX_SNAPSHOT_BYTES,SNAPSHOT_SCHEMA} from '../../dev-server/trail/snapshot-format';
import {requestHash} from '../../dev-server/trail/hash';
import {restoreDevSnapshot} from '../../tools/Restore-SharedDevSnapshot.mjs';
import {trailApi} from '../../dev-server/trail/api';
import {applyWorldEvent,loadWorld} from '../../dev-server/trail/world-store';
import {saveBossRules,placeBoss} from '../../dev-server/trail/boss-store';
import {applyEncounterAction} from '../../dev-server/trail/encounter-store';
import {editPlayer} from '../../dev-server/trail/player-admin';
import {BOSS_RULES} from '../src/game/bosses';
import G from '../src/game/engine';

async function recoveryFixture(){
  const f=database(),db=f.db as never;let now=1000000,sequence=0;
  for(const id of ['admin','player'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(id,id,id==='admin'?'admin':'player',now);
  await saveBossRules(db,'admin',{...BOSS_RULES,targets:{...BOSS_RULES.targets,Lesser:[.1,.1,.1,.1,.1]}},BOSS_RULES.revision);
  const boss=(await placeBoss(db,'admin',{designId:'metsanvartija',tier:'Lesser',placeId:'haukkala-gate',startsAt:0,endsAt:86400000,weaknessBonus:0},now)).boss,p=G.xy(boss.latitude,boss.longitude);
  const event=async(e:Parameters<typeof applyWorldEvent>[4])=>applyWorldEvent(db,'player','backup:event:'+ ++sequence,(await loadWorld(db,'player',now)).revision,e,now);
  const gps=async(x:number)=>{now+=5000;const geo=G.geo(p.x+x,p.y);return event({kind:'gps',fix:{latitude:geo.lat,longitude:geo.lon,accuracy:5,speed:1,timestamp:now}});};
  await gps(0);const draft=await applyEncounterAction(db,'player','backup:party:create',{kind:'create',bossId:boss.id,members:[]},now),active=await applyEncounterAction(db,'player','backup:party:activate',{kind:'activate',encounterId:draft.view!.encounter.id,revision:draft.view!.revision},now);
  now+=1000;const start=await event({kind:'start',movement:'foot'});for(let x=0;x<=140;x+=20)await gps(x);now+=1000;await event({kind:'stop'});
  const won=await applyEncounterAction(db,'player','backup:contribute',{kind:'contribute',encounterId:active.view!.encounter.id,revision:active.view!.revision,activityId:start.receipt.activity!.id},now);assert.equal(won.view!.encounter.state,'won');
  await applyEncounterAction(db,'player','backup:loot:claim',{kind:'claim-loot',encounterId:won.view!.encounter.id,revision:won.view!.revision},now);
  await event({kind:'claim',tile:boss.tileId,price:1});
  await editPlayer(db,'admin','player',(await loadWorld(db,'player',now)).revision,'backup',{},now);
  return{...f,db,now,encounter:won.view!.encounter.id};
}
function files(t:{after(fn:()=>void):void}){const folder=mkdtempSync(resolve(tmpdir(),'trail-dev-recovery-'));t.after(()=>{for(const file of readdirSync(folder)){const target=resolve(folder,file);assert.equal(dirname(target),folder);unlinkSync(target);}rmdirSync(folder);});return{input:resolve(folder,'snapshot.json'),output:resolve(folder,'restored.sqlite'),folder};}

test('TR-118 complete dev snapshot restores actual migrations, wallets, claims, activities and boss rewards into a NEW offline database',async t=>{
  const f=await recoveryFixture(),paths=files(t),snapshot=await exportDevSnapshot(f.db,f.now),before=await loadWorld(f.db,'player',f.now);
  assert.equal(snapshot.schema,SNAPSHOT_SCHEMA);assert.ok(snapshot.tables.trail_boss_rewards.length);assert.ok(snapshot.tables.trail_contributions.length);assert.ok(snapshot.tables.trail_backups.length);assert.ok(snapshot.tables.trail_claims.length);
  for(const table of SNAPSHOT_TABLES){const columns=f.sql.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name);assert.deepEqual([...columns].sort(),[...SNAPSHOT_COLUMNS[table]].sort());}
  writeFileSync(paths.input,JSON.stringify(snapshot));const result=await restoreDevSnapshot(paths.input,paths.output);assert.equal(result.hostedDatabaseChanged,false);assert.equal(result.digest,snapshot.digest);
  const restored=new DatabaseSync(paths.output);try{assert.deepEqual(JSON.parse(String(restored.prepare("SELECT state FROM trail_players WHERE id='player'").get()!.state)),before.world);assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,1);assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM trail_claims').get()!.n,1);assert.equal(restored.prepare('PRAGMA foreign_key_check').all().length,0);
    for(const table of SNAPSHOT_TABLES)assert.equal(restored.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n,snapshot.tables[table].length);
  }finally{restored.close();}
  const bytes=readFileSync(paths.output);await assert.rejects(()=>restoreDevSnapshot(paths.input,paths.output),/exist/i);assert.deepEqual(readFileSync(paths.output),bytes,'recovery never overwrites an existing database');
  assert.deepEqual((await loadWorld(f.db,'player',f.now)).world,before.world,'snapshot/drill cannot mutate source world');
});

test('TR-118 snapshots reject damage, wrong environments, incomplete tables and bad foreign keys without leaving partial restores',async t=>{
  const f=await recoveryFixture(),paths=files(t),snapshot=await exportDevSnapshot(f.db,f.now),damaged=structuredClone(snapshot);damaged.tables.trail_claims[0].price=999;
  await assert.rejects(()=>validateSnapshot(damaged),/checksum mismatch/);await assert.rejects(()=>validateSnapshot({...snapshot,environment:'production'}),/environment/);
  const missing=structuredClone(snapshot);delete (missing.tables as Partial<typeof missing.tables>).trail_events;await assert.rejects(()=>validateSnapshot(missing),/tables/);
  const invalid=structuredClone(snapshot);invalid.tables.trail_claims[0].owner='missing-player';const{digest:_,...payload}=invalid;invalid.digest=await requestHash(payload);writeFileSync(paths.input,JSON.stringify(invalid));await assert.rejects(()=>restoreDevSnapshot(paths.input,paths.output),/FOREIGN KEY/);assert.equal(existsSync(paths.output),false);
  writeFileSync(paths.input,'x'.repeat(MAX_SNAPSHOT_BYTES+1));await assert.rejects(()=>restoreDevSnapshot(paths.input,paths.output),/too large/);assert.equal(existsSync(paths.output),false);
});

test('TR-118 export is admin-only, same-origin and all-or-nothing when data exceeds limits',async()=>{
  const f=await recoveryFixture(),env={DB:f.db,TRAIL_ENV:'development'};
  const call=(owner:string,origin='https://dev.example')=>trailApi(new Request('https://dev.example/api/trail/admin/snapshot',{method:'POST',headers:{'oai-authenticated-user-id':owner,origin}}),env);
  assert.equal((await call('player')).status,403);assert.equal((await call('admin','https://foreign.example')).status,403);const good=await call('admin');assert.equal(good.status,200);assert.equal(good.headers.get('cache-control'),'no-store');await validateSnapshot(await good.json());
  f.sql.prepare("UPDATE trail_audit SET details=? WHERE id=(SELECT id FROM trail_audit LIMIT 1)").run('x'.repeat(MAX_SNAPSHOT_BYTES));const tooLarge=await call('admin');assert.equal(tooLarge.status,413);assert.equal((await tooLarge.json()).tables,undefined,'no misleading truncated snapshot escapes');
  f.sql.exec('CREATE TABLE trail_future_schema(id TEXT)');assert.equal((await call('admin')).status,503,'an older exporter cannot omit a newly migrated game table');
});

test('TR-118 older schema-5 snapshots remain recoverable after the claim index migrations',async t=>{
  const f=await recoveryFixture(),paths=files(t),legacy=structuredClone(await exportDevSnapshot(f.db,f.now));legacy.schema=5;
  for(const row of legacy.tables.trail_claims){delete row.cell_i;delete row.cell_j;}const{digest:_,...payload}=legacy;legacy.digest=await requestHash(payload);writeFileSync(paths.input,JSON.stringify(legacy));
  const result=await restoreDevSnapshot(paths.input,paths.output);assert.equal(result.schema,5);const restored=new DatabaseSync(paths.output);try{assert.equal(restored.prepare('PRAGMA table_info(trail_claims)').all().some(r=>r.name==='cell_i'),false);assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM trail_claims').get()!.n,1);assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM trail_boss_rewards').get()!.n,1);}finally{restored.close();}
});
