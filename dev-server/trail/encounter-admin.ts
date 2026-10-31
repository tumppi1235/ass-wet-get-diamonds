import type {D1Database} from '@cloudflare/workers-types';
import type {Encounter,EncounterState} from '../../mobile/src/game/encounters';
import {resolveEncounter} from './encounter-store';
import {WorldError} from './world-error';
import {requestHash} from './hash';
const states=['draft','active','won','expired','cancelled','failed'];
export async function queryEncounters(db:D1Database,params:URLSearchParams){
  const state=params.get('state')||'',boss=params.get('boss')||'',limit=Number(params.get('limit')||25);let cursor:{at:number;id:string}|null=null;
  if(state&&!states.includes(state)||boss.length>100||!Number.isInteger(limit)||limit<1||limit>100)throw new WorldError(400,'Invalid encounter filters');
  if(params.has('after')){try{cursor=JSON.parse(params.get('after')!);if(!cursor||!Number.isSafeInteger(cursor.at)||cursor.at<0||typeof cursor.id!=='string'||cursor.id.length>100)throw new Error();}catch{throw new WorldError(400,'Invalid encounter page');}}
  const where:string[]=[],args:(string|number)[]=[];if(state){where.push('state=?');args.push(state);}if(boss){where.push('boss=?');args.push(boss);}if(cursor){where.push('(updated_at<? OR (updated_at=? AND id<?))');args.push(cursor.at,cursor.at,cursor.id);}
  const rows=await db.prepare(`SELECT id,document,revision,updated_at FROM trail_encounters ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY updated_at DESC,id DESC LIMIT ?`).bind(...args,limit+1).all<{id:string;document:string;revision:number;updated_at:number}>(),page=rows.results.slice(0,limit),last=page.at(-1);
  return{encounters:page.map(r=>{const e=JSON.parse(r.document)as Encounter;return{id:r.id,bossId:e.boss.id,bossName:e.boss.name,tier:e.boss.tier,state:e.state,creator:e.roster.find(m=>m.id===e.creator)?.name||'Explorer',createdAt:e.createdAt,deadline:e.deadline,remainingHp:e.remainingHp,totalHp:e.totalHp,partySize:e.roster.length,revision:r.revision};}),next:rows.results.length>limit&&last?JSON.stringify({at:last.updated_at,id:last.id}):null};
}
export async function inspectEncounter(db:D1Database,id:string,now=Date.now()){
  if(typeof id!=='string'||id.length>100)throw new WorldError(400,'Invalid encounter identity');
  const result=await resolveEncounter(db,id,now),encounter:Encounter=JSON.parse(JSON.stringify(result.encounter));
  for(const c of Object.values(encounter.contributions)){delete c.progression;delete c.curveCoefficient;}
  const members=await db.prepare('SELECT p.owner AS id,m.display_name AS name,p.accepted,p.active FROM trail_party_members p JOIN trail_members m ON m.id=p.owner WHERE p.encounter=? ORDER BY p.owner').bind(id).all<{id:string;name:string;accepted:number;active:number}>();
  const rewards=await db.prepare("SELECT owner,json_extract(document,'$.gold') AS gold,json_extract(document,'$.itemName') AS itemName,json_extract(document,'$.rarity') AS rarity,json_extract(document,'$.fellowshipXp') AS fellowshipXp,created_at AS claimedAt FROM trail_boss_rewards WHERE encounter=?").bind(id).all();
  return{encounter,revision:result.revision,members:members.results.map(m=>({...m,accepted:!!m.accepted,active:!!m.active})),rewards:rewards.results};
}
export async function cancelEncounter(db:D1Database,actor:string,input:{id:string;revision:number;reason:string;nonce:string},now=Date.now()){
  if(!input||typeof input.id!=='string'||input.id.length>100||typeof input.reason!=='string'||input.reason.trim().length<5||input.reason.length>300||typeof input.nonce!=='string'||!/^[a-zA-Z0-9:_-]{8,100}$/.test(input.nonce)||!Number.isSafeInteger(input.revision))throw new WorldError(400,'Choose an encounter and explain the cancellation (5–300 characters)');
  const auditId='admin-cancel:'+actor+':'+input.nonce,hash=await requestHash(input);
  const prior=await db.prepare('SELECT details FROM trail_audit WHERE id=?').bind(auditId).first<{details:string}>();
  if(prior){if(JSON.parse(prior.details).requestHash!==hash)throw new WorldError(409,'Cancellation identity was reused');return{...await inspectEncounter(db,input.id,now),replayed:true};}
  const before=await inspectEncounter(db,input.id,now);if(before.revision!==input.revision)throw new WorldError(409,'Encounter changed; inspect its current revision first');
  if(!(['draft','active']as EncounterState[]).includes(before.encounter.state))throw new WorldError(400,'A resolved encounter cannot be cancelled or its rewards reversed');
  const after={...before.encounter,state:'cancelled' as const,resolvedAt:now};
  // Preserve the complete original document in the audit, including immutable settlement policy.
  const original=await db.prepare('SELECT document,revision FROM trail_encounters WHERE id=?').bind(input.id).first<{document:string;revision:number}>();if(original?.revision!==input.revision)throw new WorldError(409,'Encounter changed while inspecting');
  const stored={...JSON.parse(original.document),state:'cancelled',resolvedAt:now};
  try{await db.batch([
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(auditId,actor,'encounter.admin-cancel',input.id,JSON.stringify({reason:input.reason.trim(),requestHash:hash,before:JSON.parse(original.document),after:{state:after.state,resolvedAt:now},revision:input.revision}),now),
    db.prepare("UPDATE trail_encounters SET state='cancelled',document=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state IN ('draft','active')").bind(JSON.stringify(stored),now,input.id,input.revision),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('admin-encounter-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('UPDATE trail_party_members SET active=0 WHERE encounter=?').bind(input.id),
  ]);}catch{const raced=await db.prepare('SELECT details FROM trail_audit WHERE id=?').bind(auditId).first<{details:string}>();if(raced&&JSON.parse(raced.details).requestHash===hash)return{...await inspectEncounter(db,input.id,now),replayed:true};throw new WorldError(409,'Encounter changed; reload before retrying cancellation');}
  return{...await inspectEncounter(db,input.id,now),replayed:false};
}
