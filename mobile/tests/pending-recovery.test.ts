import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {trailApi} from '../../dev-server/trail/api';
import {requestHash} from '../../dev-server/trail/hash';
import {saveMaintenance} from '../../dev-server/trail/maintenance-store';
import {newDevWorld} from '../src/game/dev-world';
import {SharedWorldClient} from '../src/accounts/shared-world';
import {cancelPending} from '../../dev-server/trail/pending-store';
import {applyWorldEvent} from '../../dev-server/trail/world-store';
import {applyEncounterAction} from '../../dev-server/trail/encounter-store';
import {guardedGameDatabase} from '../../dev-server/trail/maintenance-store';

function fixture(){
  const f=database(),env={DB:f.db as never,TRAIL_ENV:'development'};
  for(const owner of ['one','two'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,0)').run(owner,owner,'player');
  f.sql.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,0,0)').run('one',JSON.stringify(newDevWorld()));
  const call=(path:string,input?:unknown,owner='one',origin='https://dev.invalid')=>trailApi(new Request('https://dev.invalid/api/trail/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':owner,origin},...(input?{body:JSON.stringify(input)}:{})}),env);
  const values=new Map<string,string>(),storage={async getItem(k:string){return values.get(k)??null;},async setItem(k:string,v:string){values.set(k,v);},async removeItem(k:string){values.delete(k);}};
  let fail=false,failCancel=false,writes=0;
  const fetcher=(async(path,init)=>{
    const route=String(path).replace('/api/trail/',''),input=init?.body?JSON.parse(String(init.body)):undefined;
    const response=await call(route,input);
    if(['events','encounter-actions'].includes(route)){writes++;if(fail){fail=false;throw new Error('Lost response after commit');}}
    if(route==='cancel-pending'&&failCancel){failCancel=false;throw new Error('Lost cancellation response');}
    return response;
  })as typeof fetch;
  const client=new SharedWorldClient(storage,fetcher);
  return{...f,call,client,values,lose(){fail=true;},loseCancel(){failCancel=true;},writes:()=>writes};
}
const envelope={id:'web:pending-recovery',revision:0,event:{kind:'start',movement:'foot'}};

test('TR-118 pending inspection is owner-scoped, same-origin, bounded and zero-write even during maintenance',async()=>{
  const f=fixture();try{
    const input={kind:'world',id:envelope.id,payload:envelope.event};
    const before=f.sql.prepare('SELECT total_changes() AS n').get()!.n;
    assert.deepEqual(await(await f.call('pending-status',input)).json(),{status:'unrecorded',revision:0});
    assert.deepEqual(await(await f.call('pending-status',input,'two')).json(),{status:'unrecorded',revision:null});
    assert.equal(f.sql.prepare('SELECT total_changes() AS n').get()!.n,before);
    assert.equal((await f.call('pending-status',input,'one','https://other.invalid')).status,403);
    assert.equal((await f.call('pending-status',{...input,id:'bad'})).status,400);
    assert.equal((await f.call('pending-status',{...input,kind:'sql-table'})).status,400);
    assert.equal((await f.call('pending-status',{...input,payload:{padding:'x'.repeat(131072)}})).status,413);
    assert.equal((await f.call('pending-status',input,'missing')).status,404);
    const anonymous=await trailApi(new Request('https://dev.invalid/api/trail/pending-status',{method:'POST',headers:{origin:'https://dev.invalid'},body:JSON.stringify(input)}),{DB:f.db as never,TRAIL_ENV:'development'});assert.equal(anonymous.status,401);
    assert.equal((await f.call('events',envelope)).status,200);
    await saveMaintenance(f.db as never,'one',{id:'pause:recovery-check',revision:0,paused:true,reason:'recovery-check',confirmed:true});
    const pausedBefore=f.sql.prepare('SELECT total_changes() AS n').get()!.n,response=await f.call('pending-status',input);
    assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{status:'committed',revision:1});
    assert.deepEqual(await(await f.call('pending-status',{...input,payload:{kind:'stop'}})).json(),{status:'identity-conflict',revision:1});
    assert.deepEqual(await(await f.call('pending-status',input,'two')).json(),{status:'unrecorded',revision:null});
    assert.equal(f.sql.prepare('SELECT total_changes() AS n').get()!.n,pausedBefore);
  }finally{f.sql.close();}
});

test('TR-118 confirmed lost responses recover without duplicate event/reward writes; unconfirmed actions are retained',async()=>{
  const f=fixture();try{
    await f.client.profile();await f.client.load();f.lose();await assert.rejects(f.client.dispatch({kind:'start',movement:'foot'},0),/Lost response/);
    const raw=f.values.get('trail-relics.dev.shared.pending.v1:one');assert.ok(raw);
    const before=f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n;
    const recovered=await f.client.discardStalePending();assert.equal(recovered.revision,1);assert.equal(await f.client.pending(),false);assert.equal(f.writes(),1);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,before);
    const unknown=JSON.stringify({...envelope,id:'web:unknown-action',revision:1});f.values.set('trail-relics.dev.shared.pending.v1:one',unknown);
    await assert.rejects(f.client.discardStalePending(),/not confirmed/);assert.equal(f.values.get('trail-relics.dev.shared.pending.v1:one'),unknown);
    assert.equal(f.writes(),1);
  }finally{f.sql.close();}
});

test('TR-118 an unrecorded stale world CAS can be explicitly cleared without executing or reissuing it',async()=>{
  const f=fixture();try{
    await f.client.profile();await f.call('events',envelope);
    f.values.set('trail-relics.dev.shared.pending.v1:one',JSON.stringify({...envelope,id:'web:stale-unrecorded'}));
    assert.equal((await f.client.discardStalePending()).revision,1);assert.equal(await f.client.pending(),false);assert.equal(f.writes(),0);
    assert.equal((await f.call('events',{...envelope,id:'web:stale-unrecorded'})).status,409,'late original request cannot pass its old CAS');
  }finally{f.sql.close();}
});

test('TR-118 observed progress rewind blocks retry and reload, preserving the original journal and revision watermark',async()=>{
  const f=fixture();try{
    await f.client.profile();await f.call('events',envelope);await f.client.load();
    const raw=JSON.stringify({...envelope,id:'web:pending-after-checkpoint',revision:1});f.values.set('trail-relics.dev.shared.pending.v1:one',raw);
    // Synthetic isolated restore only; never run on a hosted database.
    f.sql.exec('DELETE FROM trail_events');f.sql.prepare('UPDATE trail_players SET revision=0').run();
    await assert.rejects(f.client.retry(),/older than/);await assert.rejects(f.client.discardStalePending(),/older than/);await assert.rejects(f.client.cancelPending('world'),/older than/);await assert.rejects(f.client.load(),/older than/);
    assert.equal(f.values.get('trail-relics.dev.shared.pending.v1:one'),raw);assert.equal(f.values.get('trail-relics.dev.shared.revision.v1:one'),'1');assert.equal(f.writes(),0);
    f.sql.exec('DELETE FROM trail_players');await assert.rejects(f.client.retry(),/older than/);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_players').get()!.n,0,'inspection must not recreate a missing player');
  }finally{f.sql.close();}
});

test('TR-118 encounter recovery confirms exact owner receipt, preserves unknown or changed identities and never settles deadlines',async()=>{
  const f=fixture();try{
    await f.client.profile();const action={kind:'create',bossId:'synthetic-boss',members:[]},input={id:'enc:lost-response',action},key='trail-relics.dev.shared.encounters.pending.v1:one',raw=JSON.stringify(input);
    f.values.set(key,raw);await assert.rejects(f.client.discardEncounterPending(),/not confirmed/);assert.equal(f.values.get(key),raw);
    f.sql.prepare('INSERT INTO trail_encounter_actions(owner,id,request_hash,receipt,created_at) VALUES(?,?,?,?,0)').run('two',input.id,await requestHash(action),JSON.stringify({kind:'create',encounterId:'synthetic',reason:'created'}));
    await assert.rejects(f.client.discardEncounterPending(),/not confirmed/);
    f.sql.prepare('INSERT INTO trail_encounter_actions(owner,id,request_hash,receipt,created_at) VALUES(?,?,?,?,0)').run('one',input.id,await requestHash({...action,bossId:'other'}),'{}');
    await assert.rejects(f.client.retryEncounter(),/identity differs/);assert.equal(f.values.get(key),raw);assert.equal(f.writes(),0);
    f.sql.prepare('UPDATE trail_encounter_actions SET request_hash=? WHERE owner=?').run(await requestHash(action),'one');
    const changes=f.sql.prepare('SELECT total_changes() AS n').get()!.n;
    assert.deepEqual(await(await f.call('pending-status',{kind:'encounter',id:input.id,payload:action})).json(),{status:'committed',revision:0});
    assert.equal(f.sql.prepare('SELECT total_changes() AS n').get()!.n,changes);
    await f.client.discardEncounterPending();assert.equal(await f.client.pendingEncounter(),false);assert.equal(f.writes(),0);
  }finally{f.sql.close();}
});

test('TR-118 explicit cancellation records a terminal receipt; late world/encounter requests cannot change gameplay',async()=>{
  const f=fixture();try{
    await f.client.profile();const worldBefore=f.sql.prepare('SELECT * FROM trail_players').all();
    f.values.set('trail-relics.dev.shared.pending.v1:one',JSON.stringify(envelope));await f.client.cancelPending('world');assert.equal(await f.client.pending(),false);
    const late=await applyWorldEvent(f.db as never,'one',envelope.id,0,{kind:'start',movement:'foot'});
    assert.equal(late.replayed,true);assert.equal(late.receipt.accepted,false);assert.match(late.receipt.reason,/cancelled/);assert.equal(late.world.game.gold,0);assert.notEqual(late.world.game.adventure?.status,'active');
    const encounter={id:'enc:cancelled-request',action:{kind:'create' as const,bossId:'no-boss',members:[]}};
    f.values.set('trail-relics.dev.shared.encounters.pending.v1:one',JSON.stringify(encounter));await f.client.cancelPending('encounter');
    const retry=await applyEncounterAction(f.db as never,'one',encounter.id,encounter.action);assert.equal(retry.replayed,true);assert.equal(retry.view,null);assert.match(retry.receipt.reason,/cancelled/);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_encounters').get()!.n,0);assert.deepEqual(f.sql.prepare('SELECT * FROM trail_players').all(),worldBefore);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='pending.cancel'").get()!.n,2);
    assert.equal((await f.call('cancel-pending',{kind:'world',id:envelope.id,payload:envelope.event,confirmed:true})).status,200);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_audit').get()!.n,2,'repeated cancellation does not add another receipt');
  }finally{f.sql.close();}
});

test('TR-118 cancellation requires explicit origin/confirmation, preserves committed actions and is blocked during maintenance',async()=>{
  const f=fixture();try{
    const input={kind:'world',id:envelope.id,payload:envelope.event,confirmed:true};
    assert.equal((await f.call('cancel-pending',{...input,confirmed:false})).status,400);assert.equal((await f.call('cancel-pending',input,'one','https://other.invalid')).status,403);
    await f.call('events',envelope);const before=f.sql.prepare('SELECT * FROM trail_players').all();
    assert.deepEqual(await(await f.call('cancel-pending',input)).json(),{status:'recorded'});assert.deepEqual(f.sql.prepare('SELECT * FROM trail_players').all(),before);
    assert.equal((await f.call('cancel-pending',{...input,payload:{kind:'stop'}})).status,409);
    await saveMaintenance(f.db as never,'one',{id:'pause:cancel-test',revision:0,paused:true,reason:'recovery-check',confirmed:true});
    assert.equal((await f.call('cancel-pending',{...input,id:'web:paused-cancel'})).status,503);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='pending.cancel'").get()!.n,0);
  }finally{f.sql.close();}
});

test('TR-118 either side of an original/cancellation transaction race wins once, with no contradictory gameplay receipt',async()=>{
  for(const winner of ['original','cancellation']){
    const f=fixture();try{
      const batch=f.db.batch.bind(f.db);let raced=false;
      f.db.batch=async statements=>{if(!raced){raced=true;if(winner==='original')await applyWorldEvent(f.db as never,'one',envelope.id,0,{kind:'start',movement:'foot'});else await cancelPending(f.db as never,'one',{kind:'world',id:envelope.id,payload:envelope.event,confirmed:true});}return batch(statements);};
      if(winner==='original')assert.deepEqual(await cancelPending(f.db as never,'one',{kind:'world',id:envelope.id,payload:envelope.event,confirmed:true}),{status:'recorded'});
      else{const result=await applyWorldEvent(f.db as never,'one',envelope.id,0,{kind:'start',movement:'foot'});assert.equal(result.receipt.accepted,false);}
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,1);assert.equal(f.sql.prepare('SELECT revision FROM trail_players').get()!.revision,winner==='original'?1:0);
      assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='pending.cancel'").get()!.n,winner==='original'?0:1);
    }finally{f.sql.close();}
  }
});

test('TR-118 cancellation write fences include a pause racing the cancellation commit',async()=>{
  const f=fixture();try{
    const batch=f.db.batch.bind(f.db);let paused=false;
    f.db.batch=async statements=>{if(!paused){paused=true;await saveMaintenance(f.db as never,'one',{id:'pause:cancel-race',revision:0,paused:true,reason:'recovery-check',confirmed:true});}return batch(statements);};
    await assert.rejects(cancelPending(guardedGameDatabase(f.db as never,0),'one',{kind:'world',id:envelope.id,payload:envelope.event,confirmed:true}),/maintenance/i);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,0);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='pending.cancel'").get()!.n,0);
  }finally{f.sql.close();}
});

test('TR-118 lost cancellation response retains its envelope and replay returns cancellation without gameplay or duplicate audit',async()=>{
  const f=fixture();try{
    await f.client.profile();const key='trail-relics.dev.shared.pending.v1:one',raw=JSON.stringify(envelope);f.values.set(key,raw);f.loseCancel();
    await assert.rejects(f.client.cancelPending('world'),/Lost cancellation response/);assert.equal(f.values.get(key),raw);
    const result=await f.client.retry();assert.equal(result.receipt.accepted,false);assert.match(result.receipt.reason,/cancelled/);assert.equal(await f.client.pending(),false);
    assert.equal(f.sql.prepare('SELECT revision FROM trail_players').get()!.revision,0);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,1);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='pending.cancel'").get()!.n,1);
  }finally{f.sql.close();}
});
