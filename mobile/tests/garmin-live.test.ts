import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateWatchBatch,validateWatchReceipt,remainingWatchEvents,validateWatchBossFeed,watchBossNotice,GarminCompanionSession,GARMIN_FIELD_APP_ID,type WatchBatch,type WatchBossFeed} from '../src/integrations/garmin-live';
const linkId='synthetic-dev-link-0001',now=1700000000,activity='watch-dev:1700000000:1';
const batch:WatchBatch={protocol:1,environment:'development',kind:'observations',linkId,batchId:linkId+':1:2',events:[{sequence:1,kind:'start',observedAt:now,activity,payload:{source:'garmin-connect-iq',profile:'fixture',sport:1,subSport:3}},{sequence:2,kind:'tile',observedAt:now+1,activity,payload:{tile:'0,0',latitude:62.2415,longitude:25.7472,quality:'good'}}]};
const receipt={protocol:1,environment:'development',kind:'receipt',linkId,batchId:batch.batchId,status:'stored-unverified',receiptId:'synthetic-receipt-0001',sequences:[1,2]};
const feed:WatchBossFeed={protocol:1,environment:'development',kind:'boss-feed',linkId,revision:1,generatedAt:now,expiresAt:now+60,activityId:activity,bosses:[{id:'fixture-boss',name:'Fixture boss',tile:'0,0',state:'nearby'}]};
const context={linkId,leaseUntil:now+300,activityId:activity,tile:'0,0',running:true,goodObservation:true,observedAt:now,now};
test('TR-158 bounded Garmin packets retain original namespace and reject cross-account/environment and malformed observations',()=>{
  assert.deepEqual(validateWatchBatch(batch,linkId),batch);
  for(const bad of [{...batch,owner:'other-account'},{...batch,environment:'production'},{...batch,linkId:'other'},{...batch,events:[]},{...batch,events:[...batch.events,...batch.events,...batch.events]},{...batch,events:[batch.events[1],batch.events[0]]},{...batch,events:[{...batch.events[0],kind:'capture-success'}]},{...batch,events:[{...batch.events[1],payload:{tile:'0,0',latitude:NaN,longitude:0,quality:'good'}}]},{...batch,padding:'x'.repeat(4097)}])assert.throws(()=>validateWatchBatch(bad,linkId));
});
test('TR-158 receipts acknowledge only an exact pending prefix, preserving new events and granting no game success',()=>{
  assert.deepEqual(validateWatchReceipt(receipt,batch),receipt);const later={...batch.events[1],sequence:3},queue=[...batch.events,later],before=JSON.stringify(queue);
  assert.deepEqual(remainingWatchEvents(queue,batch,receipt),[later]);assert.equal(JSON.stringify(queue),before);
  for(const bad of [{...receipt,status:'delivered'},{...receipt,status:'captured'},{...receipt,sequences:[1,3]},{...receipt,sequences:[1,2,3]},{...receipt,batchId:'other'},{...receipt,linkId:'another-account'}])assert.throws(()=>remainingWatchEvents(queue,batch,bad));
  assert.throws(()=>remainingWatchEvents([later],batch,receipt));assert.throws(()=>remainingWatchEvents([{...batch.events[0],activity:'other'},batch.events[1]],batch,receipt));
  assert.equal('gold' in receipt,false);assert.equal('collection' in receipt,false);
});
test('TR-021/TR-136 boss notifications bind account, activity, ordered revision and short expiry',()=>{
  assert.deepEqual(validateWatchBossFeed(feed,linkId,activity,0,now),feed);
  for(const bad of [{...feed,revision:0},{...feed,environment:'production'},{...feed,activityId:'other'},{...feed,expiresAt:now},{...feed,generatedAt:now+6},{...feed,expiresAt:now+121},{...feed,bosses:[...feed.bosses,...feed.bosses]},{...feed,bosses:[{...feed.bosses[0],state:'fightable'}]}])assert.throws(()=>validateWatchBossFeed(bad,linkId,activity,0,now));
  assert.throws(()=>validateWatchBossFeed(feed,linkId,activity,1,now));
});
test('TR-021/TR-136 local boss-tile observation is distinct from confirmed readiness, and stale or paused states suppress both',()=>{
  assert.equal(watchBossNotice(feed,context),'BOSS TILE / SYNC NEEDED');
  const confirmed=validateWatchBossFeed({...feed,bosses:[{...feed.bosses[0],state:'fightable',receiptId:'synthetic-server-receipt'}]},linkId,activity,0,now);
  assert.equal(watchBossNotice(confirmed,context),'BOSS FIGHTABLE');
  for(const change of [{running:false},{goodObservation:false},{observedAt:now-5},{observedAt:now+1},{leaseUntil:now},{now:now+61},{tile:'1,0'},{activityId:'other'},{linkId:'other'}])assert.equal(watchBossNotice(confirmed,{...context,...change}),null);
  assert.equal(watchBossNotice(undefined,context),null);
});
test('TR-157/158 companion seam checks device/app, waits for durable exact receipt and withholds acknowledgements on failure',async()=>{
  const sent:unknown[]=[],link={id:linkId,deviceId:'synthetic-enduro',appId:GARMIN_FIELD_APP_ID,expiresAt:now+300};let stored=0;
  const native={async send(_device:string,_app:string,message:unknown){sent.push(message);}},sink={async storeUnverified(){stored++;return receipt;}};
  const bridge=new GarminCompanionSession(link,native,sink,()=>now);
  await assert.rejects(bridge.receive('other',link.appId,batch),/another device/);await assert.rejects(bridge.receive(link.deviceId,'other',batch),/another device/);assert.equal(stored,0);
  assert.deepEqual(await bridge.receive(link.deviceId,link.appId,batch),{status:'stored-unverified',awardsWritten:0});assert.deepEqual(sent,[receipt]);
  const failed=new GarminCompanionSession(link,native,{async storeUnverified(){throw new Error('Storage unavailable');}},()=>now);await assert.rejects(failed.receive(link.deviceId,link.appId,batch),/Storage unavailable/);assert.equal(sent.length,1);
  const wrong=new GarminCompanionSession(link,native,{async storeUnverified(){return{...receipt,sequences:[1]};}},()=>now);await assert.rejects(wrong.receive(link.deviceId,link.appId,batch));assert.equal(sent.length,1);
});
test('TR-157/158 revoking an in-flight companion link suppresses its late receipt; feed replay stays rejected',async()=>{
  const sent:unknown[]=[],link={id:linkId,deviceId:'synthetic-enduro',appId:GARMIN_FIELD_APP_ID,expiresAt:now+300};let release!:(v:unknown)=>void;
  const pending=new Promise(resolve=>{release=resolve;}),native={async send(_device:string,_app:string,message:unknown){sent.push(message);}};
  const bridge=new GarminCompanionSession(link,native,{async storeUnverified(){return pending;}},()=>now),first=bridge.receive(link.deviceId,link.appId,batch);
  assert.deepEqual(await bridge.receive(link.deviceId,link.appId,batch),{status:'busy'});bridge.revoke();release(receipt);assert.deepEqual(await first,{status:'link-expired'});assert.equal(sent.length,0);
  const fresh=new GarminCompanionSession(link,native,{async storeUnverified(){return receipt;}},()=>now);await fresh.sendBossFeed(feed,activity);assert.equal(sent.length,1);await assert.rejects(fresh.sendBossFeed(feed,activity));fresh.revoke();await assert.rejects(fresh.sendBossFeed({...feed,revision:2},activity));
});
