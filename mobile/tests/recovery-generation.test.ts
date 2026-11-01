import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {recoveryStatus,compareRecovery,sealRecovery,INITIAL_GENERATION} from '../../dev-server/trail/recovery-store';
import {saveMaintenance,guardedGameDatabase} from '../../dev-server/trail/maintenance-store';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {SNAPSHOT_TABLES,SNAPSHOT_COLUMNS} from '../../dev-server/trail/snapshot-format';
import {requestHash} from '../../dev-server/trail/hash';
import {applyWorldEvent} from '../../dev-server/trail/world-store';
import {trailApi} from '../../dev-server/trail/api';
import {SharedWorldClient} from '../src/accounts/shared-world';
async function fixture(){const f=database(),binding=f.db as never;
  for(const[id,role]of [['admin','admin'],['one','player']])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,0)').run(id,id,role);
  await applyWorldEvent(binding,'one','world:before-recovery',0,{kind:'start',movement:'foot'});
  await saveMaintenance(binding,'admin',{id:'pause:before-recovery',revision:0,paused:true,reason:'recovery-check',confirmed:true});
  const baseline=await exportDevSnapshot(binding),env={DB:binding,TRAIL_ENV:'development',TRAIL_RECOVERY_GENERATION:'reviewed-generation-2',TRAIL_RECOVERY_BASELINE_SHA256:baseline.digest,TRAIL_RECOVERY_DRAINED_GENERATION:'reviewed-generation-2'};
  const call=(path:string,input?:unknown,owner='admin')=>trailApi(new Request('https://dev.invalid/api/trail/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':owner,origin:'https://dev.invalid'},...(input?{body:JSON.stringify(input)}:{})}),env);
  return{...f,binding,baseline,env,call};
}
test('TR-118 external recovery generation quarantines an older/equal-counter database without blocking identity, snapshot and receipt review',async()=>{
  const f=await fixture();try{
    assert.equal((await recoveryStatus(f.binding,{})).ready,true);assert.equal((await recoveryStatus(f.binding,f.env)).ready,false);
    const before=f.sql.prepare('SELECT total_changes() AS n').get()!.n;
    assert.equal((await f.call('world',undefined,'one')).status,503);assert.equal((await f.call('recovery-status',undefined,'one')).status,200);assert.equal((await f.call('me',undefined,'one')).status,200);assert.equal((await f.call('admin/recovery',undefined,'one')).status,403);
    assert.equal((await f.call('admin/snapshot',{})).status,200);assert.equal(f.sql.prepare('SELECT total_changes() AS n').get()!.n,before);
    const resume=new Request('https://dev.invalid/api/trail/admin/maintenance',{method:'PUT',headers:{'oai-authenticated-user-id':'admin',origin:'https://dev.invalid'},body:JSON.stringify({id:'resume:unsafe-restore',revision:1,paused:false,reason:'normal',confirmed:true})});assert.equal((await trailApi(resume,f.env)).status,503);
    assert.equal((await f.call('admin/recovery',{baseline:f.baseline,confirmed:true},'one')).status,403);
  }finally{f.sql.close();}
});
test('TR-118 complete reconciliation detects changes in every gameplay table, irrespective of unchanged player counters',async()=>{
  const f=await fixture();try{
    assert.equal((await compareRecovery(f.baseline,f.baseline)).matches,true);
    for(const table of SNAPSHOT_TABLES.filter(t=>t!=='trail_integrity')){
      const next=structuredClone(f.baseline);next.tables[table].push(Object.fromEntries(SNAPSHOT_COLUMNS[table].map(c=>[c,null])));const{digest:_,...payload}=next;next.digest=await requestHash(payload);
      assert.deepEqual((await compareRecovery(f.baseline,next)).changedTables,[table]);
    }
    f.sql.prepare('DELETE FROM trail_events').run();await assert.rejects(sealRecovery(f.binding,f.env,'admin',{baseline:f.baseline,confirmed:true}),/trail_events/);assert.equal((await recoveryStatus(f.binding,f.env)).ready,false);
  }finally{f.sql.close();}
});
test('TR-118 sealing requires external pinned baseline, drain acknowledgement, pause and explicit confirmation; it preserves all gameplay',async()=>{
  const f=await fixture();try{
    await assert.rejects(sealRecovery(f.binding,f.env,'admin',{baseline:f.baseline}),/Confirm/);
    await assert.rejects(sealRecovery(f.binding,{...f.env,TRAIL_RECOVERY_DRAINED_GENERATION:undefined},'admin',{baseline:f.baseline,confirmed:true}),/drain acknowledgement/);
    await assert.rejects(sealRecovery(f.binding,{...f.env,TRAIL_RECOVERY_BASELINE_SHA256:'0'.repeat(64)},'admin',{baseline:f.baseline,confirmed:true}),/pinned outside/);
    const before=f.sql.prepare('SELECT * FROM trail_players').all(),events=f.sql.prepare('SELECT * FROM trail_events').all();
    const result=await sealRecovery(f.binding,f.env,'admin',{baseline:f.baseline,confirmed:true});assert.equal(result.ready,true);assert.equal(result.generation,f.env.TRAIL_RECOVERY_GENERATION);
    assert.equal((await sealRecovery(f.binding,f.env,'admin',{baseline:f.baseline,confirmed:true})).replayed,true);assert.deepEqual(f.sql.prepare('SELECT * FROM trail_players').all(),before);assert.deepEqual(f.sql.prepare('SELECT * FROM trail_events').all(),events);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='recovery.seal'").get()!.n,1);
  }finally{f.sql.close();}
});
test('TR-118 reconciliation checks all ledgers atomically against writes racing its final transaction',async()=>{
  const f=await fixture();try{
    const batch=f.db.batch.bind(f.db);let calls=0;
    f.db.batch=async statements=>{if(++calls===2)f.sql.prepare("DELETE FROM trail_events WHERE owner='one'").run();return batch(statements);};
    await assert.rejects(sealRecovery(f.binding,f.env,'admin',{baseline:f.baseline,confirmed:true}),/changed during/);assert.equal((await recoveryStatus(f.binding,f.env)).ready,false);assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM trail_audit WHERE action='recovery.seal'").get()!.n,0);
  }finally{f.sql.close();}
});
test('TR-118 sealed generation fences old requests even after maintenance revision reuse, and old envelopes cannot replay',async()=>{
  const f=await fixture();try{
    await sealRecovery(f.binding,f.env,'admin',{baseline:f.baseline,confirmed:true});await saveMaintenance(f.binding,'admin',{id:'resume:reviewed-recovery',revision:1,paused:false,reason:'normal',confirmed:true});
    // Explicit isolated counter reuse: new recovery generation is the independent fence.
    const old=guardedGameDatabase(f.binding,2,INITIAL_GENERATION);await assert.rejects(old.prepare("UPDATE trail_players SET revision=revision+1 WHERE id='one'").run());
    const pending={id:'world:old-pending',revision:1,event:{kind:'stop'}};assert.equal((await f.call('events',pending,'one')).status,503);assert.equal((await f.call('events',{...pending,generation:INITIAL_GENERATION},'one')).status,503);
    assert.equal((await f.call('events',{...pending,generation:f.env.TRAIL_RECOVERY_GENERATION},'one')).status,200);
    assert.equal((await f.call('encounter-actions',{id:'enc:old-pending',action:{kind:'create',bossId:'none',members:[]}},'one')).status,503);
    const values=new Map<string,string>([['trail-relics.dev.shared.pending.v1:one',JSON.stringify({...pending,id:'world:unresolved-old',revision:2})]]),storage={async getItem(k:string){return values.get(k)??null;},async setItem(k:string,v:string){values.set(k,v);},async removeItem(k:string){values.delete(k);}};
    const client=new SharedWorldClient(storage,(async(path,init)=>f.call(String(path).replace('/api/trail/',''),init?.body?JSON.parse(String(init.body)):undefined,'one'))as typeof fetch);await client.profile();await assert.rejects(client.retry(),/recovery needs/);assert.equal(await client.pending(),true);
    await client.cancelPending('world');assert.equal(await client.pending(),false);assert.equal(f.sql.prepare("SELECT revision FROM trail_players WHERE id='one'").get()!.revision,2);
  }finally{f.sql.close();}
});
