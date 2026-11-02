import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {trailApi} from '../../dev-server/trail/api';
import {authenticateWatch,issueWatchLink,revokeWatchLink,storeWatchSync,trainingQuest,watchQuestStatus} from '../../dev-server/trail/garmin-store';
import {exportDevSnapshot} from '../../dev-server/trail/snapshot-store';
import {placeBoss} from '../../dev-server/trail/boss-store';
import {DEV_SCOPE,PROD_SCOPE} from '../../dev-server/trail/service-scope';
import type {WatchBatch,WatchEvent} from '../src/integrations/garmin-live';
const now=Date.now(),seconds=Math.floor(now/1000),id='1'.repeat(32),activity='watch-dev:'+seconds+':1';
function setup(){const f=database();for(const [owner,role]of [['owner','admin'],['other','admin'],['player','player']])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(owner,owner,role,now);return f;}
const batch=(events:WatchEvent[]):WatchBatch=>({protocol:1,environment:'development',kind:'observations',linkId:id,batchId:id+':'+events[0].sequence+':'+events.at(-1)!.sequence,events});
const start:WatchEvent={sequence:1,kind:'start',observedAt:seconds,activity,payload:{source:'garmin-connect-iq',profile:'synthetic',sport:1,subSport:3,startedAt:seconds-10}};
const tile:WatchEvent={sequence:2,kind:'tile',observedAt:seconds,activity,payload:{tile:'0,-13',latitude:62.2144313,longitude:25.7480764,quality:'good'}};
const input=(value:WatchBatch|null)=>({protocol:1,environment:'development',kind:'sync',linkId:id,activityId:activity,batch:value});
const headers=(owner:string)=>({'oai-authenticated-user-id':owner,origin:'https://dev.invalid','Content-Type':'application/json'});
const watchRequest=(token?:string,value:unknown=input(batch([start,tile])))=>new Request('https://dev.invalid/api/trail/garmin/sync',{method:'POST',headers:{'Content-Type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(value)});
test('TR-157 browser key management is dev/admin/same-origin, hash-only, owner-scoped and disabled by default',async()=>{
  const f=setup(),db=f.db as never,body={id,label:'Fixture Enduro',confirmed:true},env={DB:db,TRAIL_ENV:'development',TRAIL_GARMIN_HTTP_ENABLED:'1'};
  const req=(owner:string,method='POST',value:unknown=body)=>trailApi(new Request('https://dev.invalid/api/trail/admin/garmin-links',{method,headers:headers(owner),...(method==='GET'?{}:{body:JSON.stringify(value)})}),env);
  assert.equal((await req('player')).status,403);const disabled=await trailApi(new Request('https://dev.invalid/api/trail/admin/garmin-links',{method:'POST',headers:headers('owner'),body:JSON.stringify(body)}),{...env,TRAIL_GARMIN_HTTP_ENABLED:undefined});assert.equal(disabled.status,503);
  const response=await req('owner');assert.equal(response.status,200);const made=await response.json();assert.match(made.token,/^[a-f0-9]{96}$/);
  const raw=String(f.sql.prepare('SELECT document FROM trail_configs WHERE id=?').get('garmin-link:'+id)!.document);assert.equal(raw.includes(made.token.slice(32)),false);assert.match(JSON.parse(raw).tokenHash,/^[a-f0-9]{64}$/);
  assert.equal((await req('owner')).status,409);const list=await(await req('owner','GET')).json();assert.equal(list.links.length,1);assert.equal('tokenHash' in list.links[0],false);assert.equal('lastFix' in list.links[0],false);assert.equal((await(await req('other','GET')).json()).links.length,0);assert.equal((await req('other','DELETE',{id,confirmed:true})).status,404);
  const audit=JSON.stringify(f.sql.prepare('SELECT details FROM trail_audit').all());assert.equal(audit.includes(made.token.slice(32)),false);f.sql.close();
});
test('TR-158 token-only HTTPS rejects missing/wrong/expired/revoked credentials and production scope',async()=>{
  const f=setup(),db=f.db as never,issued=await issueWatchLink(db,'owner',{id,label:'Fixture',confirmed:true},now),env={DB:db,TRAIL_ENV:'development',TRAIL_GARMIN_HTTP_ENABLED:'1'};
  assert.equal((await trailApi(watchRequest(),env)).status,401);assert.equal((await trailApi(watchRequest('0'.repeat(96)),env)).status,401);
  assert.equal((await trailApi(watchRequest(issued.token),{...env,TRAIL_GARMIN_HTTP_ENABLED:undefined})).status,503);
  assert.equal((await trailApi(watchRequest(issued.token),{...env,TRAIL_ENV:'production',TRAIL_PROJECT_ID:PROD_SCOPE.projectId})).status,404);
  await assert.rejects(authenticateWatch(db,'Bearer '+issued.token,now+31*86400000));await revokeWatchLink(db,'owner',{id,confirmed:true},now);assert.equal((await trailApi(watchRequest(issued.token),env)).status,401);f.sql.close();
});
test('TR-158 HTTPS stores exact idempotent unverified batches, starts the watch quest automatically and awards nothing',async()=>{
  const f=setup(),db=f.db as never,issued=await issueWatchLink(db,'owner',{id,label:'Fixture',confirmed:true},now),env={DB:db,TRAIL_ENV:'development',TRAIL_GARMIN_HTTP_ENABLED:'1'};
  await placeBoss(db,'owner',{designId:'metsanvartija',tier:'Lesser',placeId:'sippula-trail',startsAt:now-1000,endsAt:now+86400000,weaknessBonus:0},now);
  const before=await exportDevSnapshot(db,now),first=await trailApi(watchRequest(issued.token),env);assert.equal(first.status,200);const result=await first.json();assert.equal(result.receipt.status,'stored-unverified');assert.equal(result.awardsWritten,0);assert.ok(result.bossFeed.bosses.length>0);assert.ok(result.bossFeed.bosses.every((b:{state:string})=>b.state==='nearby'));
  const repeated=await(await trailApi(watchRequest(issued.token,input(batch([{...start,payload:{startedAt:seconds-10,subSport:3,sport:1,profile:'synthetic',source:'garmin-connect-iq'}},tile]))),env)).json();assert.deepEqual(repeated.receipt,result.receipt);assert.equal(f.sql.prepare("SELECT count(*) AS n FROM trail_events WHERE kind='garmin-observations'").get()!.n,1);
  const status=await watchQuestStatus(db,'owner',now);assert.equal(status.quest?.status,'active');assert.equal(status.quest?.startedAt,(seconds-10)*1000);assert.equal(status.quest?.rewardStatus,'pending-validation');assert.equal((await watchQuestStatus(db,'other',now)).quest,null);
  const after=await exportDevSnapshot(db,now);for(const table of ['trail_players','trail_visits','trail_claims','trail_spawn_claims','trail_boss_rewards','trail_encounters']as const)assert.deepEqual(after.tables[table],before.tables[table]);assert.equal(f.sql.prepare("SELECT count(*) AS n FROM trail_events WHERE kind<>'garmin-observations'").get()!.n,0);f.sql.close();
});
test('TR-158 changed/reordered sequence, transient storage failure and revoked in-flight sync never return a receipt',async()=>{
  const f=setup(),db=f.db as never,issued=await issueWatchLink(db,'owner',{id,label:'Fixture',confirmed:true},now),env={DB:db,TRAIL_ENV:'development',TRAIL_GARMIN_HTTP_ENABLED:'1'};
  const failing={...f.db,async batch(){throw new Error('Synthetic storage failure');}};const failed=await trailApi(watchRequest(issued.token),{...env,DB:failing as never});assert.equal(failed.status,409);assert.equal('receipt' in await failed.json(),false);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM trail_events').get()!.n,0);
  assert.equal((await trailApi(watchRequest(issued.token),env)).status,200);const changed=await trailApi(watchRequest(issued.token,input(batch([start,{...tile,payload:{...tile.payload,tile:'1,-13'}}]))),env);assert.equal(changed.status,409);
  const skipped=await trailApi(watchRequest(issued.token,input(batch([{...tile,sequence:4}]))),env);assert.equal(skipped.status,409);
  const captured=await authenticateWatch(db,'Bearer '+issued.token,now);await revokeWatchLink(db,'owner',{id,confirmed:true},now);await assert.rejects(storeWatchSync(db,captured,input(batch([{...tile,sequence:3}])),now),/changed while storing/);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM trail_events').get()!.n,1);f.sql.close();
});
test('TR-158 snapshot includes capped unverified ledger; capacity rejects new data but permits an exact retry',async()=>{
  const f=setup(),db=f.db as never,issued=await issueWatchLink(db,'owner',{id,label:'Fixture',confirmed:true},now);let link=await authenticateWatch(db,'Bearer '+issued.token,now);await storeWatchSync(db,link,input(batch([start,tile])),now);
  f.sql.prepare("UPDATE trail_configs SET document=json_set(document,'$.batchCount',128) WHERE id=?").run('garmin-link:'+id);link=await authenticateWatch(db,'Bearer '+issued.token,now);
  await assert.rejects(storeWatchSync(db,link,input(batch([{...tile,sequence:3}])),now),/capacity/);assert.ok((await storeWatchSync(db,link,input(batch([start,tile])),now)).receipt);assert.equal((await exportDevSnapshot(db,now)).projectId,DEV_SCOPE.projectId);f.sql.close();
});
test('Garmin training auto-start/pause/resume retains one quest and waits for save/discard verification',()=>{
  const first=trainingQuest(undefined,batch([start]))!;assert.equal(first.status,'active');assert.equal(first.source,'garmin');
  const paused=trainingQuest(first,batch([{sequence:2,kind:'pause',observedAt:seconds+1,activity,payload:null}]))!;assert.equal(paused.status,'paused');assert.equal(paused.id,first.id);
  const resumed=trainingQuest(paused,batch([{sequence:3,kind:'resume',observedAt:seconds+2,activity,payload:null}]))!;assert.equal(resumed.status,'active');assert.equal(resumed.id,first.id);
  const ended=trainingQuest(resumed,batch([{sequence:4,kind:'ended-unverified',observedAt:seconds+3,activity,payload:null}]))!;assert.equal(ended.status,'ended-unverified');assert.equal(trainingQuest(ended,batch([start]))?.status,'ended-unverified');
  assert.equal(trainingQuest(ended,batch([{...start,sequence:5,activity:'watch-dev:new:2'}]))?.status,'active');assert.equal(first.status,'active');assert.equal(ended.rewardStatus,'pending-validation');
});
test('TR-157 recovery generations invalidate old watch keys even after the recovered world is sealed ready',async()=>{
  const f=setup(),db=f.db as never,issued=await issueWatchLink(db,'owner',{id,label:'Fixture',confirmed:true},now),generation='dev-recovered-fixture',digest='b'.repeat(64);
  f.sql.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,?,?,?,?)').run('recovery-generation',1,JSON.stringify({generation,baselineDigest:digest}),'owner',now);
  const response=await trailApi(watchRequest(issued.token),{DB:db,TRAIL_ENV:'development',TRAIL_GARMIN_HTTP_ENABLED:'1',TRAIL_RECOVERY_GENERATION:generation,TRAIL_RECOVERY_BASELINE_SHA256:digest});assert.equal(response.status,401);assert.equal('receipt' in await response.json(),false);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM trail_events').get()!.n,0);f.sql.close();
});
test('TR-158 a maintenance pause racing the HTTPS transaction rolls back the receipt and quest shell',async()=>{
  const f=setup(),issued=await issueWatchLink(f.db as never,'owner',{id,label:'Fixture',confirmed:true},now);let armed=true;
  const wrapped={...f.db,async batch(statements:Parameters<typeof f.db.batch>[0]){if(armed){armed=false;f.sql.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,?,?,?,?)').run('maintenance',1,JSON.stringify({paused:true,reason:'planned-update',changedAt:now}),'owner',now);}return f.db.batch(statements);}};
  const response=await trailApi(watchRequest(issued.token),{DB:wrapped as never,TRAIL_ENV:'development',TRAIL_GARMIN_HTTP_ENABLED:'1'});assert.equal(response.status,503);assert.equal('receipt' in await response.json(),false);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM trail_events').get()!.n,0);assert.equal((await watchQuestStatus(f.db as never,'owner',now)).quest,null);f.sql.close();
});
