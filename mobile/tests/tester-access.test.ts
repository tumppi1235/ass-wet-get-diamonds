import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {trailApi} from '../../dev-server/trail/api';
import {applyWorldEvent} from '../../dev-server/trail/world-store';
import {saveTesterAccess,loadTesterAccess,testerAllowed} from '../../dev-server/trail/tester-access';
import {guardedGameDatabase} from '../../dev-server/trail/maintenance-store';
import {SharedWorldClient} from '../src/accounts/shared-world';
async function fixture(){const f=database(),binding=f.db as never,env={DB:binding,TRAIL_ENV:'development'};for(const[id,role]of [['admin','admin'],['player','player'],['other','player']])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,0)').run(id,id,role);await applyWorldEvent(binding,'player','test:initial-start',0,{kind:'start',movement:'foot'});const call=(path:string,input?:unknown,owner='admin',origin='https://dev.invalid')=>trailApi(new Request('https://dev.invalid/api/trail/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':owner,origin},...(input?{body:JSON.stringify(input)}:{})}),env);return{...f,binding,env,call};}
const change={id:'tester:access-pause',revision:0,target:'player',allowed:false,confirmed:true};
test('TR-041 tester controls require admin, own origin, explicit confirmation and current revisions; no role or hosting escalation',async()=>{
  const f=await fixture();try{
    assert.equal((await f.call('admin/tester-access',change,'player')).status,403);assert.equal((await f.call('admin/tester-access',change,'admin','https://other.invalid')).status,403);assert.equal((await f.call('admin/tester-access',{...change,confirmed:false})).status,400);assert.equal((await f.call('admin/tester-access',{...change,target:'admin'})).status,403);assert.equal((await f.call('admin/tester-access',{...change,target:'missing'})).status,404);
    assert.equal((await f.call('admin/tester-access',change)).status,200);assert.equal((await f.call('admin/tester-access',{...change,id:'tester:stale-action',allowed:true})).status,409);assert.equal((await f.call('admin/tester-access',{...change,allowed:true})).status,409);
    const listing=await(await f.call('admin/tester-access')).json();assert.equal(listing.hostingAudienceUnchanged,true);assert.equal(listing.players.find((p:{id:string})=>p.id==='admin').role,'admin');assert.equal(listing.players.find((p:{id:string})=>p.id==='player').allowed,false);
    assert.equal((await f.call('me',{displayName:'No escalation',role:'admin'},'new-player')).status,200);assert.equal(f.sql.prepare("SELECT role FROM trail_members WHERE id='new-player'").get()!.role,'player');
  }finally{f.sql.close();}
});
test('TR-041 paused tester cannot play or mutate lazy world reads; progress, pending journals and roles remain intact',async()=>{
  const f=await fixture();try{
    const before=f.sql.prepare("SELECT * FROM trail_players WHERE id='player'").get();await saveTesterAccess(f.binding,'admin',change);
    assert.equal((await f.call('world',undefined,'player')).status,403);assert.equal((await f.call('events',{id:'test:blocked-event',revision:1,event:{kind:'stop'}},'player')).status,403);assert.equal((await f.call('encounters',undefined,'player')).status,403);assert.equal((await f.call('me',undefined,'player')).status,200);assert.equal((await f.call('recovery-status',undefined,'player')).status,200);
    const values=new Map<string,string>(),storage={async getItem(k:string){return values.get(k)??null;},async setItem(k:string,v:string){values.set(k,v);},async removeItem(k:string){values.delete(k);}};const client=new SharedWorldClient(storage,(async(path,init)=>f.call(String(path).replace('/api/trail/',''),init?.body?JSON.parse(String(init.body)):undefined,'player'))as typeof fetch);await client.profile();await assert.rejects(client.dispatch({kind:'stop'},1),/access is paused/);assert.equal(await client.pending(),true);assert.deepEqual(f.sql.prepare("SELECT * FROM trail_players WHERE id='player'").get(),before);
    await saveTesterAccess(f.binding,'admin',{...change,id:'tester:access-enable',revision:1,allowed:true});assert.equal((await client.retry()).receipt.reason,'adventure stopped');assert.equal(await client.pending(),false);
    assert.equal((await saveTesterAccess(f.binding,'admin',change)).replayed,true);assert.equal(testerAllowed(await loadTesterAccess(f.binding),'player'),true,'replaying the earlier pause must not undo a later enable');
  }finally{f.sql.close();}
});
test('TR-041 a tester suspension racing an in-flight action fences the receipt and world in the same transaction',async()=>{
  const f=await fixture();try{
    const db=guardedGameDatabase(f.binding,0,undefined,'player'),batch=f.db.batch.bind(f.db);let changed=false;
    f.db.batch=async statements=>{if(!changed){changed=true;await saveTesterAccess(f.binding,'admin',change);}return batch(statements);};
    await assert.rejects(applyWorldEvent(db,'player','test:race-suspension',1,{kind:'stop'}));assert.equal(f.sql.prepare("SELECT revision FROM trail_players WHERE id='player'").get()!.revision,1);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_events WHERE id='test:race-suspension'").get()!.n,0);
  }finally{f.sql.close();}
});
test('TR-041 access updates guard actor and target roles in the commit transaction',async()=>{
  const f=await fixture();try{const batch=f.db.batch.bind(f.db);let changed=false;f.db.batch=async statements=>{if(!changed){changed=true;f.sql.prepare("UPDATE trail_members SET role='admin' WHERE id='player'").run();}return batch(statements);};await assert.rejects(saveTesterAccess(f.binding,'admin',change),/changed during/);assert.equal((await loadTesterAccess(f.binding)).revision,0);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='tester.access'").get()!.n,0);}finally{f.sql.close();}
});
