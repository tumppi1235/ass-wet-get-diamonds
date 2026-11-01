import type {D1Database} from '@cloudflare/workers-types';
import {requestHash} from './hash';
import {WorldError} from './world-error';

/** Receipt inspection only: never hydrate appearances, settle expiry or create a player. */
export async function inspectPending(db:D1Database,owner:string,input:{kind?:unknown;id?:unknown;payload?:unknown}){
  if(!input||!['world','encounter'].includes(String(input.kind))||typeof input.id!=='string'||!/^[a-zA-Z0-9:_-]{8,100}$/.test(input.id)||!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))throw new WorldError(400,'Choose a valid pending action');
  const hash=await requestHash(input.payload),world=input.kind==='world';
  // One statement gives a consistent receipt/revision observation; no caller-supplied SQL identifiers.
  const row=await db.prepare(world?
    'SELECT (SELECT revision FROM trail_players WHERE id=?) AS revision,request_hash AS hash FROM trail_events WHERE owner=? AND id=? UNION ALL SELECT (SELECT revision FROM trail_players WHERE id=?),NULL WHERE NOT EXISTS(SELECT 1 FROM trail_events WHERE owner=? AND id=?)':
    'SELECT (SELECT revision FROM trail_players WHERE id=?) AS revision,request_hash AS hash FROM trail_encounter_actions WHERE owner=? AND id=? UNION ALL SELECT (SELECT revision FROM trail_players WHERE id=?),NULL WHERE NOT EXISTS(SELECT 1 FROM trail_encounter_actions WHERE owner=? AND id=?)'
  ).bind(owner,owner,input.id,owner,owner,input.id).first<{revision:number|null;hash:string|null}>();
  if(!row||row.revision!==null&&(!Number.isSafeInteger(row.revision)||row.revision<0))throw new WorldError(503,'Saved progress cannot be verified; your pending action is preserved');
  return{status:row.hash===null?'unrecorded':row.hash===hash?'committed':'identity-conflict',revision:row.revision} as {status:'unrecorded'|'committed'|'identity-conflict';revision:number|null};
}

/** Explicit cancellation reserves the SAME identity, so a late original transaction cannot commit. */
export async function cancelPending(db:D1Database,owner:string,input:{kind?:unknown;id?:unknown;payload?:unknown;confirmed?:unknown},now=Date.now()){
  if(input?.confirmed!==true)throw new WorldError(400,'Confirm cancellation of the unsynced action');
  const before=await inspectPending(db,owner,input);
  if(before.status==='identity-conflict')throw new WorldError(409,'Pending action identity differs from the server receipt');
  if(before.status==='committed')return{status:'recorded'};
  const payload=input.payload as {kind:string},world=input.kind==='world';
  if(!(world?['start','stop','gps','capture','claim']:['create','accept','activate','cancel','leave','contribute','claim-loot']).includes(payload.kind))throw new WorldError(400,'Invalid action kind');
  const hash=await requestHash(payload),reason='Unsynced action cancelled; no gameplay changes',receipt=world?
    {accepted:false,reason,awards:{},balanceRevision:'none-cancelled'}:
    {kind:payload.kind,encounterId:'',reason};
  const insert=world?
    db.prepare('INSERT INTO trail_events(owner,id,kind,result,request_hash,created_at) VALUES(?,?,?,?,?,?)').bind(owner,input.id,payload.kind,JSON.stringify(receipt),hash,now):
    db.prepare('INSERT INTO trail_encounter_actions(owner,id,request_hash,receipt,created_at) VALUES(?,?,?,?,?)').bind(owner,input.id,hash,JSON.stringify(receipt),now);
  try{await db.batch([insert,db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind('pending:'+crypto.randomUUID(),owner,'pending.cancel',input.id,JSON.stringify({kind:input.kind}),now)]);}
  catch(error){const raced=await inspectPending(db,owner,input);if(raced.status==='committed')return{status:'recorded'};if(raced.status==='identity-conflict')throw new WorldError(409,'Pending action identity differs from the server receipt');throw error;}
  return{status:'cancelled'};
}
