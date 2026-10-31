import type {D1Database} from '@cloudflare/workers-types';
import type {DevWorld} from '../../mobile/src/game/dev-world';
import {validateProgression} from '../../mobile/src/game/progression';
import type {Relic} from '../../mobile/src/game/types';
import {loadWorld} from './world-store';
import {WorldError} from './world-error';

type Visit={tile:string;first_at:number;last_at:number};
type Claim={tile:string;price:number;revision:number;updated_at:number};
type Capture={spawn:string;event:string;created_at:number};
type Backup={version:1;world:DevWorld;visits:Visit[];claims:Claim[];captures:Capture[]};
async function member(db:D1Database,owner:string){if(typeof owner!=='string'||!await db.prepare('SELECT 1 FROM trail_members WHERE id=?').bind(owner).first())throw new WorldError(404,'Player not found');}
export async function inspectPlayer(db:D1Database,owner:string){await member(db,owner);const state=await loadWorld(db,owner);const backups=await db.prepare('SELECT id,revision,created_at FROM trail_backups WHERE owner=? ORDER BY created_at DESC LIMIT 30').bind(owner).all();return{...state,backups:backups.results};}
async function snapshot(db:D1Database,owner:string,world:DevWorld):Promise<Backup>{
  const[visits,claims,captures]=await Promise.all([
    db.prepare('SELECT tile,first_at,last_at FROM trail_visits WHERE owner=? ORDER BY tile').bind(owner).all<Visit>(),
    db.prepare('SELECT tile,price,revision,updated_at FROM trail_claims WHERE owner=? ORDER BY tile').bind(owner).all<Claim>(),
    db.prepare('SELECT spawn,event,created_at FROM trail_spawn_claims WHERE owner=? ORDER BY spawn').bind(owner).all<Capture>(),
  ]);return{version:1,world,visits:visits.results,claims:claims.results,captures:captures.results};
}
const guard=(db:D1Database)=>db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('admin-player-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid");
const TYPES=['Stone','Rune','Compass','Shard','Crown','Key','Lantern'];
export async function editPlayer(db:D1Database,actor:string,owner:string,expected:number,action:string,input:Record<string,unknown>,now=Date.now()){
  await member(db,owner);const current=await loadWorld(db,owner,now);
  if(!Number.isSafeInteger(expected)||expected!==current.revision)throw new WorldError(409,'Player progress changed; reload before editing');
  const backup=await snapshot(db,owner,current.world),backupId='backup:'+crypto.randomUUID();let next:DevWorld=JSON.parse(JSON.stringify(current.world));
  if(action==='backup'){
    // Still advance the revision so the snapshot and child rows share one checked point.
  }else if(action==='reset-exploration'){
    // Clear the exploration display, retaining permanent reward evidence and global ownership.
    next.rewardedTiles={...next.rewardedTiles,...Object.fromEntries(Object.keys(next.game.visits).map(k=>[k,true]))};
    next.game.visits={};next.game.path=[];next.game.searched={};next.game.revealed={};next.game.meters=0;next.game.energy=0;next.game.elapsed=0;
    if(next.game.adventure)next.game.adventure={...next.game.adventure,status:'stopped',pendingStart:false,endedAt:now};
    next.previous=null;next.anchor=null;next.latestGpsValid=false;
  }else if(action==='restore'){
    if(typeof input.backupId!=='string'||input.backupId.length>100)throw new WorldError(400,'Choose a recovery snapshot');
    const row=await db.prepare('SELECT state FROM trail_backups WHERE id=? AND owner=?').bind(input.backupId,owner).first<{state:string}>();if(!row)throw new WorldError(404,'Backup not found for this player');
    const saved=JSON.parse(row.state)as Backup;if(saved.version!==1)throw new WorldError(400,'Unsupported backup version');next=saved.world;
    // Wallet and ownership must be reconciled together. Do not restore across spending or new global captures.
    if(next.game.gold!==current.world.game.gold||JSON.stringify(saved.claims)!==JSON.stringify(backup.claims)||JSON.stringify(saved.captures)!==JSON.stringify(backup.captures))throw new WorldError(409,'Wallet or world claims changed since this snapshot; use a reconciled recovery instead');
    next.rewardedTiles={...next.rewardedTiles,...current.world.rewardedTiles,...Object.fromEntries(Object.keys(current.world.game.visits).map(k=>[k,true]))};
    next.regions={...next.regions,...current.world.regions};
    next.previous=null;next.anchor=null;next.latestGpsValid=false;if(next.game.adventure)next.game.adventure={...next.game.adventure,status:'stopped',pendingStart:false,endedAt:now};
  }else if(action==='attributes'){
    try{next.game.progression=validateProgression({version:1,xp:input.xp as never});}catch{throw new WorldError(400,'Provide all six non-negative whole XP totals');}
  }else if(action==='inventory-add'){
    if(typeof input.type!=='string'||!TYPES.includes(input.type)||!['Common','Rare','Legendary'].includes(String(input.rarity)))throw new WorldError(400,'Choose a supported item type and rarity');
    const item:Relic={id:'admin-grant:'+crypto.randomUUID(),i:0,j:0,name:input.type,rarity:input.rarity as Relic['rarity'],novelty:0,source:'Admin test grant',date:new Date(now).toISOString()};next.game.collection.push(item);
  }else if(action==='inventory-edit'||action==='inventory-remove'){
    const item=next.game.collection.find(r=>r.id===input.itemId);if(!item)throw new WorldError(404,'Inventory item not found');
    if(action==='inventory-remove')next.game.collection=next.game.collection.filter(r=>r.id!==input.itemId);
    else{if(typeof input.type!=='string'||!TYPES.includes(input.type)||!['Common','Rare','Legendary'].includes(String(input.rarity)))throw new WorldError(400,'Choose a supported item type and rarity');item.name=input.type;item.rarity=input.rarity as Relic['rarity'];}
  }else throw new WorldError(400,'Unknown player operation');
  const statements=[
    db.prepare('INSERT INTO trail_backups(id,owner,state,revision,created_at) VALUES(?,?,?,?,?)').bind(backupId,owner,JSON.stringify(backup),current.revision,now),
    db.prepare('UPDATE trail_players SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(next),now,owner,expected),guard(db),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'player.'+action,owner,JSON.stringify({backupId,fromRevision:expected,toRevision:expected+1,itemId:input.itemId??null,restoredBackup:action==='restore'?input.backupId:null,before:{items:current.world.game.collection.length,xp:current.world.game.progression?.xp},after:{items:next.game.collection.length,xp:next.game.progression?.xp},itemChange:action.startsWith('inventory-')?{type:input.type,rarity:input.rarity}:undefined}),now),
  ];
  try{await db.batch(statements);}catch{throw new WorldError(409,'Player or shared ownership changed; the complete edit was rolled back');}
  return{...await inspectPlayer(db,owner),backupId};
}
