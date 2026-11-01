import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {loadMaintenance,saveMaintenance,guardedGameDatabase} from '../../dev-server/trail/maintenance-store';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {trailApi} from '../../dev-server/trail/api';
import {newDevWorld} from '../src/game/dev-world';
import {SharedWorldClient} from '../src/accounts/shared-world';
const now=1000000;
function setup(){const f=database();for(const[id,role]of [['admin','admin'],['player','player']])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(id,id,role,now);f.sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,?,?)').run('player',JSON.stringify(newDevWorld()),0,now);return{...f,binding:f.db as never};}
const pause=(revision=0,id='pause:maintenance-1')=>({id,revision,paused:true,reason:'recovery-check' as const,confirmed:true});
const resume=(revision=1,id='resume:maintenance-1')=>({id,revision,paused:false,reason:'normal' as const,confirmed:true});
function request(path:string,owner='player',method='GET',input?:unknown,origin='https://dev.invalid'){return new Request('https://dev.invalid/api/trail/'+path,{method,headers:{'oai-authenticated-user-id':owner,origin,'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});}

test('TR-118 maintenance transitions are explicit, versioned, audited and idempotent; a replay shows current state instead of undoing a later transition',async()=>{
  const f=setup(),worldBefore=f.sql.prepare('SELECT * FROM trail_players').all();assert.equal((await loadMaintenance(f.binding)).paused,false);
  await assert.rejects(()=>saveMaintenance(f.binding,'admin',{...pause(),confirmed:false},now),/Confirm/);
  const first=await saveMaintenance(f.binding,'admin',pause(),now);assert.equal(first.maintenance.revision,1);assert.equal(first.maintenance.paused,true);assert.equal((await saveMaintenance(f.binding,'admin',pause(),now)).replayed,true);
  await assert.rejects(()=>saveMaintenance(f.binding,'admin',{...pause(),reason:'planned-update'},now),/identity changed/);await assert.rejects(()=>saveMaintenance(f.binding,'admin',resume(0),now),/state changed/);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_audit').get()!.n,1);
  await saveMaintenance(f.binding,'admin',resume(),now+1);const replay=await saveMaintenance(f.binding,'admin',pause(),now+2);assert.equal(replay.appliedRevision,1);assert.equal(replay.maintenance.revision,2);assert.equal(replay.maintenance.paused,false);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_audit').get()!.n,2);assert.deepEqual(f.sql.prepare('SELECT * FROM trail_players').all(),worldBefore);f.sql.close();
});

test('TR-118 maintenance blocks ordinary actions, lazy GET writes and admin edits, while authenticated status/control and private snapshots stay available',async()=>{
  const f=setup(),env={DB:f.binding,TRAIL_ENV:'development'},before=f.sql.prepare('SELECT * FROM trail_players').all();
  assert.equal((await trailApi(request('admin/maintenance','player','PUT',pause()),env)).status,403);assert.equal((await trailApi(request('admin/maintenance','admin','PUT',pause(),'https://other.invalid'),env)).status,403);assert.equal((await trailApi(request('admin/maintenance','admin','PUT',pause()),env)).status,200);
  const snapshot=await exportDevSnapshot(f.binding,now);
  for(const[path,method,input]of [['world','GET'],['spawns','GET'],['claims?south=62&north=62.1&west=25&east=25.1','GET'],['encounters','GET'],['events','POST',{id:'test:blocked-event',revision:0,event:{kind:'start',movement:'foot'}}],['me','POST',{displayName:'New account'}],['admin/balance','PUT',{}]]as const){const r=await trailApi(request(path,path==='me'?'new-player':path.startsWith('admin/')?'admin':'player',method,input),env);assert.equal(r.status,503,path);assert.equal((await r.json()).code,'dev-maintenance');assert.equal(r.headers.get('Retry-After'),'30');}
  assert.equal((await trailApi(request('me'),env)).status,200);const status=await(await trailApi(request('maintenance'),env)).json();assert.deepEqual(Object.keys(status.maintenance).sort(),['changedAt','paused','reason','revision']);assert.equal((await trailApi(new Request('https://dev.invalid/api/trail/maintenance'),env)).status,401);
  assert.equal((await trailApi(request('admin/snapshot','player','POST',{}),env)).status,403);const exported=await trailApi(request('admin/snapshot','admin','POST',{}),env);assert.equal(exported.status,200);assert.equal((await exported.json()).tables.trail_configs.find((r:{id:string})=>r.id==='maintenance').revision,1);assert.deepEqual((await exportDevSnapshot(f.binding,now)).tables,snapshot.tables);assert.deepEqual(f.sql.prepare('SELECT * FROM trail_players').all(),before);
  assert.equal((await trailApi(request('admin/maintenance','admin','PUT',resume()),env)).status,200);assert.equal((await trailApi(request('world'),env)).status,200);f.sql.close();
});

test('TR-118 every guarded transaction and standalone write rejects paused or stale epochs, even after reopening, without partial wallet/receipt writes',async()=>{
  const f=setup(),guarded=guardedGameDatabase(f.binding,0),before=f.sql.prepare('SELECT * FROM trail_players').all(),batch=[guarded.prepare("UPDATE trail_players SET revision=revision+1 WHERE id='player'"),guarded.prepare("INSERT INTO trail_integrity(id,valid) VALUES('synthetic-wallet-receipt',1)")];
  await saveMaintenance(f.binding,'admin',pause(),now);await assert.rejects(()=>guarded.batch(batch),/maintenance/i);await assert.rejects(()=>guarded.prepare("UPDATE trail_players SET revision=99 WHERE id='player'").run(),/maintenance/i);
  await saveMaintenance(f.binding,'admin',resume(),now+1);await assert.rejects(()=>guarded.batch(batch),/maintenance/i);assert.deepEqual(f.sql.prepare('SELECT * FROM trail_players').all(),before);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_integrity WHERE id='synthetic-wallet-receipt'").get()!.n,0);
  const fresh=guardedGameDatabase(f.binding,2);await fresh.batch([fresh.prepare("UPDATE trail_players SET revision=revision+1 WHERE id='player'"),fresh.prepare("INSERT INTO trail_integrity(id,valid) VALUES('synthetic-wallet-receipt',1)")]);assert.equal(f.sql.prepare("SELECT revision FROM trail_players WHERE id='player'").get()!.revision,1);f.sql.close();
});

test('TR-118 a request already past the API maintenance check cannot write after pause wins the database race',async()=>{
  for(const stage of ['first-write','reward-batch']){const f=setup();let injected=false;const racing={...f.db,async batch(statements:never[]){if(!injected&&(stage==='first-write'||statements.length>=4)){injected=true;await saveMaintenance(f.binding,'admin',pause(),now);}return f.db.batch(statements);}}as never,before=f.sql.prepare('SELECT * FROM trail_players').all();
    const response=await trailApi(request('events','player','POST',{id:'test:inflight-race',revision:0,event:{kind:'start',movement:'foot'}}),{DB:racing,TRAIL_ENV:'development'});assert.equal(response.status,503,stage);assert.equal(injected,true);assert.deepEqual(f.sql.prepare('SELECT * FROM trail_players').all(),before);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,0);if(stage==='first-write')assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_spawns').get()!.n,0);f.sql.close();}
});

test('TR-118 mutation-returning queries are fenced and unsupported database escape hatches do not expose unguarded writes',async()=>{
  const f=setup(),guarded=guardedGameDatabase(f.binding,0);assert.equal((await guarded.prepare("UPDATE trail_players SET revision=revision+1 WHERE id='player' RETURNING revision").first<{revision:number}>())!.revision,1);
  await saveMaintenance(f.binding,'admin',pause(),now);await assert.rejects(()=>guarded.prepare("WITH x AS (SELECT 1) UPDATE trail_players SET revision=revision+1 WHERE id='player' RETURNING revision").all(),/maintenance/i);assert.equal(f.sql.prepare("SELECT revision FROM trail_players WHERE id='player'").get()!.revision,1);
  assert.throws(()=>guarded.exec("DELETE FROM trail_players"),/guarded/);assert.throws(()=>guarded.withSession(),/guarded/);await assert.rejects(()=>guarded.prepare("DELETE FROM trail_players").raw(),/not supported/);assert.equal((await guarded.prepare("SELECT revision FROM trail_players WHERE id='player'").first<{revision:number}>())!.revision,1,'already in-flight pure reads need not mutate the paused database');f.sql.close();
});

test('TR-118 browser pending world actions survive maintenance and retry exactly once with the same envelope after reopening',async()=>{
  const f=setup(),values=new Map<string,string>(),storage={async getItem(key:string){return values.get(key)||null;},async setItem(key:string,value:string){values.set(key,value);},async removeItem(key:string){values.delete(key);}},env={DB:f.binding,TRAIL_ENV:'development'};
  const client=new SharedWorldClient(storage,(async(input,init)=>{const headers=new Headers(init?.headers);headers.set('oai-authenticated-user-id','player');headers.set('origin','https://dev.invalid');return trailApi(new Request('https://dev.invalid'+String(input),{...init,headers}),env);})as typeof fetch,'development');
  await client.profile();await saveMaintenance(f.binding,'admin',pause(),now);await assert.rejects(()=>client.dispatch({kind:'start',movement:'foot'},0),/maintenance/i);assert.equal(await client.pending(),true);const envelope=[...values.values()][0];assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,0);
  await saveMaintenance(f.binding,'admin',resume(),now+1);const result=await client.retry();assert.equal(result.world.game.adventure!.status,'active');assert.equal(await client.pending(),false);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,1);assert.equal(f.sql.prepare('SELECT id FROM trail_events').get()!.id,JSON.parse(envelope).id);assert.equal(result.world.game.gold,0);f.sql.close();
});

test('TR-118 read-only CTE reports remain genuinely zero-write, including SQL-looking literal/comment contents',async()=>{
  const f=setup(),guarded=guardedGameDatabase(f.binding,0),before=await exportDevSnapshot(f.binding,now);
  const result=await guarded.prepare("/* UPDATE is only a comment */ WITH counts AS (SELECT COUNT(*) AS n FROM trail_members) SELECT n,'DELETE' AS label FROM counts").all<{n:number;label:string}>();assert.equal(result.results[0].n,2);assert.equal(result.results[0].label,'DELETE');assert.equal((await exportDevSnapshot(f.binding,now)).digest,before.digest);f.sql.close();
});
