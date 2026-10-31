import {newDevWorld,reduceDevEvent,type DevWorld,type DevEvent,type DevReceipt} from '../../mobile/src/game/dev-world';
import type {D1Database} from '@cloudflare/workers-types';
import {tilePoint} from '../../mobile/src/game/claims';
import {loadBalance} from './balance-store';
import {WorldError} from './world-error';
export {WorldError} from './world-error';
import {hydrateSpawns,firstVisitStatement} from './spawn-store';
import {newProgression} from '../../mobile/src/game/progression';
type Row={state:string;revision:number};
export async function loadWorld(db:D1Database,owner:string,now=Date.now()){
  await db.prepare('INSERT INTO trail_players(id,state,revision,updated_at) VALUES(?,?,0,?) ON CONFLICT(id) DO NOTHING').bind(owner,JSON.stringify(newDevWorld()),Date.now()).run();
  const row=await db.prepare('SELECT state,revision FROM trail_players WHERE id=?').bind(owner).first<Row>();
  if(!row)throw new Error('World state unavailable');const world=JSON.parse(row.state)as DevWorld;world.game.progression??=newProgression();return{world:await hydrateSpawns(db,owner,world,now),revision:row.revision};
}
export async function applyWorldEvent(db:D1Database,owner:string,id:string,expected:number,event:DevEvent,now=Date.now()){
  if(!/^[a-zA-Z0-9:_-]{8,100}$/.test(id)||!Number.isSafeInteger(expected)||expected<0||!event||!['start','stop','gps','capture','claim'].includes(event.kind))throw new WorldError(400,'Invalid event envelope');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(event))))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const existing=await db.prepare('SELECT request_hash,result FROM trail_events WHERE owner=? AND id=?').bind(owner,id).first<{request_hash:string;result:string}>();
  if(existing){if(existing.request_hash!==hash)throw new WorldError(409,'Event identity was reused with different contents');return{...(await loadWorld(db,owner)),receipt:JSON.parse(existing.result)as DevReceipt,replayed:true};}
  const current=await loadWorld(db,owner,now);if(current.revision!==expected)throw new WorldError(409,'Progress changed on another device. Refresh before continuing.');
  let reduced:ReturnType<typeof reduceDevEvent>,previousClaim:{owner:string;price:number}|null=null;
  if(event.kind==='claim'){
    if(typeof event.tile!=='string'||!tilePoint(event.tile)||!(current.world.game.visits[event.tile]>0))throw new WorldError(400,'Visit a valid tile before claiming it');
    previousClaim=await db.prepare('SELECT owner,price FROM trail_claims WHERE tile=?').bind(event.tile).first();
    const price=(previousClaim?.price||0)+1;
    if(previousClaim?.owner===owner)throw new WorldError(409,'You already own this tile');
    if(!Number.isSafeInteger(price)||price!==event.price)throw new WorldError(409,'Tile price changed. Refresh and retry');
    const world:DevWorld=JSON.parse(JSON.stringify(current.world));
    if(!Number.isSafeInteger(world.game.gold)||world.game.gold<price)throw new WorldError(400,'Not enough gold');
    world.game.gold-=price;world.game.claimGoldSpent=(world.game.claimGoldSpent||0)+price;
    reduced={world,receipt:{accepted:true,reason:'claimed',tile:event.tile,awards:{},balanceRevision:world.configRevision}};
  }else{try{reduced=reduceDevEvent(current.world,event,now,(await loadBalance(db)).balance);}catch(error){throw new WorldError(400,(error as Error).message);}}
  const {world,receipt}=reduced;
  const personal=receipt.tile&&event.kind==='gps'?await firstVisitStatement(db,owner,receipt.tile,now):null;
  const statements=[
    db.prepare('INSERT INTO trail_events(owner,id,kind,result,request_hash,created_at) VALUES(?,?,?,?,?,?)').bind(owner,id,event.kind,JSON.stringify(receipt),hash,now),
    db.prepare('UPDATE trail_players SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(world),now,owner,expected),
    // CHECK fails the entire D1 batch if optimistic concurrency did not update exactly one row.
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('world-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
  ];
  if(personal)statements.push(personal);
  if(receipt.collected&&event.kind==='capture'&&world.game.sharedSpawnsOnly)statements.push(
    db.prepare('INSERT INTO trail_spawn_claims(spawn,owner,event,created_at) SELECT id,?,?,? FROM trail_spawns WHERE id=? AND removed_at IS NULL AND starts_at<=? AND (expires_at IS NULL OR expires_at>?)').bind(owner,id,now,receipt.collected,now,now),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('spawn-claim-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
  );
  if(event.kind==='claim')statements.push(
    db.prepare('INSERT INTO trail_claims(tile,owner,price,revision,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(tile) DO UPDATE SET owner=excluded.owner,price=excluded.price,revision=trail_claims.revision+1,updated_at=excluded.updated_at WHERE trail_claims.price=? AND trail_claims.owner<>?').bind(event.tile,owner,event.price,now,previousClaim?.price||0,owner),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('claim-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
  );
  if(receipt.tile&&event.kind==='gps')statements.push(db.prepare('INSERT INTO trail_visits(tile,owner,first_at,last_at) VALUES(?,?,?,?) ON CONFLICT(tile,owner) DO UPDATE SET last_at=excluded.last_at').bind(receipt.tile,owner,now,now));
  try{await db.batch(statements);}catch{
    const raced=await db.prepare('SELECT request_hash,result FROM trail_events WHERE owner=? AND id=?').bind(owner,id).first<{request_hash:string;result:string}>();
    if(raced&&raced.request_hash===hash)return{...(await loadWorld(db,owner)),receipt:JSON.parse(raced.result)as DevReceipt,replayed:true};
    throw new WorldError(409,'Progress changed during this action. Refresh and retry.');
  }
  return{world:await hydrateSpawns(db,owner,world,now),revision:expected+1,receipt,replayed:false};
}
