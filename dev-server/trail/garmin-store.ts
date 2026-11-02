import type {D1Database} from '@cloudflare/workers-types';
import {validateWatchBatch,type WatchBatch,type WatchReceipt,type GarminTrainingQuest} from '../../mobile/src/integrations/garmin-live';
import {requestHash} from './hash';
import {WorldError} from './world-error';
import {DEV_SCOPE} from './service-scope';
import {INITIAL_GENERATION} from './recovery-store';
import {queryBosses} from './boss-store';
import {loadRegions} from './region-store';
import {blockedAt} from '../../mobile/src/game/world-regions';
type Fix={latitude:number;longitude:number;activity:string};
type Link={generation:string;version:1;environment:'development';projectId:string;id:string;owner:string;label:string;tokenHash:string;createdAt:number;expiresAt:number;revokedAt:number|null;lastSeenAt:number|null;lastSequence:number|null;batchCount:number;lastFix:Fix|null;quest?:GarminTrainingQuest};
export type WatchLink={rowId:string;revision:number;value:Link};
const prefix='garmin-link:',maxBatches=128;
const denied=()=>new WorldError(401,'Garmin credential is invalid, expired or revoked');
const publicLink=(r:WatchLink)=>({id:r.value.id,label:r.value.label,createdAt:r.value.createdAt,expiresAt:r.value.expiresAt,revokedAt:r.value.revokedAt,lastSeenAt:r.value.lastSeenAt,batches:r.value.batchCount,revision:r.revision});
const normalized=(v:unknown):unknown=>Array.isArray(v)?v.map(normalized):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normalized(x)])):v;
async function tokenHash(id:string,secret:string){return requestHash({projectId:DEV_SCOPE.projectId,id,secret});}
function sameHash(a:string,b:string){if(a.length!==64||b.length!==64)return false;let different=0;for(let i=0;i<64;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);return different===0;}
async function readLink(db:D1Database,id:string):Promise<WatchLink|undefined>{
  const row=await db.prepare('SELECT revision,document FROM trail_configs WHERE id=?').bind(prefix+id).first<{revision:number;document:string}>();if(!row)return;
  try{const v=JSON.parse(row.document)as Link;if(v.version!==1||v.environment!=='development'||v.projectId!==DEV_SCOPE.projectId||v.id!==id||typeof v.owner!=='string'||typeof v.tokenHash!=='string')return;return{rowId:prefix+id,revision:row.revision,value:v};}catch{return;}
}
export async function listWatchLinks(db:D1Database,owner:string){
  const rows=await db.prepare("SELECT id FROM trail_configs WHERE id LIKE 'garmin-link:%' AND json_extract(document,'$.owner')=? ORDER BY updated_at DESC LIMIT 20").bind(owner).all<{id:string}>();
  const result=[];for(const row of rows.results){const link=await readLink(db,row.id.slice(prefix.length));if(link)result.push(publicLink(link));}return{links:result,maxBatchesPerLink:maxBatches};
}
export async function watchQuestStatus(db:D1Database,owner:string,now=Date.now()){
  const rows=await db.prepare("SELECT id FROM trail_configs WHERE id LIKE 'garmin-link:%' AND json_extract(document,'$.owner')=? AND json_extract(document,'$.revokedAt') IS NULL AND json_extract(document,'$.expiresAt')>? ORDER BY updated_at DESC LIMIT 2").bind(owner,now).all<{id:string}>();
  for(const row of rows.results){const link=await readLink(db,row.id.slice(prefix.length));if(link?.value.quest)return{quest:link.value.quest,lastSeenAt:link.value.lastSeenAt};}return{quest:null,lastSeenAt:null};
}
/** Training lifecycle creates a quest shell, never GPS effort/rewards or a second phone recorder. */
export function trainingQuest(previous:GarminTrainingQuest|undefined,batch:WatchBatch):GarminTrainingQuest|undefined{
  let quest=previous;
  for(const e of batch.events){
    if(e.kind==='start'){
      if(quest?.activityId===e.activity)continue;
      quest={id:'garmin:'+batch.linkId+':'+e.activity,activityId:e.activity,status:'active',startedAt:Number(e.payload?.startedAt??e.observedAt)*1000,updatedAt:e.observedAt*1000,source:'garmin',rewardStatus:'pending-validation'};
    }else if(quest?.activityId===e.activity&&quest.status!=='ended-unverified'&&['pause','resume','ended-unverified'].includes(e.kind))quest={...quest,status:e.kind==='pause'?'paused':e.kind==='resume'?'active':'ended-unverified',updatedAt:e.observedAt*1000};
  }
  return quest;
}
/** Browser owner action only. Raw secret is returned once, never persisted/audited. */
export async function issueWatchLink(db:D1Database,owner:string,input:{id?:unknown;label?:unknown;confirmed?:unknown},now=Date.now(),generation=INITIAL_GENERATION){
  if(input.confirmed!==true||typeof input.id!=='string'||!/^[a-f0-9]{32}$/.test(input.id)||typeof input.label!=='string'||input.label.trim().length<1||input.label.trim().length>32)throw new WorldError(400,'Confirm queued-location sharing and choose a watch name');
  const id=input.id,secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  const value:Link={generation,version:1,environment:'development',projectId:DEV_SCOPE.projectId,id,owner,label:input.label.trim(),tokenHash:await tokenHash(id,secret),createdAt:now,expiresAt:now+30*86400000,revokedAt:null,lastSeenAt:null,lastSequence:null,batchCount:0,lastFix:null};
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) SELECT ?,1,?,?,? WHERE (SELECT count(*) FROM trail_configs WHERE id LIKE 'garmin-link:%' AND json_extract(document,'$.owner')=? AND json_extract(document,'$.revokedAt') IS NULL AND json_extract(document,'$.expiresAt')>?)<2").bind(prefix+id,JSON.stringify(value),owner,now,owner,now),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('garmin-issue-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,'garmin.link.issue',id,JSON.stringify({label:value.label,expiresAt:value.expiresAt}),now),
  ]);}catch{throw new WorldError(409,'This issue request already exists or two active watch links are present; refresh and revoke an older link first');}
  return{link:publicLink({rowId:prefix+id,revision:1,value}),token:id+secret};
}
export async function revokeWatchLink(db:D1Database,owner:string,input:{id?:unknown;confirmed?:unknown},now=Date.now()){
  if(input.confirmed!==true||typeof input.id!=='string')throw new WorldError(400,'Confirm this watch revocation');const r=await readLink(db,input.id);if(!r||r.value.owner!==owner)throw new WorldError(404,'Watch link not found');
  await db.batch([
    db.prepare("UPDATE trail_configs SET document=json_set(document,'$.revokedAt',?),revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND json_extract(document,'$.owner')=? AND json_extract(document,'$.revokedAt') IS NULL").bind(now,owner,now,r.rowId,owner),
    db.prepare("INSERT INTO trail_audit(id,actor,action,target,details,created_at) SELECT ?,?,'garmin.link.revoke',?,'{}',? WHERE changes()=1").bind(crypto.randomUUID(),owner,input.id,now),
  ]);return{revoked:true};
}
export async function authenticateWatch(db:D1Database,authorization:string|null,now=Date.now()){
  const token=authorization?.match(/^Bearer ([a-f0-9]{96})$/)?.[1];if(!token)throw denied();const id=token.slice(0,32),r=await readLink(db,id);
  if(!r||!sameHash(r.value.tokenHash,await tokenHash(id,token.slice(32)))||r.value.revokedAt!==null||r.value.expiresAt<=now)throw denied();
  if(!await db.prepare('SELECT id FROM trail_members WHERE id=?').bind(r.value.owner).first())throw denied();return r;
}
export async function storeWatchSync(db:D1Database,r:WatchLink,raw:unknown,now=Date.now()){
  const input=raw as {protocol?:unknown;environment?:unknown;kind?:unknown;linkId?:unknown;activityId?:unknown;batch?:unknown};
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['protocol','environment','kind','linkId','activityId','batch'].includes(k))||input.protocol!==1||input.environment!=='development'||input.kind!=='sync'||input.linkId!==r.value.id||!(input.activityId===null||typeof input.activityId==='string'&&input.activityId.length>0&&input.activityId.length<=100))throw new WorldError(400,'Invalid Garmin sync envelope');
  let batch:WatchBatch|undefined;try{if(input.batch!==null)batch=validateWatchBatch(input.batch,r.value.id);}catch{throw new WorldError(400,'Invalid Garmin observation batch');}
  const seconds=Math.floor(now/1000);if(batch?.events.some(e=>e.observedAt>seconds+60||e.observedAt<seconds-30*86400))throw new WorldError(409,'Watch clock or observation age needs review; records remain queued');
  const eventId=batch?'garmin:'+batch.batchId:null,hash=batch?await requestHash(normalized(batch)):null;
  const prior=eventId?await db.prepare('SELECT request_hash,result,kind FROM trail_events WHERE owner=? AND id=?').bind(r.value.owner,eventId).first<{request_hash:string;result:string;kind:string}>():null;
  if(prior&&(prior.request_hash!==hash||prior.kind!=='garmin-observations'))throw new WorldError(409,'Garmin batch identity was reused with different observations');
  const fresh=!!batch&&!prior;if(fresh&&batch&&(r.value.batchCount>=maxBatches||r.value.lastSequence!==null&&batch.events[0].sequence!==r.value.lastSequence+1))throw new WorldError(409,'Watch sequence or observation capacity needs review; records remain queued');
  let receipt:WatchReceipt|null=prior?JSON.parse(prior.result).receipt:null;
  if(fresh&&batch)receipt={protocol:1,environment:'development',kind:'receipt',linkId:r.value.id,batchId:batch.batchId,status:'stored-unverified',receiptId:crypto.randomUUID(),sequences:batch.events.map(e=>e.sequence)};
  const value={...r.value,lastSeenAt:now};if(fresh&&batch){value.batchCount++;value.lastSequence=batch.events.at(-1)!.sequence;value.quest=trainingQuest(value.quest,batch);for(const e of batch.events)if(e.kind==='tile')value.lastFix={latitude:e.payload!.latitude as number,longitude:e.payload!.longitude as number,activity:e.activity};}
  const statements=[db.prepare("UPDATE trail_configs SET document=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND json_extract(document,'$.revokedAt') IS NULL AND json_extract(document,'$.expiresAt')>?").bind(JSON.stringify(value),now,r.rowId,r.revision,now),db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('garmin-sync-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid")];
  if(fresh)statements.push(db.prepare("INSERT INTO trail_events(owner,id,kind,result,request_hash,created_at) VALUES(?,?,'garmin-observations',?,?,?)").bind(r.value.owner,eventId,JSON.stringify({batch,receipt,awardsWritten:0,validation:'unverified'}),hash,now));
  try{await db.batch(statements);}catch{throw new WorldError(409,'Watch link changed while storing; retry the same pending batch');}
  // Public nearby definitions only. Unverified watch data NEVER produces fightable.
  let bossFeed=null;const fix=value.lastFix;
  if(input.activityId&&fix&&fix.activity===input.activityId){
    const regions=await loadRegions(db),result=await queryBosses(db,{south:Math.max(-90,fix.latitude-.02),north:Math.min(90,fix.latitude+.02),west:Math.max(-180,fix.longitude-.04),east:Math.min(180,fix.longitude+.04)},now);
    bossFeed={protocol:1,environment:'development',kind:'boss-feed',linkId:value.id,revision:r.revision+1,generatedAt:seconds,expiresAt:seconds+120,activityId:input.activityId,bosses:result.bosses.filter(({boss})=>!blockedAt(boss,now,regions)).slice(0,8).map(({boss})=>({id:boss.id,name:boss.name.slice(0,24),tile:boss.tileId,state:'nearby'}))};
  }
  return{protocol:1,environment:'development',kind:'sync-response',linkId:value.id,receipt,bossFeed,awardsWritten:0};
}
