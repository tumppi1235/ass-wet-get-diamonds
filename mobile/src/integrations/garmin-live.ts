/** Development wire contract for a future authenticated native Connect IQ adapter.
 * Validation/storage receipts are never evidence of collection, boss readiness or rewards.
 * No browser Bluetooth, account pairing, HTTP ingress or credential is implemented here.
 */
export type WatchEvent={sequence:number;kind:'start'|'resume'|'pause'|'tile'|'collect-intent'|'boss-tile-intent'|'ended-unverified';observedAt:number;activity:string;payload:Record<string,unknown>|null};
export type GarminTrainingQuest={id:string;activityId:string;status:'active'|'paused'|'ended-unverified';startedAt:number;updatedAt:number;source:'garmin';rewardStatus:'pending-validation'};
export type WatchBatch={protocol:1;environment:'development';kind:'observations';linkId:string;batchId:string;events:WatchEvent[]};
export type WatchReceipt={protocol:1;environment:'development';kind:'receipt';linkId:string;batchId:string;status:'stored-unverified';receiptId:string;sequences:number[]};
export type WatchBoss={id:string;name:string;tile:string;state:'nearby'|'fightable';receiptId?:string};
export type WatchBossFeed={protocol:1;environment:'development';kind:'boss-feed';linkId:string;revision:number;generatedAt:number;expiresAt:number;activityId:string;bosses:WatchBoss[]};
const invalid=()=>{throw new Error('Invalid Garmin dev message');};
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))return invalid();return v as Record<string,unknown>;}
function keys(v:Record<string,unknown>,allowed:string[]){if(Object.keys(v).some(k=>!allowed.includes(k)))invalid();}
function text(v:unknown,min:number,max:number):v is string{return typeof v==='string'&&v.length>=min&&v.length<=max;}
function integer(v:unknown,min=0):v is number{return Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=2147483647;}
function tile(v:unknown):v is string{return typeof v==='string'&&/^-?\d{1,7},-?\d{1,7}$/.test(v);}
function envelope(value:unknown,kind:string,linkId:string){
  let bytes=0;try{bytes=new TextEncoder().encode(JSON.stringify(value)).byteLength;}catch{return invalid();}
  const m=object(value);if(bytes>4096||!text(linkId,16,64)||m.protocol!==1||m.environment!=='development'||m.kind!==kind||m.linkId!==linkId)return invalid();return m;
}
function observation(value:unknown):WatchEvent{
  const e=object(value);if(!integer(e.sequence,1)||!integer(e.observedAt)||!text(e.activity,1,100))return invalid();
  keys(e,['sequence','kind','observedAt','activity','payload']);
  if(!['start','resume','pause','tile','collect-intent','boss-tile-intent','ended-unverified'].includes(String(e.kind)))return invalid();
  if(e.kind==='pause'||e.kind==='resume'||e.kind==='ended-unverified'){if(e.payload!==null)return invalid();}
  else{
    const p=object(e.payload);
    keys(p,e.kind==='start'?['source','profile','sport','subSport','startedAt']:e.kind==='tile'?['tile','latitude','longitude','quality']:e.kind==='boss-tile-intent'?['bossId','tile']:['tile']);
    if(e.kind==='start'){
      if(p.source!=='garmin-connect-iq'||!text(p.profile,1,64)||![p.sport,p.subSport].every(n=>n===null||integer(n)))return invalid();
      if(p.startedAt!==undefined&&(!integer(p.startedAt)||p.startedAt>e.observedAt+60||e.observedAt-p.startedAt>30*86400))return invalid();
    }else{
      if(!tile(p.tile))return invalid();
      if(e.kind==='tile'&&(p.quality!=='good'||!Number.isFinite(p.latitude)||Math.abs(Number(p.latitude))>90||typeof p.latitude!=='number'||!Number.isFinite(p.longitude)||Math.abs(Number(p.longitude))>180||typeof p.longitude!=='number'))return invalid();
      if(e.kind==='boss-tile-intent'&&!text(p.bossId,1,80))return invalid();
    }
  }
  return e as WatchEvent;
}
export function validateWatchBatch(value:unknown,linkId:string):WatchBatch{
  const m=envelope(value,'observations',linkId);if(!Array.isArray(m.events)||m.events.length<1||m.events.length>4)return invalid();
  keys(m,['protocol','environment','kind','linkId','batchId','events']);
  const events=m.events.map(observation);if(events.some((e,i)=>i>0&&e.sequence!==events[i-1].sequence+1))return invalid();
  if(m.batchId!==`${linkId}:${events[0].sequence}:${events.at(-1)!.sequence}`)return invalid();
  return{protocol:1,environment:'development',kind:'observations',linkId,batchId:m.batchId as string,events};
}
export function validateWatchReceipt(value:unknown,batch:WatchBatch):WatchReceipt{
  const m=envelope(value,'receipt',batch.linkId);if(m.batchId!==batch.batchId||m.status!=='stored-unverified'||!text(m.receiptId,16,100)||!Array.isArray(m.sequences)||m.sequences.length!==batch.events.length||m.sequences.some((n,i)=>n!==batch.events[i].sequence))return invalid();
  keys(m,['protocol','environment','kind','linkId','batchId','status','receiptId','sequences']);
  return m as WatchReceipt;
}
/** Queue removal is a separate step AFTER durable observation storage.
 * A receipt with merely an upper sequence number cannot delete unseen events.
 */
export function remainingWatchEvents(queue:WatchEvent[],batch:WatchBatch,receipt:unknown){
  validateWatchReceipt(receipt,batch);
  if(queue.length<batch.events.length||batch.events.some((e,i)=>queue[i].sequence!==e.sequence||queue[i].activity!==e.activity||queue[i].kind!==e.kind||queue[i].observedAt!==e.observedAt))return invalid();
  return queue.slice(batch.events.length);
}
export function validateWatchBossFeed(value:unknown,linkId:string,activityId:string,previousRevision:number,now:number):WatchBossFeed{
  const m=envelope(value,'boss-feed',linkId);
  keys(m,['protocol','environment','kind','linkId','revision','generatedAt','expiresAt','activityId','bosses']);
  if(!integer(now)||!integer(m.revision,1)||m.revision<=previousRevision||!integer(m.generatedAt)||!integer(m.expiresAt)||m.generatedAt>now+5||m.generatedAt<now-120||m.expiresAt<=now||m.expiresAt<=m.generatedAt||m.expiresAt-m.generatedAt>120||m.activityId!==activityId||!text(activityId,1,100)||!Array.isArray(m.bosses)||m.bosses.length>8)return invalid();
  const ids=new Set<string>();for(const value of m.bosses){const b=object(value);keys(b,['id','name','tile','state','receiptId']);if(!text(b.id,1,80)||ids.has(b.id)||!text(b.name,1,24)||!tile(b.tile)||!['nearby','fightable'].includes(String(b.state))||b.state==='fightable'&&!text(b.receiptId,16,100))return invalid();ids.add(b.id);}
  return m as WatchBossFeed;
}
/** A lease/receipt must be supplied by the future authenticated adapter. Never
 * derive readiness from a tile or a stored-unverified batch acknowledgement.
 */
export function watchBossNotice(feed:WatchBossFeed|undefined,context:{linkId:string;leaseUntil:number;activityId:string;tile:string;running:boolean;goodObservation:boolean;observedAt:number;now:number}){
  const c=context;if(!feed||!integer(c.now)||!integer(c.observedAt)||!integer(c.leaseUntil)||feed.linkId!==c.linkId||feed.activityId!==c.activityId||feed.generatedAt>c.now+5||feed.generatedAt<c.now-120||feed.expiresAt-feed.generatedAt>120||feed.expiresAt<=c.now||c.leaseUntil<=c.now||!c.running||!c.goodObservation||c.now-c.observedAt<0||c.now-c.observedAt>=5)return null;
  const found=feed.bosses.filter(b=>b.tile===c.tile);return found.some(b=>b.state==='fightable'&&text(b.receiptId,16,100))?'BOSS FIGHTABLE':found.length?'BOSS TILE / SYNC NEEDED':null;
}

export const GARMIN_FIELD_APP_ID='ef3e1e0d4a2a4bd28d0506c067d27a2a';
type NativeSender={send(deviceId:string,appId:string,message:unknown):Promise<void>};
type ObservationSink={storeUnverified(batch:WatchBatch):Promise<unknown>};
/** Native adapter seam. Construct only after authenticated account/device pairing.
 * The sink must durably/idempotently store observations before returning a receipt.
 * Native SDK provisioning, that server endpoint and pairing are separate work.
 */
export class GarminCompanionSession{
  private active=true;private busy=false;private revision=0;
  constructor(private readonly link:{id:string;deviceId:string;appId:string;expiresAt:number},private readonly native:NativeSender,private readonly sink:ObservationSink,private readonly seconds:()=>number){
    if(!text(link.id,16,64)||!text(link.deviceId,1,100)||link.appId!==GARMIN_FIELD_APP_ID||!integer(link.expiresAt)||link.expiresAt<=seconds())throw new Error('Use an authenticated current Garmin dev link');
    this.link={...link};
  }
  private current(){return this.active&&this.seconds()<this.link.expiresAt;}
  revoke(){this.active=false;}
  async receive(deviceId:string,appId:string,raw:unknown){
    if(!this.current()||deviceId!==this.link.deviceId||appId!==this.link.appId)throw new Error('Garmin link is inactive or belongs to another device/app');
    if(this.busy)return{status:'busy' as const};
    const batch=validateWatchBatch(raw,this.link.id);this.busy=true;
    try{
      const receipt=validateWatchReceipt(await this.sink.storeUnverified(batch),batch);
      if(!this.current())return{status:'link-expired' as const};
      await this.native.send(this.link.deviceId,this.link.appId,receipt);
      return{status:'stored-unverified' as const,awardsWritten:0 as const};
    }finally{this.busy=false;}
  }
  async sendBossFeed(raw:unknown,activityId:string){
    if(!this.current())throw new Error('Garmin link is inactive');
    const feed=validateWatchBossFeed(raw,this.link.id,activityId,this.revision,this.seconds());
    await this.native.send(this.link.deviceId,this.link.appId,feed);
    if(this.current())this.revision=Math.max(this.revision,feed.revision);
  }
}
