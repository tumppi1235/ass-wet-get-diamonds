import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {trailApi} from '../../dev-server/trail/api';
import {DEV_SCOPE,PROD_SCOPE,serviceScope} from '../../dev-server/trail/service-scope';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {validateSnapshot} from '../../dev-server/trail/snapshot-format';
import {compareRecovery,recoveryStatus} from '../../dev-server/trail/recovery-store';
import {SharedWorldClient} from '../src/accounts/shared-world';
function fixture(environment:'development'|'production'){
  const f=database(),scope=environment==='production'?PROD_SCOPE:DEV_SCOPE,env={DB:f.db as never,TRAIL_ENV:environment,TRAIL_PROJECT_ID:scope.projectId,TRAIL_ADMIN_EMAIL:'owner@example.invalid'};
  const call=(path:string,input?:unknown,owner='owner',email='owner@example.invalid')=>trailApi(new Request('https://'+environment+'.invalid/api/trail/'+path,{method:input?'POST':'GET',headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':email,origin:'https://'+environment+'.invalid'},...(input?{body:JSON.stringify(input)}:{})}),env);
  return{...f,env,scope,call};
}
test('TR-111/112 production requires its own pinned project/environment; dev configuration cannot masquerade as production',async()=>{
  const p=fixture('production');try{
    const health=await(await p.call('health')).json();assert.equal(health.environment,'production');assert.equal(health.projectId,PROD_SCOPE.projectId);
    assert.throws(()=>serviceScope({TRAIL_ENV:'production'}));assert.throws(()=>serviceScope({TRAIL_ENV:'production',TRAIL_PROJECT_ID:DEV_SCOPE.projectId}));assert.throws(()=>serviceScope({TRAIL_ENV:'development',TRAIL_PROJECT_ID:PROD_SCOPE.projectId}));
    assert.equal((await trailApi(new Request('https://production.invalid/api/trail/health'),{...p.env,TRAIL_PROJECT_ID:DEV_SCOPE.projectId})).status,503);
    assert.equal((await trailApi(new Request('https://production.invalid/api/trail/world'),p.env)).status,401);
  }finally{p.sql.close();}
});
test('TR-112/119 shared production journals, identity and ledger writes stay separate from dev and existing phone-local saves',async()=>{
  const p=fixture('production'),d=fixture('development'),values=new Map<string,string>([['trail-relics.profiles.v1','existing phone save'],['trail-relics.dev.shared.pending.v1:owner','dev journal stays here']]),storage={async getItem(k:string){return values.get(k)??null;},async setItem(k:string,v:string){values.set(k,v);},async removeItem(k:string){values.delete(k);}};let lose=true;
  try{
    const client=new SharedWorldClient(storage,(async(path,init)=>{const result=await p.call(String(path).replace('/api/trail/',''),init?.body?JSON.parse(String(init.body)):undefined);if(lose&&String(path).endsWith('/events')){lose=false;throw Error('Lost production response');}return result;})as typeof fetch,'production');
    await client.join('Owner');assert.equal((await client.load()).revision,0);await assert.rejects(client.dispatch({kind:'start',movement:'foot'},0),/Lost production/);assert.equal(await client.pending(),true);assert.ok(values.has('trail-relics.shared.pending.v1:owner'));assert.equal((await client.retry()).replayed,true);
    assert.equal(values.get('trail-relics.profiles.v1'),'existing phone save');assert.equal(values.get('trail-relics.dev.shared.pending.v1:owner'),'dev journal stays here');assert.equal(d.sql.prepare('SELECT COUNT(*) AS n FROM trail_members').get()!.n,0);assert.equal(d.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,0);
    const record=JSON.parse(String(p.sql.prepare('SELECT state FROM trail_players').get()!.state));assert.equal(record.game.gold,0);assert.equal(record.game.collection.length,0);assert.equal((await recoveryStatus(p.env.DB,p.env)).generation,'prod-initial-1');
    const mismatched=new SharedWorldClient(storage,(async(path,init)=>d.call(String(path).replace('/api/trail/',''),init?.body?JSON.parse(String(init.body)):undefined))as typeof fetch,'production');await d.call('me',{displayName:'Dev owner'});await assert.rejects(mismatched.profile(),/environment mismatch/);
  }finally{p.sql.close();d.sql.close();}
});
test('TR-118 production snapshots and reconciliation reject development snapshots even with valid checksums',async()=>{
  const p=fixture('production'),d=fixture('development');try{
    await p.call('me',{displayName:'Owner'});const prod=await exportDevSnapshot(p.env.DB,1,PROD_SCOPE),dev=await exportDevSnapshot(d.env.DB,1);
    assert.equal(prod.environment,'production');assert.equal(prod.projectId,PROD_SCOPE.projectId);assert.equal(prod.format,'trail-relics-shared-world');await validateSnapshot(prod,PROD_SCOPE);await assert.rejects(validateSnapshot(prod),/environment/);await assert.rejects(validateSnapshot(dev,PROD_SCOPE),/environment/);await assert.rejects(compareRecovery(dev,prod,PROD_SCOPE),/environment/);
    assert.equal((await p.call('admin/snapshot',{},'ordinary','person@example.invalid')).status,404);await p.call('me',{displayName:'Player',role:'admin'},'ordinary','person@example.invalid');assert.equal((await p.call('admin/snapshot',{},'ordinary','person@example.invalid')).status,403);
  }finally{p.sql.close();d.sql.close();}
});
test('TR-118 production requires a production generation and denies stale development envelopes before any reward write',async()=>{
  const p=fixture('production');try{
    await p.call('me',{displayName:'Owner'});const event={id:'production:start:1',revision:0,event:{kind:'start',movement:'foot'}};
    assert.equal((await p.call('events',event)).status,503);assert.equal((await p.call('events',{...event,generation:'dev-initial-1'})).status,503);assert.equal(p.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,0);assert.equal((await p.call('events',{...event,generation:'prod-initial-1'})).status,200);
    const result=await(await p.call('events',{...event,generation:'prod-initial-1'})).json();assert.equal(result.replayed,true);assert.equal(result.world.game.gold,0);assert.equal(p.sql.prepare('SELECT COUNT(*) AS n FROM trail_events').get()!.n,1);
  }finally{p.sql.close();}
});
